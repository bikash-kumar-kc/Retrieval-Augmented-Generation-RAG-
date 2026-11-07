import { and, desc, eq, sql } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";

import * as schema from "../clients/db/schema.js";

import type {
  DocumentRecord,
  NewDocument,
  PipelineStage,
  PipelineStatus,
} from "../types/repository/documentRepository.types.js";
import { DocumentRepositoryContract } from "../interface/documentRepository.interface.js";

export class DocumentRepository implements DocumentRepositoryContract {
  constructor(private readonly db: LibSQLDatabase<typeof schema>) {}

  async insert(d: NewDocument): Promise<void> {
    await this.db.insert(schema.documents).values({
      documentId: d.documentId,
      ownerId: d.ownerId,
      name: d.name,
      mimeType: d.mimeType,
      sizeBytes: d.sizeBytes,
      filePath: d.filePath,
      fileHash: d.fileHash,
      dedupKey: d.dedupKey,
      agentRouterPrompt: d.agentPrompt,
    });
  }

  async findById(documentId: string): Promise<DocumentRecord | null> {
    const row = await this.db.query.documents.findFirst({
      where: eq(schema.documents.documentId, documentId),
    });

    return row ? this.map(row) : null;
  }

  async findByIdForOwner(
    documentId: string,
    ownerId: string,
  ): Promise<DocumentRecord | null> {
    const row = await this.db.query.documents.findFirst({
      where: and(
        eq(schema.documents.documentId, documentId),
        eq(schema.documents.ownerId, ownerId),
      ),
    });

    return row ? this.map(row) : null;
  }

  async findByDedupKey(
    ownerId: string,
    dedupKey: string,
  ): Promise<DocumentRecord | null> {
    const row = await this.db.query.documents.findFirst({
      where: and(
        eq(schema.documents.ownerId, ownerId),
        eq(schema.documents.dedupKey, dedupKey),
      ),
    });

    return row ? this.map(row) : null;
  }

  async listByOwner(
    ownerId: string,
    limit = 100,
    offset = 0,
  ): Promise<DocumentRecord[]> {
    const rows = await this.db
      .select()
      .from(schema.documents)
      .where(eq(schema.documents.ownerId, ownerId))
      .orderBy(desc(schema.documents.createdAt))
      .limit(limit)
      .offset(offset);

    return rows.map((row) => this.map(row));
  }

  async listProcessingByOwner(ownerId: string): Promise<DocumentRecord[]> {
    const rows = await this.db
      .select()
      .from(schema.documents)
      .where(
        and(
          eq(schema.documents.ownerId, ownerId),
          eq(schema.documents.status, "processing"),
        ),
      )
      .orderBy(desc(schema.documents.createdAt));

    return rows.map((row) => this.map(row));
  }

  async setStage(documentId: string, stage: PipelineStage): Promise<void> {
    await this.db
      .update(schema.documents)
      .set({
        stage,
        updatedAt: sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`,
      })
      .where(eq(schema.documents.documentId, documentId));
  }

  async resetForRun(documentId: string): Promise<void> {
    await this.db
      .update(schema.documents)
      .set({
        status: "processing",
        errorMessage: null,
        updatedAt: sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`,
      })
      .where(eq(schema.documents.documentId, documentId));
  }

  async incrementAttempts(documentId: string): Promise<void> {
    await this.db
      .update(schema.documents)
      .set({
        attempts: sql`${schema.documents.attempts} + 1`,
        updatedAt: sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`,
      })
      .where(eq(schema.documents.documentId, documentId));
  }

  async recordError(documentId: string, message: string): Promise<void> {
    await this.db
      .update(schema.documents)
      .set({
        errorMessage: message.slice(0, 1000),
        updatedAt: sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`,
      })
      .where(eq(schema.documents.documentId, documentId));
  }

  async markReady(documentId: string, chunkCount: number): Promise<void> {
    await this.db
      .update(schema.documents)
      .set({
        status: "ready",
        stage: "embedded",
        chunkCount,
        errorMessage: null,
        updatedAt: sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`,
      })
      .where(eq(schema.documents.documentId, documentId));
  }

  async markFailed(documentId: string, message: string): Promise<void> {
    await this.db
      .update(schema.documents)
      .set({
        status: "failed",
        errorMessage: message.slice(0, 1000),
        updatedAt: sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`,
      })
      .where(eq(schema.documents.documentId, documentId));
  }

  async deleteWithChildren(documentId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .delete(schema.chunks)
        .where(eq(schema.chunks.documentId, documentId));

      await tx
        .delete(schema.parsedDocuments)
        .where(eq(schema.parsedDocuments.documentId, documentId));

      await tx
        .delete(schema.documents)
        .where(eq(schema.documents.documentId, documentId));
    });
  }

  private map(row: typeof schema.documents.$inferSelect): DocumentRecord {
    return {
      documentId: row.documentId,
      ownerId: row.ownerId,
      name: row.name,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      filePath: row.filePath,
      fileHash: row.fileHash,
      stage: row.stage as PipelineStage,
      status: row.status as PipelineStatus,
      errorMessage: row.errorMessage,
      attempts: row.attempts,
      chunkCount: row.chunkCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
