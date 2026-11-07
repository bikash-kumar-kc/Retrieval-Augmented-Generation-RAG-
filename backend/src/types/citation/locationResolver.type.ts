export type ChunkMeta = {
  segments: {
    page: number;
    pageStart: number;
    chunkStart: number;
    length: number;
  }[];
};

export type CitationInput = {
  matchedText: string; 
  startOffset: number;
  endOffset: number;
};

export type PageLocation = { page: number; text: string };