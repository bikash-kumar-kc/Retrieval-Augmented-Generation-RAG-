import { Pinecone } from "@pinecone-database/pinecone";
import { log } from "../utils/logger.js";

class RetrievelService {
  readonly client: Pinecone;
  constructor(
    private readonly apiKey: string,
    private readonly indexName: string,
    private readonly topK?: number,
  ) {
    this.client = new Pinecone({ apiKey: this.apiKey });
  }
  retrievelOfRelatedChunks = async ({
    query,
    nameSpace,
  }: {
    query: string;
    nameSpace: string;
  }) => {
    try {
      if (!query?.trim() || !nameSpace?.trim())
        throw new Error("query or namespace is missing");

      // namespace is now set on the index handle
      const index = this.client.index({
        name: this.indexName,
        namespace: nameSpace,
      });

      const result = await index.documents.search({
        topK: this.topK ?? 5,
        scoreBy: [{ type: "embed", fields: ["chunk_text"], query }],
        includeFields: ["chunk_text","page_number","extra_data"],
      });

      if (!result) throw new Error("Failed to get relevant chunk.");
      return result.matches;
    } catch (error) {
      log.error("[Retrievel Service]", { error });
      throw error;
    }
  };
}

export default RetrievelService;
