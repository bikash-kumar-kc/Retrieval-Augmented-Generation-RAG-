import { eq, inArray, and, asc, sql } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";

import * as schema from "../clients/db/schema.js";
import {
  ChunkRecord,
  NewChunk,
} from "../types/repository/chunckRepository.type.js";
import { ChunkRepositoryContract } from "../interface/chunckRepository.interface.js";

export class ChunkRepository implements ChunkRepositoryContract {
  constructor(private readonly db: LibSQLDatabase<typeof schema>) {}

  /**
   * Idempotent: delete + insert run as ONE transaction.
   * If anything fails, the transaction rolls back.
   */
  async insertChuncks(
    documentId: string,
    ownerId: string,
    chunks: NewChunk[],
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      // Delete existing chunks for this document
      await tx
        .delete(schema.chunks)
        .where(eq(schema.chunks.documentId, documentId));

      // Insert new chunks
      if (chunks.length > 0) {
        await tx.insert(schema.chunks).values(
          chunks.map((chunk) => ({
            chunkId: chunk.chunkId,
            documentId,
            ownerId,
            chunkIndex: chunk.chunkIndex,
            text: chunk.text,
            chunkHash: chunk.chunkHash,
            metadataJson: JSON.stringify(chunk.metadata),
          })),
        );
      }
    });
  }

  /**
   * Next chunks that still need a vector, in document order.
   */
  async listPendingEmbeddingChunck(
    documentId: string,
    limit: number,
  ): Promise<ChunkRecord[]> {
    const rows = await this.db
      .select()
      .from(schema.chunks)
      .where(
        and(
          eq(schema.chunks.documentId, documentId),
          eq(schema.chunks.embedded, 0),
        ),
      )
      .orderBy(asc(schema.chunks.chunkIndex))
      .limit(limit);

    return rows.map((row) => ({
      chunkId: row.chunkId,
      documentId: row.documentId,
      ownerId: row.ownerId,
      chunkIndex: row.chunkIndex,
      text: row.text,
      chunkHash: row.chunkHash,
      metadata: JSON.parse(row.metadataJson) as Record<string, unknown>,
      embedded: row.embedded === 1,
    }));
  }

  async markEmbedded(chunkIds: string[]): Promise<void> {
    if (chunkIds.length === 0) return;

    await this.db
      .update(schema.chunks)
      .set({
        embedded: 1,
      })
      .where(inArray(schema.chunks.chunkId, chunkIds));
  }

  async counts(
    documentId: string,
  ): Promise<{ total: number; embedded: number }> {
    const [row] = await this.db
      .select({
        total: sql<number>`COUNT(*)`,
        embedded: sql<number>`COALESCE(SUM(${schema.chunks.embedded}), 0)`,
      })
      .from(schema.chunks)
      .where(eq(schema.chunks.documentId, documentId));

    return {
      total: Number(row?.total ?? 0),
      embedded: Number(row?.embedded ?? 0),
    };
  }

  async listIds(documentId: string): Promise<string[]> {
    const rows = await this.db
      .select({
        chunkId: schema.chunks.chunkId,
      })
      .from(schema.chunks)
      .where(eq(schema.chunks.documentId, documentId))
      .orderBy(asc(schema.chunks.chunkIndex));

    return rows.map((row) => row.chunkId);
  }
}
