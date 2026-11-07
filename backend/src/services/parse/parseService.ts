import { Parser } from "../../types/repository/parsedRepository.type.js";
import { NonRetryableError } from "../../utils/error.js";


/** Picks a parser by mime type. Add DOCX/HTML/etc. later by registering another Parser. */

export class ParserRegistry {
  private readonly byMime = new Map<string, Parser>();

  // register parser.
  register(parser: Parser): this {
    for (const mime of parser.mimeTypes) this.byMime.set(mime.toLowerCase(), parser);
    return this;
  }

  // check whether the document is supported.
  supports(mimeType: string): boolean {
    return this.byMime.has(mimeType.toLowerCase());
  }

  
  supportedMimeTypes(): string[] {
    return [...this.byMime.keys()];
  }

  resolve(mimeType: string): Parser {
    const parser = this.byMime.get(mimeType.toLowerCase());
    if (!parser) throw new NonRetryableError(`Unsupported document type: ${mimeType}`);
    return parser;
  }
}
