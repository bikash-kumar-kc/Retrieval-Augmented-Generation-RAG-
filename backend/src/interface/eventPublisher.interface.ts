export type StepName = "parse" | "chunk" | "embed";

export type PipelineEventType =
  | "queued"
  | "stage_started"
  | "stage_completed"
  | "progress"
  | "completed"
  | "retrying"
  | "failed";

export interface PipelineEvent {
  type: PipelineEventType;
  documentId: string;
  ownerId: string;
  step?: StepName;
  progress?: { done: number; total: number };
  error?: string;
  at: string;
}

export interface EventPublisher {
  publish(event: PipelineEvent): Promise<void>;
}

export const EVENTS_CHANNEL = "pipeline:events";
