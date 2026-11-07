export interface Embedder {
  readonly dimensions: number;
  /** Embeds passages for storage. */
  embedDocuments(texts: string[]): Promise<number[][]>;
  /** Embeds a search query (some models, e.g. bge, want a query prefix). */
  embedQuery(text: string): Promise<number[]>;
  /** Throws if the backend is unreachable or returns unexpected dimensions. */
  healthCheck(): Promise<void>;
}