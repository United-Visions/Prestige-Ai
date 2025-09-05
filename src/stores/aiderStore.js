import { create } from 'zustand';
import { useApiKeyStore } from '@/lib/apiKeys';
// Default model mapping per provider
const DEFAULT_MODELS = {
    anthropic: 'sonnet', // maps to Claude 3.7 Sonnet shortcut inside aider
    openai: 'o3-mini',
    gemini: 'gemini', // Gemini 2.5 Pro shortcut
};
export const useAiderStore = create((set, get) => ({
    backendProvider: undefined,
    model: undefined,
    preferAider: false,
    setBackend: (provider, model) => set({ backendProvider: provider, model: model || DEFAULT_MODELS[provider] }),
    getCliArgs: () => {
        const { backendProvider, model } = get();
        if (!backendProvider || !model)
            return {};
        const keyStore = useApiKeyStore.getState();
        // Provider mapping for api key namespace expected by aider
        const providerKeyNamespace = backendProvider === 'gemini' ? 'google' : backendProvider; // gemini uses google key env
        const apiKey = keyStore.getApiKey(providerKeyNamespace);
        // Gemini often works without specifying --api-key if env var set; we still pass if present
        const apiKeySpec = apiKey ? `${providerKeyNamespace}=${apiKey}` : undefined;
        return { model, apiKeySpec };
    },
    setPreferAider: (value) => set({ preferAider: value }),
}));
export function buildAiderCommand() {
    const { model, apiKeySpec } = useAiderStore.getState().getCliArgs();
    if (!model)
        return null;
    const parts = ['aider', '--model', model];
    if (apiKeySpec)
        parts.push('--api-key', apiKeySpec);
    // We quote the prompt at call site; return command prefix
    return parts.join(' ');
}
