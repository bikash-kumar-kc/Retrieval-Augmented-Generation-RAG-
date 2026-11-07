/** A failure that will never succeed on retry (bad input, unsupported type, missing doc...). */
export class NonRetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NonRetryableError";
  }
}

/** An error that maps to an HTTP status. */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code: string = "error",
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
