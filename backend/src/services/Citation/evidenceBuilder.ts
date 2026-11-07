type RetrievedChunk = {
  chunkId: string;
  documentId: string;
  chunk_text: string;
  page_number?: number;
};

export type ChunkRef = Omit<RetrievedChunk, "text">;

export function buildEvidence(chunks: RetrievedChunk[], maxChars = 12000) {
  const chunkMap: Record<string, ChunkRef & { chunk_text: string }> = {};
  const parts: string[] = [];
  let used = 0;

  for (const chunk of chunks) {
    const tag = `C${parts.length + 1}`;
    const block = `[${tag}] ${chunk.chunk_text}`;

    if (used + block.length > maxChars) break;

    parts.push(block);
    chunkMap[tag] = chunk;
    used += block.length;
  }

  return { contextString: parts.join("\n\n"), chunkMap };
}
