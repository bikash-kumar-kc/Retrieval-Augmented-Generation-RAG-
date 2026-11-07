import "dotenv/config";
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/clients/db/schema.ts",
  out: "./src/clients/db/migrations",
  dialect: "turso",
  dbCredentials: {
    //@ts-ignore
    url: process.env.TURSO_URL!,
    // @ts-ignore
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
} satisfies Config;
