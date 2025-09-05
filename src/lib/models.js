import { z } from "zod";
export const ModelProviderSchema = z.enum([
    "anthropic",
    "google",
    "openai",
    "auto",
    "ollama",
    "lmstudio",
    "openrouter",
    "claude-code",
    "aider",
]);
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
// OpenAI models
export const openaiModels = [
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
export const anthropicModels = [
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
export const googleModels = [
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
export const openrouterModels = [
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
// Auto models
export const autoModels = [
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
// Claude Code models
export const claudeCodeModels = [
    {
        name: "claude-code",
        provider: "claude-code",
        requiresApiKey: false,
        requiresCli: true,
        cost: "CLI-based",
        contextWindow: 200000,
        maxOutputTokens: 8000,
        description: "Premium AI assistant with advanced code understanding and tool access"
    }
];
// Aider CLI model (meta wrapper; actual underlying model chosen via CLI flags)
export const aiderModels = [
    {
        name: "aider-cli",
        provider: "aider",
        requiresApiKey: false, // Provided inline to CLI when needed
        requiresCli: true,
        cost: "Depends on backend (DeepSeek/Claude/OpenAI/Gemini)",
        contextWindow: 200000,
        maxOutputTokens: 8000,
        description: "Aider AI CLI wrapper supporting multi-provider editing"
    }
];
export const allModels = [...openaiModels, ...anthropicModels, ...googleModels, ...openrouterModels, ...autoModels, ...claudeCodeModels, ...aiderModels];
export const modelProviders = [
    {
        id: "openai",
        name: "OpenAI",
        description: "GPT models for advanced reasoning and coding",
        models: openaiModels,
        apiKeyRequired: true,
        icon: "🤖",
        envVar: "OPENAI_API_KEY"
    },
    {
        id: "anthropic",
        name: "Anthropic",
        description: "Claude models for advanced reasoning and coding",
        models: anthropicModels,
        apiKeyRequired: true,
        icon: "🧠",
        envVar: "ANTHROPIC_API_KEY"
    },
    {
        id: "google",
        name: "Google",
        description: "Gemini models for multimodal AI tasks",
        models: googleModels,
        apiKeyRequired: true,
        icon: "🌐",
        envVar: "GOOGLE_API_KEY"
    },
    {
        id: "openrouter",
        name: "OpenRouter",
        description: "Access to various open source models",
        models: openrouterModels,
        apiKeyRequired: true,
        icon: "🌐",
        envVar: "OPENROUTER_API_KEY"
    },
    {
        id: "auto",
        name: "Auto",
        description: "Automatically selects the best model",
        models: autoModels,
        apiKeyRequired: false,
        icon: "⚡",
        envVar: undefined
    },
    {
        id: "claude-code",
        name: "Claude Code",
        description: "Premium AI with CLI integration",
        models: claudeCodeModels,
        apiKeyRequired: false,
        icon: "💻",
        envVar: undefined
    },
    {
        id: "aider",
        name: "Aider",
        description: "Aider CLI (DeepSeek, Claude, OpenAI, Gemini)",
        models: aiderModels,
        apiKeyRequired: false,
        icon: "🛠️",
        envVar: undefined
    }
];
// Providers that support thinking
export const PROVIDERS_THAT_SUPPORT_THINKING = [
    "google",
    "anthropic", // Claude 3.5 and newer models support thinking
    "auto",
];
export function getModelsByProvider(provider) {
    return allModels.filter(model => model.provider === provider);
}
export function getProviderInfo(provider) {
    return modelProviders.find(p => p.id === provider);
}
export const DEFAULT_MODEL = anthropicModels[0]; // Claude 4 Sonnet
