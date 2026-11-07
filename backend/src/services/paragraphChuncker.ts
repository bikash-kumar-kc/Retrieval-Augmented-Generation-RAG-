import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { ChunkDraft, Chunker } from "../interface/chuncker.interface.js";
import { ParsedDocument } from "../types/repository/parsedRepository.type.js";
import { chunkWithLocations } from "../utils/chunk-with-location.js";

export interface ParagraphChunkerOptions {
  /** Max characters per chunk (~4 chars per token; 1500 chars is roughly 375 tokens). */
  chunkSize: number;
  chunkOverlap: number;
}

/**
 * Splits on paragraph breaks first ("\n\n"), then lines, then sentences, then words,
 * so chunks stay under chunkSize without cutting mid-sentence when avoidable.
 * Each parsed section (a PDF page) is split on its own, so page numbers stay accurate.
 */
export class ParagraphChunker implements Chunker {
  private readonly splitter: RecursiveCharacterTextSplitter;

  constructor(opts: ParagraphChunkerOptions) {
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: opts.chunkSize,
      chunkOverlap: opts.chunkOverlap,
      separators: ["\n\n", "\n", ". ", " ", ""],
    });
  }

  // async chunk(doc: ParsedDocument): Promise<ChunkDraft[]> {
  //   const drafts: ChunkDraft[] = [];
  //   // sectionIndex is a paragraph for the parsed document.
  //   for (const [sectionIndex, section] of doc.sections.entries()) {
  //     const pieces = await this.splitter.splitText(section.text);
  //     console.log(sectionIndex)
  //     console.log(section)
  //     console.log(pieces);
  //     for (const piece of pieces) {
  //       const text = piece.trim();
  //       if (!text) continue;
  //       drafts.push({
  //         index: drafts.length,
  //         text,
  //         metadata: { ...section.metadata, sectionIndex },
  //       });
  //     }
  //   }
  //   return drafts;
  // }

  async chunk(doc: ParsedDocument): Promise<ChunkDraft[]> {
    const drafts: ChunkDraft[] = [];

    // sectionIndex is a paragraph for the parsed document.
    for (const [sectionIndex, section] of doc.sections.entries()) {
      const page = section.metadata?.pageNumber as number;

      if (page == null) {
        console.warn(`Section ${sectionIndex} has no page number`);
        continue;
      }

      const located = await chunkWithLocations(
        page,
        section.text,
        this.splitter,
      );

      for (const piece of located) {
        console.log(piece);
        const text = piece.text.trim();

        if (!text) continue;

        drafts.push({
          index: drafts.length,
          text,
          metadata: {
            ...section.metadata,
            sectionIndex,
            locations: piece.segments,
          },
        });
      }
    }

    return drafts;
  }
}
