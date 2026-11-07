import { Pinecone } from "@pinecone-database/pinecone";
import { chunkArray, withRetry } from "../../utils/retry.js";
import {
  IntegratedEmbeddingStore,
  TextRecord,
} from "../../interface/vectorStore.interface.js";

export class PineconeIntegratedStore implements IntegratedEmbeddingStore {
  readonly embedsText = true as const;
  private readonly client: Pinecone;

  constructor(
    private readonly opts: {
      apiKey: string;
      indexName: string;
      textField: string;
    },
  ) {
    this.client = new Pinecone({ apiKey: opts.apiKey });
  }

  async validate(): Promise<void> {
    const desc = await this.client.indexes.describe(this.opts.indexName);
    const fields = (desc as any).schema?.fields as
      | Record<string, Record<string, unknown>>
      | undefined;
    const field = fields?.[this.opts.textField];
    if (!field || field["type"] !== "string" || !field["embed"]) {
      throw new Error(
        `Index needs a string schema field "${this.opts.textField}" declared with "embed"`,
      );
    }
  }

  async upsertText(namespace: string, records: TextRecord[]): Promise<void> {
    const documents = this.client.index({
      name: this.opts.indexName,
      namespace,
    }).documents;
    for (const batch of chunkArray(records, 96)) {
      await withRetry(
        () =>
          documents.upsert({
            documents: batch.map((r) => ({
              _id: r.id,
              [this.opts.textField]: r.text,
              ...r.metadata,
            })),
          }),
        { retries: 3, baseDelayMs: 500 },
      );
    }
  }

  async deleteByIds(namespace: string, ids: string[]): Promise<void> {
    const documents = this.client.index({
      name: this.opts.indexName,
      namespace,
    }).documents;
    for (const batch of chunkArray(ids, 100)) {
      await withRetry(() => documents.delete({ ids: batch }), {
        retries: 3,
        baseDelayMs: 500,
      });
    }
  }
}
