/** Light cleanup applied to parsed text before chunking. */
export function cleanText(input: string): string {
  return input
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Used only for hashing: casing and whitespace differences should not change the hash. */
export function normalizeForHash(input: string): string {
  return input.toLowerCase().replace(/\s+/g, " ").trim();
}
