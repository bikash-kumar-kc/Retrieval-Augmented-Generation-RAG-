import type { Citation, MatchType, PageLocation } from "../types/conversation";

/**
 * The one place that knows how a PageLocation says "which page".
 * ASSUMPTION: a 1-based `page`. `pageNumber` and a 0-based `pageIndex` are also understood.
 */
export function pageOf(location: PageLocation): number | null {
  const l = location as Record<string, unknown>;
  for (const key of ["page", "pageNumber"]) {
    const v = l[key];
    if (typeof v === "number" && Number.isFinite(v) && v >= 1) return Math.floor(v);
  }
  const index = l["pageIndex"];
  if (typeof index === "number" && Number.isFinite(index) && index >= 0) return Math.floor(index) + 1;
  return null;
}

/** distinct pages of a citation, in order */
export function citationPages(citation: Citation): number[] {
  const pages = new Set<number>();
  for (const loc of citation.locations ?? []) {
    const p = pageOf(loc);
    if (p !== null) pages.add(p);
  }
  return [...pages].sort((a, b) => a - b);
}

export const MATCH_LABEL: Record<MatchType, string> = {
  exact: "Exact match",
  normalized: "Normalized match",
  fuzzy: "Fuzzy match",
};

/** ASSUMPTION: matchScore is 0..1 */
export function scorePercent(score: number): string {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(score) ? score : 0));
  return `${Math.round(clamped * 100)}%`;
}