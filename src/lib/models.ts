import { z } from "zod";

export const ModelProviderSchema = z.enum([
  "anthropic",
  "google", 
  "openai",
  "auto",
  "ollama",
  "lmstudio",
  "openrouter",
]);

export type ModelProvider = z.infer<typeof ModelProviderSchema>;

export const LargeLanguageModelSchema = z.object({
  name: z.string(),
  provider: ModelProviderSchema,
  customModelId: z.number().optional(),
  requiresApiKey: z.boolean().default(true),
  requiresCli: z.boolean().default(false),
  cost: z.string().optional(),
  contextWindow: z.number().optional(),
  description: z.string().optional(),
  maxOutputTokens: z.number().optional(),
  tag: z.string().optional(),
});

export type LargeLanguageModel = z.infer<typeof LargeLanguageModelSchema>;

// OpenAI models
export const openaiModels: LargeLanguageModel[] = [
  {
    name: "gpt-4.1",
    provider: "openai",
    requiresApiKey: true,
    requiresCli: false,
    cost: "$5/$15 per 1M tokens",
    contextWindow: 1047576,
    maxOutputTokens: 32768,
    description: "OpenAI's flagship model"
  },
  {
    name: "gpt-4.1-mini",
    provider: "openai",
    requiresApiKey: true,
    requiresCli: false,
    cost: "$0.15/$0.60 per 1M tokens",
    contextWindow: 1047576,
    maxOutputTokens: 32768,
    description: "OpenAI's lightweight, but intelligent model"
  },
  {
    name: "o3-mini",
    provider: "openai",
    requiresApiKey: true,
    requiresCli: false,
    cost: "$1.25/$5 per 1M tokens",
    contextWindow: 200000,
    maxOutputTokens: 32000,
    description: "Reasoning model"
  },
  {
    name: "o4-mini",
    provider: "openai",
    requiresApiKey: true,
    requiresCli: false,
    cost: "$1.25/$5 per 1M tokens",
    contextWindow: 200000,
    maxOutputTokens: 32000,
    description: "Reasoning model"
  }
];

// Anthropic/Claude models (including Claude Code)
export const anthropicModels: LargeLanguageModel[] = [
  {
    name: "claude-sonnet-4-20250514",
    provider: "anthropic",
    requiresApiKey: true,
    requiresCli: false,
    cost: "$3/$15 per 1M tokens",
    contextWindow: 200000,
    maxOutputTokens: 16000,
    description: "Excellent coder"
  },
  {
    name: "claude-3-7-sonnet-latest",
    provider: "anthropic",
    requiresApiKey: true,
    requiresCli: false,
    cost: "$3/$15 per 1M tokens",
    contextWindow: 200000,
    maxOutputTokens: 16000,
    description: "Excellent coder"
  },
  {
    name: "claude-3-5-sonnet-20241022",
    provider: "anthropic", 
    requiresApiKey: true,
    requiresCli: false,
    cost: "$3/$15 per 1M tokens",
    contextWindow: 200000,
    maxOutputTokens: 8000,
    description: "Good coder, excellent at following instructions"
  },
  {
    name: "claude-3-5-haiku-20241022",
    provider: "anthropic",
    requiresApiKey: true,
    requiresCli: false,
    cost: "$0.25/$1.25 per 1M tokens", 
    contextWindow: 200000,
    maxOutputTokens: 8000,
    description: "Lightweight coder"
  }
];

// Google/Gemini models  
export const googleModels: LargeLanguageModel[] = [
  {
    name: "gemini-2.5-pro",
    provider: "google",
    requiresApiKey: true,
    requiresCli: false,
    cost: "$2.50/$7.50 per 1M tokens",
    contextWindow: 1048576,
    maxOutputTokens: 65535,
    description: "Google's Gemini 2.5 Pro model"
  },
  {
    name: "gemini-2.5-flash",
    provider: "google",
    requiresApiKey: true, 
    requiresCli: false,
    cost: "$0.075/$0.30 per 1M tokens",
    contextWindow: 1048576,
    maxOutputTokens: 65535,
    description: "Google's Gemini 2.5 Flash model (free tier available)"
  }
];

// OpenRouter models
export const openrouterModels: LargeLanguageModel[] = [
  {
    name: "deepseek/deepseek-chat-v3-0324:free",
    provider: "openrouter",
    requiresApiKey: true,
    requiresCli: false,
    cost: "Free (data may be used for training)",
    contextWindow: 128000,
    maxOutputTokens: 32000,
    description: "Use for free (data may be used for training)"
  },
  {
    name: "deepseek/deepseek-r1-0528",
    provider: "openrouter",
    requiresApiKey: true,
    requiresCli: false,
    cost: "$0.55/$2.19 per 1M tokens",
    contextWindow: 128000,
    maxOutputTokens: 32000,
    description: "Good reasoning model with excellent price for performance"
  }
];

// Ollama models (local)
export const ollamaModels: LargeLanguageModel[] = [
  {
    name: "llama3.3:70b",
    provider: "ollama",
    requiresApiKey: false,
    requiresCli: false,
    cost: "Free (local)",
    contextWindow: 128000,
    maxOutputTokens: 32000,
    description: "Meta's Llama 3.3 70B model running locally"
  },
  {
    name: "deepseek-r1:32b",
    provider: "ollama",
    requiresApiKey: false,
    requiresCli: false,
    cost: "Free (local)",
    contextWindow: 128000,
    maxOutputTokens: 32000,
    description: "DeepSeek R1 32B reasoning model running locally"
  },
  {
    name: "qwen2.5-coder:32b",
    provider: "ollama",
    requiresApiKey: false,
    requiresCli: false,
    cost: "Free (local)",
    contextWindow: 128000,
    maxOutputTokens: 32000,
    description: "Alibaba's Qwen 2.5 Coder model for programming tasks"
  }
];

// LM Studio models (local)
export const lmstudioModels: LargeLanguageModel[] = [
  {
    name: "local-model",
    provider: "lmstudio",
    requiresApiKey: false,
    requiresCli: false,
    cost: "Free (local)",
    contextWindow: 128000,
    maxOutputTokens: 32000,
    description: "Any model running in LM Studio"
  }
];

// Auto models
export const autoModels: LargeLanguageModel[] = [
  {
    name: "auto",
    provider: "auto",
    requiresApiKey: false,
    requiresCli: false,
    cost: "Variable",
    contextWindow: 1000000,
    maxOutputTokens: 32000,
    tag: "Default",
    description: "Automatically selects the best model"
  }
];


export const allModels = [...openaiModels, ...anthropicModels, ...googleModels, ...openrouterModels, ...ollamaModels, ...lmstudioModels, ...autoModels];

export const modelProviders = [
  {
    id: "openai" as const,
    name: "OpenAI",
    description: "GPT models for advanced reasoning and coding",
    models: openaiModels,
    apiKeyRequired: true,
    icon: "🤖",
    envVar: "OPENAI_API_KEY"
  },
  {
    id: "anthropic" as const,
    name: "Anthropic",
    description: "Claude models for advanced reasoning and coding",
    models: anthropicModels,
    apiKeyRequired: true,
    icon: "🧠",
    envVar: "ANTHROPIC_API_KEY"
  },
  {
    id: "google" as const, 
    name: "Google",
    description: "Gemini models for multimodal AI tasks",
    models: googleModels,
    apiKeyRequired: true,
    icon: "🌐",
    envVar: "GOOGLE_API_KEY"
  },
  {
    id: "openrouter" as const,
    name: "OpenRouter",
    description: "Access to various open source models",
    models: openrouterModels,
    apiKeyRequired: true,
    icon: "🌐",
    envVar: "OPENROUTER_API_KEY"
  },
  {
    id: "ollama" as const,
    name: "Ollama",
    description: "Run open source models locally",
    models: ollamaModels,
    apiKeyRequired: false,
    icon: "🦙",
    envVar: undefined
  },
  {
    id: "lmstudio" as const,
    name: "LM Studio",
    description: "Run models locally with LM Studio",
    models: lmstudioModels,
    apiKeyRequired: false,
    icon: "💻",
    envVar: undefined
  },
  {
    id: "auto" as const,
    name: "Auto",
    description: "Automatically selects the best model",
    models: autoModels,
    apiKeyRequired: false,
    icon: "⚡",
    envVar: undefined
  }
];

// Providers that support thinking
export const PROVIDERS_THAT_SUPPORT_THINKING: ModelProvider[] = [
  "google",
  "anthropic", // Claude 3.5 and newer models support thinking
  "auto",
];

export function getModelsByProvider(provider: ModelProvider): LargeLanguageModel[] {
  return allModels.filter(model => model.provider === provider);
}

export function getProviderInfo(provider: ModelProvider) {
  return modelProviders.find(p => p.id === provider);
}

export const DEFAULT_MODEL = anthropicModels[0]; // Claude 4 Sonnet