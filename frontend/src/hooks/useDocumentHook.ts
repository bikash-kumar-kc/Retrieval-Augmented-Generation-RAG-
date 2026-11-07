import { useCallback, useEffect, useRef, useState } from "react";
import type {
  DocumentDto,
  DocumentRow,
  LocalUpload,
  PipelineEvent,
  UploadResponse,
} from "../types/document";
import { documentsApi } from "../api/documents.api";
import { applyPipelineEvent, mergeDto } from "../lib/pipeline";
import { getErrorMessage } from "../api/axios/axios.client";
import { useServerSideEvents } from "./useServerSideEventHook";
import { showToast } from "../components/reuseableComponents/Toast";

export const MAX_STREAMS = 4;

function upsertDoc(list: DocumentRow[], dto: DocumentDto): DocumentRow[] {
  const existing = list.find((d) => d.documentId === dto.documentId);
  const next = mergeDto(existing, dto);
  return existing
    ? list.map((d) => (d.documentId === dto.documentId ? next : d))
    : [next, ...list];
}

export function useDocumentHook() {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [uploads, setUploads] = useState<LocalUpload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(new Set());

  const documentsRef = useRef<DocumentRow[]>([]);
  useEffect(() => {
    documentsRef.current = documents;
  }, [documents]);

  const seq = useRef(0);

  const refresh = useCallback(async () => {
    const startedAt = seq.current;
    try {
      const dtos = await documentsApi.list();
      if (seq.current !== startedAt) return; // fresher data arrived while the request was in flight
      setDocuments((prev) =>
        dtos.map((dto) =>
          mergeDto(
            prev.find((p) => p.documentId === dto.documentId),
            dto,
          ),
        ),
      );
      setLoadError(null);
    } catch (err) {
      setLoadError(getErrorMessage(err, "Could not load documents"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const processingIds = documents
    .filter((d) => d.status === "processing")
    .map((d) => d.documentId);
  const hasProcessing = processingIds.length > 0;

  const sseStatus = useServerSideEvents({
    documentIds: processingIds.slice(0, MAX_STREAMS),
    onSnapshot: (dto) => {
      seq.current++;
      setDocuments((prev) => upsertDoc(prev, dto));
    },
    onPipelineEvent: (event: PipelineEvent) => {
      if (
        !documentsRef.current.some((d) => d.documentId === event.documentId)
      ) {
        void refresh();
        return;
      }
      seq.current++;
      setDocuments((prev) =>
        prev.map((d) =>
          d.documentId === event.documentId ? applyPipelineEvent(d, event) : d,
        ),
      );
    },
  });

  // if server side events is blocked.
  useEffect(() => {
    if (sseStatus !== "closed" || !hasProcessing) return;
    const id = setInterval(() => void refresh(), 4000);
    return () => clearInterval(id);
  }, [sseStatus, hasProcessing, refresh]);

  const setBusy = (id: string, busy: boolean) =>
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });

  const uploadDocument = useCallback(
    async (
      file: File,
      agentPrompt: string,
      onProgress?: (percent: number) => void,
    ): Promise<UploadResponse> => {
      const localId = crypto.randomUUID();
      setUploads((u) => [
        {
          localId,
          name: file.name,
          percent: 0,
          startedAt: new Date().toISOString(),
        },
        ...u,
      ]);
      try {
        const result = await documentsApi.upload(
          file,
          agentPrompt,
          (percent) => {
            setUploads((u) =>
              u.map((x) => (x.localId === localId ? { ...x, percent } : x)),
            );
            onProgress?.(percent);
          },
        );
        seq.current++;
        setDocuments((prev) => upsertDoc(prev, result.document));
        if (result.duplicate)
          showToast.info(
            "Already uploaded",
            `${file.name} is already in your documents.`,
          );
        else
          showToast.success(
            "Upload completed",
            `${file.name} is now being processed.`,
          );
        return result;
      } catch (err) {
        showToast.error("Upload failed", getErrorMessage(err));
        throw err;
      } finally {
        setUploads((u) => u.filter((x) => x.localId !== localId));
      }
    },
    [],
  );

  const retryDocument = useCallback(
    async (documentId: string) => {
      setBusy(documentId, true);
      seq.current++;
      setDocuments((prev) =>
        prev.map((d) =>
          d.documentId === documentId
            ? {
                ...d,
                status: "processing",
                errorMessage: null,
                retrying: false,
              }
            : d,
        ),
      );
      try {
        const dto = await documentsApi.retry(documentId);
        seq.current++;
        setDocuments((prev) => upsertDoc(prev, dto));
        showToast.info(
          "Retry started",
          "Resuming from the last completed step.",
        );
      } catch (err) {
        showToast.error("Retry failed", getErrorMessage(err));
        void refresh(); // put the row back to what the server says
      } finally {
        setBusy(documentId, false);
      }
    },
    [refresh],
  );

  const deleteDocument = useCallback(async (documentId: string) => {
    setBusy(documentId, true);
    try {
      await documentsApi.remove(documentId);
      seq.current++;
      setDocuments((prev) => prev.filter((d) => d.documentId !== documentId));
      showToast.success("Document deleted");
    } catch (err) {
      showToast.error("Delete failed", getErrorMessage(err));
    } finally {
      setBusy(documentId, false);
    }
  }, []);

  return {
    documents,
    uploads,
    isLoading,
    loadError,
    busyIds,
    sseStatus,
    refresh,
    uploadDocument,
    retryDocument,
    deleteDocument,
  };
}
