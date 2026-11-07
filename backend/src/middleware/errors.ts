import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/error.js";
import multer from "multer";
import { log } from "../utils/logger.js";


export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    // e.g. an SSE stream already started; nothing sensible to send
    res.end();
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "validation_error",
        message: "Invalid request",
        details: err.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
    });
    return;
  }

  if (err instanceof AppError) {
    res
      .status(err.status)
      .json({ error: { code: err.code, message: err.message } });
    return;
  }

  if (err instanceof multer.MulterError) {
    const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    res
      .status(status)
      .json({ error: { code: err.code.toLowerCase(), message: err.message } });
    return;
  }

  log.error("unhandled error", {
    err: err instanceof Error ? (err.stack ?? err.message) : String(err),
  });

  res.status(500).json({
    error: { code: "internal_error", message: "Something went wrong" },
  });
  void next;
};
