import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "../types/conversation";
import { getErrorMessage } from "../api/axios/axios.client";
import { showToast } from "../components/reuseableComponents/Toast";
import { conversationApi, isAbort } from "../api/conversation";

const now = () => new Date().toISOString();

export function useConversation(documentId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isAnswering, setIsAnswering] = useState(false);
  const inFlight = useRef<AbortController | null>(null);

  const loadHistory = useCallback(
    async (id: string, isCurrent: () => boolean) => {
      setIsHistoryLoading(true);
      setHistoryError(null);
      try {
        const saved = await conversationApi.history(id);
        if (isCurrent()) setMessages(saved);
      } catch (err) {
        if (isCurrent())
          setHistoryError(
            getErrorMessage(err, "Could not load the conversation"),
          );
      } finally {
        if (isCurrent()) setIsHistoryLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    inFlight.current?.abort(); // a question for the previous document stops being followed (the server still saves it)
    inFlight.current = null;
    setIsAnswering(false);
    setMessages([]);
    setHistoryError(null);
    if (!documentId) {
      setIsHistoryLoading(false);
      return;
    }
    let current = true;
    void loadHistory(documentId, () => current);
    return () => {
      current = false;
    };
  }, [documentId, loadHistory]);

  useEffect(() => () => inFlight.current?.abort(), []);

  const send = useCallback(
    async (rawQuery: string): Promise<boolean> => {
      const query = rawQuery.trim();
      if (!documentId || !query || inFlight.current) return false;

      const assistantId = crypto.randomUUID();
      const controller = new AbortController();
      inFlight.current = controller;
      setIsAnswering(true);
      setMessages((list) => [
        ...list,
        {
          id: crypto.randomUUID(),
          role: "user",
          content: query,
          citations: [],
          status: "done",
          createdAt: now(),
        },
        {
          id: assistantId,
          role: "assistant",
          content: "",
          citations: [],
          status: "streaming",
          createdAt: now(),
        },
      ]);

      const patch = (change: (m: ChatMessage) => ChatMessage) =>
        setMessages((list) =>
          list.map((m) => (m.id === assistantId ? change(m) : m)),
        );

      let finished = false;
      try {
        await conversationApi.stream({
          documentId,
          query,
          signal: controller.signal,
          onEvent: (ev) => {
            switch (ev.event) {
              case "delta": // token chunks, if the backend sends them
                patch((m) => ({ ...m, content: m.content + ev.data.text }));
                break;
              case "message": // the full answer, as soon as the LLM is done
                patch((m) => ({ ...m, content: ev.data.content }));
                break;
              case "citation": // sources, as soon as they are ready (before or after the answer)
                patch((m) => ({ ...m, citations: ev.data.citations }));
                break;
              case "done":
                finished = true;
                patch((m) => ({ ...m, status: "done" }));
                break;
              case "error":
                finished = true;
                patch((m) => ({
                  ...m,
                  status: "error",
                  errorMessage: ev.data.message,
                }));
                break;
            }
          },
        });
        if (!finished) {
          patch((m) => ({
            ...m,
            status: "error",
            errorMessage: "The connection was lost before the answer finished.",
          }));
        }
      } catch (err) {
        if (isAbort(err)) {
          // stopped by the user: keep what arrived, drop an empty placeholder
          setMessages((list) =>
            list.flatMap((m) => {
              if (m.id !== assistantId) return [m];
              return m.content === "" && m.citations.length === 0
                ? []
                : [{ ...m, status: "done" as const }];
            }),
          );
        } else {
          const message = getErrorMessage(err, "Could not get an answer");
          patch((m) => ({ ...m, status: "error", errorMessage: message }));
          showToast.error("Message failed", message);
        }
      } finally {
        if (inFlight.current === controller) {
          inFlight.current = null;
          setIsAnswering(false);
        }
      }
      return true;
    },
    [documentId],
  );

  const stop = useCallback(() => inFlight.current?.abort(), []);

  const retry = useCallback(
    async (assistantMessageId: string) => {
      const index = messages.findIndex((m) => m.id === assistantMessageId);
      const question = index > 0 ? messages[index - 1] : undefined;
      if (!question || question.role !== "user") return;
      setMessages((list) =>
        list.filter((m) => m.id !== assistantMessageId && m.id !== question.id),
      );
      await send(question.content);
    },
    [messages, send],
  );

  const reloadHistory = useCallback(() => {
    if (documentId) void loadHistory(documentId, () => true);
  }, [documentId, loadHistory]);

  return {
    messages,
    isHistoryLoading,
    historyError,
    isAnswering,
    send,
    stop,
    retry,
    reloadHistory,
  };
}
