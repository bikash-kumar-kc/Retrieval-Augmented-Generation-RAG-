import { useCallback, useEffect, useState } from "react";
import type { DocumentDto } from "../types/document";
import { documentsApi } from "../api/documents.api";
import { getErrorMessage } from "../api/axios/axios.client";

export function useChatDocuments() {
  const [documents, setDocuments] = useState<DocumentDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setDocuments(await documentsApi.list());
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load documents"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { documents, isLoading, error, refresh };
}
