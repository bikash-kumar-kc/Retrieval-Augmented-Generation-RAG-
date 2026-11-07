import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().default(8000),
  CORS_ORIGIN: z.string().default("*"),

  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),

  TURSO_URL: z.string().min(1),
  TURSO_AUTH_TOKEN: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),

  REDIS_URL: z.string().min(1),

  PINECONE_API_KEY: z.string().min(1),
  PINECONE_INDEX: z.string().min(1),

  EMBEDDING_URL: z.string().url(),
  EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(384),
  EMBEDDING_BATCH_SIZE: z.coerce.number().int().min(1).default(32),

  UPLOAD_DIR: z.string().default("./data/uploads"),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(50),

  DEDUP_ENABLED: z.stringbool().default(true),
  CHUNK_SIZE: z.coerce.number().int().positive().default(1500),
  CHUNK_OVERLAP: z.coerce.number().int().min(0).default(200),

  WORKER_CONCURRENCY: z.coerce.number().int().min(1).default(2),
  MAX_ATTEMPTS: z.coerce.number().int().min(1).default(3),
  RETRY_DELAY_MS: z.coerce.number().int().min(0).default(15_000),
  LOCK_TTL_MS: z.coerce.number().int().positive().default(600_000),
  REDIS_PORT: z.coerce.number().int().positive().default(17_448),
  REDIS_PASSWORD: z.string().min(1),
  PINECONE_VECTOR_FIELD: z.string().min(1),
  PINECONE_TEXT_FIELD: z.string().min(1),
  PINECONE_INDEX_TYPE: z.string().min(1),
  PINECONE_TITLE_FIELD: z.string().min(1),
  TEXT_TO_TEXT_API_KEY: z.string().min(1),
  AGENT_ROUTER_API_KEY: z.string().min(1),
  EXACT_QUOTE_API_KEY: z.string().min(1),
  GROQ_LLM_MODEL: z.string().min(1),
});

export type Config = z.infer<typeof schema>;

// @ts-ignore
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
