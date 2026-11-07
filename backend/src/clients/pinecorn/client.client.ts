import { Pinecone } from "@pinecone-database/pinecone";
import {
  VectorRecord,
  VectorStore,
} from "../../interface/vectorStore.interface.js";
import { chunkArray, withRetry } from "../../utils/retry.js";

export class PineconeVectorStore implements VectorStore {
  private readonly client: Pinecone;

  constructor(private readonly opts: { apiKey: string; indexName: string }) {
    this.client = new Pinecone({ apiKey: opts.apiKey });
  }

  async validate(dimensions: number): Promise<void> {
    const desc = await this.client.indexes.describe(this.opts.indexName);
    if (desc.dimension !== dimensions) {
      throw new Error(
        `Pinecone index "${this.opts.indexName}" has dimension ${desc.dimension}, embedder produces ${dimensions}`,
      );
    }
  }

  /** Pinecone upsert overwrites by id, so retries and re-runs never create duplicates. */
  async upsert(namespace: string, records: VectorRecord[]): Promise<void> {
    const index = this.client.index({ name: this.opts.indexName });
    for (const batch of chunkArray(records, 100)) {
      await withRetry(() => index.upsert({ records: batch, namespace }), {
        retries: 3,
        baseDelayMs: 500,
      });
    }
  }

  async deleteByIds(namespace: string, ids: string[]): Promise<void> {
    const index = this.client.index({ name: this.opts.indexName });
    for (const batch of chunkArray(ids, 1000)) {
      await withRetry(() => index.deleteMany({ ids: batch, namespace }), {
        retries: 3,
        baseDelayMs: 500,
      });
    }
  }
}
