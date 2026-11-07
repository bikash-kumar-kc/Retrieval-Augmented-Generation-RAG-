import {
  MATCH_LABEL,
  scorePercent,
} from "../../../lib/citations";
import type { Citation, MatchType } from "../../../types/conversation";
import { Badge } from "../../ui/badge";
import { PdfViewer } from "./PdfView";

const MATCH_STYLE: Record<MatchType, string> = {
  exact: "border-green-200 bg-green-50 text-green-700",
  normalized: "border-blue-200 bg-blue-50 text-blue-700",
  fuzzy: "border-amber-200 bg-amber-50 text-amber-700",
};

interface Props {
  citation: Citation;
  locationIndex: number;
  onLocationChange: (index: number) => void;
}

export function CitationCard({
  citation,
  locationIndex,
  onLocationChange,
}: Props) {

  const pages = citation.locations.map((l) => l?.page);
  console.log("pages",pages)
  const page = pages[locationIndex] ?? pages[0] ?? null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant="outline"
          className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${MATCH_STYLE[citation.matchType]}`}
        >
          {MATCH_LABEL[citation.matchType]}
        </Badge>
        <span className="text-xs px-2.5 py-0.5 rounded-full border-yellow-200 bg-yellow-50 text-yellow-700">
          Match Score {scorePercent(citation.matchScore)}
        </span>
      </div>

      {/* <figure className="rounded-lg border-l-4 border-[#3b6d11] bg-[#f5f9f0] px-3 py-2">
        <blockquote className="max-h-32 overflow-y-auto whitespace-pre-wrap wrap-break-word text-sm italic text-[#171717]">
          “{citation.quote}”
        </blockquote>
        {foundAs && (
          <figcaption className="mt-2 border-t border-[#e5e7eb] pt-2 text-xs text-[#6b7280]">
            Found in the document as:{" "}
            <span className="not-italic text-[#171717]">{foundAs}</span>
          </figcaption>
        )}
      </figure> */}

      {pages.length > 1 && (
        <div
          role="group"
          aria-label="Pages of this citation"
          className="flex flex-wrap items-center gap-1.5"
        >
          <span className="text-xs text-[#6b7280]">Appears on</span>
          {pages.map((p, i) => (
            <button
              key={p}
              type="button"
              onClick={() => onLocationChange(i)}
              aria-pressed={i === locationIndex}
              className={`rounded-md border px-2 py-0.5 text-xs font-medium ${
                i === locationIndex
                  ? "border-[#3b6d11] bg-[#3b6d11] text-white"
                  : "border-[#e5e7eb] bg-white text-[#3b6d11] hover:bg-[#eaf2e1]"
              }`}
            >
              Page {p}
            </button>
          ))}
        </div>
      )}

      {page === null ? (
        <p className="rounded-lg border border-dashed border-[#e5e7eb] px-3 py-6 text-center text-sm text-[#6b7280]">
          This citation has no page information, so it can't be shown in the
          PDF.
        </p>
      ) : (
        <PdfViewer
          key={`${citation.documentId}-${page}`}
          documentId={citation.documentId}
          page={page}
          highlightCandidates={[citation.matchedText, citation.quote]}
        />
      )}
    </div>
  );
}
