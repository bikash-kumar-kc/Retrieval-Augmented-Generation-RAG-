import { randomUUID } from "node:crypto";
import {
  UserRecord,
  UserRepositoryContract,
} from "../interface/userRepository.interface.js";
import { loginSchema, signupSchema } from "../schema/auth.schema.js";
import z from "zod";
import { Config } from "../config.js";
import { AppError } from "../utils/error.js";
import jwt, { SignOptions } from "jsonwebtoken";
import { isUniqueViolation } from "../clients/db/turso.db.client.js";
import {
  burnPasswordCheck,
  hashedPassword,
  verifyPassword,
} from "../utils/password.js";

export interface PublicUser {
  userId: string;
  name: string;
  email: string;
  purpose: string;
}

const toPublic = (u: UserRecord): PublicUser => ({
  userId: u.userId,
  name: u.name,
  email: u.email,
  purpose: u.purpose,
});

export class AuthService {
  constructor(
    private readonly users: UserRepositoryContract,
    private readonly config: Pick<Config, "JWT_SECRET" | "JWT_EXPIRES_IN">,
  ) {}

  async signup(
    input: z.infer<typeof signupSchema>,
  ): Promise<{ token: string; user: PublicUser }> {
    try {
      console.log("signup");
      console.log(input.password);
      const user: Omit<UserRecord, "createdAt"> = {
        userId: randomUUID(),
        name: input.name,
        email: input.email,
        passwordHash: await hashedPassword(input.password),
        purpose: input.purpose,
      };

      await this.users.create(user);

      return {
        token: this.sign(user.userId),
        user: toPublic({ ...user, createdAt: "" }),
      };
    } catch (err) {
      // the unique index on email is the real guard; it also wins signup races
      if (isUniqueViolation(err))
        throw new AppError(
          409,
          "An account with this email already exists",
          "email_taken",
        );
      throw err;
    }
  }

  async login(
    input: z.infer<typeof loginSchema>,
  ): Promise<{ token: string; user: PublicUser }> {
    const user = await this.users.findByEmail(input.email);

    if (!user) {
      await burnPasswordCheck(input.password);
      throw new AppError(
        401,
        "Invalid email or password",
        "invalid_credentials",
      );
    }
    if (!(await verifyPassword(user.passwordHash, input.password))) {
      throw new AppError(
        401,
        "Invalid email or password",
        "invalid_credentials",
      );
    }
    return { token: this.sign(user.userId), user: toPublic(user) };
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    if (!user)
      throw new AppError(401, "Account no longer exists", "unauthorized");
    return toPublic(user);
  }

  verifyToken(token: string): string {
    try {
      const payload = jwt.verify(token, this.config.JWT_SECRET);
      console.log(payload);
      console.log(typeof payload);

      if (typeof payload !== "object") {
        throw new Error("Invalid token payload");
      }

      return payload?.userId;
    } catch {
      throw new AppError(401, "Invalid or expired token", "unauthorized");
    }
  }

  private sign(userId: string): string {
    // @ts-ignore
    return jwt.sign({ userId }, this.config.JWT_SECRET, {
      expiresIn: this.config.JWT_EXPIRES_IN,
      algorithm: "HS256",
    });
  }
}
