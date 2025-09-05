import { create } from 'zustand';
import { useApiKeyStore } from '@/lib/apiKeys';

type AiderBackendProvider = 'anthropic' | 'openai' | 'gemini';

interface AiderState {
  backendProvider?: AiderBackendProvider;
  model?: string; // underlying model id passed to --model
  setBackend: (provider: AiderBackendProvider, model?: string) => void;
  getCliArgs: () => { model?: string; apiKeySpec?: string };
  preferAider: boolean;
  setPreferAider: (value: boolean) => void;
}

// Default model mapping per provider
const DEFAULT_MODELS: Record<AiderBackendProvider, string> = {
  anthropic: 'sonnet', // maps to Claude 3.7 Sonnet shortcut inside aider
  openai: 'o3-mini',
  gemini: 'gemini', // Gemini 2.5 Pro shortcut
};

export const useAiderStore = create<AiderState>((set, get) => ({
  backendProvider: undefined,
  model: undefined,
  preferAider: false,
  setBackend: (provider, model) => set({ backendProvider: provider, model: model || DEFAULT_MODELS[provider] }),
  getCliArgs: () => {
    const { backendProvider, model } = get();
    if (!backendProvider || !model) return {};
    const keyStore = useApiKeyStore.getState();
    // Provider mapping for api key namespace expected by aider
    const providerKeyNamespace = backendProvider === 'gemini' ? 'google' : backendProvider; // gemini uses google key env
    const apiKey = keyStore.getApiKey(providerKeyNamespace as any);
    // Gemini often works without specifying --api-key if env var set; we still pass if present
    const apiKeySpec = apiKey ? `${providerKeyNamespace}=${apiKey}` : undefined;
    return { model, apiKeySpec };
  },
  setPreferAider: (value) => set({ preferAider: value }),
}));

export function buildAiderCommand(): string | null {
  const { model, apiKeySpec } = useAiderStore.getState().getCliArgs();
  if (!model) return null;
  const parts = ['aider', '--model', model];
  if (apiKeySpec) parts.push('--api-key', apiKeySpec);
  // We quote the prompt at call site; return command prefix
  return parts.join(' ');
}
