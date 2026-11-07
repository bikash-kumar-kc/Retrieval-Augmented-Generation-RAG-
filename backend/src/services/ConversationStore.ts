import { and, desc, eq, sql } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { randomUUID } from "node:crypto";
import * as schema from "../clients/db/schema.js";
import type { IMessageHistory } from "../types/llm/llm.type.js";

const MEMORY_LIMIT = 20; // how many past messages are handed to the LLM

export interface StoredMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: unknown[];
  createdAt: string;
}

export class ConversationStore {
  private readonly memory = new Map<string, IMessageHistory[]>();

  constructor(private readonly db: LibSQLDatabase<typeof schema>) {}

  private key(ownerId: string, documentId: string) {
    return `${ownerId}:${documentId}`;
  }

  async getMemory(ownerId: string, documentId: string): Promise<IMessageHistory[]> {
    const key = this.key(ownerId, documentId);
    const cached = this.memory.get(key);
    if (cached) return cached;
    const past = await this.history(ownerId, documentId, MEMORY_LIMIT);
    const loaded = past.map((m) => ({ role: m.role, content: m.content }));
    this.memory.set(key, loaded);
    return loaded;
  }

  private remember(ownerId: string, documentId: string, messages: IMessageHistory[]) {
    const key = this.key(ownerId, documentId);
    const next = [...(this.memory.get(key) ?? []), ...messages].slice(-MEMORY_LIMIT);
    this.memory.set(key, next);
  }

  /** Saves a finished question/answer pair (user row first, so ordering by insert order is stable). */
  async saveExchange(a: {
    ownerId: string;
    documentId: string;
    query: string;
    answer: string;
    citations: unknown[];
    askedAt: string;
  }): Promise<{ assistantMessageId: string }> {
    const userId = randomUUID();
    const assistantId = randomUUID();
    await this.db.batch([
      this.db.insert(schema.conversationMessages).values({
        messageId: userId, ownerId: a.ownerId, documentId: a.documentId,
        role: "user", content: a.query, citations: null, createdAt: a.askedAt,
      }),
      this.db.insert(schema.conversationMessages).values({
        messageId: assistantId, ownerId: a.ownerId, documentId: a.documentId,
        role: "assistant", content: a.answer,
        citations: a.citations.length ? JSON.stringify(a.citations) : null,
        createdAt: new Date().toISOString(),
      }),
    ]);
    this.remember(a.ownerId, a.documentId, [
      { role: "user", content: a.query },
      { role: "assistant", content: a.answer },
    ]);
    return { assistantMessageId: assistantId };
  }

  /** The most recent `limit` messages, oldest first. */
  async history(ownerId: string, documentId: string, limit = 100): Promise<StoredMessage[]> {
    const rows = await this.db
      .select()
      .from(schema.conversationMessages)
      .where(and(eq(schema.conversationMessages.ownerId, ownerId), eq(schema.conversationMessages.documentId, documentId)))
      .orderBy(desc(schema.conversationMessages.createdAt), desc(sql`rowid`))
      .limit(limit);

    return rows.reverse().map((r) => ({
      id: r.messageId,
      role: r.role,
      content: r.content,
      citations: r.citations ? (JSON.parse(r.citations) as unknown[]) : [],
      createdAt: r.createdAt,
    }));
  }
}
