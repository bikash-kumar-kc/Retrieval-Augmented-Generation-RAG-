import { useEffect, useState } from "react";
import { FileText, Loader2, RefreshCw } from "lucide-react";
import type { DocumentRow, LocalUpload } from "../../../types/document";
import { GenericDropdown, type GenericDropdownAction } from "./GenericDropDown";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
import { Skeleton } from "../../ui/skeleton";
import { ProcessingBadge, UploadStatusBadge } from "./StatusBadges";
import { relativeTime, shortId } from "../../../lib/format";
import { processingState } from "../../../lib/pipeline";
import { theme } from "../../../lib/theme";
import { ConfirmDialog } from "./ConfirmDialog";

interface Props {
  documents: DocumentRow[];
  uploads: LocalUpload[];
  isLoading: boolean;
  loadError: string | null;
  busyIds: ReadonlySet<string>;
  onRetry: (documentId: string) => void | Promise<void>;
  onDelete: (documentId: string) => void | Promise<void>;
  onReload: () => void;
}

/** re-render every `ms` so "2 minutes ago" keeps moving */
function useNow(ms = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

const th = "h-11 px-4 text-[15px] font-semibold  tracking-wide text-[#6b7280]";
const td = "px-4 py-3.5";

export function DocumentsTable({
  documents,
  uploads,
  isLoading,
  loadError,
  busyIds,
  onRetry,
  onDelete,
  onReload,
}: Props) {
  const now = useNow();
  const [pending, setPending] =
    useState<GenericDropdownAction<DocumentRow> | null>(null);

  function actionsFor(doc: DocumentRow): GenericDropdownAction<DocumentRow>[] {
    const remove: GenericDropdownAction<DocumentRow> = {
      actionName: "Delete",
      variant: "destructive",
      confirmMessage: `Delete "${doc.name}"? Its chunks and vectors will be removed too.`,
      method: () => onDelete(doc.documentId),
      data: doc,
    };
    if (doc.status === "failed") {
      return [
        {
          actionName: "Retry",
          method: () => onRetry(doc.documentId),
          data: doc,
        },
        remove,
      ];
    }
    if (doc.status === "ready") return [remove];
    return [];
  }

  const isEmpty =
    !isLoading && !loadError && documents.length === 0 && uploads.length === 0;

  {
    isEmpty && (
      <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
        <FileText className="size-8 text-[#3b6d11]" />
        <p className="text-sm font-medium text-[#171717]">No documents yet</p>
        <p className="text-sm text-[#6b7280]">
          Upload your first document below to get started.
        </p>
      </div>
    );
  }

  return (
    <div>
      {!isEmpty && (
        <div className={`${theme.card} overflow-hidden`}>
          <Table className="rounded-md">
            <TableHeader>
              <TableRow className="border-[#e5e7eb] bg-[#fafafa] hover:bg-[#fafafa] ">
                <TableHead className={th}>Document ID</TableHead>
                <TableHead className={th}>Name</TableHead>
                <TableHead className={th}>Status</TableHead>
                <TableHead className={th}>Processing</TableHead>
                <TableHead className={th}>Created</TableHead>
                <TableHead className={`${th} w-16 text-right`}>
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i} className="border-[#f1f1f1]">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={j} className={td}>
                        <Skeleton className="h-5 w-full max-w-32 bg-[#eaf2e1]" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {/* files still travelling to the server */}
              {uploads.map((u) => (
                <TableRow
                  key={u.localId}
                  className="border-[#f1f1f1] hover:bg-[#f5f5f5]"
                >
                  <TableCell
                    className={`${td} font-mono text-xs text-[#6b7280]`}
                  >
                    -
                  </TableCell>
                  <TableCell className={`${td} font-medium text-[#171717]`}>
                    {u.name}
                  </TableCell>
                  <TableCell className={td}>
                    <UploadStatusBadge state="uploading" percent={u.percent} />
                  </TableCell>
                  <TableCell className={`${td} text-sm text-[#6b7280]`}>
                    Waiting for upload
                  </TableCell>
                  <TableCell className={`${td} text-sm`}>
                    {relativeTime(u.startedAt, now)}
                  </TableCell>
                  <TableCell className={`${td} text-right`} />
                </TableRow>
              ))}

              {documents.map((doc) => {
                const actions = actionsFor(doc);
                const busy = busyIds.has(doc.documentId);
                return (
                  <TableRow
                    key={doc.documentId}
                    className="border-[#f1f1f1] hover:bg-[#f5f5f5]"
                  >
                    <TableCell
                      className={`${td} font-mono text-xs text-[#6b7280]`}
                      title={doc.documentId}
                    >
                      {shortId(doc.documentId)}
                    </TableCell>
                    <TableCell
                      className={`${td} max-w-64 font-medium text-[#171717]`}
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="size-4 shrink-0 text-[#3b6d11]" />
                        <span className="truncate" title={doc.name}>
                          {doc.name}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className={td}>
                      <UploadStatusBadge state="uploaded" />
                    </TableCell>
                    <TableCell className={td}>
                      <ProcessingBadge
                        state={processingState(doc)}
                        errorMessage={doc.errorMessage}
                      />
                    </TableCell>
                    <TableCell className={`${td} whitespace-nowrap text-sm`}>
                      {relativeTime(doc.createdAt, now)}
                    </TableCell>
                    <TableCell className={`${td} text-right`}>
                      {busy ? (
                        <Loader2
                          className="ml-auto size-4 animate-spin text-[#6b7280]"
                          aria-label="Working"
                        />
                      ) : actions.length > 0 ? (
                        <GenericDropdown
                          actions={actions}
                          onConfirm={setPending}
                        />
                      ) : (
                        <span className="text-[#6b7280]">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {loadError && (
            <div
              className="flex flex-col items-center gap-3 px-4 py-10 text-center"
              role="alert"
            >
              <p className="text-sm text-red-600">{loadError}</p>
              <button
                onClick={onReload}
                className="inline-flex items-center gap-2 rounded-md border border-[#e5e7eb] px-3 py-1.5 text-sm text-[#171717] hover:bg-[#f5f5f5]"
              >
                <RefreshCw className="size-4" /> Try again
              </button>
            </div>
          )}

          <ConfirmDialog
            open={pending !== null}
            title={
              pending?.actionName
                ? `${pending.actionName} document ?`
                : "Are you sure?"
            }
            description={pending?.confirmMessage ?? ""}
            confirmLabel={pending?.actionName ?? "Confirm"}
            destructive={pending?.variant === "destructive"}
            onCancel={() => setPending(null)}
            onConfirm={() => {
              const action = pending;
              setPending(null);
              if (action) void action.method();
            }}
          />
        </div>
      )}
      {isEmpty && (
        <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
          <FileText className="size-8 text-[#3b6d11]" />
          <p className="text-sm font-medium text-[#171717]">No documents yet</p>
          <p className="text-sm text-[#6b7280]">
            Upload your first document below to get started.
          </p>
        </div>
      )}
    </div>
  );
}
