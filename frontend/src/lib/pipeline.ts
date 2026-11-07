import type { DocumentDto, DocumentRow, PipelineEvent, PipelineStage, StepName } from "../types/document";

/**
 * The backend runs three steps (embedding and writing to the vector DB happen together,
 * batch by batch), so the stepper shows three. PipelineSteps takes any list of labels.
 */
export const PIPELINE_STEP_LABELS = ["Parsing", "Chunking", "Embedding & uploading"];

const STAGE_INDEX: Record<PipelineStage, number> = {
  uploaded: 0, // nothing finished yet -> parsing is next
  parsed: 1,
  chunked: 2,
  embedded: 3, // everything finished
};

const STEP_TO_STAGE: Record<StepName, PipelineStage> = {
  parse: "parsed",
  chunk: "chunked",
  embed: "embedded",
};

/** Props for <PipelineSteps /> derived from a document. */
export function deriveStepper(doc: DocumentRow): { current: number; failedAt: number | null; error?: string } {
  const last = PIPELINE_STEP_LABELS.length - 1;
  if (doc.status === "ready") return { current: PIPELINE_STEP_LABELS.length, failedAt: null };
  if (doc.status === "failed") {
    return {
      current: 0,
      failedAt: Math.min(STAGE_INDEX[doc.stage], last),
      ...(doc.errorMessage ? { error: doc.errorMessage } : {}),
    };
  }
  return { current: STAGE_INDEX[doc.stage], failedAt: null };
}

export type ProcessingState =
  | { kind: "step"; label: string; detail?: string }
  | { kind: "completed" }
  | { kind: "failed" };

/** What the "Processing" column shows. */
export function processingState(doc: DocumentRow): ProcessingState {
  if (doc.status === "ready") return { kind: "completed" };
  if (doc.status === "failed") return { kind: "failed" };
  const index = Math.min(STAGE_INDEX[doc.stage], PIPELINE_STEP_LABELS.length - 1);
  const labels = ["Parsing", "Chunking", "Embedding"];
  const detail =
    index === 2 && doc.progress ? `${doc.progress.done}/${doc.progress.total}` : doc.retrying ? "retrying" : undefined;
  return { kind: "step", label: labels[index] ?? "Processing", ...(detail ? { detail } : {}) };
}

/** Pure reducer: apply one SSE `pipeline` event to a document. */
export function applyPipelineEvent(doc: DocumentRow, event: PipelineEvent): DocumentRow {
  switch (event.type) {
    case "queued":
    case "stage_started":
      return { ...doc, status: "processing", retrying: false };
    case "stage_completed":
      return event.step ? { ...doc, status: "processing", stage: STEP_TO_STAGE[event.step] } : doc;
    case "progress":
      return event.progress ? { ...doc, progress: event.progress } : doc;
    case "completed": {
      const { progress: _progress, ...rest } = doc;
      return { ...rest, status: "ready", stage: "embedded", errorMessage: null, retrying: false };
    }
    case "retrying":
      return { ...doc, retrying: true, errorMessage: event.error ?? doc.errorMessage };
    case "failed":
      return { ...doc, status: "failed", retrying: false, errorMessage: event.error ?? doc.errorMessage };
    default:
      return doc;
  }
}

/** Keep client-only fields (embed progress) when a fresh DTO arrives for a document still being processed. */
export function mergeDto(prev: DocumentRow | undefined, dto: DocumentDto): DocumentRow {
  if (!prev || dto.status !== "processing") return dto;
  return { ...dto, ...(prev.progress ? { progress: prev.progress } : {}) };
}
