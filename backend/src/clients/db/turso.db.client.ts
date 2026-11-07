import { Client, createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema.js";

let db: LibSQLDatabase<typeof schema> | undefined;
let tursoClient: Client | undefined;

const connectTursoDb = ({
  endpoint,
  authToken,
}: {
  endpoint?: string | undefined;
  authToken?: string | undefined;
}) => {
  if (db && tursoClient) {
    return { db, tursoClient };
  }

  if (!endpoint?.trim() || !authToken?.trim()) {
    throw new Error("Endpoint or AuthToken is missing.");
  }

  tursoClient = createClient({
    url: endpoint,
    authToken: authToken,
  });

  db = drizzle(tursoClient, { schema });
  return { db, tursoClient };
};

export default connectTursoDb;

export function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | undefined;
  return (
    !!e &&
    (e.code === "SQLITE_CONSTRAINT_UNIQUE" ||
      e.code === "SQLITE_CONSTRAINT_PRIMARYKEY" ||
      (typeof e.message === "string" &&
        e.message.includes("UNIQUE constraint failed")))
  );
}
