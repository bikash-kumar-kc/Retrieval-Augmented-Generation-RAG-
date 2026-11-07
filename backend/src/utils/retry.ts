export interface RetryOptions {
  retries: number;
  baseDelayMs: number;
  maxDelayMs?: number;
  /** Return false to stop retrying immediately (e.g. 4xx responses). */
  shouldRetry?: (err: unknown) => boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt > opts.retries || opts.shouldRetry?.(err) === false) throw err;
      const exp = Math.min(opts.baseDelayMs * 2 ** (attempt - 1), opts.maxDelayMs ?? 10_000);
      await sleep(exp / 2 + Math.random() * (exp / 2));
    }
  }
}

export function chunkArray<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
