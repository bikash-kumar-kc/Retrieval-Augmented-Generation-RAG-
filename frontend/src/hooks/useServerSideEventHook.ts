import { useEffect, useRef, useState } from "react";
import type { DocumentDto, PipelineEvent } from "../types/document";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../api/axios/axios.client";

export type SseStatus = "idle" | "connecting" | "open" | "closed";

interface Options {
  /** one stream is kept open per id; ids that disappear from this list have their stream closed */
  documentIds: string[];
  /** current state of a document, sent once each time its stream opens */
  onSnapshot: (doc: DocumentDto) => void;
  /** live pipeline event */
  onPipelineEvent: (event: PipelineEvent) => void;
}

export function useServerSideEvents({ documentIds, onSnapshot, onPipelineEvent }: Options): SseStatus {
  const { token } = useAuth();
  const [status, setStatus] = useState<SseStatus>("idle");
  const sources = useRef(new Map<string, EventSource>());

  // keep the latest callbacks without reconnecting every render
  const handlers = useRef({ onSnapshot, onPipelineEvent });
  useEffect(() => {
    handlers.current = { onSnapshot, onPipelineEvent };
  });

  const key = [...documentIds].sort().join(",");

  useEffect(() => {
    const open = sources.current;

    function updateStatus() {
      const all = [...open.values()];
      if (all.length === 0) setStatus("idle");
      else if (all.some((s) => s.readyState === EventSource.CLOSED)) setStatus("closed");
      else if (all.every((s) => s.readyState === EventSource.OPEN)) setStatus("open");
      else setStatus("connecting");
    }

    if (!token) return;
    
    const wanted = new Set(key ? key.split(",") : []);

    // close streams for documents that are no longer being processed
    for (const [id, source] of open) {
      if (!wanted.has(id)) {
        source.close();
        open.delete(id);
      }
    }

    // open a stream for each new document
    for (const id of wanted) {
      if (open.has(id)) continue;
      const params = new URLSearchParams({ token, documentId: id });
      const source = new EventSource(`${API_BASE_URL}/api/events?${params}`);
      source.onopen = updateStatus;
      source.onerror = updateStatus; 
      source.addEventListener("snapshot", (e) => {
        try {
          handlers.current.onSnapshot(JSON.parse((e as MessageEvent<string>).data) as DocumentDto);
        } catch {
          /* ignore a malformed frame */
        }
      });
      source.addEventListener("pipeline", (e) => {
        try {
          handlers.current.onPipelineEvent(JSON.parse((e as MessageEvent<string>).data) as PipelineEvent);
        } catch {
          /* ignore a malformed frame */
        }
      });
      open.set(id, source);
    }
    updateStatus();
  }, [key, token]);

  // close everything when the page unmounts
  useEffect(() => {
    const open = sources.current;
    return () => {
      for (const source of open.values()) source.close();
      open.clear();
    };
  }, []);

  return status;
}