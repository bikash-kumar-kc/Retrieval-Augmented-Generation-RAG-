import axios from "axios";
import { api } from "./axios/axios.client";

const MAX_CACHED = 5;
const cache = new Map<string, Promise<Blob>>();

async function readError(err: unknown): Promise<Error> {
  if (axios.isAxiosError(err) && err.response?.data instanceof Blob) {
    try {
      const body = JSON.parse(await err.response.data.text()) as {
        errorMsg?: string;
      };
      if (body.errorMsg) return new Error(body.errorMsg);
    } catch {
    }
  }
  if (axios.isAxiosError(err) && err.code === "ERR_NETWORK")
    return new Error("Cannot reach the server");
  return err instanceof Error ? err : new Error("Could not load the file");
}


export function getDocumentFile(documentId: string): Promise<Blob> {
  const cached = cache.get(documentId);
  if (cached) return cached;

  const request = api
    .get<Blob>(`/api/documentDownload/${documentId}/file`, {
      responseType: "blob",
    })
    .then((res) => res.data)
    .catch(async (err: unknown) => {
      cache.delete(documentId); // never cache a failure
      throw await readError(err);
    });

  cache.set(documentId, request);

  if (cache.size > MAX_CACHED)
    cache.delete(cache.keys().next().value as string); // drop the oldest
  return request;
}

export function forgetDocumentFile(documentId: string): void {
  cache.delete(documentId);
}
