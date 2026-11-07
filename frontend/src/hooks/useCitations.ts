import { useCallback, useState } from "react";
import type { Citation } from "../types/conversation";

export interface ActiveCitation {
  messageId: string;
  citations: Citation[];
  index: number;
}

export function useCitations() {
  const [isOpen, setIsOpen] = useState(false);
  const [active, setActive] = useState<ActiveCitation | null>(null);
  const [locationIndex, setLocationIndex] = useState(0);

  const openCitation = useCallback(
    (messageId: string, citations: Citation[], index: number) => {
      setActive({ messageId, citations, index });
      setLocationIndex(0);
      setIsOpen(true);
    },
    [],
  );

  const selectCitation = useCallback((index: number) => {
    setActive((a) =>
      a && index >= 0 && index < a.citations.length ? { ...a, index } : a,
    );
    setLocationIndex(0);
  }, []);

  const togglePanel = useCallback(() => setIsOpen((o) => !o), []);
  const closePanel = useCallback(() => setIsOpen(false), []);

  const reset = useCallback(() => {
    setActive(null);
    setLocationIndex(0);
    setIsOpen(false);
  }, []);

  const citation = active ? (active.citations[active.index] ?? null) : null;

  return {
    isOpen,
    active,
    citation,
    locationIndex,
    setLocationIndex,
    openCitation,
    selectCitation,
    togglePanel,
    closePanel,
    reset,
  };
}
