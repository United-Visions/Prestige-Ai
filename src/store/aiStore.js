import { create } from 'zustand';
import { persist } from 'zustand/middleware';
export const useAIStore = create()(persist((set) => ({
    // Initial state
    messages: [],
    isGenerating: false,
    currentModel: null,
    apps: [],
    currentApp: null,
    previewVisible: false,
    previewApp: null,
    theme: 'system',
    apiKeys: {},
    autoSave: true,
    contextWindow: 8000,
    // Chat actions
    addMessage: (message) => {
        const newMessage = {
            ...message,
            id: crypto.randomUUID(),
            timestamp: new Date()
        };
        set((state) => ({
            messages: [...state.messages, newMessage]
        }));
    },
    updateMessage: (id, updates) => {
        set((state) => ({
            messages: state.messages.map((msg) => msg.id === id ? { ...msg, ...updates } : msg)
        }));
    },
    clearMessages: () => {
        set({ messages: [] });
    },
    setGenerating: (generating) => {
        set({ isGenerating: generating });
    },
    setCurrentModel: (model) => {
        set({ currentModel: model });
    },
    // App actions
    addApp: (app) => {
        const newApp = {
            ...app,
            id: Date.now() // Simple ID generation
        };
        set((state) => ({
            apps: [...state.apps, newApp]
        }));
    },
    updateApp: (id, updates) => {
        set((state) => ({
            apps: state.apps.map((app) => app.id === id ? { ...app, ...updates } : app)
        }));
    },
    deleteApp: (id) => {
        set((state) => ({
            apps: state.apps.filter((app) => app.id !== id),
            currentApp: state.currentApp?.id === id ? null : state.currentApp,
            previewApp: state.previewApp?.id === id ? null : state.previewApp
        }));
    },
    setCurrentApp: (app) => {
        set({ currentApp: app });
    },
    // Preview actions
    setPreviewVisible: (visible) => {
        set({ previewVisible: visible });
    },
    setPreviewApp: (app) => {
        set({ previewApp: app });
    },
    // Settings actions
    updateSettings: (settings) => {
        set((state) => ({ ...state, ...settings }));
    },
    setApiKey: (provider, key) => {
        set((state) => ({
            apiKeys: { ...state.apiKeys, [provider]: key }
        }));
    }
}), {
    name: 'prestige-ai-store',
    partialize: (state) => ({
        // Persist everything except transient state
        messages: state.messages,
        apps: state.apps,
        theme: state.theme,
        apiKeys: state.apiKeys,
        autoSave: state.autoSave,
        contextWindow: state.contextWindow
    })
}));
// Utility functions for working with the store
export const getAppById = (id) => {
    return useAIStore.getState().apps.find(app => app.id === id);
};
export const getRunningApps = () => {
    return useAIStore.getState().apps.filter(app => app.status === 'running');
};
export const getRecentMessages = (count = 10) => {
    const messages = useAIStore.getState().messages;
    return messages.slice(-count);
};
export const hasApiKey = (provider) => {
    const apiKeys = useAIStore.getState().apiKeys;
    return !!apiKeys[provider];
};
