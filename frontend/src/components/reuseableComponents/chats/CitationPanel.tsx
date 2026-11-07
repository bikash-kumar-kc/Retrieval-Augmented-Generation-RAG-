import { PanelRightClose, PanelRightOpen, Quote } from "lucide-react";
import type { ActiveCitation } from "../../../hooks/useCitations";
import type { Citation } from "../../../types/conversation";
import { CitationCard } from "./CitationCard";

interface Props {
  isOpen: boolean;
  active: ActiveCitation | null;
  citation: Citation | null;
  locationIndex: number;
  onLocationChange: (index: number) => void;
  onSelectCitation: (index: number) => void;
  onToggle: () => void;
}

export function CitationPanel({
  isOpen,
  active,
  citation,
  locationIndex,
  onLocationChange,
  onSelectCitation,
  onToggle,
}: Props) {
  if (!isOpen) {
    return (
      <aside
        aria-label="Citations (collapsed)"
        className="hidden w-11 shrink-0 flex-col items-center rounded-xl border border-[#e5e7eb] bg-white py-2 lg:flex"
      >
        <button
          type="button"
          onClick={onToggle}
          aria-label="Expand citations panel"
          title="Show citations"
          className="rounded-md p-2 text-[#6b7280] hover:bg-[#f5f5f5] hover:text-[#171717]"
        >
          <PanelRightOpen className="size-5" />
        </button>
        <Quote className="mt-3 size-4 text-[#6b7280]" aria-hidden />
        {active && (
          <span
            className="mt-2 flex size-5 items-center justify-center rounded-full bg-[#3b6d11] text-[10px] font-semibold text-white"
            title="A citation is selected"
          >
            {active.index + 1}
          </span>
        )}
      </aside>
    );
  }

  return (
    <aside
      aria-label="Citations"
     className="
  fixed inset-y-0 right-0 z-40 h-screen overflow-auto
  flex w-[min(100vw,34rem)] flex-col gap-3
  border-l border-[#e5e7eb] bg-white p-4 shadow-xl
  lg:static lg:z-auto lg:w-136 lg:min-w-0 lg:shrink
  lg:rounded-md lg:border lg:shadow-sm
  hover:shadow-md transition-all
"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#171717]">Citations</h2>
        <button
          type="button"
          onClick={onToggle}
          aria-label="Collapse citations panel"
          title="Collapse"
          className="rounded-md p-1.5 text-[#6b7280] hover:bg-[#f5f5f5] hover:text-[#171717]"
        >
          <PanelRightClose className="size-5" />
        </button>
      </div>

      {!active || !citation ? (
        <div className="m-auto flex max-w-xs flex-col items-center gap-2 text-center">
          <Quote className="size-7 text-[#3b6d11]" />
          <p className="text-sm font-medium text-[#171717]">
            No citation selected
          </p>
          <p className="text-sm text-[#6b7280]">
            Click a numbered source under an answer to see where it comes from
            in the PDF.
          </p>
        </div>
      ) : (
        <>
          {active.citations.length > 1 && (
            <div
              role="tablist"
              aria-label="Citations of this answer"
              className="flex flex-wrap gap-1.5"
            >
              {active.citations.map((c, i) => (
                <button
                  key={c.citationId}
                  role="tab"
                  type="button"
                  aria-selected={i === active.index}
                  onClick={() => onSelectCitation(i)}
                  className={`rounded-sm border px-2.5 py-0.5 text-xs font-semibold ${
                    i === active.index
                      ? "border-none bg-[black] text-white"
                      : "border-[#e5e7eb] bg-white text-[black] hover:bg-[#eaf2e1]"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
          <CitationCard
            key={citation.citationId}
            citation={citation}
            locationIndex={locationIndex}
            onLocationChange={onLocationChange}
          />
        </>
      )}
    </aside>
  );
}
