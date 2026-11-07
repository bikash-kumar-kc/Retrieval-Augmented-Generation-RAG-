type Token = { word: string; start: number; end: number };

export type FuzzyResult = {
  start: number;
  end: number;
  score: number;
};

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  for (const m of text.matchAll(/\S+/g)) {
    const word = m[0]
      .toLowerCase()
      .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
    if (word)
      tokens.push({ word, start: m.index!, end: m.index! + m[0].length });
  }
  return tokens;
}

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return 1 - prev[b.length] / maxLen;
}

export function fuzzyMatch(
  quote: string,
  chunkText: string,
  threshold = 0.8,
): FuzzyResult | null {
  const q = tokenize(quote);
  const t = tokenize(chunkText);
  if (q.length === 0 || t.length === 0) return null;

  const qStr = q.map((x) => x.word).join(" ");
  let best: FuzzyResult | null = null;

  for (let size = Math.max(1, q.length - 2); size <= q.length + 2; size++) {
    for (let i = 0; i + size <= t.length; i++) {
      const window = t.slice(i, i + size);
      const score = similarity(qStr, window.map((x) => x.word).join(" "));
      if (score >= threshold && (!best || score > best.score)) {
        best = { start: window[0].start, end: window[size - 1].end, score };
      }
    }
  }
  return best;
}
