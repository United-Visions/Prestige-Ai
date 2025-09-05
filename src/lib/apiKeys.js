import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getModelsByProvider } from './models';
export const useApiKeyStore = create()(persist((set, get) => ({
    apiKeys: {},
    apiKeyStatuses: {},
    cliStatus: {
        claudeCodeAvailable: false,
        hasUsageLimit: false,
    },
    setApiKey: (provider, key) => {
        set((state) => ({
            apiKeys: {
                ...state.apiKeys,
                [provider]: key,
            },
            apiKeyStatuses: {
                ...state.apiKeyStatuses,
                [provider]: {
                    provider,
                    hasKey: true,
                    isValid: false, // Will be validated separately
                    lastChecked: new Date(),
                },
            },
        }));
        // Automatically validate the new key
        get().validateApiKey(provider);
    },
    removeApiKey: (provider) => {
        set((state) => {
            const newApiKeys = { ...state.apiKeys };
            delete newApiKeys[provider];
            const newStatuses = { ...state.apiKeyStatuses };
            delete newStatuses[provider];
            return {
                apiKeys: newApiKeys,
                apiKeyStatuses: newStatuses,
            };
        });
    },
    getApiKey: (provider) => {
        const { apiKeys } = get();
        return apiKeys[provider] || null;
    },
    validateApiKey: async (provider) => {
        const { apiKeys } = get();
        const apiKey = apiKeys[provider];
        if (!apiKey) {
            set((state) => ({
                apiKeyStatuses: {
                    ...state.apiKeyStatuses,
                    [provider]: {
                        provider,
                        hasKey: false,
                        isValid: false,
                        lastChecked: new Date(),
                        errorMessage: 'No API key provided',
                    },
                },
            }));
            return false;
        }
        try {
            let isValid = false;
            let errorMessage;
            // Validate based on provider
            if (provider === 'anthropic') {
                // Simple validation for Anthropic API key format
                if (apiKey.startsWith('sk-ant-')) {
                    // In a real app, you'd make a test API call here
                    isValid = true;
                }
                else {
                    errorMessage = 'Invalid Anthropic API key format';
                }
            }
            else if (provider === 'google') {
                // Simple validation for Google API key format  
                if (apiKey.length > 20) {
                    // In a real app, you'd make a test API call here
                    isValid = true;
                }
                else {
                    errorMessage = 'Invalid Google API key format';
                }
            }
            set((state) => ({
                apiKeyStatuses: {
                    ...state.apiKeyStatuses,
                    [provider]: {
                        provider,
                        hasKey: true,
                        isValid,
                        lastChecked: new Date(),
                        errorMessage,
                    },
                },
            }));
            return isValid;
        }
        catch (error) {
            set((state) => ({
                apiKeyStatuses: {
                    ...state.apiKeyStatuses,
                    [provider]: {
                        provider,
                        hasKey: true,
                        isValid: false,
                        lastChecked: new Date(),
                        errorMessage: error instanceof Error ? error.message : 'Validation failed',
                    },
                },
            }));
            return false;
        }
    },
    checkClaudeCodeCli: async () => {
        try {
            let cliAvailable = false;
            let version = undefined;
            let hasUsageLimit = false;
            let error = undefined;
            // Check if we're in Electron environment
            if (typeof window !== 'undefined' && window.electronAPI) {
                // Try the new enhanced status check first
                if (window.electronAPI.claudeCode.checkStatus) {
                    const status = await window.electronAPI.claudeCode.checkStatus();
                    cliAvailable = status.available;
                    hasUsageLimit = status.hasUsageLimit;
                    error = status.error;
                    // If available, try to get version
                    if (cliAvailable) {
                        try {
                            version = hasUsageLimit ? 'limited' : 'ready';
                        }
                        catch (versionError) {
                            console.warn('Could not get Claude Code version:', versionError);
                            version = 'detected';
                        }
                    }
                }
                else {
                    // Fallback to old method
                    console.log('Using fallback Claude Code detection');
                    cliAvailable = await window.electronAPI.claudeCode.checkAvailability();
                    hasUsageLimit = false; // Can't detect with old method
                    if (cliAvailable) {
                        version = 'detected';
                    }
                }
            }
            set(() => ({
                cliStatus: {
                    claudeCodeAvailable: cliAvailable,
                    version,
                    lastChecked: new Date(),
                    hasUsageLimit,
                    error,
                },
            }));
            console.log('Claude Code CLI Status:', {
                cliAvailable,
                version,
                hasUsageLimit,
                error
            });
            return cliAvailable;
        }
        catch (error) {
            console.error('Error checking Claude Code CLI:', error);
            set(() => ({
                cliStatus: {
                    claudeCodeAvailable: false,
                    lastChecked: new Date(),
                    error: 'Failed to check Claude Code CLI',
                },
            }));
            return false;
        }
    },
    getProviderStatus: (provider) => {
        const { apiKeyStatuses } = get();
        return apiKeyStatuses[provider] || {
            provider,
            hasKey: false,
            isValid: false,
        };
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
        const { apiKeyStatuses, cliStatus } = get();
        const availableProviders = [];
        // Check each provider for valid API keys
        Object.keys(apiKeyStatuses).forEach((provider) => {
            const status = apiKeyStatuses[provider];
            if (status && status.hasKey && status.isValid) {
                availableProviders.push(provider);
            }
        });
        // Check if Claude Code CLI is available
        if (cliStatus.claudeCodeAvailable) {
            availableProviders.push('claude-code');
        }
        // If Aider IPC exposed, consider it available (runtime CLI presence validated later)
        if (typeof window !== 'undefined' && window.electronAPI?.aider) {
            availableProviders.push('aider');
        }
        return availableProviders;
    },
    getRecommendedModel: () => {
        const availableProviders = get().getAvailableProviders();
        if (availableProviders.length === 0) {
            return null;
        }
        // If only one provider available, return its best model
        if (availableProviders.length === 1) {
            const provider = availableProviders[0];
            const models = getModelsByProvider(provider);
            return models.length > 0 ? models[0] : null;
        }
        // Priority order for multiple providers
        const priorityOrder = [
            'aider',
            'claude-code',
            'anthropic',
            'openai',
            'google',
            'openrouter'
        ];
        for (const provider of priorityOrder) {
            if (availableProviders.includes(provider)) {
                const models = getModelsByProvider(provider);
                if (models.length > 0) {
                    return models[0]; // Return the first (best) model for this provider
                }
            }
        }
        return null;
    },
    hasOnlyOneProvider: () => {
        return get().getAvailableProviders().length === 1;
    },
}), {
    name: 'prestige-api-keys',
    // Only persist API keys and statuses, not sensitive data
    partialize: (state) => ({
        apiKeyStatuses: state.apiKeyStatuses,
        cliStatus: state.cliStatus,
        // Note: In a production app, API keys should be stored more securely
        apiKeys: state.apiKeys,
    }),
}));
// Simple wrapper functions for the ApiKeyDialog
export function getApiKey(provider) {
    return useApiKeyStore.getState().getApiKey(provider);
}
export function setApiKey(provider, key) {
    useApiKeyStore.getState().setApiKey(provider, key);
}
export async function validateApiKey(provider, key) {
    if (key) {
        // Set the key first if provided
        setApiKey(provider, key);
    }
    return useApiKeyStore.getState().validateApiKey(provider);
}
export async function checkClaudeCodeCLI() {
    return useApiKeyStore.getState().checkClaudeCodeCli();
}
// Utility functions
// Auto model selection functions
export function getAvailableProviders() {
    return useApiKeyStore.getState().getAvailableProviders();
}
export function getRecommendedModel() {
    return useApiKeyStore.getState().getRecommendedModel();
}
export function hasOnlyOneProvider() {
    return useApiKeyStore.getState().hasOnlyOneProvider();
}
export function shouldAutoSelectModel() {
    return hasOnlyOneProvider() && getRecommendedModel() !== null;
}
export function getAutoSelectedModel() {
    if (shouldAutoSelectModel()) {
        return getRecommendedModel();
    }
    return null;
}
export function getModelAvailability(modelName, provider) {
    const apiKeyStore = useApiKeyStore.getState();
    const status = apiKeyStore.getProviderStatus(provider);
    // Special case for Claude Code
    if (modelName === 'Claude Code') {
        const cliStatus = apiKeyStore.cliStatus;
        return {
            available: status.hasKey && status.isValid || cliStatus.claudeCodeAvailable,
            reason: status.hasKey && status.isValid
                ? 'API key configured'
                : cliStatus.claudeCodeAvailable
                    ? 'CLI available'
                    : 'Requires API key or CLI installation',
            status: status.hasKey && status.isValid || cliStatus.claudeCodeAvailable ? 'ready' : 'needs-setup',
        };
    }
    return {
        available: status.hasKey && status.isValid,
        reason: !status.hasKey
            ? 'API key required'
            : !status.isValid
                ? status.errorMessage || 'Invalid API key'
                : 'Ready to use',
        status: status.hasKey && status.isValid ? 'ready' : 'needs-setup',
    };
}
