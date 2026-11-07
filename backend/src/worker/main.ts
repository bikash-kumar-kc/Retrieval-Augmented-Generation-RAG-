import { BullMqQueue } from "../clients/bullmq/bullmq.client.js";
import connectToRedis from "../clients/redis/redis.client.js";
import {
  RedisEventPublisher,
  RedisLocks,
} from "../clients/redis/redisEventPublisher.js";
import { loadConfig } from "../config.js";
import { buildConfig } from "../container.js";
import { embedsText } from "../interface/vectorStore.interface.js";
import { IngestionPipeline } from "../pipeline/documentIngestionPipeline/pipeline.js";
import { AppError } from "../utils/error.js";
import { log } from "../utils/logger.js";
import { createJobProcessor } from "./processor.js";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitUntil(
  name: string,
  check: () => Promise<void>,
): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      await check();
      return;
    } catch (err) {
      log.warn(`waiting for ${name}`, { attempt, err: String(err) });
      await sleep(Math.min(5_000 * attempt, 30_000));
    }
  }
}

async function main() {
  // load the config.
  const config = loadConfig();
  // build dependencies.
  const { tursoClient, repos, clients } = buildConfig(config);

  // // Don't pull jobs until the things they need are actually reachable and compatible.
  // await waitUntil("embedding service", () => clients.embedder.healthCheck());
  // await waitUntil("vector store", () =>
  //   clients.vectorStore.validate(clients.embedder.dimensions),

  const store = clients.vectorStore;
  if (embedsText(store)) {
    await waitUntil("vector store", () => store.validate());
  } else {
    const embedder = clients.embedder!;
    await waitUntil("embedding service", () => embedder.healthCheck());
    await waitUntil("vector store", () => store.validate(embedder.dimensions));
  }

  // connecting to redis.
  const redisClient = await connectToRedis({
    host: config.REDIS_URL,
    port: config.REDIS_PORT,
    password: config.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
  });

  if (typeof redisClient === "undefined")
    throw new AppError(500, "Failed to connected to redis");

  const pipeline = new IngestionPipeline({
    documents: repos.documents,
    parsed: repos.parsed,
    chunks: repos.chunks,
    parsers: clients.parsers,
    chunker: clients.chunker,
    embedder: clients.embedder,
    vectorStore: clients.vectorStore,
    events: new RedisEventPublisher(redisClient),
    embeddingBatchSize: config.EMBEDDING_BATCH_SIZE,
  });

  // handle queue
  const queue = await BullMqQueue.connect({
    connection: redisClient,
    retryDelayMs: 2000,
    maxAttempts: 3,
  });

  await queue.consume(
    createJobProcessor({
      pipeline,
      documents: repos.documents,
      locks: new RedisLocks(redisClient),
      maxAttempts: config.MAX_ATTEMPTS,
      lockTtlMs: config.LOCK_TTL_MS,
    }),
    config.WORKER_CONCURRENCY,
  );

  const shutdown = async (signal: string) => {
    log.info("shutting down worker", { signal });
    await queue.close(); // stops consuming; unacked jobs are redelivered
    redisClient.disconnect();
    tursoClient.close();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  console.log("Worker is ready to work.");
}

main().catch((err) => {
  log.error("worker failed to start", { err: String(err) });
  process.exit(1);
});
