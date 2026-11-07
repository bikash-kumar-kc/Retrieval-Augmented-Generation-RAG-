import { randomUUID } from "node:crypto";
import { mkdir, open, rename, rm } from "node:fs/promises";
import path from "node:path";
import type { Config } from "../config.js";
import { sha256File } from "../utils/hash.js";
import { log } from "../utils/logger.js";
import { DocumentRepositoryContract } from "../interface/documentRepository.interface.js";
import { JobPublisher } from "../interface/jobPublisher.interface.js";
import { EventPublisher } from "../interface/eventPublisher.interface.js";
import { IncomingFile, UploadResult } from "../types/filehandling/file.type.js";
import { AppError, errorMessage } from "../utils/error.js";
import { ParserRegistry } from "./parse/parseService.js";
import { isUniqueViolation } from "../clients/db/turso.db.client.js";
import { DocumentRecord } from "../types/repository/documentRepository.types.js";

export class UploadService {
  constructor(
    private readonly deps: {
      documents: DocumentRepositoryContract;
      parsers: ParserRegistry;
      queue: JobPublisher;
      events: EventPublisher;
      config: Pick<Config, "UPLOAD_DIR" | "DEDUP_ENABLED">;
    },
  ) {}

  /**
   * validate,file hash, calcuate dedup,store in db,enqueue
   */
  async ingest(file: IncomingFile): Promise<UploadResult> {
    const { documents, parsers, config } = this.deps;

    let movedTo: string | null = null;

    try {
      // check whether the give file is accepted or not.
      if (!parsers.supports(file.mimeType)) {
        throw new AppError(
          415,
          `Unsupported file type: ${file.mimeType}`,
          "unsupported_type",
        );
      }

      // select the correct parser as per file mimeType
      const parser = parsers.resolve(file.mimeType);

      // chekc the file type and content.
      await this.assertContentMatches(file.tmpPath, parser.sniff?.bind(parser));

      const fileHash = await sha256File(file.tmpPath);

      // Level 1 dedup (per owner): same bytes already uploaded?
      if (config.DEDUP_ENABLED) {
        const existing = await documents.findByDedupKey(file.ownerId, fileHash);
        if (existing)
          return {
            document: await this.reviveIfFailed(existing),
            duplicate: true,
          };
      }

      const documentId = randomUUID();

      const finalPath = path.resolve(
        config.UPLOAD_DIR,
        file.ownerId,
        `${documentId}${parser.fileExtension}`,
      );

      try {
        await mkdir(path.dirname(finalPath), { recursive: true });
      } catch (error) {
        console.log("[]")
      }

      await rename(file.tmpPath, finalPath);

      movedTo = finalPath;

      try {
        await documents.insert({
          documentId,
          ownerId: file.ownerId,
          name: path.basename(file.originalName).slice(0, 255),
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes,
          filePath: finalPath,
          fileHash,
          dedupKey: config.DEDUP_ENABLED ? fileHash : null,
          agentPrompt:file.agentPrompt,
        });
      } catch (err) {
        if (isUniqueViolation(err) && config.DEDUP_ENABLED) {
          // two identical uploads raced; the DB constraint rejected the loser
          const winner = await documents.findByDedupKey(file.ownerId, fileHash);
          if (winner)
            return {
              document: await this.reviveIfFailed(winner),
              duplicate: true,
            };
        }

        throw err;
      }
      movedTo = null; // row exists: the file now belongs to it

      const document = (await documents.findById(documentId)) as DocumentRecord;
      await this.enqueue(document);
      return { document, duplicate: false };
    } finally {
      await rm(file.tmpPath, { force: true }); // no-op if it was moved
      if (movedTo) await rm(movedTo, { force: true }); // orphan from a failed insert
    }
  }

  /** Manual retry for a failed document (resumes from its last completed stage). */
  async retry(document: DocumentRecord): Promise<DocumentRecord> {
    if (document.status !== "failed") {
      throw new AppError(
        409,
        `Document is ${document.status}, only failed documents can be retried`,
        "not_failed",
      );
    }
    return this.reviveIfFailed(document);
  }

  private async reviveIfFailed(doc: DocumentRecord): Promise<DocumentRecord> {
    if (doc.status !== "failed") return doc;

    await this.deps.documents.resetForRun(doc.documentId);

    const fresh = (await this.deps.documents.findById(
      doc.documentId,
    )) as DocumentRecord;

    await this.enqueue(fresh);

    return fresh;
  }

  private async enqueue(doc: DocumentRecord): Promise<void> {
    try {
      await this.deps.queue.enqueue({ documentId: doc.documentId });
    } catch (err) {
      // Without a queued job the row would sit in 'processing' forever, so surface it as failed (retryable).

      await this.deps.documents.markFailed(
        doc.documentId,
        "Could not queue the document for processing",
      );
      log.error("enqueue failed", {
        documentId: doc.documentId,
        err: errorMessage(err),
      });
      throw new AppError(
        503,
        "Processing queue unavailable, please retry",
        "queue_unavailable",
      );
    }
    await this.deps.events
      .publish({
        type: "queued",
        documentId: doc.documentId,
        ownerId: doc.ownerId,
        at: new Date().toISOString(),
      })
      .catch((e) =>
        log.warn("failed to publish queued event", { err: String(e) }),
      );
  }

  private async assertContentMatches(
    filePath: string,
    sniff?: (header: Buffer) => boolean,
  ): Promise<void> {
    if (!sniff) return;

    const handle = await open(filePath, "r");

    try {
      const header = Buffer.alloc(16);
      await handle.read(header, 0, header.length, 0);
      if (!sniff(header))
        throw new AppError(
          415,
          "File content does not match its declared type",
          "content_mismatch",
        );
    } finally {
      await handle.close();
    }
  }
}
