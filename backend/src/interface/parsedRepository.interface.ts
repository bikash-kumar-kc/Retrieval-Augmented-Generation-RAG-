import type { ParsedDocument } from "../types/repository/parsedRepository.type.js";

export interface ParsedRepositoryContract {
  /**
   * Upsert: re-running the parse stage overwrites the previous output.
   */
  save(documentId: string, parsed: ParsedDocument): Promise<void>;

  load(documentId: string): Promise<ParsedDocument | null>;
}
