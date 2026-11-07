import { DocumentRecord } from "../repository/documentRepository.types.js";

export interface IncomingFile {
  ownerId: string;
  tmpPath: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  agentPrompt:string;
}

export interface UploadResult {
  document: DocumentRecord;
  duplicate: boolean;
}