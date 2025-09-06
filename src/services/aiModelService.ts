import { streamText, generateText } from "ai";
import { createModelClient } from "./modelClient";
import type { LargeLanguageModel } from "@/lib/models";
import type { Message } from "@/types";

export interface StreamChunk {
  type: 'text-delta' | 'reasoning' | 'error';
  content: string;
  isComplete?: boolean;
}

export interface StreamOptions {
  onChunk?: (chunk: StreamChunk) => void;
  onComplete?: (fullResponse: string) => void;
  onError?: (error: string) => void;
  systemPrompt?: string;
  settings?: any;
}

class AIModelServiceV2 {
  private static instance: AIModelServiceV2;

  private constructor() {}

  public static getInstance(): AIModelServiceV2 {
    if (!AIModelServiceV2.instance) {
      AIModelServiceV2.instance = new AIModelServiceV2();
    }
    return AIModelServiceV2.instance;
  }

  public async generateResponse(
    model: LargeLanguageModel,
    systemPrompt: string,
    messages: Message[]
  ): Promise<string> {
    try {
      const modelClient = createModelClient(model);
      
      const result = await generateText({
        model: modelClient.model,
        system: systemPrompt,
        messages: messages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content
        })),
      });

      return result.text;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to generate response: ${errorMessage}`);
    }
  }

  public async streamResponse(
    model: LargeLanguageModel,
    systemPrompt: string,
    messages: Message[],
    options: StreamOptions = {}
  ): Promise<void> {
    const { onChunk, onComplete, onError, settings } = options;

    try {
      const modelClient = createModelClient(model);
      
      let fullResponse = '';

      const result = await streamText({
        model: modelClient.model,
        system: systemPrompt,
        messages: messages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content
        })),
        temperature: 0,
      });

      for await (const textPart of result.textStream) {
        fullResponse += textPart;
        onChunk?.({ 
          type: 'text-delta', 
          content: textPart 
        });
      }

      onComplete?.(fullResponse);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      onError?.(errorMessage);
    }
  }
}

export const aiModelService = AIModelServiceV2.getInstance();
export const aiModelServiceV2 = aiModelService; // For backward compatibility