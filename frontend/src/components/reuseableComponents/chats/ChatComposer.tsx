import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowUp, Square } from "lucide-react";
import type { DocumentDto } from "../../../types/document";
import { DocumentPicker } from "./DocumentPicker";


export const MAX_QUERY_CHARS = 4000; // keep in sync with the API

interface Props {
  documents: DocumentDto[];
  documentsLoading: boolean;
  documentsError: string | null;
  selectedId: string | null;
  /** a document is chosen AND ready */
  canChat: boolean;
  isAnswering: boolean;
  onSelectDocument: (documentId: string) => void;
  onOpenPicker: () => void;
  onSend: (query: string) => Promise<boolean>;
  onStop: () => void;
}

export function ChatComposer({
  documents, documentsLoading, documentsError, selectedId, canChat, isAnswering, onSelectDocument, onOpenPicker, onSend, onStop,
}: Props) {
  const [text, setText] = useState("");
  const box = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  const canSend = canChat && !isAnswering && text.trim().length > 0;

  async function submit() {
    if (!canSend) return;
    const query = text;
    setText("");
    const accepted = await onSend(query);
    if (!accepted) setText(query); // e.g. an answer was still running: don't lose what was typed
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void submit();
    }
  }

  const placeholder = !selectedId
    ? "Choose a document with + to start chatting"
    : !canChat
      ? "This document isn't ready yet"
      : "Ask a question about this document…";

  return (
    <div className="border-t border-[#f1f1f1] p-3 bg-gray-100">
     <div className="flex min-w-0 items-end gap-2">
        <DocumentPicker
          documents={documents}
          isLoading={documentsLoading}
          error={documentsError}
          selectedId={selectedId}
          onSelect={onSelectDocument}
          onOpen={onOpenPicker}
        />
        <textarea
          ref={box}
          value={text}
          rows={1}
          maxLength={MAX_QUERY_CHARS}
          disabled={!canChat}
          aria-label="Message"
          placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
        className="max-h-40 min-h-9 min-w-0 flex-1 resize-none rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#171717] placeholder:text-[#6b7280]/70 focus-visible:outline-none focus-visible:border-none disabled:cursor-not-allowed disabled:bg-[#fafafa]"

        />
        {isAnswering ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop"
            title="Stop"
            className="flex size-9 shrink-0 items-center justify-center rounded-md border border-[#e5e7eb] text-[#171717] hover:bg-[#f5f5f5]"
          >
            <Square className="size-4 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!canSend}
            aria-label="Send"
            title="Send"
            className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#3b6d11] text-white transition-colors hover:bg-[#2f5a0d] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowUp className="size-5" />
          </button>
        )}
      </div>
    </div>
  );
}
