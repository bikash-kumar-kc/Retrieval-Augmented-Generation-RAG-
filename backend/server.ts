import "dotenv/config";
import { createApp } from "./src/app.js";
import connectToRedis from "./src/clients/redis/redis.client.js";
import { BullMqQueue } from "./src/clients/bullmq/bullmq.client.js";
import { AppError } from "./src/utils/error.js";
import { loadConfig } from "./src/config.js";
import { buildConfig } from "./src/container.js";
import { AuthService } from "./src/services/AuthService.js";
import { UploadService } from "./src/services/uploadService.js";
import { DocumentService } from "./src/services/documentService.js";
import { RedisEventPublisher } from "./src/clients/redis/redisEventPublisher.js";
import { log } from "./src/utils/logger.js";
import { SseHub } from "./src/sse-hub.js";

const PORT = process.env.PORT ?? 8000;

const startServer = async () => {
  try {
    // load the env variable and check crossponding to the zod schema for validation.
    const config = loadConfig();

    // build configuration for dependencies.
    const { repos, clients, tursoClient, db, retrivalService } =
      buildConfig(config);

    // connecting to redis.
    const redisClient = await connectToRedis({
      host: config.REDIS_URL,
      port: config.REDIS_PORT,
      password: config.REDIS_PASSWORD,
      maxRetriesPerRequest: 3,
    });

    if (typeof redisClient === "undefined")
      throw new AppError(500, "Failed to connected to redis");

    // create a channel to send sse between worker process and the node process.
    const hub = new SseHub(redisClient.duplicate());

    // handle queue
    const queue = await BullMqQueue.connect({
      connection: redisClient,
      retryDelayMs: 2000,
      maxAttempts: 3,
    });

    const app = await createApp({
      config,
      repos,
      clients,
      hub,
      auth: new AuthService(repos.users, config),
      uploads: new UploadService({
        documents: repos.documents,
        parsers: clients.parsers,
        queue,
        events: new RedisEventPublisher(redisClient),
        config,
      }),
      documentService: new DocumentService({
        documents: repos.documents,
        chunks: repos.chunks,
        vectorStore: clients.vectorStore,
      }),
      db,
      retrivalService,
    });

    const server = app.listen(Number(PORT), () => {
      console.log("Sever is starting at PORT: ", PORT);
    });

    const shutdown = async (signal: string) => {
      log.info("shutting down api", { signal });
      await hub.stop();
      server.close();
      await queue.close();
      redisClient.disconnect();
      tursoClient.close();
      process.exit(0);
    };
    process.on("SIGINT", () => void shutdown("SIGINT"));
    process.on("SIGTERM", () => void shutdown("SIGTERM"));
  } catch (error) {
    console.log("Failed to start server");
    if (error instanceof Error) {
      console.log(error);
      console.log(error.message);
      return;
    }
    console.log(error);
  }
};

startServer();
