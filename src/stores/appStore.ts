import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Message, App, Conversation } from '@/types';
import { LargeLanguageModel, DEFAULT_MODEL } from '@/lib/models';
import { AdvancedAppManagementService } from '@/services/advancedAppManagementService';

interface AppState {
  apps: App[];
  currentApp: App | null;
  currentConversation: Conversation | null;
  currentAppConversations: Conversation[];
  selectedModel: LargeLanguageModel;
  isGenerating: boolean;
  error: string | null;
  chatSummary: string | null;

  // Actions
  loadApps: () => Promise<void>;
  createApp: (prompt: string) => Promise<{ app: App, conversationId: number }>;
  setCurrentApp: (app: App | null) => void;
  refreshCurrentApp: () => Promise<void>;
  createConversation: (appId: number, initialMessage: string) => Promise<Conversation>;
  setCurrentConversation: (conversation: Conversation | null) => void;
  addMessage: (conversationId: number, message: Omit<Message, 'id' | 'timestamp' | 'conversationId'>) => Promise<void>;
  deleteApp: (appId: number) => Promise<void>;
  deleteConversation: (conversationId: number) => Promise<void>;
  renameApp: (appId: number, newName: string) => Promise<void>;
  setSelectedModel: (model: LargeLanguageModel) => void;
  setChatSummary: (summary: string | null) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setError: (error: string | null) => void;
}

const useAppStore = create<AppState>()(
  devtools(
    (set, get) => ({
      // Initial state
      apps: [],
      currentApp: null,
      currentConversation: null,
      currentAppConversations: [],
      selectedModel: DEFAULT_MODEL,
      isGenerating: false,
      error: null,
      chatSummary: null,
      
      // Actions
      loadApps: async () => {
        const appService = AdvancedAppManagementService.getInstance();
        const apps = await appService.getApps();
        set({ apps });
      },
      
      createApp: async (prompt: string) => {
        set({ isGenerating: true, error: null });
        try {
          const appService = AdvancedAppManagementService.getInstance();
          const { app, conversationId } = await appService.createApp({ userPrompt: prompt });
          
          // Wait a moment for template files to be created
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Get the app with files populated
          const fullApp = await appService.getApp(app.id);
          const conversation = await appService.getConversation(conversationId);
          const conversations = await appService.getAppConversations(app.id);

          // Update apps list first
          set((state) => ({
            apps: [...state.apps, fullApp || app],
            currentConversation: conversation,
            currentAppConversations: conversations,
          }));
          
          // Use setCurrentApp to ensure proper cleanup of any previous app
          await get().setCurrentApp(fullApp || app);
          
          return { app: fullApp || app, conversationId };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create app';
          set({ error: errorMessage, isGenerating: false });
          throw error;
        }
      },
      
      setCurrentApp: async (app: App | null) => {
        const appService = AdvancedAppManagementService.getInstance();
        const { currentApp } = get();
        
        // Stop the currently running app if switching to a different app or going to app list
        if (currentApp && currentApp.id !== app?.id) {
          try {
            const isRunning = await appService.isAppRunning(currentApp.id);
            if (isRunning) {
              console.log(`Stopping currently running app: ${currentApp.name} (ID: ${currentApp.id})`);
              await appService.stopApp(currentApp.id);
            }
          } catch (error) {
            console.error(`Error stopping current app ${currentApp.id}:`, error);
          }
        }

        if (app) {
          const conversations = await appService.getAppConversations(app.id);
          const fullApp = await appService.getApp(app.id);
          set({ 
            currentApp: fullApp, 
            currentAppConversations: conversations,
            currentConversation: conversations[0] || null 
          });
        } else {
          set({ 
            currentApp: null, 
            currentAppConversations: [],
            currentConversation: null 
          });
        }
      },

      refreshCurrentApp: async () => {
        const { currentApp } = get();
        if (currentApp) {
          const appService = AdvancedAppManagementService.getInstance();
          const refreshedApp = await appService.getApp(currentApp.id);
          if (refreshedApp) {
            set({ currentApp: refreshedApp });
          }
        }
      },
      
      createConversation: async (appId: number, initialMessage: string) => {
        set({ isGenerating: true, error: null });
        try {
          const appService = AdvancedAppManagementService.getInstance();
          const conversationId = await appService.createConversation({ appId, initialMessage });
          const conversation = await appService.getConversation(conversationId);
          if (!conversation) {
            throw new Error('Failed to create or retrieve conversation.');
          }
          
          const conversations = await appService.getAppConversations(appId);
          set({ 
            currentConversation: conversation, 
            currentAppConversations: conversations,
          });
          return conversation;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create conversation';
          set({ error: errorMessage, isGenerating: false });
          throw error;
        }
      },
      
      setCurrentConversation: async (conversation: Conversation | null) => {
        if (conversation) {
          const appService = AdvancedAppManagementService.getInstance();
          const fullConversation = await appService.getConversation(conversation.id);
          set({ currentConversation: fullConversation });
        } else {
          set({ currentConversation: null });
        }
      },
      
      addMessage: async (conversationId, message) => {
        // This function can just add the message locally, 
        // the agent processing logic will handle the API call and response
        const appService = AdvancedAppManagementService.getInstance();
        await appService.addMessageToConversation(conversationId, message.role, message.content);
        const conversation = await appService.getConversation(conversationId);
        
        const state = get();
        if (state.currentApp) {
          const conversations = await appService.getAppConversations(state.currentApp.id);
          set({ 
            currentConversation: conversation, 
            currentAppConversations: conversations,
          });
        } else {
          set({ currentConversation: conversation });
        }
      },

      deleteApp: async (appId: number) => {
        const appService = AdvancedAppManagementService.getInstance();
        await appService.deleteApp(appId);
        set((state) => ({
          apps: state.apps.filter((app) => app.id !== appId),
          currentApp: state.currentApp?.id === appId ? null : state.currentApp,
        }));
      },

      deleteConversation: async (conversationId: number) => {
        const appService = AdvancedAppManagementService.getInstance();
        await appService.deleteConversation(conversationId);
        set((state) => ({
          currentConversation: state.currentConversation?.id === conversationId ? null : state.currentConversation,
        }));
      },

      renameApp: async (appId: number, newName: string) => {
        const appService = AdvancedAppManagementService.getInstance();
        await appService.renameApp(appId, newName);
        await get().loadApps();
      },

      setSelectedModel: (model: LargeLanguageModel) => {
        set({ selectedModel: model });
      },

      setChatSummary: (summary: string | null) => {
        set({ chatSummary: summary });
      },
      
      setIsGenerating: (isGenerating: boolean) => {
        set({ isGenerating });
      },
      
      setError: (error: string | null) => {
        set({ error });
      },
    }),
    {
      name: 'prestige-ai-store',
    }
  )
);

export default useAppStore;