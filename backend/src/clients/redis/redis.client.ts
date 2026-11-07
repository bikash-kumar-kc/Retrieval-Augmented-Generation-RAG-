import "dotenv/config";
import { Redis } from "ioredis";

export let redisClient: Redis<"legacy"> | undefined;

const connectToRedis = async ({
  host,
  port,
  password,
  maxRetriesPerRequest = null,
}: {
  host?: string | undefined;
  port?: number | undefined;
  password?: string | undefined;
  maxRetriesPerRequest?: number | null;
}) => {
  if (redisClient) {
    console.log("[redis] client exist already");
    return redisClient;
  }

  redisClient = new Redis({
    username: "default",
    host,
    port,
    password,
    maxRetriesPerRequest,
  });
  await redisClient.ping();

  redisClient.on("error", (err) => {
    console.log("[redis] Failed to connect to redis.", err);
  });

  redisClient.on("ready", () => {
    console.log("[redis] connected successfully.");
  });

  return redisClient;
};

export default connectToRedis;
