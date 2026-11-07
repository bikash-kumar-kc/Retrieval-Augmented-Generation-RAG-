import { AlertCircle, Loader2, RotateCcw } from "lucide-react";
import type { ChatMessage } from "../../../types/conversation";
import { TypingIndicator } from "./TypingIndicator";
import { CitationChips } from "./CitationChip";

interface Props {
  message: ChatMessage;
  activeCitationIndex: number | null;
  onOpenCitation: (index: number) => void;
  onRetry: () => void;
}

export function MessageBubble({
  message,
  activeCitationIndex,
  onOpenCitation,
  onRetry,
}: Props) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap wrap-break-word rounded-md shadow-sm hover:shadow-md rounded-br-sm bg-[#e3e1e1] px-4 py-2.5 text-sm text-black transition-all">
          {message.content}
        </p>
      </div>
    );
  }

  const waitingForAnswer =
    message.status === "streaming" &&
    message.content === "" &&
    message.citations.length === 0;
  const waitingForSources =
    message.status === "streaming" &&
    message.content !== "" &&
    message.citations.length === 0;

  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] rounded-md shadow-sm hover:shadow-md rounded-bl-sm border border-[#e5e7eb] bg-gray-100 px-4 py-3 text-sm text-[#171717]">
        {waitingForAnswer && <TypingIndicator />}

        {message.content !== "" && (
          <p className="whitespace-pre-wrap wrap-break-word leading-relaxed">
            {message.content}
          </p>
        )}

        {message.status === "error" && (
          <div role="alert" className="mt-1 flex flex-col gap-2 text-red-600">
            <p className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {message.errorMessage ?? "Something went wrong."}
            </p>
            <button
              onClick={onRetry}
              className="inline-flex w-fit items-center gap-1.5 rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium hover:bg-red-50"
            >
              <RotateCcw className="size-3.5" /> Try again
            </button>
          </div>
        )}

        <CitationChips
          citations={message.citations}
          activeIndex={activeCitationIndex}
          onOpen={onOpenCitation}
        />

        {waitingForSources && (
          <p
            role="status"
            className="mt-3 flex items-center gap-1.5 text-xs text-[#6b7280]"
          >
            <Loader2 className="size-3 animate-spin" /> Finding sources…
          </p>
        )}
      </div>
    </div>
  );
}
