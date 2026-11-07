import { PageLocation } from "../../types/citation/locationResolver.type.js";

export function resolveLocation(
  citation: { matchedText: string; startOffset: number; endOffset: number },
  meta: { segments: { page: number; chunkStart: number; length: number }[] },
): PageLocation[] {
  const out: PageLocation[] = [];
  for (const seg of meta.segments) {
    const s = Math.max(citation.startOffset, seg.chunkStart);
    const e = Math.min(citation.endOffset, seg.chunkStart + seg.length);
    if (s >= e) continue;
    out.push({
      page: seg.page,
      text: citation.matchedText.slice(
        s - citation.startOffset,
        e - citation.startOffset,
      ),
    });
  }
  return out;
}
