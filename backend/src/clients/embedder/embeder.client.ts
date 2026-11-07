
import { Embedder } from "../../interface/embedder.interface.js";
import { chunkArray, withRetry } from "../../utils/retry.js";

export interface TeiEmbedderOptions {
  baseUrl: string;
  dimensions: number;
  batchSize: number;
  queryPrefix?: string;
  timeoutMs?: number;
}

class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

/** Client for Hugging Face Text Embeddings Inference: POST /embed. */
export class TeiEmbedder implements Embedder {
  readonly dimensions: number;
  private readonly baseUrl: string;
  private readonly batchSize: number;
  private readonly queryPrefix: string;
  private readonly timeoutMs: number;

  constructor(opts: TeiEmbedderOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.dimensions = opts.dimensions;
    this.batchSize = opts.batchSize;
    this.queryPrefix = opts.queryPrefix ?? "Represent this sentence for searching relevant passages: ";
    this.timeoutMs = opts.timeoutMs ?? 60_000;
  }

  // batch the texts as per the batch size.
  async embedDocuments(texts: string[]): Promise<number[][]> {
    const out: number[][] = [];
    for (const batch of chunkArray(texts, this.batchSize)) {
      out.push(...(await this.embedBatch(batch)));
    }
    return out;
  }

  // for embedding query.
  async embedQuery(text: string): Promise<number[]> {
    const [vector] = await this.embedBatch([this.queryPrefix + text]);
    if (!vector) throw new Error("TEI returned no vector for query");
    return vector;
  }

  // for health check up.
  async healthCheck(): Promise<void> {
    const res = await fetch(`${this.baseUrl}/health`, { signal: AbortSignal.timeout(5_000) });
    if (!res.ok) throw new Error(`TEI /health returned ${res.status}`);
    const [probe] = await this.embedBatch(["dimension probe"]);
    if (probe?.length !== this.dimensions) {
      throw new Error(
        `Embedding model returns ${probe?.length} dimensions but EMBEDDING_DIMENSIONS is ${this.dimensions}`,
      );
    }
  }


  // generate the embedding with retry.
  private embedBatch(inputs: string[]): Promise<number[][]> {
    return withRetry(
      async () => {
        console.log("[embedding starts]");
        const res = await fetch(`${this.baseUrl}/embed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inputs, normalize: true, truncate: true }),
          signal: AbortSignal.timeout(this.timeoutMs),
        });
        if (!res.ok) {
          throw new HttpError(res.status, `TEI /embed failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
        }
        const vectors = (await res.json()) as number[][];
        if (!Array.isArray(vectors) || vectors.length !== inputs.length) {
          throw new Error(`TEI returned ${vectors?.length} vectors for ${inputs.length} inputs`);
        }
        return vectors;
      },
      {
        retries: 4,
        baseDelayMs: 500,
        // retry network errors, 429 and 5xx; give up on other 4xx (our request is wrong)
        shouldRetry: (err) => !(err instanceof HttpError) || err.status === 429 || err.status >= 500,
      },
    );
  }
}
