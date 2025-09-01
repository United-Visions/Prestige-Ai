import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Template } from '../templates';
import { LargeLanguageModel } from '../lib/models';
import { ProcessInfo } from '../services/processManager';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  attachments?: string[];
  thinking?: string;
}

export interface App {
  id: number;
  name: string;
  path: string;
  template: Template;
  createdAt: Date;
  lastModified: Date;
  status: 'idle' | 'running' | 'building' | 'error';
  process?: ProcessInfo;
}

export interface AIState {
  // Chat
  messages: ChatMessage[];
  isGenerating: boolean;
  currentModel: LargeLanguageModel | null;
  
  // Apps
  apps: App[];
  currentApp: App | null;
  
  // Preview
  previewVisible: boolean;
  previewApp: App | null;
  
  // Settings
  theme: 'light' | 'dark' | 'system';
  apiKeys: Record<string, string>;
  autoSave: boolean;
  contextWindow: number;
  
  // Actions
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  updateMessage: (id: string, content: Partial<ChatMessage>) => void;
  clearMessages: () => void;
  setGenerating: (generating: boolean) => void;
  setCurrentModel: (model: LargeLanguageModel) => void;
  
  // App actions
  addApp: (app: Omit<App, 'id'>) => void;
  updateApp: (id: number, updates: Partial<App>) => void;
  deleteApp: (id: number) => void;
  setCurrentApp: (app: App | null) => void;
  
  // Preview actions
  setPreviewVisible: (visible: boolean) => void;
  setPreviewApp: (app: App | null) => void;
  
  // Settings actions
  updateSettings: (settings: Partial<AIState>) => void;
  setApiKey: (provider: string, key: string) => void;
}

export const useAIStore = create<AIState>()(
  persist(
    (set) => ({
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
        const newMessage: ChatMessage = {
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
          messages: state.messages.map((msg) =>
            msg.id === id ? { ...msg, ...updates } : msg
          )
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
        const newApp: App = {
          ...app,
          id: Date.now() // Simple ID generation
        };
        
        set((state) => ({
          apps: [...state.apps, newApp]
        }));
      },
      
      updateApp: (id, updates) => {
        set((state) => ({
          apps: state.apps.map((app) =>
            app.id === id ? { ...app, ...updates } : app
          )
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
    }),
    {
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
    }
  )
);

// Utility functions for working with the store
export const getAppById = (id: number): App | undefined => {
  return useAIStore.getState().apps.find(app => app.id === id);
};

export const getRunningApps = (): App[] => {
  return useAIStore.getState().apps.filter(app => app.status === 'running');
};

export const getRecentMessages = (count: number = 10): ChatMessage[] => {
  const messages = useAIStore.getState().messages;
  return messages.slice(-count);
};

export const hasApiKey = (provider: string): boolean => {
  const apiKeys = useAIStore.getState().apiKeys;
  return !!apiKeys[provider];
};