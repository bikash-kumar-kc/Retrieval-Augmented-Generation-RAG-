export type PipelineStage = "uploaded" | "parsed" | "chunked" | "embedded";
export type PipelineStatus = "processing" | "ready" | "failed";

/** What GET /api/documents returns for each document. */
export interface DocumentDto {
  documentId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  fileHash: string;
  status: PipelineStatus;
  stage: PipelineStage; // last COMPLETED stage
  errorMessage: string | null;
  attempts: number;
  chunkCount: number | null;
  agentPrompt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** DocumentDto plus live info that only exists on the client. */
export interface DocumentRow extends DocumentDto {
  /** embedding progress, from SSE `progress` events */
  progress?: { done: number; total: number };
  /** the server is retrying after a transient failure */
  retrying?: boolean;
}

export type StepName = "parse" | "chunk" | "embed";

export type PipelineEventType =
  | "queued"
  | "stage_started"
  | "stage_completed"
  | "progress"
  | "completed"
  | "retrying"
  | "failed";

/** Payload of the SSE `pipeline` event. */
export interface PipelineEvent {
  type: PipelineEventType;
  documentId: string;
  step?: StepName;
  progress?: { done: number; total: number };
  error?: string;
  at: string;
}

export interface UploadResponse {
  document: DocumentDto;
  duplicate: boolean;
}

/** A file that is still travelling to the server. Shown as a temporary table row. */
export interface LocalUpload {
  localId: string;
  name: string;
  percent: number;
  startedAt: string;
}
