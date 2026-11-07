import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page } from "react-pdf";
import { Loader2, Minus, Plus, RefreshCw } from "lucide-react";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "../../../lib/pdf";
import { useDocumentFile } from "../../../hooks/useDocumentFile";
import { escapeHtml, findHighlight } from "../../../lib/highlight";

const ZOOMS = [0.75, 1, 1.25, 1.5, 2];

interface Props {
  documentId: string;
  page: number;
  highlightCandidates: string[];
}

function useContainerWidth(ref: React.RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.floor(entry?.contentRect.width ?? 0)),
    );
    observer.observe(el);
    setWidth(Math.floor(el.clientWidth));
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

export function PdfViewer({ documentId, page, highlightCandidates }: Props) {
  const { file, isLoading, error, reload } = useDocumentFile(documentId);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [zoomIndex, setZoomIndex] = useState(1);
  const [textItems, setTextItems] = useState<ReadonlyArray<{
    str?: string;
  }> | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const width = useContainerWidth(container);

  console.log("file");
  console.log(file);

  const shownPage = numPages ? Math.min(Math.max(page, 1), numPages) : page;
  const candidatesKey = highlightCandidates.join("\u0000");

  useEffect(() => setTextItems(null), [documentId, shownPage]); // the old page's text no longer applies
  useEffect(() => setRenderError(null), [documentId]);

  const highlight = useMemo(
    () => (textItems ? findHighlight(textItems, highlightCandidates) : null),
    [textItems, candidatesKey],
  );

  const customTextRenderer = useCallback(
    ({ str, itemIndex }: { str: string; itemIndex: number }) => {
      const safe = escapeHtml(str);
      return highlight?.itemIndexes.has(itemIndex)
        ? `<mark data-citation-highlight style="background:rgba(250,204,21,.5);color:transparent;border-radius:2px">${safe}</mark>`
        : safe;
    },
    [highlight],
  );

  const scrollToHighlight = useCallback(() => {
    container.current
      ?.querySelector("[data-citation-highlight]")
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, []);

  const pageWidth =
    width > 0 ? Math.floor(width * (ZOOMS[zoomIndex] ?? 1)) : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto rounded-md border border-[#e5e7eb] bg-[#fafafa] shadow-md hover:shadow-lg transition-all">
      <div className="flex items-center justify-between gap-2 border-b border-[#e5e7eb] bg-gray-100 px-3 py-1.5 text-xs text-[#6b7280]">
        <span>
          Page {shownPage}
          {numPages ? ` of ${numPages}` : ""}
        </span>
        <span className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Zoom out"
            disabled={zoomIndex === 0}
            onClick={() => setZoomIndex((z) => Math.max(0, z - 1))}
            className="rounded p-1 hover:bg-[#d2d1d1] hover:text-white disabled:opacity-40"
          >
            <Minus className="size-3.5" />
          </button>
          <span className="w-9 text-center tabular-nums">
            {Math.round((ZOOMS[zoomIndex] ?? 1) * 100)}%
          </span>
          <button
            type="button"
            aria-label="Zoom in"
            disabled={zoomIndex === ZOOMS.length - 1}
            onClick={() =>
              setZoomIndex((z) => Math.min(ZOOMS.length - 1, z + 1))
            }
            className="rounded p-1 hover:bg-[#d2d1d1] hover:text-white disabled:opacity-40"
          >
            <Plus className="size-3.5" />
          </button>
        </span>
      </div>

      <div ref={container} className="min-h-0 flex-1 overflow-auto">
        {isLoading && (
          <p
            role="status"
            className="flex items-center justify-center gap-2 py-10 text-sm text-[#6b7280]"
          >
            <Loader2 className="size-4 animate-spin" /> Loading the PDF…
          </p>
        )}

        {(error || renderError) && (
          <div
            role="alert"
            className="flex flex-col items-center gap-3 px-4 py-10 text-center"
          >
            <p className="text-sm text-red-600">{error ?? renderError}</p>
            <button
              onClick={() => {
                setRenderError(null);
                reload();
              }}
              className="inline-flex items-center gap-2 rounded-md border border-[#e5e7eb] bg-white px-3 py-1.5 text-sm text-[#171717] hover:bg-[#f5f5f5]"
            >
              <RefreshCw className="size-4" /> Try again
            </button>
          </div>
        )}

        {file && !error && !renderError && (
          <Document
            file={file}
            onLoadSuccess={({ numPages: n }) => setNumPages(n)}
            onLoadError={() =>
              setRenderError("This PDF could not be displayed.")
            }
            loading={
              <p
                role="status"
                className="flex items-center justify-center gap-2 py-10 text-sm text-[#6b7280]"
              >
                <Loader2 className="size-4 animate-spin" /> Opening the PDF…
              </p>
            }
          >
            <Page
              pageNumber={shownPage}
              {...(pageWidth ? { width: pageWidth } : {})}
              renderAnnotationLayer={false}
              customTextRenderer={customTextRenderer}
              onGetTextSuccess={(content) =>
                setTextItems(
                  content.items as unknown as ReadonlyArray<{ str?: string }>,
                )
              }
              onRenderTextLayerSuccess={scrollToHighlight}
            />
          </Document>
        )}
      </div>

      {highlight && (
        <p
          role="status"
          className="border-t border-[#e5e7eb] bg-gray-100 px-3 py-1.5 text-xs text-[#6b7280]"
        >
          {highlight.kind === "exact" && "The cited passage is highlighted."}
          {highlight.kind === "fuzzy" &&
            "Closest match highlighted (the wording differs slightly)."}
          {highlight.kind === "none" &&
            "Couldn't locate the exact passage on this page."}
        </p>
      )}
    </div>
  );
}
