import { useCallback, useEffect } from "react";
import { Download, FileText } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useConversation } from "../hooks/useConversation";
import { useCitations } from "../hooks/useCitations";
import { useChatDocuments } from "../hooks/useChatDocument";
import { getDocumentFile } from "../api/documentFile";
import { saveBlob } from "../lib/download";
import { showToast } from "../components/reuseableComponents/Toast";
import { MessageList } from "../components/reuseableComponents/chats/MessageList";
import { ChatComposer } from "../components/reuseableComponents/chats/ChatComposer";
import { CitationPanel } from "../components/reuseableComponents/chats/CitationPanel";

const LAST_DOCUMENT_KEY = "genericRagChatDocument";

export default function ChatPage() {
  const [params, setParams] = useSearchParams();
  const {
    documents,
    isLoading: documentsLoading,
    error: documentsError,
    refresh,
  } = useChatDocuments();

  const selectedId = params.get("doc");
  const selected = documents.find((d) => d.documentId === selectedId) ?? null;
  const canChat = selected?.status === "ready";

  const conversation = useConversation(canChat ? selectedId : null);
  const citations = useCitations();
  console.log(citations.citation);
  const { reset: resetCitations } = citations;

  // no ?doc= in the URL: go back to the document used last time, if it is still there and ready
  useEffect(() => {
    if (selectedId || documentsLoading) return;
    const last = localStorage.getItem(LAST_DOCUMENT_KEY);
    if (
      last &&
      documents.some((d) => d.documentId === last && d.status === "ready")
    ) {
      setParams({ doc: last }, { replace: true });
    }
  }, [selectedId, documentsLoading, documents, setParams]);

  // another document: whatever citation was open belongs to the old conversation
  useEffect(() => {
    resetCitations();
  }, [selectedId, resetCitations]);

  const selectDocument = useCallback(
    (documentId: string) => {
      localStorage.setItem(LAST_DOCUMENT_KEY, documentId);
      setParams({ doc: documentId });
    },
    [setParams],
  );

  async function download() {
    if (!selected) return;
    try {
      saveBlob(await getDocumentFile(selected.documentId), selected.name);
    } catch (err) {
      showToast.error(
        "Download failed",
        err instanceof Error ? err.message : undefined,
      );
    }
  }

  const missing = selectedId !== null && !documentsLoading && selected === null;

  return (
    <div className="flex h-full min-h-0 overflow-hidden w-full min-w-0 gap-4">
      <section className="flex min-w-0 h-screen flex-1 flex-col overflow-auto rounded-md border border-[#e5e7eb] bg-white shadow-md">
        <header className="flex items-center gap-2 border-b border-[#f1f1f1] px-4 py-2.5 bg-gray-100">
          <FileText className="size-4 shrink-0 text-[#3b6d11]" />
          <h1
            className="min-w-0 flex-1 truncate text-sm font-semibold text-[#171717]"
            title={selected?.name}
          >
            {selected ? selected.name : "No document selected"}
          </h1>
          {selected && (
            <button
              type="button"
              onClick={() => void download()}
              aria-label="Download PDF"
              title="Download PDF"
              className="rounded-md p-1.5 text-[#6b7280] hover:bg-[#f5f5f5] hover:text-[#171717]"
            >
              <Download className="size-4" />
            </button>
          )}
        </header>

        {missing && (
          <p
            role="alert"
            className="border-b border-[#f1f1f1] bg-amber-50 px-4 py-2 text-sm text-amber-800"
          >
            That document no longer exists. Choose another one with the +
            button.
          </p>
        )}
        {selected && !canChat && (
          <p
            role="status"
            className="border-b border-[#f1f1f1] bg-amber-50 px-4 py-2 text-sm text-amber-800"
          >
            {selected.status === "failed"
              ? "This document failed to process, so it can't be used for chat. Retry it on the Documents page."
              : "This document is still being processed. You can chat as soon as it's ready."}
          </p>
        )}

        <MessageList
          messages={conversation.messages}
          hasDocument={canChat}
          documentName={selected?.name}
          isHistoryLoading={conversation.isHistoryLoading}
          historyError={conversation.historyError}
          onReloadHistory={conversation.reloadHistory}
          active={citations.active}
          onOpenCitation={citations.openCitation}
          onRetry={(id) => void conversation.retry(id)}
        />

        <ChatComposer
          documents={documents}
          documentsLoading={documentsLoading}
          documentsError={documentsError}
          selectedId={selectedId}
          canChat={canChat}
          isAnswering={conversation.isAnswering}
          onSelectDocument={selectDocument}
          onOpenPicker={() => void refresh()}
          onSend={conversation.send}
          onStop={conversation.stop}
        />
      </section>

      <CitationPanel
        isOpen={citations.isOpen}
        active={citations.active}
        citation={citations.citation}
        locationIndex={citations.locationIndex}
        onLocationChange={citations.setLocationIndex}
        onSelectCitation={citations.selectCitation}
        onToggle={citations.togglePanel}
      />
    </div>
  );
}
