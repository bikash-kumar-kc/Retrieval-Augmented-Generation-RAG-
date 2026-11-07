export interface PageLocation {
  page?: number;
  [key: string]: unknown;
}

export type MatchType = "exact" | "normalized" | "fuzzy";

export interface Citation {
  citationId: string;
  documentId: string;
  chunkId: string;
  quote: string;
  matchedText: string;
  matchType: MatchType;
  matchScore: number;
  locations: PageLocation[];
}

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  citations: Citation[];
  status: "streaming" | "done" | "error";
  createdAt: string;
  errorMessage?: string;
}

export type StreamEvent =
  | { event: "delta"; data: { text: string } }
  | { event: "message"; data: { content: string } }
  | { event: "citation"; data: { citations: Citation[] } }
  | { event: "done"; data: { messageId?: string } }
  | { event: "error"; data: { message: string } };

export interface StoredMessage {
  id: string;
  role: ChatRole;
  content: string;
  citations: Citation[];
  createdAt: string;
}
