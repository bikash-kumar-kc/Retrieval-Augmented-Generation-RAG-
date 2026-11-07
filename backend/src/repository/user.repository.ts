import { eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";

import * as schema from "../clients/db/schema.js";
import type {
  UserPurpose,
} from "../types/repository/userRepository.type.js";
import { UserRecord, UserRepositoryContract } from "../interface/userRepository.interface.js";

export class UserRepository implements UserRepositoryContract {
  constructor(
    private readonly db: LibSQLDatabase<typeof schema>,
  ) {}

  /**
   * Throws a UNIQUE violation if the email already exists.
   */
  async create(
    user: Omit<UserRecord, "createdAt">,
  ): Promise<void> {
    
    await this.db
      .insert(schema.users)
      .values({
        userId: user.userId,
        name: user.name,
        email: user.email,
        passwordHash: user.passwordHash,
        purpose: user.purpose,
      });
  }

  async findByEmail(
    email: string,
  ): Promise<UserRecord | null> {
    const rows = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    const row = rows[0];

    if (!row) {
      return null;
    }

    return this.map(row);
  }

  async findById(
    userId: string,
  ): Promise<UserRecord | null> {
    const rows = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.userId, userId))
      .limit(1);

    const row = rows[0];

    if (!row) {
      return null;
    }

    return this.map(row);
  }

  private map(
    row: typeof schema.users.$inferSelect,
  ): UserRecord {
    return {
      userId: row.userId,
      name: row.name,
      email: row.email,
      passwordHash: row.passwordHash,
      purpose: row.purpose as UserPurpose,
      createdAt: row.createdAt,
    };
  }
}