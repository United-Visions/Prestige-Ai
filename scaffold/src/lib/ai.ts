import { google } from '@ai-sdk/google';
import { generateText, streamText, generateObject } from 'ai';
import { z } from 'zod';

// AI Configuration
const AI_CONFIG = {
  model: 'gemini-2.5-flash', // Default model
  apiKey: import.meta.env.VITE_GEMINI_API_KEY,
  maxTokens: 1000,
  temperature: 0.7,
};

// Check if AI is properly configured
export const isAIConfigured = (): boolean => {
  return !!AI_CONFIG.apiKey;
};

// Get API key setup instructions
export const getAPIKeyInstructions = () => {
  return {
    provider: 'Google Gemini',
    url: 'https://aistudio.google.com/app/apikey',
    envVar: 'VITE_GEMINI_API_KEY',
    instructions: [
      '1. Go to Google AI Studio: https://aistudio.google.com/app/apikey',
      '2. Sign in with your Google account',
      '3. Click "Create API key"',
      '4. Copy the generated API key',
      '5. Add to your .env file: VITE_GEMINI_API_KEY=your_key_here'
    ]
  };
};

// Initialize Gemini model
const getModel = () => {
  if (!AI_CONFIG.apiKey) {
    throw new Error('Gemini API key not configured. Please set VITE_GEMINI_API_KEY in your environment variables.');
  }
  return google(AI_CONFIG.model, {
    apiKey: AI_CONFIG.apiKey,
  });
};

// Simple text generation
export const generateAIText = async (prompt: string, options?: {
  maxTokens?: number;
  temperature?: number;
}) => {
  try {
    const model = getModel();
    const result = await generateText({
      model,
      prompt,
      maxTokens: options?.maxTokens || AI_CONFIG.maxTokens,
      temperature: options?.temperature || AI_CONFIG.temperature,
    });
    
    return {
      success: true,
      text: result.text,
      usage: result.usage
    };
  } catch (error) {
    console.error('AI text generation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

// Streaming text generation
export const streamAIText = async (
  prompt: string,
  onChunk: (chunk: string) => void,
  options?: {
    maxTokens?: number;
    temperature?: number;
  }
) => {
  try {
    const model = getModel();
    const result = await streamText({
      model,
      prompt,
      maxTokens: options?.maxTokens || AI_CONFIG.maxTokens,
      temperature: options?.temperature || AI_CONFIG.temperature,
    });

    for await (const delta of result.textStream) {
      onChunk(delta);
    }

    return {
      success: true,
      usage: await result.usage
    };
  } catch (error) {
    console.error('AI streaming failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

// Structured object generation with Zod schema
export const generateAIObject = async <T>(
  prompt: string,
  schema: z.ZodSchema<T>,
  options?: {
    maxTokens?: number;
    temperature?: number;
  }
) => {
  try {
    const model = getModel();
    const result = await generateObject({
      model,
      prompt,
      schema,
      maxTokens: options?.maxTokens || AI_CONFIG.maxTokens,
      temperature: options?.temperature || AI_CONFIG.temperature,
    });

    return {
      success: true,
      object: result.object,
      usage: result.usage
    };
  } catch (error) {
    console.error('AI object generation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

// Chat conversation with system prompt
export const chatWithAI = async (
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  options?: {
    maxTokens?: number;
    temperature?: number;
  }
) => {
  try {
    const model = getModel();
    const result = await generateText({
      model,
      messages,
      maxTokens: options?.maxTokens || AI_CONFIG.maxTokens,
      temperature: options?.temperature || AI_CONFIG.temperature,
    });

    return {
      success: true,
      message: result.text,
      usage: result.usage
    };
  } catch (error) {
    console.error('AI chat failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

// Streaming chat with system prompt
export const streamChatWithAI = async (
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  onChunk: (chunk: string) => void,
  options?: {
    maxTokens?: number;
    temperature?: number;
  }
) => {
  try {
    const model = getModel();
    const result = await streamText({
      model,
      messages,
      maxTokens: options?.maxTokens || AI_CONFIG.maxTokens,
      temperature: options?.temperature || AI_CONFIG.temperature,
    });

    for await (const delta of result.textStream) {
      onChunk(delta);
    }

    return {
      success: true,
      usage: await result.usage
    };
  } catch (error) {
    console.error('AI streaming chat failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

// Content enhancement utilities
export const enhanceContent = async (content: string, type: 'blog' | 'product' | 'social' = 'blog') => {
  const prompts = {
    blog: `Enhance this blog content to be more engaging, well-structured, and SEO-friendly:\n\n${content}`,
    product: `Improve this product description to be more compelling and highlight key benefits:\n\n${content}`,
    social: `Rewrite this content to be more engaging for social media with appropriate tone:\n\n${content}`
  };

  return await generateAIText(prompts[type]);
};

// Summarization
export const summarizeContent = async (content: string, maxLength = 150) => {
  const prompt = `Summarize the following content in no more than ${maxLength} characters, maintaining the key points:\n\n${content}`;
  return await generateAIText(prompt, { maxTokens: 100 });
};

// Generate tags/categories
export const generateTags = async (content: string, maxTags = 5) => {
  const tagSchema = z.object({
    tags: z.array(z.string()).max(maxTags).describe('Relevant tags for the content')
  });

  const prompt = `Generate ${maxTags} relevant tags for this content:\n\n${content}`;
  return await generateAIObject(prompt, tagSchema);
};

// SEO meta generation
export const generateSEOMeta = async (content: string, title?: string) => {
  const seoSchema = z.object({
    title: z.string().max(60).describe('SEO-optimized title'),
    description: z.string().max(160).describe('Meta description'),
    keywords: z.array(z.string()).max(10).describe('SEO keywords')
  });

  const prompt = `Generate SEO metadata for this content${title ? ` with title: ${title}` : ''}:\n\n${content}`;
  return await generateAIObject(prompt, seoSchema);
};

// Export AI configuration for external use
export { AI_CONFIG };