import axios from "axios";
import type {
  ChatMessage,
  StoredMessage,
  StreamEvent,
} from "../types/conversation";
import {
  api,
  API_BASE_URL,
  TOKEN_KEY,
  UNAUTHORIZED_EVENT,
} from "./axios/axios.client";
import { parseSse } from "../lib/sse";

/** An error the server explained in { isSuccess:false, errorMsg } form. */
export class ConversationError extends Error {}

interface StreamArgs {
  documentId: string;
  query: string;
  signal?: AbortSignal;
  onEvent: (event: StreamEvent) => void;
}

const KNOWN = new Set(["delta", "message", "citation", "done", "error"]);

export const conversationApi = {
  /** Saved messages of one document's conversation, oldest first. */
  async history(documentId: string): Promise<ChatMessage[]> {
    const { data } = await api.get<{ data: { messages: StoredMessage[] } }>(
      `/api/conversation/${documentId}`,
    );
    return data.data.messages.map((m) => ({
      ...m,
      citations: m.citations ?? [],
      status: "done" as const,
    }));
  },

  /**
   * Asks a question and reports each event as it arrives. Resolves when the stream ends.
   * Uses fetch (not axios) because the browser can't stream a response body through XHR.
   */
  async stream({
    documentId,
    query,
    signal,
    onEvent,
  }: StreamArgs): Promise<void> {
    const token = localStorage.getItem(TOKEN_KEY);
    const res = await fetch(`${API_BASE_URL}/api/conversation`, {
      method: "POST",
      signal: signal ?? null,
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ documentId, query }),
    });

    if (res.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    if (!res.ok || !res.body) {
      // validation errors are plain JSON, sent before the stream starts
      const body = (await res.json().catch(() => null)) as {
        errorMsg?: string;
      } | null;
      throw new ConversationError(
        body?.errorMsg ?? `Request failed (${res.status})`,
      );
    }

    for await (const frame of parseSse(res.body)) {
      if (!KNOWN.has(frame.event)) continue;
      try {
        onEvent({
          event: frame.event,
          data: JSON.parse(frame.data),
        } as StreamEvent);
      } catch (err) {
        if (err instanceof SyntaxError) continue; // ignore a malformed frame
        throw err;
      }
    }
  },
};

export function isAbort(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === "AbortError") ||
    (axios.isCancel(err) as boolean)
  );
}
