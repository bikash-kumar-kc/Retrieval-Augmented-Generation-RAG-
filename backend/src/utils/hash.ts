import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";

export function sha256Hex(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

/** Streams the file so large uploads never have to fit in memory. */
export function sha256File(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    createReadStream(path)
      .on("data", (block) => hash.update(block))
      .on("error", reject)
      .on("end", () => resolve(hash.digest("hex")));
  });
}

/** Deterministic id: same document + position + content => same id, always. */
export function chunkId(documentId: string, chunkIndex: number, chunkHash: string): string {
  return sha256Hex(`${documentId}:${chunkIndex}:${chunkHash}`);
}
