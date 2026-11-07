import { rm } from "node:fs/promises";
import { DocumentRepositoryContract } from "../interface/documentRepository.interface.js";
import { ChunkRepositoryContract } from "../interface/chunckRepository.interface.js";
import {
  IntegratedEmbeddingStore,
  VectorStore,
} from "../interface/vectorStore.interface.js";
import { DocumentRecord } from "../types/repository/documentRepository.types.js";
import { AppError } from "../utils/error.js";
import { FileService } from "./fileHandling.js";

export class DocumentService {
  constructor(
    private readonly deps: {
      documents: DocumentRepositoryContract;
      chunks: ChunkRepositoryContract;
      vectorStore: VectorStore | IntegratedEmbeddingStore;
    },
  ) {}

  // remove the document.
  async remove(
    doc: DocumentRecord,
    fileHandlingInstance: FileService,
  ): Promise<void> {
    if (doc.status === "processing") {
      throw new AppError(
        409,
        "Document is still processing; try again when it finishes or fails",
        "still_processing",
      );
    }

    const ids = await this.deps.chunks.listIds(doc.documentId);

    if (ids.length)
      await this.deps.vectorStore.deleteByIds(
        doc.ownerId + doc.documentId,
        ids,
      );

    await this.deps.documents.deleteWithChildren(doc.documentId);

    await fileHandlingInstance.removeFile(doc.filePath);
  }
}
