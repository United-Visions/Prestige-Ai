import { z } from "zod";
// Model and Provider schemas
export const ModelProviderSchema = z.enum([
    "claude",
    "gemini",
    "claude-code",
    "aider",
    "auto",
    "ollama",
    "lmstudio",
]);
export const LargeLanguageModelSchema = z.object({
    name: z.string(),
    provider: ModelProviderSchema,
    customModelId: z.number().optional(),
});
// Chat mode
export const ChatModeSchema = z.enum(["build", "ask"]);
// Secret handling
export const SecretSchema = z.object({
    value: z.string(),
    encryptionType: z.enum(["electron-safe-storage", "plaintext"]).optional(),
});
// Provider settings
export const ProviderSettingSchema = z.object({
    apiKey: SecretSchema.optional(),
});
// GitHub settings
export const GitHubSecretsSchema = z.object({
    accessToken: SecretSchema.nullable(),
});
export const GithubUserSchema = z.object({
    email: z.string(),
    username: z.string().optional(),
    name: z.string().optional(),
});
// Main settings schema
export const UserSettingsSchema = z.object({
    selectedModel: LargeLanguageModelSchema,
    providerSettings: z.record(z.string(), ProviderSettingSchema),
    selectedTemplateId: z.string().optional(),
    selectedChatMode: ChatModeSchema.optional(),
    // GitHub integration
    githubUser: GithubUserSchema.optional(),
    githubAccessToken: SecretSchema.optional(),
    // Features
    autoApproveChanges: z.boolean().optional(),
    enableAutoFixProblems: z.boolean().optional(),
    enableNativeGit: z.boolean().optional(),
    // Privacy & telemetry
    telemetryConsent: z.enum(["opted_in", "opted_out", "unset"]).optional(),
    telemetryUserId: z.string().optional(),
    // First run
    hasRunBefore: z.boolean().optional(),
    lastShownReleaseNotesVersion: z.string().optional(),
    // Context settings
    maxChatTurnsInContext: z.number().optional(),
    // Theme and UI
    theme: z.enum(["light", "dark", "system"]).optional(),
    // Developer settings
    isTestMode: z.boolean().optional(),
});
// Default settings
export const DEFAULT_SETTINGS = {
    selectedModel: {
        name: "claude-3-5-sonnet-20241022",
        provider: "claude",
    },
    providerSettings: {},
    selectedTemplateId: "vite-react",
    selectedChatMode: "build",
    autoApproveChanges: false,
    enableAutoFixProblems: true,
    enableNativeGit: true,
    telemetryConsent: "unset",
    hasRunBefore: false,
    maxChatTurnsInContext: 20,
    theme: "system",
    isTestMode: false,
};
// Helper functions
export function mergeWithDefaults(settings) {
    return { ...DEFAULT_SETTINGS, ...settings };
}
export function isProviderConfigured(settings, provider, envVars) {
    // Special handling for providers that don't need API keys
    if (provider === "claude-code" || provider === "auto") {
        return true;
    }
    if (provider === "aider") {
        // Aider can work with inline api key flags; treat as configured if CLI present (renderer will check)
        return true;
    }
    // Check user settings
    const providerSettings = settings.providerSettings[provider];
    if (providerSettings?.apiKey?.value) {
        return true;
    }
    // Check environment variables
    if (envVars) {
        const envVarMap = {
            claude: "ANTHROPIC_API_KEY",
            gemini: "GOOGLE_API_KEY",
        };
        const envVarName = envVarMap[provider];
        if (envVarName && envVars[envVarName]) {
            return true;
        }
    }
    return false;
}
export function validateSettings(settings) {
    try {
        return UserSettingsSchema.parse(settings);
    }
    catch (error) {
        console.warn("Invalid settings format, using defaults:", error);
        return DEFAULT_SETTINGS;
    }
}
