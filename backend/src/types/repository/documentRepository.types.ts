export type PipelineStage = "uploaded" | "parsed" | "chunked" | "embedded";

export type PipelineStatus = "processing" | "ready" | "failed";

export interface DocumentRecord {
  documentId: string;
  ownerId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  filePath: string;
  fileHash: string;
  stage: PipelineStage;
  status: PipelineStatus;
  errorMessage: string | null;
  attempts: number;
  chunkCount: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewDocument {
  documentId: string;
  ownerId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  filePath: string;
  fileHash: string;
  agentPrompt: string;
  /**
   * File hash when deduplication is enabled,
   * otherwise null.
   */
  dedupKey: string | null;
}
