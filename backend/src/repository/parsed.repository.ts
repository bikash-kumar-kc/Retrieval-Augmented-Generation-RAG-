import { eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";

import * as schema from "../clients/db/schema.js";
import { ParsedRepositoryContract } from "../interface/parsedRepository.interface.js";
import { ParsedDocument } from "../types/repository/parsedRepository.type.js";


export class ParsedRepository implements ParsedRepositoryContract {
  constructor(
    private readonly db: LibSQLDatabase<typeof schema>,
  ) {}

  /**
   * Upsert: re-running the parse stage overwrites the previous output.
   */
  async save(
    documentId: string,
    parsed: ParsedDocument,
  ): Promise<void> {
    await this.db
      .insert(schema.parsedDocuments)
      .values({
        documentId,
        parser: parsed.parser,
        sectionsJson: JSON.stringify(parsed.sections),
        metadataJson: JSON.stringify(parsed.metadata),
      })
      .onConflictDoUpdate({
        target: schema.parsedDocuments.documentId,
        set: {
          parser: parsed.parser,
          sectionsJson: JSON.stringify(parsed.sections),
          metadataJson: JSON.stringify(parsed.metadata),
        },
      });
  }

  async load(
    documentId: string,
  ): Promise<ParsedDocument | null> {
    const rows = await this.db
      .select({
        parser: schema.parsedDocuments.parser,
        sectionsJson: schema.parsedDocuments.sectionsJson,
        metadataJson: schema.parsedDocuments.metadataJson,
      })
      .from(schema.parsedDocuments)
      .where(eq(schema.parsedDocuments.documentId, documentId))
      .limit(1);

    const row = rows[0];

    if (!row) {
      return null;
    }

    return {
      parser: row.parser,
      sections: JSON.parse(row.sectionsJson) as ParsedDocument["sections"],
      metadata: JSON.parse(row.metadataJson) as Record<string, unknown>,
    };
  }
}