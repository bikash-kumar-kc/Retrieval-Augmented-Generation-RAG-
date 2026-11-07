import type { Config } from "./config.js";
import { ParserRegistry } from "./services/parse/parseService.js";
import { ChunkRepositoryContract } from "./interface/chunckRepository.interface.js";
import { Embedder } from "./interface/embedder.interface.js";
import {
  IntegratedEmbeddingStore,
  VectorStore,
} from "./interface/vectorStore.interface.js";
import { UserRepositoryContract } from "./interface/userRepository.interface.js";
import { DocumentRepositoryContract } from "./interface/documentRepository.interface.js";
import { ParsedRepositoryContract } from "./interface/parsedRepository.interface.js";
import connectTursoDb from "./clients/db/turso.db.client.js";
import { PdfParser } from "./services/parse/pdf.parse.js";
import { UserRepository } from "./repository/user.repository.js";
import { DocumentRepository } from "./repository/document.repository.js";
import { ParsedRepository } from "./repository/parsed.repository.js";
import { ChunkRepository } from "./repository/chunck.repository.js";
import { ParagraphChunker } from "./services/paragraphChuncker.js";
import { PineconeVectorStore } from "./clients/pinecorn/client.client.js";
import { TeiEmbedder } from "./clients/embedder/embeder.client.js";
import { Client } from "@libsql/client";
import { Chunker } from "./interface/chuncker.interface.js";
import { PineconeDocumentsVectorStore } from "./clients/pinecorn/pinecone-documents.store.js";
import { PineconeIntegratedStore } from "./clients/pinecorn/pinecorn-integrated.store.js";
import GrokClient from "./clients/llm/client.js";
import LlmInterface from "./interface/llm.interface.js";
import {
  exactToExactSystemPrompt,
  textToTextSystemPrompt,
} from "./constants/systemPrompt/llm.systemPrompts.js";
import { LibSQLDatabase } from "drizzle-orm/libsql";
import RetrievelService from "./services/retrivelService.js";

export interface Clients {
  parsers: ParserRegistry;
  chunker: Chunker;
  embedder: Embedder;
  vectorStore: VectorStore | IntegratedEmbeddingStore;
  textToText: LlmInterface;
  exactQuote: LlmInterface;
  agentRouter: LlmInterface;
}

export interface Repositories {
  users: UserRepositoryContract;
  documents: DocumentRepositoryContract;
  parsed: ParsedRepositoryContract;
  chunks: ChunkRepositoryContract;
}

export interface Container {
  config: Config;
  repos: Repositories;
  clients: Clients;
  tursoClient: Client;
  db: LibSQLDatabase<typeof import("./clients/db/schema.js")>;
  retrivalService:RetrievelService
}

/**
 * Composition root. Defaults: PDF parser, paragraph chunker, TEI embedder, Pinecone.
 * Bring your own implementation of any of them:
 *
 * build config is used for configuring the dependencies like database,redis,queue,parser,chunker,embedder and vector database
 *
 *   buildConfig(config, { embedder: new MyOpenAiEmbedder(), vectorStore: new MyQdrantStore() })
 */
export function buildConfig(
  config: Config,
  overrides: Partial<Clients> = {},
): Container {
  const { db, tursoClient } = connectTursoDb({
    endpoint: config.TURSO_URL,
    authToken: config.TURSO_AUTH_TOKEN,
  });

  const clients: Clients = {
    parsers:
      overrides.parsers ?? new ParserRegistry().register(new PdfParser()),
    chunker:
      overrides.chunker ??
      new ParagraphChunker({
        chunkSize: config.CHUNK_SIZE,
        chunkOverlap: config.CHUNK_OVERLAP!,
      }),
    embedder:
      overrides.embedder ??
      new TeiEmbedder({
        baseUrl: config.EMBEDDING_URL,
        dimensions: config.EMBEDDING_DIMENSIONS,
        batchSize: config.EMBEDDING_BATCH_SIZE,
      }),
    vectorStore:
      overrides.vectorStore ??
      (config.PINECONE_INDEX_TYPE === "documents"
        ? new PineconeDocumentsVectorStore({
            apiKey: config.PINECONE_API_KEY,
            indexName: config.PINECONE_INDEX,
            vectorField: config.PINECONE_VECTOR_FIELD,
            textField: config.PINECONE_TEXT_FIELD,
          })
        : config.PINECONE_INDEX_TYPE === "integrated"
          ? new PineconeIntegratedStore({
              apiKey: config.PINECONE_API_KEY,
              indexName: config.PINECONE_INDEX,
              textField: config.PINECONE_TEXT_FIELD,
            })
          : new PineconeVectorStore({
              apiKey: config.PINECONE_API_KEY,
              indexName: config.PINECONE_INDEX,
            })),
    textToText: new GrokClient(
      config.TEXT_TO_TEXT_API_KEY,
      config.GROQ_LLM_MODEL,
      textToTextSystemPrompt,
    ),
    exactQuote: new GrokClient(
      config.EXACT_QUOTE_API_KEY,
      config.GROQ_LLM_MODEL,
      exactToExactSystemPrompt,
    ),
    agentRouter: new GrokClient(
      config.AGENT_ROUTER_API_KEY,
      config.GROQ_LLM_MODEL,
    ),
  };

  const repos: Repositories = {
    users: new UserRepository(db!),
    documents: new DocumentRepository(db!),
    parsed: new ParsedRepository(db!),
    chunks: new ChunkRepository(db!),
  };

  const retrivalService = new RetrievelService(
    config.PINECONE_API_KEY,
    config.PINECONE_INDEX,
  );

  return { config, repos, clients, tursoClient, db,retrivalService };
}
