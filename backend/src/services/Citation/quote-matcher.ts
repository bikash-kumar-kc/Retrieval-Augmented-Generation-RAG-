import { fuzzyMatch } from "./fuzzy-match.js";

type ChunkRef = {
  chunkId: string;
  documentId: string;
  page_number?: number;
  chunk_text: string;
};

type Citation = {
  chunkId: string;
  documentId: string;
  page?: number;
  quote: string;
  matchedText: string;
  startOffset: number;
  endOffset: number;
  matchType: "exact" | "normalized" | "fuzzy";
  matchScore: number;
};

function normalizeWithMap(text: string) {
  let norm = "";
  const map: number[] = [];
  let prevSpace = true;
  for (let i = 0; i < text.length; i++) {
    if (/\s/.test(text[i])) {
      if (prevSpace) continue;
      norm += " ";
      map.push(i);
      prevSpace = true;
    } else {
      norm += text[i].toLowerCase();
      map.push(i);
      prevSpace = false;
    }
  }
  return { norm, map };
}

export function matchQuotes(
  quotes: string[],
  chunkMap: Record<string, ChunkRef>,
): Citation[] {
  const citations: Citation[] = [];

  for (const quote of quotes) {
    let found: Citation | null = null;

    for (const chunk of Object.values(chunkMap)) {
      const exactIdx = chunk.chunk_text.indexOf(quote);
      if (exactIdx !== -1) {
        found = {
          chunkId: chunk.chunkId,
          documentId: chunk.documentId,
          page: chunk.page_number,
          quote,
          matchedText: quote,
          startOffset: exactIdx,
          endOffset: exactIdx + quote.length,
          matchType: "exact",
          matchScore: 1,
        };
        break;
      }

      const { norm, map } = normalizeWithMap(chunk.chunk_text);
      const q = normalizeWithMap(quote).norm.trimEnd();
      const idx = q ? norm.indexOf(q) : -1;
      if (idx !== -1) {
        const start = map[idx];
        const end = map[idx + q.length - 1] + 1;
        found = {
          chunkId: chunk.chunkId,
          documentId: chunk.documentId,
          page: chunk.page_number,
          quote,
          matchedText: chunk.chunk_text.slice(start, end),
          startOffset: start,
          endOffset: end,
          matchType: "normalized",
          matchScore: 1,
        };
        break;
      }

      if (!found) {
        let bestScore = 0;
        for (const chunk of Object.values(chunkMap)) {
          const r = fuzzyMatch(quote, chunk.chunk_text);
          if (r && r.score > bestScore) {
            bestScore = r.score;
            found = {
              chunkId: chunk.chunkId,
              documentId: chunk.documentId,
              page: chunk.page_number,
              quote,
              matchedText: chunk.chunk_text.slice(r.start, r.end),
              startOffset: r.start,
              endOffset: r.end,
              matchType: "fuzzy",
              matchScore: r.score,
            };
          }
        }
      }
    }

    if (found) citations.push(found);
  }

  return citations;
}
