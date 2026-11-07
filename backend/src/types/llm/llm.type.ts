export type IExactQuoteResponse = string[];

export interface IMessageHistory {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ITextToTextRequest {
  query: string;
  chunks?: string;
  messageHistory: IMessageHistory[] | [];
}
