import {
  ChunkCounts,
  ChunkRecord,
  NewChunk,
} from "../types/repository/chunckRepository.type.js";

export interface ChunkRepositoryContract {
  /**
   * Replace all chunks belonging to a document.
   */
  insertChuncks(
    documentId: string,
    ownerId: string,
    chunks: NewChunk[],
  ): Promise<void>;

  /**
   * Get chunks that have not been embedded yet,
   * ordered by their chunk index.
   */
  listPendingEmbeddingChunck(documentId: string, limit: number): Promise<ChunkRecord[]>;

  /**
   * Mark the given chunks as successfully embedded.
   */
  markEmbedded(chunkIds: string[]): Promise<void>;

  /**
   * Get total and embedded chunk counts for a document.
   */
  counts(documentId: string): Promise<ChunkCounts>;

  /**
   * Get all chunk IDs for a document in chunk order.
   */
  listIds(documentId: string): Promise<string[]>;
}
