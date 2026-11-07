export interface SseFrame {
  event: string;
  data: string;
}

function parseFrame(raw: string): SseFrame | null {
  let event = "message";
  const data: string[] = [];
  for (const line of raw.split("\n")) {
    if (line === "" || line.startsWith(":")) continue; // blank line or comment (heartbeat)
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "event") event = value;
    else if (field === "data") data.push(value);
  }
  return data.length === 0 ? null : { event, data: data.join("\n") };
}

export async function* parseSse(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<SseFrame> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // normalise CRLF, but keep a trailing lone "\r" until we know whether "\n" follows
      const hold = buffer.endsWith("\r") ? "\r" : "";
      buffer =
        buffer.slice(0, buffer.length - hold.length).replace(/\r\n?/g, "\n") +
        hold;

      let boundary: number;
      while ((boundary = buffer.indexOf("\n\n")) !== -1) {
        const frame = parseFrame(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        if (frame) yield frame;
      }
    }
    // a final frame without its blank line is incomplete; the SSE spec says to discard it
  } finally {
    reader.releaseLock();
  }
}
