import type { Response } from "express";
import type { Redis } from "ioredis";
import {
  EVENTS_CHANNEL,
  PipelineEvent,
} from "./interface/eventPublisher.interface.js";
import { log } from "./utils/logger.js";

interface SseClient {
  ownerId: string;
  documentId?: string | undefined;
  res: Response;
}

/**
 * Bridges Redis pub/sub (fed by the workers) to open SSE connections.
 * A client only ever receives events for documents it owns.
 */
export class SseHub {
  private readonly clients = new Set<SseClient>();
  private heartbeat: NodeJS.Timeout | undefined;
  private isRegistered: boolean = false;

  // a dedicated connection with redis for pub/sub.
  constructor(private readonly subscriber: Redis) {}

  // subscribe the channel, listen and publish.
  async start(): Promise<void> {
    if (this.isRegistered) return;
    // listen event and publish the event.
    this.subscriber.on("message", (channel, message) => {
      if (channel !== EVENTS_CHANNEL) return;
      try {
        this.dispatch(JSON.parse(message) as PipelineEvent);
      } catch (err) {
        log.warn("bad pipeline event on redis", { err: String(err) });
      }
    });

    // connected to the channel.
    await this.subscriber.subscribe(EVENTS_CHANNEL);

    // keeps proxies and load balancers from closing idle streams
    this.heartbeat = setInterval(() => {
      for (const c of this.clients) c.res.write(": ping\n\n");
    }, 25_000);

    this.isRegistered = true;

    this.heartbeat.unref();
  }

  // clients that subscribe the channel.
  add(client: SseClient): () => void {
    this.clients.add(client);
    return () => this.clients.delete(client);
  }

  // send the event to client.
  send(res: Response, event: string, data: unknown): void {
    res.write(`event:${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  // unsubscribe the channel
  async stop(): Promise<void> {
    if (this.heartbeat) clearInterval(this.heartbeat);
    for (const c of this.clients) c.res.end();
    this.clients.clear();
    this.subscriber.disconnect();
  }

  // dispatching the event.
  private dispatch(event: PipelineEvent): void {
    for (const c of this.clients) {
      if (c.ownerId !== event.ownerId) continue;
      if (c.documentId && c.documentId !== event.documentId) continue;
      console.log("dispatchedddddd,");
      this.send(c.res, "pipeline", event);
    }
  }
}
