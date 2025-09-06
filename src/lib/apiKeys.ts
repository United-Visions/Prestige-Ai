import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ModelProvider, LargeLanguageModel, getModelsByProvider, getProviderInfo } from './models';

// Environment variable detection
function getEnvVar(name: string): string | undefined {
  if (typeof window !== 'undefined' && window.electronAPI) {
    return window.electronAPI.getEnvVar(name);
  }
  return undefined;
}

// Helper function to mask ENV API keys
function maskEnvApiKey(key: string | undefined): string {
  if (!key) return 'Not Set';
  if (key.length < 8) return '****';
  return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
}

export interface ApiKeyStatus {
  provider: ModelProvider;
  hasKey: boolean;
  isValid: boolean;
  lastChecked?: Date;
  errorMessage?: string;
  hasEnvKey?: boolean;
  envKeyValue?: string;
}

export interface ModelAvailability {
  status: 'ready' | 'api_key_required' | 'unavailable';
  message?: string;
}

interface ApiKeyStore {
  // API Keys (stored securely)
  apiKeys: Record<ModelProvider, string>;
  
  // Environment variables cache
  envVars: Record<string, string | undefined>;
  
  // Status tracking
  apiKeyStatuses: Record<ModelProvider, ApiKeyStatus>;
  
  // Actions
  setApiKey: (provider: ModelProvider, key: string) => void;
  removeApiKey: (provider: ModelProvider) => void;
  getApiKey: (provider: ModelProvider) => string | null;
  getEffectiveApiKey: (provider: ModelProvider) => string | null;
  validateApiKey: (provider: ModelProvider) => Promise<boolean>;
  getProviderStatus: (provider: ModelProvider) => ApiKeyStatus;
  updateProviderStatus: (provider: ModelProvider, status: Partial<ApiKeyStatus>) => void;
  refreshEnvVars: () => void;
  getAvailableProviders: () => ModelProvider[];
  getRecommendedModel: () => LargeLanguageModel | null;
}

const defaultApiKeyStatus = (provider: ModelProvider): ApiKeyStatus => ({
  provider,
  hasKey: false,
  isValid: false,
  hasEnvKey: false,
});

// Initialize environment variables
function initializeEnvVars(): Record<string, string | undefined> {
  const envVars: Record<string, string | undefined> = {};
  
  // Get all provider environment variable names
  const allProviders = ['openai', 'anthropic', 'google', 'openrouter'] as ModelProvider[];
  
  allProviders.forEach(provider => {
    const providerInfo = getProviderInfo(provider);
    if (providerInfo?.envVar) {
      const envValue = getEnvVar(providerInfo.envVar);
      envVars[providerInfo.envVar] = envValue;
    }
  });
  
  return envVars;
}

export const useApiKeyStore = create<ApiKeyStore>()(
  persist(
    (set, get) => ({
      apiKeys: {} as Record<ModelProvider, string>,
      envVars: initializeEnvVars(),
      apiKeyStatuses: {
        openai: defaultApiKeyStatus('openai'),
        anthropic: defaultApiKeyStatus('anthropic'),
        google: defaultApiKeyStatus('google'),
        openrouter: defaultApiKeyStatus('openrouter'),
        ollama: { provider: 'ollama', hasKey: true, isValid: true, hasEnvKey: false },
        lmstudio: { provider: 'lmstudio', hasKey: true, isValid: true, hasEnvKey: false },
        auto: defaultApiKeyStatus('auto'),
      } as Record<ModelProvider, ApiKeyStatus>,

      setApiKey: (provider, key) => {
        set((state) => ({
          apiKeys: {
            ...state.apiKeys,
            [provider]: key,
          },
          apiKeyStatuses: {
            ...state.apiKeyStatuses,
            [provider]: {
              ...state.apiKeyStatuses[provider],
              hasKey: !!key,
              isValid: false, // Will be validated later
              lastChecked: new Date(),
            },
          },
        }));
      },

      removeApiKey: (provider) => {
        set((state) => {
          const newApiKeys = { ...state.apiKeys };
          delete newApiKeys[provider];
          
          return {
            apiKeys: newApiKeys,
            apiKeyStatuses: {
              ...state.apiKeyStatuses,
              [provider]: defaultApiKeyStatus(provider),
            },
          };
        });
      },

      getApiKey: (provider) => {
        return get().apiKeys[provider] || null;
      },

      getEffectiveApiKey: (provider) => {
        const state = get();
        const userKey = state.apiKeys[provider];
        if (userKey) return userKey;
        
        // Fallback to environment variable
        const providerInfo = getProviderInfo(provider);
        if (providerInfo?.envVar) {
          return state.envVars[providerInfo.envVar] || null;
        }
        
        return null;
      },

      refreshEnvVars: () => {
        const envVars = initializeEnvVars();
        set((state) => {
          // Update environment variable status for each provider
          const updatedStatuses = { ...state.apiKeyStatuses };
          
          Object.keys(updatedStatuses).forEach(providerKey => {
            const provider = providerKey as ModelProvider;
            const providerInfo = getProviderInfo(provider);
            
            if (providerInfo?.envVar) {
              const hasEnvKey = !!envVars[providerInfo.envVar];
              updatedStatuses[provider] = {
                ...updatedStatuses[provider],
                hasEnvKey,
                envKeyValue: envVars[providerInfo.envVar],
              };
            }
          });
          
          return {
            envVars,
            apiKeyStatuses: updatedStatuses,
          };
        });
      },

      validateApiKey: async (provider) => {
        const apiKey = get().getApiKey(provider);
        if (!apiKey) return false;

        // For now, just assume the key is valid if it exists
        // In a real implementation, you'd make API calls to validate
        get().updateProviderStatus(provider, { isValid: true });
        return true;
      },

      getProviderStatus: (provider) => {
        return get().apiKeyStatuses[provider] || defaultApiKeyStatus(provider);
      },

      updateProviderStatus: (provider, status) => {
        set((state) => ({
          apiKeyStatuses: {
            ...state.apiKeyStatuses,
            [provider]: {
              ...state.apiKeyStatuses[provider],
              ...status,
            },
          },
        }));
      },

      getAvailableProviders: () => {
        const state = get();
        return Object.keys(state.apiKeyStatuses)
          .filter((provider) => {
            const status = state.apiKeyStatuses[provider as ModelProvider];
            const providerType = provider as ModelProvider;
            
            // Local providers are always available
            if (providerType === 'ollama' || providerType === 'lmstudio') {
              return true;
            }
            
            // Check if user has set a key OR environment variable is available
            const hasUserKey = status.hasKey && status.isValid;
            const hasValidEnvKey = status.hasEnvKey;
            
            return hasUserKey || hasValidEnvKey;
          }) as ModelProvider[];
      },

      getRecommendedModel: () => {
        const availableProviders = get().getAvailableProviders();
        
        // Priority order for recommendations
        const providerPriority: ModelProvider[] = ['anthropic', 'openai', 'google', 'openrouter', 'auto'];
        
        for (const provider of providerPriority) {
          if (availableProviders.includes(provider)) {
            const models = getModelsByProvider(provider);
            if (models.length > 0) {
              return models[0];
            }
          }
        }
        
        return null;
      },
    }),
    {
      name: 'api-keys-store-v3',
      partialize: (state) => ({
        apiKeys: state.apiKeys,
        apiKeyStatuses: state.apiKeyStatuses,
      }),
    }
  )
);

export function getModelAvailability(modelName: string, provider: ModelProvider): ModelAvailability {
  const store = useApiKeyStore.getState();
  const status = store.getProviderStatus(provider);
  
  // Local providers are always available
  if (provider === 'ollama' || provider === 'lmstudio') {
    return { status: 'ready' };
  }
  
  // Auto provider logic
  if (provider === 'auto') {
    const availableProviders = store.getAvailableProviders();
    if (availableProviders.length > 0) {
      return { status: 'ready' };
    }
    return { 
      status: 'api_key_required', 
      message: 'At least one API key is required for auto mode' 
    };
  }
  
  // Check if we have either user key or environment key
  const hasUserKey = status.hasKey && status.isValid;
  const hasEnvKey = status.hasEnvKey;
  
  if (!hasUserKey && !hasEnvKey) {
    return { 
      status: 'api_key_required', 
      message: `${provider} API key required` 
    };
  }
  
  if (hasUserKey || hasEnvKey) {
    return { status: 'ready' };
  }
  
  return { 
    status: 'unavailable', 
    message: 'Invalid API key' 
  };
}

// Standalone functions for backward compatibility
export function getApiKey(provider: ModelProvider): string | null {
  return useApiKeyStore.getState().getApiKey(provider);
}

export function setApiKey(provider: ModelProvider, key: string): void {
  useApiKeyStore.getState().setApiKey(provider, key);
}

export async function validateApiKey(provider: ModelProvider): Promise<boolean> {
  return useApiKeyStore.getState().validateApiKey(provider);
}

export function checkClaudeCodeCLI(): boolean {
  // Since we removed Claude Code CLI, always return false
  return false;
}