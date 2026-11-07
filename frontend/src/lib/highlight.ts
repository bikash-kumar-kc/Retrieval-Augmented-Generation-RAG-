/**
 * Finds where a quote sits in the text items pdf.js produced for ONE page, so the matching
 * pieces can be highlighted. Three attempts, cheapest first:
 *   1. exact substring after normalisation (case, punctuation and whitespace ignored)
 *   2. approximate substring search (edit distance), which survives hyphenation, ligatures,
 *      OCR slips and small differences between the backend's text extraction and pdf.js
 */

export interface HighlightMatch {
  /** indexes into the page's text items */
  itemIndexes: Set<number>;
  kind: "exact" | "fuzzy" | "none";
  /** edit distance / quote length: 0 = identical, lower is better */
  distanceRatio: number;
}

const WORD_CHAR = /[\p{L}\p{N}]/u;
const MAX_PATTERN = 400; // bounds the cost of the approximate search
const MIN_QUOTE = 6;
const MAX_DISTANCE_RATIO = 0.3;

/** lower-case letters and digits; every run of anything else becomes ONE space */
export function normalizeText(input: string): string {
  return normalizeParts([input]).text;
}

function normalizeParts(parts: string[]): { text: string; itemOf: number[] } {
  let text = "";
  const itemOf: number[] = []; // itemOf[i] = which part produced text[i]
  let lastWasSpace = true; // no leading space

  parts.forEach((part, partIndex) => {
    for (const ch of part) {
      if (WORD_CHAR.test(ch)) {
        const lower = ch.toLowerCase();
        text += lower;
        for (let k = 0; k < lower.length; k++) itemOf.push(partIndex);
        lastWasSpace = false;
      } else if (!lastWasSpace) {
        text += " ";
        itemOf.push(partIndex);
        lastWasSpace = true;
      }
    }
    // pdf.js splits words and lines into separate items: an item boundary counts as a space
    if (!lastWasSpace) {
      text += " ";
      itemOf.push(partIndex);
      lastWasSpace = true;
    }
  });
  return { text, itemOf };
}

/** Sellers' algorithm: the substring of `text` closest to `pattern` by edit distance. */
function approximateFind(text: string, pattern: string): { start: number; end: number; distance: number } {
  const forward = bestEnd(text, pattern);
  // run again on the reversed strings, over the part before the end, to find where the match starts
  const reversedPattern = [...pattern].reverse().join("");
  const reversedPrefix = [...text.slice(0, forward.end)].reverse().join("");
  const backward = bestEnd(reversedPrefix, reversedPattern);
  return { start: Math.max(0, forward.end - backward.end), end: forward.end, distance: forward.distance };
}

function bestEnd(text: string, pattern: string): { end: number; distance: number } {
  const m = pattern.length;
  let prev = new Uint32Array(m + 1);
  let cur = new Uint32Array(m + 1);
  for (let i = 0; i <= m; i++) prev[i] = i;

  let best = m;
  let end = 0;
  for (let j = 1; j <= text.length; j++) {
    cur[0] = 0; // a match may start anywhere
    const c = text.charCodeAt(j - 1);
    for (let i = 1; i <= m; i++) {
      const cost = pattern.charCodeAt(i - 1) === c ? 0 : 1;
      cur[i] = Math.min(prev[i - 1]! + cost, prev[i]! + 1, cur[i - 1]! + 1);
    }
    if (cur[m]! < best) {
      best = cur[m]!;
      end = j;
    }
    [prev, cur] = [cur, prev];
  }
  return { end, distance: best };
}

/** `candidates` in order of preference, e.g. [matchedText, quote]. Items without `str` (marked content) count as empty. */
export function findHighlight(items: ReadonlyArray<{ str?: string }>, candidates: string[]): HighlightMatch {
  const none: HighlightMatch = { itemIndexes: new Set(), kind: "none", distanceRatio: 1 };
  const parts = items.map((i) => (typeof i.str === "string" ? i.str : ""));
  const { text, itemOf } = normalizeParts(parts);
  if (text.trim().length === 0) return none;

  const toItems = (start: number, end: number): Set<number> => {
    const set = new Set<number>();
    for (let k = start; k < Math.min(end, itemOf.length); k++) {
      const item = itemOf[k]!;
      if (parts[item]!.trim() !== "") set.add(item);
    }
    return set;
  };

  const quotes = candidates.map(normalizeText).filter((q) => q.length >= MIN_QUOTE);

  for (const q of quotes) {
    const at = text.indexOf(q);
    if (at !== -1) return { itemIndexes: toItems(at, at + q.length), kind: "exact", distanceRatio: 0 };
  }

  let best: HighlightMatch = none;
  for (const q of quotes) {
    const pattern = q.slice(0, MAX_PATTERN);
    const { start, end, distance } = approximateFind(text, pattern);
    const ratio = distance / pattern.length;
    if (ratio <= MAX_DISTANCE_RATIO && ratio < best.distanceRatio) {
      // the pattern may have been cut to MAX_PATTERN: extend to cover the whole quote
      const fullEnd = Math.min(text.length, Math.max(end, start + q.length));
      best = { itemIndexes: toItems(start, fullEnd), kind: "fuzzy", distanceRatio: ratio };
    }
  }
  return best;
}

/** the text layer injects what we return as HTML, so everything dynamic must be escaped */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
