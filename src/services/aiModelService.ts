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
      let inThinkingBlock = false;

      // Enhanced provider options based on dyad's implementation
      // Only add thinking config if the service is stable
      const providerOptions: any = {};
      
      try {
        // Configure thinking/reasoning for different providers (with fallback)
        if (model.provider === 'google') {
          // Google Gemini thinking config - commented out due to 503 errors
          // providerOptions.google = {
          //   thinkingConfig: {
          //     includeThoughts: true,
          //   },
          // };
        } else if (model.provider === 'openai') {
          providerOptions.openai = {
            reasoningSummary: "auto",
          };
        }
      } catch (configError) {
        console.warn('Provider config error, using fallback:', configError);
      }

      // Try with enhanced options first, fallback to basic on error
      let result;
      try {
        result = await streamText({
          model: modelClient.model,
          system: systemPrompt,
          messages: messages.map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content
          })),
          temperature: 0.1,
          maxRetries: 1,
          providerOptions,
        });
      } catch (enhancedError: any) {
        console.warn('Enhanced streaming failed, trying basic mode:', enhancedError?.message);
        
        // Fallback to basic streaming without special provider options
        result = await streamText({
          model: modelClient.model,
          system: systemPrompt,
          messages: messages.map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content
          })),
          temperature: 0.1,
          maxRetries: 2,
        });
      }

      // Check if we have fullStream support (reasoning models) or fallback to textStream
      if (result.fullStream) {
        try {
          // Process both reasoning and text streams
          for await (const part of result.fullStream) {
            let chunk = '';
            
            if (part.type === 'text-delta') {
              // Handle transition from thinking to response
              if (inThinkingBlock) {
                chunk = '</think>';
                inThinkingBlock = false;
                onChunk?.({ type: 'text-delta', content: chunk });
                chunk = '';
              }
              chunk += part.text;
              fullResponse += part.text;
              
              if (chunk) {
                onChunk?.({ 
                  type: 'text-delta', 
                  content: chunk 
                });
              }
            } else if (part.type === 'reasoning-delta') {
              // Handle thinking/reasoning content
              if (!inThinkingBlock) {
                chunk = '<think>';
                inThinkingBlock = true;
                onChunk?.({ type: 'reasoning', content: chunk });
              }
              
              // Escape dyad tags in reasoning content to prevent conflicts
              const escapedText = this.escapeDyadTags(part.text);
              onChunk?.({ 
                type: 'reasoning', 
                content: escapedText 
              });
            }
          }
        } catch (streamError) {
          console.warn('Full stream processing failed, falling back to text stream:', streamError);
          // Fallback to basic text streaming
          fullResponse = await this.processBasicTextStream(result, fullResponse, onChunk);
        }
      } else {
        // Fallback to basic text streaming
        fullResponse = await this.processBasicTextStream(result, fullResponse, onChunk);
      }
      
      // Close any open thinking block
      if (inThinkingBlock) {
        onChunk?.({ type: 'reasoning', content: '</think>' });
      }

      onComplete?.(fullResponse);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Stream response error:', errorMessage);
      
      // Provide more specific error handling
      if (errorMessage.includes('503') || errorMessage.includes('Service Unavailable') || errorMessage.includes('overloaded')) {
        onError?.('The AI service is temporarily overloaded. Please try again in a moment.');
      } else if (errorMessage.includes('API key')) {
        onError?.('Please check your API key configuration.');
      } else {
        onError?.(errorMessage);
      }
    }
  }

  private async processBasicTextStream(
    result: any, 
    fullResponse: string, 
    onChunk?: (chunk: StreamChunk) => void
  ): Promise<string> {
    for await (const textPart of result.textStream) {
      fullResponse += textPart;
      onChunk?.({ 
        type: 'text-delta', 
        content: textPart 
      });
    }
    return fullResponse;
  }

  private escapeDyadTags(text: string): string {
    // Escape dyad tags in reasoning content to avoid conflicts
    // Using look-alike characters as dyad does
    return text.replace(/<dyad/g, "＜dyad").replace(/<\/dyad/g, "＜/dyad");
  }
}

export const aiModelService = AIModelServiceV2.getInstance();
export const aiModelServiceV2 = aiModelService; // For backward compatibility