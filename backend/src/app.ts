import cors from "cors";
import express, { type Express } from "express";
import type { SseHub } from "./sse-hub.js";
import { Config } from "./config.js";
import { AuthService } from "./services/AuthService.js";
import { UploadService } from "./services/uploadService.js";
import { DocumentService } from "./services/documentService.js";
import { authRoutes } from "./routes/auth.route.js";
import { documentRoutes } from "./routes/document.route.js";
import { eventRoutes } from "./routes/event.route.js";
import { errorHandler } from "./middleware/errors.js";
import { Clients, Repositories } from "./container.js";
import { LibSQLDatabase } from "drizzle-orm/libsql";
import conservationRoute from "./routes/conversation.route.js";
import RetrievelService from "./services/retrivelService.js";
import documentFileRoute from "./routes/documentFile.route.js";

export interface AppDeps {
  config: Config;
  repos: Repositories;
  clients: Clients;
  auth: AuthService;
  uploads: UploadService;
  documentService: DocumentService;
  hub: SseHub;
  db: LibSQLDatabase<typeof import("./clients/db/schema.js")>;
  retrivalService: RetrievelService;
}

export async function createApp(deps: AppDeps): Promise<Express> {
  const app = express();

  app.disable("x-powered-by");

  // handle cors.
  app.use(
    cors({
      origin:
        deps.config.CORS_ORIGIN === "*"
          ? true
          : deps.config.CORS_ORIGIN.split(","),
    }),
  );

  app.use(express.json({ limit: "100kb" }));

  app.get("/healthz", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/auth", authRoutes(deps.auth));

  app.use(
    "/api/documents",
    await documentRoutes({
      config: deps.config,
      auth: deps.auth,
      documents: deps.repos.documents,
      parsers: deps.clients.parsers,
      uploads: deps.uploads,
      documentService: deps.documentService,
    }),
  );

  app.use(
    "/api/conversation",
    conservationRoute({
      textToTextInstance: deps.clients.textToText,
      extractQuoteInstance: deps.clients.exactQuote,
      agentRouterInstace: deps.clients.agentRouter,
      databaseInstance: deps.db,
      retrivalService: deps.retrivalService,
      auth: deps.auth,
    }),
  );

  app.use(
    "/api/events",
    eventRoutes({
      auth: deps.auth,
      documents: deps.repos.documents,
      hub: deps.hub,
    }),
  );

  app.use(
    "/api/documentDownload",
    documentFileRoute({ databaseInstance: deps.db, auth: deps.auth }),
  );

  // global error handler.
  app.use(errorHandler);
  return app;
}
