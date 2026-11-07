import { eq, and, sql } from "drizzle-orm";
import * as schema from "../clients/db/schema.js";
import { userCredentials } from "../clients/db/schema.js";
import { LibSQLDatabase } from "drizzle-orm/libsql";

export class CredentialRepository {
  constructor(private readonly db: LibSQLDatabase<typeof schema>) {}

  async save(ownerId: string, provider: string, blob: string) {
    await this.db
      .insert(schema.userCredentials)
      .values({
        ownerId,
        provider,
        secretBlob: blob,
      })
      .onConflictDoUpdate({
        target: [
          schema.userCredentials.ownerId,
          schema.userCredentials.provider,
        ],
        set: {
          secretBlob: sql`excluded.secret_blob`,
          version: sql`${schema.userCredentials.version} + 1`,
          updatedAt: sql`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
        },
      });
  }

  async load(ownerId: string, provider: string) {
    const result = await this.db
      .select({
        blob: userCredentials.secretBlob,
        version: userCredentials.version,
      })
      .from(userCredentials)
      .where(
        and(
          eq(userCredentials.ownerId, ownerId),
          eq(userCredentials.provider, provider),
        ),
      )
      .limit(1);

    const row = result[0];

    return row
      ? {
          blob: row.blob,
          version: row.version,
        }
      : null;
  }

  async remove(ownerId: string, provider: string) {
    await this.db
      .delete(userCredentials)
      .where(
        and(
          eq(userCredentials.ownerId, ownerId),
          eq(userCredentials.provider, provider),
        ),
      );
  }
}
