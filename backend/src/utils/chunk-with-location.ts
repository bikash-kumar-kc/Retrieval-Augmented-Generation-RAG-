export type LocatedChunk = {
  text: string;
  segments: {
    page: number;
    pageStart: number;
    chunkStart: number;
    length: number;
  }[];
};

export async function chunkWithLocations(
  page: number,
  text: string,
  splitter: { splitText(text: string): Promise<string[]> },
): Promise<LocatedChunk[]> {
  const pieces = await splitter.splitText(text);

  const result: LocatedChunk[] = [];

  let prevStart = -1;

  for (const piece of pieces) {
    const docStart = text.indexOf(piece, prevStart + 1);

    const segments: LocatedChunk["segments"] = [];

    if (docStart === -1) {
      console.warn(
        `Chunk "${piece.slice(0, 50)}..." not found in source text`,
      );
    } else {
      prevStart = docStart;

      segments.push({
        page,
        pageStart: docStart,
        chunkStart: 0,
        length: piece.length,
      });
    }

    result.push({
      text: piece,
      segments,
    });
  }

  return result;
}