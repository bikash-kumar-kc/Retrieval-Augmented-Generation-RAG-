export interface NewChunk {
  chunkId: string;
  chunkIndex: number;
  text: string;
  chunkHash: string;
  metadata: Record<string, unknown>;
}

export interface ChunkRecord extends NewChunk {
  documentId: string;
  ownerId: string;
  embedded: boolean;
}

export interface ChunkCounts {
  total: number;
  embedded: number;
}
