import { PDFParse } from "pdf-parse";
import { readFile } from "node:fs/promises";
import {
  ParsedDocument,
  Parser,
} from "../../types/repository/parsedRepository.type.js";
import { cleanText } from "../../utils/clean.js";

/** One section per page, so every chunk can carry its page number. */
export class PdfParser implements Parser {
  readonly name = "pdf-parse";
  readonly mimeTypes = ["application/pdf"] as const;
  readonly fileExtension = ".pdf";

  sniff(header: Buffer): boolean {
    return header.subarray(0, 5).toString("latin1") === "%PDF-";
  }

  async parse(filePath: string): Promise<ParsedDocument> {
    // improvement use read stream.
    const buffer = await readFile(filePath);
    const parser = new PDFParse({ data: buffer });

    try {
      const result = await parser.getText();

      const sections = result.pages
        .map((page, i) => ({
          text: cleanText(page.text),
          metadata: {
            pageNumber: i + 1,
          },
        }))
        .filter((s) => s.text.length > 0);

      return {
        parser: this.name,
        sections,
        metadata: {
          pageCount: result.pages.length,
        },
      };
    } finally {
      await parser.destroy();
    }
  }
}
