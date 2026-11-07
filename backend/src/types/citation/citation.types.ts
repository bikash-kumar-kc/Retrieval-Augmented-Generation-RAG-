import LlmInterface from "../../interface/llm.interface.js";
import { PageLocation } from "./locationResolver.type.js";

export type RetrievedChunk = {
  chunkId: string;
  documentId: string;
  text: string;
  metadataJson: string;
};

export type FinalCitation = {
  citationId: string;
  documentId: string;
  chunkId: string;
  quote: string;
  matchedText: string;
  matchType: "exact" | "normalized" | "fuzzy";
  matchScore: number;
  locations: PageLocation[];
};

export type Deps = {
  extractQuoteInstance:LlmInterface;
};