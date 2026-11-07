import type { RequestHandler, Response } from "express";
import { AppError } from "../utils/error.js";
import { AuthService } from "../services/AuthService.js";

export function userIdOf(res: Response): string {
  return res.locals["userId"] as string;
}

/**
 * Bearer token from the Authorization header. Browsers' EventSource can't set headers,
 * so routes that serve SSE also accept ?token=... (allowQueryToken).
 */
export function requireAuth(
  auth: AuthService,
  opts: { allowQueryToken?: boolean } = {},
): RequestHandler {
  return (req, res, next) => {
    const header = req.headers.authorization;
    let token: string | undefined;
    if (header?.startsWith("Bearer ")) token = header.slice(7);

    else if (opts.allowQueryToken && typeof req.query["token"] === "string")
      token = req.query["token"];

    if (!token) throw new AppError(401, "Missing credentials", "unauthorized");

    res.locals["userId"] = auth.verifyToken(token);
    next();
  };
}
