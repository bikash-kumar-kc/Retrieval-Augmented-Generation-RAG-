import { resolveLocation } from "./location-resolver.js";
import { buildEvidence, ChunkRef } from "./evidenceBuilder.js";
import { matchQuotes } from "./quote-matcher.js";
import {
  Deps,
  FinalCitation,
  RetrievedChunk,
} from "../../types/citation/citation.types.js";
import { ChunkMeta } from "../../types/citation/locationResolver.type.js";
import { IRelevantChunk } from "../../routes/conversation.route.js";

export class CitationService {
  constructor(private deps: Deps) {}

  async cite(
    question: string,
    chunks: {
      chunkId: string;
      documentId: string;
      chunk_text: string;
      page_number: number;
      meta_data: {
        page: number;
        pageStart: number;
        chunkStart: number;
        length: number;
      }[];
    }[],
    contextString: string,
    chunkMap: Record<
      string,
      ChunkRef & {
        chunk_text: string;
      }
    >,
  ): Promise<FinalCitation[]> {
    const included = Object.values(chunkMap);

    if (included.length === 0) return [];

    let quotes: string[] = [];

    try {
      quotes = await this.deps.extractQuoteInstance.exactQuote(
        question,
        contextString,
      ); // llm call to extract the exact quotes.
    } catch (err) {
      console.error("[Citation Exact quotes] citation extraction failed", err);
      return [];
    }

    const matches = matchQuotes(quotes, chunkMap);
   
    const byId = new Map(chunks.map((c) => [c.chunkId, c]));

    const out: FinalCitation[] = [];

    for (const [i, m] of matches.entries()) {
      const chunk = byId.get(m.chunkId)!;


      const meta = {
        segments: chunk.meta_data,
      };

      out.push({
        citationId: `cit_${i + 1}`,
        documentId: m.documentId,
        chunkId: m.chunkId,
        quote: m.quote,
        matchedText: m.matchedText,
        matchType: m.matchType,
        matchScore: m.matchScore,
        locations: resolveLocation(m, meta),
      });
    }

    console.log(out);
    return out;
  }
}
