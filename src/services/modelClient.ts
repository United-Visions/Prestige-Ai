import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI as createGoogle } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { LanguageModel } from "ai";
import type { LargeLanguageModel } from "@/lib/models";
import { useApiKeyStore } from "@/lib/apiKeys";

export interface ModelClient {
  model: LanguageModel;
  providerId?: string;
}

export function createModelClient(
  model: LargeLanguageModel
): ModelClient {
  const apiKeyStore = useApiKeyStore.getState();
  
  switch (model.provider) {
    case "openai": {
      const apiKey = apiKeyStore.getApiKey('openai');
      if (!apiKey) {
        throw new Error('OpenAI API key not found.');
      }
      const provider = createOpenAI({ apiKey });
      return {
        model: provider(model.name),
        providerId: model.provider,
      };
    }
    
    case "anthropic": {
      const apiKey = apiKeyStore.getApiKey('anthropic');
      if (!apiKey) {
        throw new Error('Anthropic API key not found.');
      }
      const provider = createAnthropic({ apiKey });
      return {
        model: provider(model.name),
        providerId: model.provider,
      };
    }
    
    case "google": {
      const apiKey = apiKeyStore.getApiKey('google');
      if (!apiKey) {
        throw new Error('Google API key not found.');
      }
      const provider = createGoogle({ apiKey });
      return {
        model: provider(model.name),
        providerId: model.provider,
      };
    }
    
    case "openrouter": {
      const apiKey = apiKeyStore.getApiKey('openrouter');
      if (!apiKey) {
        throw new Error('OpenRouter API key not found.');
      }
      const provider = createOpenRouter({ apiKey });
      return {
        model: provider(model.name),
        providerId: model.provider,
      };
    }
    
    case "ollama": {
      const provider = createOpenAICompatible({
        name: "ollama",
        baseURL: "http://localhost:11434/v1",
      });
      return {
        model: provider(model.name),
        providerId: model.provider,
      };
    }
    
    case "lmstudio": {
      const provider = createOpenAICompatible({
        name: "lmstudio",
        baseURL: "http://localhost:1234/v1",
      });
      return {
        model: provider(model.name),
        providerId: model.provider,
      };
    }
    
    case "auto": {
      // For auto, try to find the first available API key
      const providers = ['anthropic', 'google', 'openai'] as const;
      
      for (const providerName of providers) {
        const apiKey = apiKeyStore.getApiKey(providerName);
        if (apiKey) {
          // Use default models for each provider
          const defaultModels = {
            anthropic: "claude-sonnet-4-20250514",
            google: "gemini-2.5-flash", 
            openai: "gpt-4.1"
          };
          
          const autoModel: LargeLanguageModel = {
            ...model,
            provider: providerName,
            name: defaultModels[providerName]
          };
          
          return createModelClient(autoModel);
        }
      }
      
      throw new Error('No API keys available for any model supported by the "auto" provider.');
    }
    
    default:
      throw new Error(`Unsupported model provider: ${model.provider}`);
  }
}