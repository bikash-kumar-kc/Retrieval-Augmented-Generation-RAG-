import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";
import type { Citation } from "../../../types/conversation";

interface Props {
  citations: Citation[];
  activeIndex: number | null;
  onOpen: (index: number) => void;
}

export function CitationChips({ citations, activeIndex, onOpen }: Props) {
  if (citations.length === 0) return null;

  return (
    <div
      role="group"
      aria-label="Citations"
      className="mt-3 flex flex-wrap items-center gap-1.5"
    >
      <span className="mr-1 text-xs font-medium text-[#6b7280]">Sources</span>
      {citations.map((c, i) => (
        <Tooltip key={c.citationId}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => onOpen(i)}
              aria-label={`View citation ${i + 1}`}
              aria-pressed={activeIndex === i}
              className={`flex size-6 items-center justify-center rounded-md border text-xs font-semibold transition-colors  ${
                activeIndex === i
                  ? "border-none bg-[black] text-white"
                  : "border-[#e5e7eb] bg-white hover:bg-[#F5F5F5]"
              }`}
            >
              {i + 1}
            </button>
          </TooltipTrigger>
          <TooltipContent className="bg-black text-white">
            Click here to visit citation {i + 1}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
