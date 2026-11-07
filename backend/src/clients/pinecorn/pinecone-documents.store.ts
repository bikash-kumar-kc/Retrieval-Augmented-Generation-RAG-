import { Pinecone } from "@pinecone-database/pinecone";
import { chunkArray, withRetry } from "../../utils/retry.js";
import {
  VectorRecord,
  VectorStore,
} from "../../interface/vectorStore.interface.js";

export interface PineconeDocumentsOptions {
  apiKey: string;
  indexName: string;
  vectorField: string;
  textField: string;
}

export class PineconeDocumentsVectorStore implements VectorStore {
  private readonly client: Pinecone;

  constructor(private readonly opts: PineconeDocumentsOptions) {
    this.client = new Pinecone({ apiKey: opts.apiKey });
  }

  async validate(dimensions: number): Promise<void> {
    const desc = await this.client.indexes.describe(this.opts.indexName);
    const fields = (
      desc as unknown as {
        schema?: { fields?: Record<string, Record<string, unknown>> };
      }
    ).schema?.fields;
    if (!fields) {
      throw new Error(
        `Pinecone index "${this.opts.indexName}" has no document schema; use PINECONE_INDEX_TYPE=vectors`,
      );
    }
    const field = fields[this.opts.vectorField];
    if (!field) {
      throw new Error(
        `Index schema has no field "${this.opts.vectorField}". Fields: ${Object.keys(fields).join(", ") || "(none)"}. ` +
          `Set PINECONE_VECTOR_FIELD to your dense_vector field.`,
      );
    }
    if (field["type"] !== "dense_vector") {
      throw new Error(
        `Schema field "${this.opts.vectorField}" is type "${String(field["type"])}", expected dense_vector ` +
          `(a field with integrated "embed" makes Pinecone embed text itself and rejects supplied vectors)`,
      );
    }
    if (field["dimension"] !== dimensions) {
      throw new Error(
        `Schema field "${this.opts.vectorField}" has dimension ${String(field["dimension"])}, embedder produces ${dimensions}`,
      );
    }
  }

  async upsert(namespace: string, records: VectorRecord[]): Promise<void> {
    const documents = this.client.index({
      name: this.opts.indexName,
      namespace,
    }).documents;
    for (const batch of chunkArray(records, 96)) {
      await withRetry(
        () =>
          documents.upsert({
            documents: batch.map((r) => {
              const { text, ...rest } = r.metadata;
              return {
                _id: r.id,
                [this.opts.vectorField]: r.values,
                [this.opts.textField]: text,
                ...rest,
              };
            }),
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
