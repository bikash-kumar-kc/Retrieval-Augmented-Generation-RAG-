import {
  DocumentRecord,
  NewDocument,
  PipelineStage,
} from "../types/repository/documentRepository.types.js";

export interface DocumentRepositoryContract {
  insert(document: NewDocument): Promise<void>;

  findById(documentId: string): Promise<DocumentRecord | null>;

  findByIdForOwner(
    documentId: string,
    ownerId: string,
  ): Promise<DocumentRecord | null>;

  findByDedupKey(
    ownerId: string,
    dedupKey: string,
  ): Promise<DocumentRecord | null>;

  listByOwner(
    ownerId: string,
    limit?: number,
    offset?: number,
  ): Promise<DocumentRecord[]>;

  listProcessingByOwner(ownerId: string): Promise<DocumentRecord[]>;

  setStage(documentId: string, stage: PipelineStage): Promise<void>;

  resetForRun(documentId: string): Promise<void>;

  incrementAttempts(documentId: string): Promise<void>;

  recordError(documentId: string, message: string): Promise<void>;

  markReady(documentId: string, chunkCount: number): Promise<void>;

  markFailed(documentId: string, message: string): Promise<void>;

  deleteWithChildren(documentId: string): Promise<void>;
}
