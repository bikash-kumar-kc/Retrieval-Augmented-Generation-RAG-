import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Badge } from "../../ui/badge";
import type { ProcessingState } from "../../../lib/pipeline";

const base = "gap-1.5 rounded-full border px-2.5 py-3 text-xs font-medium";
const amber = `${base} border-amber-200 bg-amber-50 text-amber-700`;
const green = `${base} border-green-200 bg-green-50 text-green-700`;
const red = `${base} border-red-200 bg-red-50 text-red-700`;

/** "Status" column: is the FILE on the server yet? */
export function UploadStatusBadge({ state, percent }: { state: "uploading" | "uploaded"; percent?: number }) {
  if (state === "uploading") {
    return (
      <Badge variant="outline" className={amber}>
        <Loader2 className="size-3 animate-spin" />
        Uploading{percent !== undefined ? ` ${percent}%` : ""}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={green}>
      <CheckCircle2 className="size-3" />
      Uploaded
    </Badge>
  );
}

/** "Processing" column: where is the document in the pipeline? */
export function ProcessingBadge({ state, errorMessage }: { state: ProcessingState; errorMessage?: string | null }) {
  if (state.kind === "completed") {
    return (
      <Badge variant="outline" className={green}>
        <CheckCircle2 className="size-3" />
        Completed
      </Badge>
    );
  }
  if (state.kind === "failed") {
    return (
      <Badge variant="outline" className={red} title={errorMessage ?? undefined}>
        <XCircle className="size-3" />
        Failed
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={amber}>
      <Loader2 className="size-3 animate-spin" />
      {state.label}
      {state.detail ? <span className="font-normal opacity-80">{state.detail}</span> : null}
    </Badge>
  );
}
