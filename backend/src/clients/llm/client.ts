import Groq from "groq-sdk";
import LlmInterface from "../../interface/llm.interface.js";
import {
  IExactQuoteResponse,
  IMessageHistory,
  ITextToTextRequest,
} from "../../types/llm/llm.type.js";
import { log } from "../../utils/logger.js";
import { createAgentRouterPrompt } from "../../constants/systemPrompt/llm.systemPrompts.js";

class GrokClient implements LlmInterface {
  readonly client: Groq;
  constructor(
    private readonly apiKey: string,
    private readonly modelName: string,
    private readonly systemPrompt?: string,
  ) {
    this.client = new Groq({ apiKey: this.apiKey });
  }

  exactQuote = async (
    query: string,
    chunkString: string,
  ): Promise<IExactQuoteResponse> => {
    try {
      if (!chunkString?.trim() || !query?.trim())
        throw new Error("Query or Chunk string is missing");

      const response = await this.client.chat.completions.create({
        messages: [
          {
            role: "system",
            content: this.systemPrompt!,
          },
          {
            role: "developer",
            content: chunkString,
          },
          {
            role: "user",
            content: query,
          },
        ],
        model: this.modelName,
        temperature: 0.2,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "exact_quote_schema",
            strict: true,
            schema: {
              type: "object",
              properties: {
                evidence: { type: "array", items: { type: "string" } },
              },
              required: ["evidence"],
              additionalProperties: false,
            },
          },
        },
      });

      console.log(response.choices[0].message.content)

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return result?.evidence;
    } catch (error) {
      log.error("[llm exact quote extraction]", { error: error });
      throw error;
    }
  };

  textToText = async ({
    query,
    chunks,
    messageHistory,
  }: ITextToTextRequest): Promise<{ text: string }> => {
    try {
      if (!query?.trim()) throw new Error("query or chunks are required");

      const messages: {
        role: "system" | "user" | "developer" | "assistant";
        content: string;
      }[] = [
        {
          role: "system",
          content: this.systemPrompt!,
        },
        ...messageHistory,
      ];

      if (chunks) {
        messages.push({ role: "developer", content: chunks });
      }

      messages.push({
        role: "user",
        content: query,
      });

      const response = await this.client.chat.completions.create({
        messages: [...messages],
        model: this.modelName,
        temperature: 1.5,
      });

      const result = response.choices[0].message.content;
      return {
        text: result!,
      };
    } catch (error) {
      log.error("[llm text to text]", { error: error });
      throw error;
    }
  };

  agentRouter = async ({
    systemPrompt,
    query,
    messageHistory,
  }: {
    systemPrompt: string;
    query: string;
    messageHistory: IMessageHistory[] | [];
  }): Promise<{ isRequired: boolean }> => {
    try {
      if (!systemPrompt?.trim() || !query?.trim())
        throw new Error("Query or system prompt string is missing");

      const prompt = createAgentRouterPrompt(systemPrompt);
      const response = await this.client.chat.completions.create({
        messages: [
          {
            role: "system",
            content: prompt,
          },
          ...messageHistory,
          {
            role: "user",
            content: query,
          },
        ],
        model: this.modelName,
        temperature: 0.2,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "agent_route_schema",
            strict: true,
            schema: {
              type: "object",
              properties: {
                isRequired: { type: "boolean" },
              },
              required: ["isRequired"],
              additionalProperties: false,
            },
          },
        },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return {
        isRequired: result?.isRequired || false,
      };
    } catch (error) {
      log.error("[agent router]", { error: error });
      throw error;
    }
  };
}

export default GrokClient;
