import type { Response } from "express";

export interface SseStream {
  /** writes one `event:` frame; silently ignored once the client is gone */
  send(event: string, data: unknown): void;
  end(): void;
  readonly closed: boolean;
}


export function startSse(res: Response): SseStream {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // stop nginx from buffering the stream
  });
  
  res.flushHeaders();

  // a comment line every 15 s keeps proxies and load balancers from closing an idle stream
  const heartbeat = setInterval(() => {
    if (!res.writableEnded && !res.destroyed) res.write(": ping\n\n");
  }, 15_000);

  heartbeat.unref();

  res.on("close", () => clearInterval(heartbeat));

  return {
    send(event, data) {
      if (res.writableEnded || res.destroyed) return;
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    },
    end() {
      clearInterval(heartbeat);
      if (!res.writableEnded) res.end();
    },
    get closed() {
      return res.writableEnded || res.destroyed;
    },
  };
}
