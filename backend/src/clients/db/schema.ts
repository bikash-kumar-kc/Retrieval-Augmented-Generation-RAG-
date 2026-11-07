import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    userId: text("user_id").primaryKey(),

    name: text("name").notNull(),

    email: text("email").notNull(),

    passwordHash: text("password_hash").notNull(),

    purpose: text("purpose", {
      enum: ["personal", "business", "research", "education", "other"],
    }).notNull(),

    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),

    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  },
  (table) => [
    uniqueIndex("idx_users_email").on(table.email),
    uniqueIndex("idx_users_userid").on(table.userId),
  ],
);

export const documents = sqliteTable(
  "documents",
  {
    documentId: text("document_id").primaryKey(),

    ownerId: text("owner_id")
      .notNull()
      .references(() => users.userId, {
        onDelete: "cascade",
      }),

    name: text("name").notNull(),

    mimeType: text("mime_type").notNull(),

    sizeBytes: integer("size_bytes").notNull(),

    filePath: text("file_path").notNull(),

    fileHash: text("file_hash").notNull(),

    dedupKey: text("dedup_key"),

    stage: text("stage", {
      enum: ["uploaded", "parsed", "chunked", "embedded"],
    })
      .notNull()
      .default("uploaded"),

    status: text("status", {
      enum: ["processing", "ready", "failed"],
    })
      .notNull()
      .default("processing"),

    errorMessage: text("error_message"),

    attempts: integer("attempts").notNull().default(0),

    chunkCount: integer("chunk_count"),
    agentRouterPrompt: text("agent_router_prompt"),

    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),

    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  },
  (table) => [
    index("idx_documents_owner_created").on(table.ownerId, table.createdAt),

    index("idx_documents_owner_hash").on(table.ownerId, table.fileHash),

    uniqueIndex("uniq_documents_owner_dedup").on(table.ownerId, table.dedupKey),
  ],
);

export const parsedDocuments = sqliteTable("parsed_documents", {
  documentId: text("document_id")
    .primaryKey()
    .references(() => documents.documentId, {
      onDelete: "cascade",
    }),

  parser: text("parser").notNull(),

  sectionsJson: text("sections_json").notNull(),

  metadataJson: text("metadata_json").notNull().default("{}"),

  createdAt: text("created_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
});

export const chunks = sqliteTable(
  "chunks",
  {
    chunkId: text("chunk_id").primaryKey(),

    documentId: text("document_id")
      .notNull()
      .references(() => documents.documentId, {
        onDelete: "cascade",
      }),

    ownerId: text("owner_id").notNull(),

    chunkIndex: integer("chunk_index").notNull(),

    text: text("text").notNull(),

    chunkHash: text("chunk_hash").notNull(),

    metadataJson: text("metadata_json").notNull().default("{}"),

    embedded: integer("embedded").notNull().default(0),

    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  },
  (table) => [
    uniqueIndex("uniq_chunks_doc_index").on(table.documentId, table.chunkIndex),

    index("idx_chunks_pending").on(table.documentId, table.embedded),
  ],
);

export const userCredentials = sqliteTable(
  "user_credentials",
  {
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.userId, { onDelete: "cascade" }),

    provider: text("provider").notNull(),

    secretBlob: text("secret_blob").notNull(),

    version: integer("version").notNull().default(1),

    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => [
    uniqueIndex("idx_owner_provide").on(table.ownerId, table.provider),
  ],
);

export const conversationMessages = sqliteTable(
  "conversation_messages",
  {
    messageId: text("message_id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    documentId: text("document_id").notNull(),
    role: text("role", { enum: ["user", "assistant"] }).notNull(),
    content: text("content").notNull(),
    citations: text("citations"), // JSON string of the citation array (assistant messages only)
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    index("idx_conversation_owner_doc").on(
      t.ownerId,
      t.documentId,
      t.createdAt,
    ),
  ],
);
