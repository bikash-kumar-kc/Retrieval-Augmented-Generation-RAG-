import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { CheckCircle2, FileText, Loader2, UploadCloud, X } from "lucide-react";
import type { DocumentRow, UploadResponse } from "../../../types/document";
import { showToast } from "../Toast";
import { theme } from "../../../lib/theme";
import { PipelineSteps } from "../pipeline/PipelineStep";
import { deriveStepper, PIPELINE_STEP_LABELS } from "../../../lib/pipeline";
import { Progress } from "../../ui/progress";
import { formatBytes } from "../../../lib/format";
import { Textarea } from "../../ui/textarea";

export const MAX_UPLOAD_MB = 50; // keep in sync with MAX_UPLOAD_MB on the API
export const MAX_PROMPT_CHARS = 2000;

type Phase =
  | { kind: "idle" }
  | { kind: "uploading"; percent: number }
  | { kind: "uploaded"; documentId: string; duplicate: boolean }
  | { kind: "error"; message: string };

interface Props {
  /** live list from useDocumentHook, so the stepper follows the pipeline */
  documents: DocumentRow[];
  onUpload: (
    file: File,
    agentPrompt: string,
    onProgress: (percent: number) => void,
  ) => Promise<UploadResponse>;
  onRetry: (documentId: string) => void | Promise<void>;
}

function rejectionMessage(rejections: FileRejection[]): string {
  const code = rejections[0]?.errors[0]?.code;
  if (code === "file-too-large")
    return `That file is larger than ${MAX_UPLOAD_MB} MB.`;
  if (code === "file-invalid-type")
    return "Only PDF files are supported for now.";
  if (code === "too-many-files") return "Please choose one file at a time.";
  return rejections[0]?.errors[0]?.message ?? "That file can't be uploaded.";
}

export function DocumentUploader({ documents, onUpload, onRetry }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [agentPrompt, setAgentPrompt] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  const onDropAccepted = useCallback((accepted: File[]) => {
    setFile(accepted[0] ?? null);
    setPhase({ kind: "idle" });
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    multiple: false,
    maxSize: MAX_UPLOAD_MB * 1024 * 1024,
    disabled: phase.kind === "uploading",
    noClick: true, // the whole area is clickable through our own button/handler below
    noKeyboard: true,
    onDropAccepted,
    onDropRejected: (rejections) =>
      showToast.warning("File not accepted", rejectionMessage(rejections)),
  });

  function reset() {
    setFile(null);
    setAgentPrompt("");
    setPhase({ kind: "idle" });
  }

  async function handleUpload() {
    if (!file) return;
    setPhase({ kind: "uploading", percent: 0 });
    try {
      const result = await onUpload(file, agentPrompt.trim(), (percent) =>
        setPhase({ kind: "uploading", percent }),
      );
      setPhase({
        kind: "uploaded",
        documentId: result.document.documentId,
        duplicate: result.duplicate,
      });
    } catch (err) {
      // the hook already showed a toast; keep the form so the user can try again
      setPhase({
        kind: "error",
        message: err instanceof Error ? err.message : "Upload failed",
      });
    }
  }

  // ---- after the upload: completed + live pipeline ---------------------------------
  if (phase.kind === "uploaded") {
    const doc = documents.find((d) => d.documentId === phase.documentId);
    return (
      <section
        className={`${theme.card} space-y-5 p-6`}
        aria-label="Upload status"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-green-700">
          <CheckCircle2 className="size-5" />
          {phase.duplicate
            ? "This file was already uploaded"
            : "Upload completed"}
          {doc && (
            <span className="truncate font-normal text-[#6b7280]">
              - {doc.name}
            </span>
          )}
        </div>

        {doc ? (
          <PipelineSteps
            steps={PIPELINE_STEP_LABELS}
            {...deriveStepper(doc)}
            onRetry={() => void onRetry(doc.documentId)}
            onClose={reset}
          />
        ) : (
          <p className="text-sm text-[#6b7280]">
            This document is no longer in your list.
          </p>
        )}

        {(!doc || doc.status !== "processing") && (
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-md border border-[#e5e7eb] px-3 py-1.5 text-sm text-[#171717] hover:bg-[#f5f5f5]"
          >
            <UploadCloud className="size-4" /> Upload another document
          </button>
        )}
      </section>
    );
  }

  // ---- while uploading ------------------------------------------------------------
  if (phase.kind === "uploading") {
    return (
      <section className={`${theme.card} space-y-4 p-6`} aria-live="polite">
        <div className="flex items-center gap-2 text-sm font-medium text-[#171717]">
          <Loader2 className="size-5 animate-spin text-[#3b6d11]" />
          Uploading {file?.name}…
          <span className="ml-auto tabular-nums text-[#6b7280]">
            {phase.percent}%
          </span>
        </div>
        <Progress
          value={phase.percent}
          className="h-2 bg-[#eaf2e1] [&>[data-slot=progress-indicator]]:bg-[#3b6d11]"
        />
      </section>
    );
  }

  // ---- the form -------------------------------------------------------------------
  return (
    <section className={`${theme.card} space-y-5 p-6`}>
      <div
        {...getRootProps({
          onClick: open,
          onKeyDown: (e) => (e.key === "Enter" || e.key === " ") && open(),
          role: "button",
          tabIndex: 0,
          "aria-label": "Choose a PDF to upload",
        })}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b6d11] ${
          isDragActive
            ? "border-gray-700 bg-[#e8eae6]"
            : "border-gray-700 hover:border-[#3b6d11] hover:bg-gray-100"
        }`}
      >
        <input {...getInputProps()} />
        <UploadCloud className="size-9 text-[#3b6d11]" />
        <p className="text-sm font-medium text-[#171717]">
          {isDragActive
            ? "Drop the file here"
            : "Drag & drop a PDF here, or click to browse"}
        </p>
        <p className="text-xs text-[#6b7280]">
          PDF only, up to {MAX_UPLOAD_MB} MB
        </p>
      </div>

      {file && (
        <div className="flex items-center gap-3 rounded-lg border border-[#e5e7eb] bg-[#fafafa] px-3 py-2">
          <FileText className="size-5 shrink-0 text-[#3b6d11]" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[#171717]">
              {file.name}
            </p>
            <p className="text-xs text-[#6b7280]">{formatBytes(file.size)}</p>
          </div>
          <button
            onClick={() => setFile(null)}
            aria-label="Remove file"
            className="rounded-full p-1 text-[#6b7280] hover:bg-[#f5f5f5] hover:text-red-600"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label
          htmlFor="agent-prompt"
          className="text-md font-medium text-[#171717] pl-2"
        >
          Agent prompt
        </label>
        <Textarea
          id="agent-prompt"
          value={agentPrompt}
          onChange={(e) => setAgentPrompt(e.target.value)}
          maxLength={MAX_PROMPT_CHARS}
          rows={4}
          placeholder="Describe this document for the agent. e.g. This is our 2025 supplier price list. Use it to answer questions about pricing and delivery terms."
          className="resize-y border-[#e5e7eb] bg-white text-[#171717] placeholder:text-[#6b7280]/70 focus-visible:border transition-all"
        />
        <p className="text-right text-xs text-[#6b7280]">
          {agentPrompt.length}/{MAX_PROMPT_CHARS}
        </p>
      </div>

      {phase.kind === "error" && (
        <p role="alert" className="text-sm text-red-600">
          {phase.message}
        </p>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => void handleUpload()}
          disabled={!file}
          className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${theme.primaryButton}`}
        >
          <UploadCloud className="size-4" /> Upload document
        </button>
      </div>
    </section>
  );
}
