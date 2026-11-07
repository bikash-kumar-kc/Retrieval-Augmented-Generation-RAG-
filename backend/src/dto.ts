import type{ DocumentRecord } from "./types/repository/documentRepository.types.js";


/** What the UI sees. Server-side paths and the dedup key never leave the API. */
export function toDocumentDto(d: DocumentRecord) {
  return {
    documentId: d.documentId,
    name: d.name,
    mimeType: d.mimeType,
    sizeBytes: d.sizeBytes,
    fileHash: d.fileHash,
    status: d.status,
    stage: d.stage,
    errorMessage: d.errorMessage,
    attempts: d.attempts,
    chunkCount: d.chunkCount,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}
