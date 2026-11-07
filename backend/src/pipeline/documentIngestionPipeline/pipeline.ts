import { Chunker } from "../../interface/chuncker.interface.js";
import { ChunkRepositoryContract } from "../../interface/chunckRepository.interface.js";
import { DocumentRepositoryContract } from "../../interface/documentRepository.interface.js";
import { Embedder } from "../../interface/embedder.interface.js";
import {
  EventPublisher,
  PipelineEvent,
  StepName,
} from "../../interface/eventPublisher.interface.js";
import { ParsedRepositoryContract } from "../../interface/parsedRepository.interface.js";
import {
  embedsText,
  IntegratedEmbeddingStore,
  VectorStore,
} from "../../interface/vectorStore.interface.js";
import { ChunkRepository } from "../../repository/chunck.repository.js";
import { ParserRegistry } from "../../services/parse/parseService.js";
import {
  DocumentRecord,
  PipelineStage,
} from "../../types/repository/documentRepository.types.js";
import { normalizeForHash } from "../../utils/clean.js";
import { errorMessage, NonRetryableError } from "../../utils/error.js";
import { chunkId, sha256Hex } from "../../utils/hash.js";
import { log } from "../../utils/logger.js";

export interface PipelineDeps {
  documents: DocumentRepositoryContract;
  parsed: ParsedRepositoryContract;
  chunks: ChunkRepositoryContract;
  parsers: ParserRegistry;
  chunker: Chunker;
  embedder: Embedder;
  vectorStore: VectorStore | IntegratedEmbeddingStore;
  events: EventPublisher;
  embeddingBatchSize: number;
}

interface Step {
  name: StepName;
  /** runs only when the document's last completed stage equals this */
  from: PipelineStage;
  to: PipelineStage;
  run: (doc: DocumentRecord) => Promise<void>;
}

/**
 * the pipeline starts from there where the last time the pipeline breaks.
 * every stage stores their output somewhere in persistent memory to support resumeability
 */
export class IngestionPipeline {
  private readonly steps: Step[];

  constructor(private readonly d: PipelineDeps) {
    this.steps = [
      {
        name: "parse",
        from: "uploaded",
        to: "parsed",
        run: (doc) => this.parse(doc),
      },
      {
        name: "chunk",
        from: "parsed",
        to: "chunked",
        run: (doc) => this.chunk(doc),
      },
      {
        name: "embed",
        from: "chunked",
        to: "embedded",
        run: (doc) => this.embed(doc),
      },
    ];
  }

  async run(documentId: string): Promise<void> {
    console.log("[pipeline started]");
    const doc = await this.d.documents.findById(documentId);
    if (!doc) throw new NonRetryableError(`Document ${documentId} not found`);
    if (doc.status === "ready") return;
    await this.d.documents.resetForRun(documentId);

    let stage = doc.stage;
    for (const step of this.steps) {
      if (stage !== step.from) continue;

      await this.emit(doc, { type: "stage_started", step: step.name });
      await step.run(doc);
      await this.d.documents.setStage(documentId, step.to);
      // set the next stage and start over.
      stage = step.to;
      await this.emit(doc, { type: "stage_completed", step: step.name });
    }

    const { total } = await this.d.chunks.counts(documentId);
    await this.d.documents.markReady(documentId, total);

    await this.emit(doc, { type: "completed" });

    console.log("[pipeline completed]");
  }

  async markRetrying(documentId: string, err: unknown): Promise<void> {
    const doc = await this.d.documents.findById(documentId);
    if (!doc) return;
    const message = errorMessage(err);
    await this.d.documents.recordError(documentId, message);
    await this.emit(doc, { type: "retrying", error: message });
  }

  async markFailed(documentId: string, err: unknown): Promise<void> {
    const doc = await this.d.documents.findById(documentId);
    if (!doc) return;
    const message = errorMessage(err);
    await this.d.documents.markFailed(documentId, message);
    await this.emit(doc, { type: "failed", error: message });
  }

  // ---- steps ----------------------------------------------------------------

  private async parse(doc: DocumentRecord): Promise<void> {
    console.log("[parsing started]");
    const parser = this.d.parsers.resolve(doc.mimeType);
    const parsed = await parser.parse(doc.filePath);
    const chars = parsed.sections.reduce((n, s) => n + s.text.length, 0);
    if (chars === 0) {
      throw new NonRetryableError(
        "No extractable text found (scanned or image-only document? OCR is not supported yet)",
      );
    }
    await this.d.parsed.save(doc.documentId, parsed);
    console.log("[parsing completed]");
  }

  private async chunk(doc: DocumentRecord): Promise<void> {
    console.log("[chunking started]");
    const parsed = await this.d.parsed.load(doc.documentId);
    if (!parsed)
      throw new Error(
        `Parsed output missing for ${doc.documentId} (stage says parsed)`,
      );

    const drafts = await this.d.chunker.chunk(parsed);
    if (drafts.length === 0)
      throw new NonRetryableError("Chunking produced no chunks");

    const chunks = drafts.map((draft) => {
      const chunkHash = sha256Hex(normalizeForHash(draft.text));
      return {
        chunkId: chunkId(doc.documentId, draft.index, chunkHash),
        chunkIndex: draft.index,
        text: draft.text,
        chunkHash,
        metadata: draft.metadata,
      };
    });

    await this.d.chunks.insertChuncks(doc.documentId, doc.ownerId, chunks);

    console.log("[chunking completed]");
  }

  private async embed(doc: DocumentRecord): Promise<void> {
    console.log("[embedding started]");
    const { total, embedded } = await this.d.chunks.counts(doc.documentId);

    let done = embedded;
    if (done > 0)
      await this.emit(doc, {
        type: "progress",
        step: "embed",
        progress: { done, total },
      });

    for (;;) {
      const pending = await this.d.chunks.listPendingEmbeddingChunck(
        doc.documentId,
        this.d.embeddingBatchSize,
      );

      if (pending.length === 0) break;

      // const chunkPageLocationInfo =

      const meta = (c: (typeof pending)[number]) => {
        const metaData = c.metadata.locations as {
          page: number;
          pageStart: number;
          chunkStart: number;
          length: number;
        }[];

        return {
          document_id: doc.documentId,
          owner_id: doc.ownerId,
          source: doc.name,
          chunk_index: c.chunkIndex,
          extra_data: JSON.stringify(metaData),
        };
      };

      const store = this.d.vectorStore;

      if (embedsText(store)) {
        // Pinecone embeds on its side: text only, no Embedder call
        await store.upsertText(
          doc.ownerId + doc.documentId,
          pending.map((c) => ({
            id: c.chunkId,
            text: c.text,
            metadata: meta(c),
          })),
        );
      } else {
        // make the vector embedding.
        const vectors = await this.d.embedder.embedDocuments(
          pending.map((c) => c.text),
        );

        if (vectors.length !== pending.length) {
          throw new Error(
            `Embedder returned ${vectors.length} vectors for ${pending.length} chunks`,
          );
        }

        //@ts-ignore
        await this.d.vectorStore.upsert(
          doc.ownerId + doc.documentId, // namespace per user => tenant isolation
          pending.map((c, i) => ({
            id: c.chunkId,
            values: vectors[i] as number[],
            metadata: {
              text: c.text,
              document_id: doc.documentId,
              owner_id: doc.ownerId,
              source: doc.name,
              chunk_index: c.chunkIndex,
              ...(typeof c.metadata["pageNumber"] === "number"
                ? { page_number: c.metadata["pageNumber"] }
                : {}),
            },
          })),
        );
      }

      // mark that the embedded chucked.
      await this.d.chunks.markEmbedded(pending.map((c) => c.chunkId));

      // increase the embedded chunck.
      done += pending.length;

      await this.emit(doc, {
        type: "progress",
        step: "embed",
        progress: { done, total },
      });
    }

    console.log("[embedding completed]");
  }

  private async emit(
    doc: DocumentRecord,
    partial: Omit<PipelineEvent, "documentId" | "ownerId" | "at">,
  ): Promise<void> {
    try {
      console.log("[event sending start]");
      await this.d.events.publish({
        ...partial,
        documentId: doc.documentId,
        ownerId: doc.ownerId,
        at: new Date().toISOString(),
      });
      console.log("[event sending completed]");
    } catch (err) {
      // Progress reporting must never fail an ingestion.
      log.warn("failed to publish pipeline event", {
        type: partial.type,
        err: String(err),
      });
    }
  }
}
