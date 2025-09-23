import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Message, App, Conversation } from '@/types';
import { LargeLanguageModel, DEFAULT_MODEL } from '@/lib/models';
import { useApiKeyStore } from '@/lib/apiKeys';
import { AdvancedAppManagementService } from '@/services/advancedAppManagementService';
import { GitHubService } from '@/services/githubService';
import { VercelService } from '@/services/vercelService';
import { SupabaseService } from '@/services/supabaseService';
import AppStateManager from '@/services/appStateManager';

interface IntegrationStatus {
  connected: boolean;
  loading: boolean;
  error?: string;
  user?: any;
}

interface AppState {
  apps: App[];
  currentApp: App | null;
  currentConversation: Conversation | null;
  currentAppConversations: Conversation[];
  selectedModel: LargeLanguageModel;
  isGenerating: boolean;
  error: string | null;
  chatSummary: string | null;
  
  // Integration status
  githubStatus: IntegrationStatus;
  vercelStatus: IntegrationStatus;
  supabaseStatus: IntegrationStatus;

  // Actions
  loadApps: () => Promise<void>;
  createApp: (prompt: string) => Promise<{ app: App, conversationId: number }>;
  setCurrentApp: (app: App | null) => void;
  refreshCurrentApp: () => Promise<void>;
  createConversation: (appId: number, initialMessage?: string, titleOverride?: string) => Promise<Conversation>;
  setCurrentConversation: (conversation: Conversation | null) => void;
  addMessage: (conversationId: number, message: Omit<Message, 'id' | 'timestamp' | 'conversationId'>) => Promise<void>;
  deleteApp: (appId: number) => Promise<void>;
  deleteConversation: (conversationId: number) => Promise<void>;
  renameApp: (appId: number, newName: string) => Promise<void>;
  setSelectedModel: (model: LargeLanguageModel) => void;
  setChatSummary: (summary: string | null) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setError: (error: string | null) => void;
  
  // Integration actions
  checkIntegrationStatuses: () => Promise<void>;
  connectGitHub: () => Promise<void>;
  connectVercel: (token: string) => Promise<void>;
  connectSupabase: (token: string) => Promise<void>;
  disconnectGitHub: () => void;
  disconnectVercel: () => Promise<void>;
  disconnectSupabase: () => void;
}

const useAppStore = create<AppState>()(
  devtools(
    (set, get) => ({
      // Initial state
      apps: [],
      currentApp: null,
      currentConversation: null,
      currentAppConversations: [],
      selectedModel: (() => {
        // Try to get a recommended model based on available API keys
        const apiKeyStore = useApiKeyStore.getState();
        const recommendedModel = apiKeyStore.getRecommendedModel();
        return recommendedModel || DEFAULT_MODEL;
      })(),
      isGenerating: false,
      error: null,
      chatSummary: null,
      
      // Integration status
      githubStatus: { connected: false, loading: false },
      vercelStatus: { connected: false, loading: false },
      supabaseStatus: { connected: false, loading: false },
      
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
          
          // Initialize app state in the state manager for continuous building
          const stateManager = AppStateManager.getInstance();
          await stateManager.switchToApp(fullApp);
          
          set({ 
            currentApp: fullApp, 
            currentAppConversations: conversations,
            currentConversation: conversations[0] || null 
          });

          // Auto-start the new app - similar to @dyad's approach
          try {
            const isRunning = await appService.isAppRunning(fullApp.id);
            if (!isRunning) {
              console.log(`Auto-starting app: ${fullApp.name} (ID: ${fullApp.id})`);
              // Note: The actual start will be handled by CodeViewerPanel's useEffect
              // This just signals that auto-start should happen
            }
          } catch (error) {
            console.error(`Error checking/starting app ${fullApp.id}:`, error);
          }
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
      
      createConversation: async (appId: number, initialMessage?: string, titleOverride?: string) => {
        // Only show generating indicator if we actually have an initial message (which would seed context)
        if (initialMessage && initialMessage.trim()) {
          set({ isGenerating: true, error: null });
        } else {
          set({ error: null });
        }
        try {
          const appService = AdvancedAppManagementService.getInstance();
          const conversationId = await appService.createConversation({ appId, initialMessage, titleOverride });
          const conversation = await appService.getConversation(conversationId);
          if (!conversation) {
            throw new Error('Failed to create or retrieve conversation.');
          }
          
          const conversations = await appService.getAppConversations(appId);
          set((state) => ({ 
            currentConversation: conversation, 
            currentAppConversations: conversations,
            // Ensure we are not stuck in generating state after creating an empty conversation
            isGenerating: initialMessage && initialMessage.trim() ? state.isGenerating : false
          }));
          // If we set isGenerating earlier due to initialMessage, clear it now (no AI call here)
          if (initialMessage && initialMessage.trim()) {
            set({ isGenerating: false });
          }
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
        
        // Clean up virtual filesystem state
        const stateManager = AppStateManager.getInstance();
        stateManager.cleanupApp(appId);
        
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

      // Integration actions
      checkIntegrationStatuses: async () => {
        const githubService = GitHubService.getInstance();
        const vercelService = VercelService.getInstance();
        const supabaseService = SupabaseService.getInstance();

        // Check GitHub status
        set((state) => ({ 
          githubStatus: { ...state.githubStatus, loading: true, error: undefined }
        }));
        try {
          const user = await githubService.getCurrentUser();
          set((state) => ({ 
            githubStatus: { connected: !!user, loading: false, user }
          }));
        } catch (error) {
          set((state) => ({ 
            githubStatus: { 
              connected: false, 
              loading: false, 
              error: 'Failed to check GitHub status' 
            }
          }));
        }

        // Check Vercel status
        set((state) => ({ 
          vercelStatus: { ...state.vercelStatus, loading: true, error: undefined }
        }));
        try {
          // Force reload token from storage
          await vercelService.reloadStoredToken();
          const user = await vercelService.getCurrentUser();
          set((state) => ({ 
            vercelStatus: { connected: !!user, loading: false, user }
          }));
        } catch (error) {
          set((state) => ({ 
            vercelStatus: { 
              connected: false, 
              loading: false, 
              error: 'Failed to check Vercel status' 
            }
          }));
        }

        // Check Supabase status
        set((state) => ({ 
          supabaseStatus: { ...state.supabaseStatus, loading: true, error: undefined }
        }));
        try {
          const orgs = await supabaseService.getOrganizations();
          set((state) => ({ 
            supabaseStatus: { connected: orgs.length > 0, loading: false }
          }));
        } catch (error) {
          set((state) => ({ 
            supabaseStatus: { 
              connected: false, 
              loading: false, 
              error: 'Failed to check Supabase status' 
            }
          }));
        }
      },

      connectGitHub: async () => {
        const githubService = GitHubService.getInstance();
        set((state) => ({ 
          githubStatus: { ...state.githubStatus, loading: true, error: undefined }
        }));
        
        try {
          await githubService.authenticateWithDeviceFlow();
          const user = await githubService.getCurrentUser();
          set((state) => ({ 
            githubStatus: { connected: true, loading: false, user }
          }));
        } catch (error) {
          set((state) => ({ 
            githubStatus: { 
              connected: false, 
              loading: false, 
              error: error instanceof Error ? error.message : 'Failed to connect GitHub' 
            }
          }));
          throw error;
        }
      },

      connectVercel: async (token: string) => {
        const vercelService = VercelService.getInstance();
        set((state) => ({ 
          vercelStatus: { ...state.vercelStatus, loading: true, error: undefined }
        }));
        
        try {
          vercelService.setToken(token);
          const user = await vercelService.getCurrentUser();
          set((state) => ({ 
            vercelStatus: { connected: true, loading: false, user }
          }));
        } catch (error) {
          set((state) => ({ 
            vercelStatus: { 
              connected: false, 
              loading: false, 
              error: error instanceof Error ? error.message : 'Failed to connect Vercel' 
            }
          }));
          throw error;
        }
      },

      connectSupabase: async (token: string) => {
        const supabaseService = SupabaseService.getInstance();
        set((state) => ({ 
          supabaseStatus: { ...state.supabaseStatus, loading: true, error: undefined }
        }));
        
        try {
          supabaseService.setToken(token);
          const orgs = await supabaseService.getOrganizations();
          set((state) => ({ 
            supabaseStatus: { connected: orgs.length > 0, loading: false }
          }));
        } catch (error) {
          set((state) => ({ 
            supabaseStatus: { 
              connected: false, 
              loading: false, 
              error: error instanceof Error ? error.message : 'Failed to connect Supabase' 
            }
          }));
          throw error;
        }
      },

      disconnectGitHub: () => {
        const githubService = GitHubService.getInstance();
        githubService.clearAuth();
        set({ githubStatus: { connected: false, loading: false } });
      },

      disconnectVercel: async () => {
        try {
          const vercelService = VercelService.getInstance();
          await vercelService.logout();
          set({ vercelStatus: { connected: false, loading: false } });
        } catch (error) {
          console.error('Failed to disconnect Vercel:', error);
          set({ vercelStatus: { connected: false, loading: false } });
        }
      },

      disconnectSupabase: () => {
        const supabaseService = SupabaseService.getInstance();
        supabaseService.clearAuth();
        set({ supabaseStatus: { connected: false, loading: false } });
      },
    }),
    {
      name: 'prestige-ai-store',
    }
  )
);

export default useAppStore;