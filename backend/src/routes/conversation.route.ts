import express from "express";
import LlmInterface from "../interface/llm.interface.js";
import { CitationService } from "../services/Citation/citationService.js";
import { log } from "../utils/logger.js";
import { LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "../clients/db/schema.js";
import { and, eq } from "drizzle-orm";
import RetrievelService from "../services/retrivelService.js";
import { buildEvidence } from "../services/Citation/evidenceBuilder.js";
import { requireAuth } from "../middleware/auth.js";
import { AuthService } from "../services/AuthService.js";
import { ConversationStore } from "../services/ConversationStore.js";
import { startSse } from "../utils/sse.js";



export interface IRelevantChunk {
  _id: string;
  documentId: string;
  chunk_text: string;
  page_number: number;
  extra_data: string;
}

const removeDobuleQuote = /\*\*/g;
const MAX_QUERY_CHARS = 4000;

const conservationRoute = ({
  textToTextInstance,
  extractQuoteInstance,
  agentRouterInstace,
  databaseInstance,
  retrivalService,
  auth,
  store = new ConversationStore(databaseInstance),
}: {
  textToTextInstance: LlmInterface;
  extractQuoteInstance: LlmInterface;
  agentRouterInstace: LlmInterface;
  databaseInstance: LibSQLDatabase<typeof schema>;
  retrivalService: RetrievelService;
  auth: AuthService;
  store?: ConversationStore;
}) => {
  const router = express.Router();
  const citationInstance = new CitationService({ extractQuoteInstance });

  const findOwnDocument = async (documentId: string, ownerId: string) => {
    const [doc] = await databaseInstance
      .select({
        docId: schema.documents.documentId,
        name: schema.documents.name,
        agentRouterPrompt: schema.documents.agentRouterPrompt,
        status: schema.documents.status,
      })
      .from(schema.documents)
      .where(
        and(
          eq(schema.documents.documentId, documentId),
          eq(schema.documents.ownerId, ownerId),
        ),
      );
    return doc; 
  };

  // past messages based on document
  router.get(
    "/:documentId",
    requireAuth(auth, { allowQueryToken: false }),
    async (req, res) => {
      const userId = res.locals["userId"] as string;
      try {
        const documentId = String(req.params["documentId"]);
        if (!(await findOwnDocument(documentId, userId))) {
          return res
            .status(404)
            .json({ isSuccess: false, errorMsg: "Document not found." });
        }
        const messages = await store.history(userId, documentId);
        return res.json({ isSuccess: true, data: { messages } });
      } catch (error) {
        log.error("[conversation history route] ", { error });
        return res.status(500).json({
          isSuccess: false,
          errorMsg: "Could not load the conversation.",
        });
      }
    },
  );

  // conversational route
  router.post(
    "/",
    requireAuth(auth, { allowQueryToken: false }),
    async (req, res) => {
      const userId = res.locals["userId"] as string;
      const { documentId, query } = (req.body ?? {}) as {
        documentId?: string;
        query?: string;
      };

      if (!documentId?.trim() || !query?.trim()) {
        return res.status(400).json({
          isSuccess: false,
          errorMsg: "DocumentId or query is missing.",
        });
      }

      if (query.length > MAX_QUERY_CHARS) {
        return res.status(400).json({
          isSuccess: false,
          errorMsg: `Query is longer than ${MAX_QUERY_CHARS} characters.`,
        });
      }


      let doc: Awaited<ReturnType<typeof findOwnDocument>>;

      try {
        doc = await findOwnDocument(documentId, userId);
      } catch (error) {
        log.error("[conversation text route] ", { error });
        return res
          .status(500)
          .json({ isSuccess: false, errorMsg: "Could not load the document." });
      }

      if (!doc)
        return res
          .status(404)
          .json({ isSuccess: false, errorMsg: "Document not found." });
      if (doc.status !== "ready") {
        return res.status(409).json({
          isSuccess: false,
          errorMsg: "Document is either in processing or failed",
        });
      }

      // 2. from here on everything is an event
      const sse = startSse(res);
      const askedAt = new Date().toISOString();

      try {
        const messageHistory = await store.getMemory(userId, doc.docId);

        // agent router.
        const { isRequired } = await agentRouterInstace.agentRouter({
          systemPrompt: doc.agentRouterPrompt!,
          query,
          messageHistory,
        });

        let answer: string;
        let citations: unknown[] = [];

        if (!isRequired) {
          const response = await textToTextInstance.textToText({
            query,
            messageHistory,
          });

          answer = response.text.replace(removeDobuleQuote, "");

          sse.send("message", { content: answer });

        } else {

          // starting of retrieval process.
          const relevantChunks =
            (await retrivalService.retrievelOfRelatedChunks({
              query,
              nameSpace: userId + doc.docId,
            })) as unknown as IRelevantChunk[];


          const formatedChuncks = relevantChunks.map((c) => ({
            chunkId: c._id,
            documentId: documentId,
            chunk_text: c.chunk_text,
            page_number: c.page_number,
            meta_data: JSON.parse(c.extra_data) as {
              page: number;
              pageStart: number;
              chunkStart: number;
              length: number;
            }[],
          }));

          const { contextString, chunkMap } = buildEvidence(formatedChuncks);

          // run both at once and send each the moment it is ready
          const answerReady = textToTextInstance
            .textToText({ query, chunks: contextString, messageHistory })
            .then((r) => {
              const text = r.text.replace(removeDobuleQuote, "");
              sse.send("message", { content: text });
              return text;
            });

          const citationsReady = citationInstance
            .cite(query, formatedChuncks, contextString, chunkMap)
            .then((c) => {
              sse.send("citation", { citations: c });
              return c as unknown[];
            })
            // an answer without sources is better than no answer
            .catch((error) => {
              log.error("[conversation citation] ", { error });
              return [] as unknown[];
            });

          [answer, citations] = await Promise.all([
            answerReady,
            citationsReady,
          ]);
        }

        // 3. save even if the browser has already gone away, so the answer shows up in the history later
        const { assistantMessageId } = await store.saveExchange({
          ownerId: userId,
          documentId: doc.docId,
          query,
          answer,
          citations,
          askedAt,
        });
        
        sse.send("done", { messageId: assistantMessageId });

      } catch (error) {
        log.error("[conversation text route] ", { error });
        sse.send("error", {
          message: "Something went wrong while answering. Please try again.",
        });
      } finally {
        sse.end();
      }
    },
  );

  return router;
};

export default conservationRoute;
