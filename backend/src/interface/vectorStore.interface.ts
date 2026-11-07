// ---- vector store ----------------------------------------------------------
export type VectorMetadata = Record<string, string | number | boolean>;

export interface VectorRecord {
  id: string;
  values: number[];
  metadata: VectorMetadata;
}

export interface VectorStore {
  /** Throws if the index cannot hold vectors of this size. */
  validate(dimensions: number): Promise<void>;
  /** Insert-or-overwrite by id. Must be safe to call repeatedly with the same records. */
  upsert(namespace: string, records: VectorRecord[]): Promise<void>;
  deleteByIds(namespace: string, ids: string[]): Promise<void>;
}


export interface TextRecord {
  id: string;
  text: string;                 // Pinecone turns this into a vector; we never see it
  metadata: VectorMetadata;
}

export interface IntegratedEmbeddingStore {
  readonly embedsText: true;
  validate(): Promise<void>;
  upsertText(namespace: string, records: TextRecord[]): Promise<void>;
  deleteByIds(namespace: string, ids: string[]): Promise<void>;
}

export const embedsText = (s: VectorStore | IntegratedEmbeddingStore): s is IntegratedEmbeddingStore =>
  (s as IntegratedEmbeddingStore).embedsText === true;