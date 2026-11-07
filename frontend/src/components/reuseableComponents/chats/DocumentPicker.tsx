import { Check, FileText, Loader2, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import type { DocumentDto } from "../../../types/document";

interface Props {
  documents: DocumentDto[];
  isLoading: boolean;
  error: string | null;
  selectedId: string | null;
  onSelect: (documentId: string) => void;
  onOpen: () => void;
  disabled?: boolean;
}
export function DocumentPicker({
  documents,
  isLoading,
  error,
  selectedId,
  onSelect,
  onOpen,
  disabled,
}: Props) {
  const sorted = [...documents].sort(
    (a, b) => Number(b.status === "ready") - Number(a.status === "ready"),
  );

  return (
    <DropdownMenu onOpenChange={(open) => open && onOpen()}>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          type="button"
          aria-label="Choose a document"
          title="Choose a document"
          className="flex size-9 shrink-0 items-center justify-center rounded-md border border-[#e5e7eb] text-black transition-colors hover:bg-[#eaf2e1] focus-visible:outline-none  disabled:opacity-50 bg-white"
        >
          <Plus className="size-5" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="top"
        align="start"
        className="max-h-80 w-72 overflow-hidden border-[#e5e7eb] bg-[#F5F5F5] text-[#171717] shadow-md"
      >
        <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wide text-black text-center">
          Chat with a document
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-[#f1f1f1]" />

        {isLoading && documents.length === 0 && (
          <p
            role="status"
            className="flex items-center gap-2 px-2 py-3 text-sm text-[#6b7280]"
          >
            <Loader2 className="size-4 animate-spin" /> Loading documents…
          </p>
        )}
        {error && (
          <p role="alert" className="px-2 py-3 text-sm text-red-600">
            {error}
          </p>
        )}
        {!isLoading && !error && documents.length === 0 && (
          <p className="px-2 py-3 text-sm text-[#6b7280]">
            No documents yet. Upload one on the Documents page.
          </p>
        )}

        {sorted.map((doc) => {
          const ready = doc.status === "ready";
          return (
            <DropdownMenuItem
              key={doc.documentId}
              disabled={!ready}
              onSelect={() => onSelect(doc.documentId)}
              className="gap-2  bg-white focus:text-[black] focus:bg-gray-50 transition-all"
            >
              <FileText className="size-4 shrink-0 text-[#3b6d11]" />
              <span className="flex-1 truncate" title={doc.name}>
                {doc.name}
              </span>
              {!ready && (
                <span className="text-xs text-[#6b7280]">
                  {doc.status === "failed" ? "Failed" : "Processing"}
                </span>
              )}
              {doc.documentId === selectedId && (
                <Check
                  className="size-4 text-[#73ff00]"
                  aria-label="Selected"
                />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
