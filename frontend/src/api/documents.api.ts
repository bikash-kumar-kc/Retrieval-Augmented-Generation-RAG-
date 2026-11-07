import type { DocumentDto, UploadResponse } from "../types/document";
import { api } from "./axios/axios.client";


export const documentsApi = {
  async list(): Promise<DocumentDto[]> {
    const { data } = await api.get<{ documents: DocumentDto[] }>("/api/documents", { params: { limit: 10 } });
    return data.documents;
  },

  async upload(
    file: File,
    agentPrompt: string,
    onProgress: (percent: number) => void,
    signal?: AbortSignal,
  ): Promise<UploadResponse> {
    const form = new FormData();
    form.append("agentPrompt", agentPrompt);
    form.append("file", file);
    const { data } = await api.post<UploadResponse>("/api/documents", form, {
      signal,
      onUploadProgress: (e) => {
        if (e.total) onProgress(Math.min(100, Math.round((e.loaded * 100) / e.total)));
      },
    });
    return data;
  },

  async retry(documentId: string): Promise<DocumentDto> {
    const { data } = await api.post<{ document: DocumentDto }>(`/api/documents/${documentId}/retry`);
    return data.document;
  },

  async remove(documentId: string): Promise<void> {
    await api.delete(`/api/documents/${documentId}`);
  },
};
