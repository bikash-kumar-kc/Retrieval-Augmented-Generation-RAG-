import { useCallback, useEffect, useState } from "react";
import { getDocumentFile } from "../api/documentFile";

export function useDocumentFile(documentId: string | null) {
  const [file, setFile] = useState<Blob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setFile(null);
    setError(null);
    if (!documentId) return;
    let current = true;
    setIsLoading(true);
    getDocumentFile(documentId)
      .then((blob) => {
        console.log(blob)
        if(current) setFile(blob)
      })
      .catch((err: unknown) => current && setError(err instanceof Error ? err.message : "Could not load the file"))
      .finally(() => current && setIsLoading(false));
    return () => {
      current = false;
    };
  }, [documentId, attempt]);

  const reload = useCallback(() => setAttempt((a) => a + 1), []);
  return { file, isLoading, error, reload };
}
