import { useEffect, useRef } from "react";
import { Loader2, MessageSquare, RefreshCw } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import type { ChatMessage } from "../../../types/conversation";
import type { ActiveCitation } from "../../../hooks/useCitations";

interface Props {
  messages: ChatMessage[];
  hasDocument: boolean;
  documentName?: string | undefined;
  isHistoryLoading: boolean;
  historyError: string | null;
  onReloadHistory: () => void;
  active: ActiveCitation | null;
  onOpenCitation: (
    messageId: string,
    citations: ChatMessage["citations"],
    index: number,
  ) => void;
  onRetry: (messageId: string) => void;
}

export function MessageList({
  messages,
  hasDocument,
  documentName,
  isHistoryLoading,
  historyError,
  onReloadHistory,
  active,
  onOpenCitation,
  onRetry,
}: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  useEffect(() => {
    if (stickToBottom.current) end.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  return (
    <div
      ref={scroller}
      onScroll={(e) => {
        const el = e.currentTarget;
        stickToBottom.current =
          el.scrollHeight - el.scrollTop - el.clientHeight < 120;
      }}
      className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-4 py-5"
    >
      {!hasDocument && (
        <Empty title="Pick a document to chat with">
          Use the <b>+</b> button next to the message box to choose one of your
          documents.
        </Empty>
      )}

      {hasDocument && isHistoryLoading && (
        <p
          role="status"
          className="flex items-center justify-center gap-2 py-10 text-sm text-[#6b7280]"
        >
          <Loader2 className="size-4 animate-spin" /> Loading the conversation…
        </p>
      )}

      {hasDocument && historyError && (
        <div
          role="alert"
          className="flex flex-col items-center gap-3 py-10 text-center"
        >
          <p className="text-sm text-red-600">{historyError}</p>
          <button
            onClick={onReloadHistory}
            className="inline-flex items-center gap-2 rounded-md border border-[#e5e7eb] px-3 py-1.5 text-sm text-[#171717] hover:bg-[#f5f5f5]"
          >
            <RefreshCw className="size-4" /> Try again
          </button>
        </div>
      )}

      {hasDocument &&
        !isHistoryLoading &&
        !historyError &&
        messages.length === 0 && (
          <Empty
            title={`Ask a question about ${documentName ?? "this document"}`}
          >
            Answers come with numbered sources you can open to see the exact
            passage in the PDF.
          </Empty>
        )}

      {messages.map((m) => (
        <MessageBubble
          key={m.id}
          message={m}
          activeCitationIndex={active?.messageId === m.id ? active.index : null}
          onOpenCitation={(index) => onOpenCitation(m.id, m.citations, index)}
          onRetry={() => onRetry(m.id)}
        />
      ))}
      <div ref={end} />
    </div>
  );
}

function Empty({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="m-auto flex max-w-sm flex-col items-center gap-2 py-10 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-[#eaf2e1] text-[#3b6d11]">
        <MessageSquare className="size-5" />
      </div>
      <p className="text-sm font-medium text-[#171717]">{title}</p>
      <p className="text-sm text-[#6b7280]">{children}</p>
    </div>
  );
}
