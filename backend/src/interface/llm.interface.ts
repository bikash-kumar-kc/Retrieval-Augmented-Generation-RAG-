//@ts-nocheck

import {
  IExactQuoteResponse,
  ITextToTextRequest,
} from "../types/llm/llm.type.js";

class LlmInterface {
  exactQuote = async (
    chunkString: string,
    query: string,
  ): Promise<IExactQuoteResponse> => {};

  textToText = async ({
    query,
    chunks,
    messageHistory,
  }: ITextToTextRequest): Promise<{ text: string }> => {};

  agentRouter = async ({
    systemPrompt,
    query,
    messageHistory,
  }: {
    systemPrompt: string;
    query: string;
    messageHistory: IMessageHistory[] | [];
  }): Promise<{ isRequired: boolean }> => {};
}
export default LlmInterface;
