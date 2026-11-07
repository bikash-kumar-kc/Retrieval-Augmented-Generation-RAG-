import { DocumentsTable } from "../components/reuseableComponents/documents/DocumentsTable";
import { DocumentUploader } from "../components/reuseableComponents/documents/DocumentUploader";
import { useDocumentHook } from "../hooks/useDocumentHook";


export default function DocumentsPage() {
  const docs = useDocumentHook();

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-[#171717]">Manage your documents</h1>
        <p className="mt-1 text-sm text-[#6b7280]">
          Upload documents and follow them through parsing, chunking and embedding.
        </p>
        {docs.sseStatus === "closed" && (
          <p className="mt-2 text-xs text-amber-700" role="status">
            Live updates are unavailable, so this list refreshes every few seconds.
          </p>
        )}
      </header>

      <DocumentsTable
        documents={docs.documents}
        uploads={docs.uploads}
        isLoading={docs.isLoading}
        loadError={docs.loadError}
        busyIds={docs.busyIds}
        onRetry={docs.retryDocument}
        onDelete={docs.deleteDocument}
        onReload={docs.refresh}
      />

      <DocumentUploader documents={docs.documents} onUpload={docs.uploadDocument} onRetry={docs.retryDocument} />
    </div>
  );
}
