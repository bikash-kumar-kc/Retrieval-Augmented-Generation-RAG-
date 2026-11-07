import { ParsedDocument } from "../types/repository/parsedRepository.type.js";

export interface ChunkDraft {
  index: number;
  text: string;
  metadata: Record<string, unknown>;
}

export interface Chunker {
  chunk(doc: ParsedDocument): Promise<ChunkDraft[]>;
}
