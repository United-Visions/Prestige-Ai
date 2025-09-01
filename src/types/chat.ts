export type CustomTagState = "pending" | "finished" | "aborted";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  attachments?: string[];
}

export interface ChatResponseChunk {
  chatId: string;
  content: string;
  isComplete: boolean;
}

export interface ChatResponseEnd {
  chatId: string;
  updatedFiles?: boolean;
  extraFiles?: string[];
  extraFilesError?: string;
}

export type ContentPiece =
  | { type: "markdown"; content: string }
  | { type: "custom-tag"; tagInfo: CustomTagInfo };

export type CustomTagInfo = {
  tag: string;
  attributes: Record<string, string>;
  content: string;
  fullMatch: string;
  inProgress?: boolean;
};