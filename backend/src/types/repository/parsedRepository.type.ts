// ---- parsing ---------------------------------------------------------------
export interface ParsedSection {
  text: string;
  /** e.g. { pageNumber: 3 } for PDFs; { heading: "Intro" } for a future DOCX parser */
  metadata: Record<string, unknown>;
}

export interface ParsedDocument {
  parser: string;
  sections: ParsedSection[];
  metadata: Record<string, unknown>;
}

export interface Parser {
  readonly name: string;
  readonly mimeTypes: readonly string[];
  readonly fileExtension: string;
  /** Cheap content check on the first bytes (the client-supplied mime type can lie). */
  sniff?(header: Buffer): boolean;
  parse(filePath: string): Promise<ParsedDocument>;
}