import type { App, Conversation, FileChange } from '@/types';
import type { AppOutput, AppError } from '@/types/appTypes';
import { FileSystemService } from './fileSystemService';
import { DEFAULT_TEMPLATE_ID } from '@/templates';

export interface CreateAppParams {
  userPrompt: string;
}

export interface CreateConversationParams {
  appId: number;
  initialMessage?: string; // optional; if provided used to derive title and first message
  titleOverride?: string;  // optional explicit title
}

export class AdvancedAppManagementService {
  private static instance: AdvancedAppManagementService;
  private fileSystemService: FileSystemService;
  private appOutputCallbacks: Map<number, (output: AppOutput) => void> = new Map();
  private appErrorCallbacks: Map<number, (error: AppError) => void> = new Map();
  private isListenerSetup: boolean = false;

  private constructor() {
    this.fileSystemService = FileSystemService.getInstance();
    this.setupEventListeners();
  }

  public static getInstance(): AdvancedAppManagementService {
    if (!AdvancedAppManagementService.instance) {
      AdvancedAppManagementService.instance = new AdvancedAppManagementService();
    }
    return AdvancedAppManagementService.instance;
  }

  private setupEventListeners() {
    if (this.isListenerSetup || typeof window === 'undefined' || !window.electronAPI) {
      return;
    }

    // Setup IPC listeners for app output and errors
    window.electronAPI.advancedApp.onOutput((appId: number, output: AppOutput) => {
      const callback = this.appOutputCallbacks.get(appId);
      callback?.(output);
    });

    window.electronAPI.advancedApp.onError((appId: number, error: AppError) => {
      const callback = this.appErrorCallbacks.get(appId);
      callback?.(error);
    });

    this.isListenerSetup = true;
  }

  // App Creation (same as before)
  async createApp(params: CreateAppParams): Promise<{ app: App; conversationId: number }> {
    try {
      // Generate app name from user prompt
      const appName = await this.fileSystemService.generateAppNameFromPrompt(params.userPrompt);
      
      // Check if app already exists
      const apps = await window.electronAPI.db.getApps();
      const existingApp = apps.find((app: App) => app.name === appName);
      
      if (existingApp) {
        throw new Error(`App with name "${appName}" already exists`);
      }

      // Create app directory structure on desktop
      await this.fileSystemService.createPrestigeAIDirectory();
      const appPath = await this.fileSystemService.createAppDirectory(appName);
      
      // Create from template and initialize app structure
      const { initializeAppStructure } = await import('../templates/createFromTemplate');
      await initializeAppStructure(appPath, DEFAULT_TEMPLATE_ID);

      // Create app in database
      const app = await window.electronAPI.db.createApp({
        name: appName,
        path: appName,
        description: `App created from: ${params.userPrompt.substring(0, 100)}...`,
      });

      // Generate conversation title from user prompt
      const conversationTitle = await this.fileSystemService.generateConversationTitle(params.userPrompt);

      // Create initial conversation
      const conversationId = await window.electronAPI.db.createConversation({
        appId: app.id,
        title: conversationTitle,
      });
      
      // Add initial message
      await window.electronAPI.db.addMessage({
        conversationId,
        role: 'user',
        content: params.userPrompt,
      });

      const returnedApp = {
        ...app,
        description: app.description ?? undefined,
      };
      
      return { app: returnedApp, conversationId };
    } catch (error) {
      console.error('Failed to create app:', error);
      throw new Error(`Failed to create app: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Advanced App Running with IPC
  async runApp(
    appId: number, 
    onOutput: (output: AppOutput) => void,
    onError?: (error: AppError) => void
  ): Promise<{ proxyUrl?: string }> {
    try {
      // Get app info
      const app = await window.electronAPI.db.getApp(appId);
      if (!app) {
        throw new Error('App not found');
      }

      // Get app path
      const appPath = await this.fileSystemService.getAppPath(app.name);
      
      // Store callbacks
      this.appOutputCallbacks.set(appId, onOutput);
      if (onError) {
        this.appErrorCallbacks.set(appId, onError);
      }

      // Use IPC to run app in main process
      const result = await window.electronAPI.advancedApp.run(appId, appPath);
      
      return result;
    } catch (error) {
      console.error(`Error running app ${appId}:`, error);
      throw error;
    }
  }

  async stopApp(appId: number): Promise<void> {
    try {
      await window.electronAPI.advancedApp.stop(appId);
      
      // Clean up callbacks
      this.appOutputCallbacks.delete(appId);
      this.appErrorCallbacks.delete(appId);
    } catch (error) {
      console.error(`Error stopping app ${appId}:`, error);
      throw error;
    }
  }

  async restartApp(
    appId: number,
    onOutput: (output: AppOutput) => void,
    onError?: (error: AppError) => void,
    removeNodeModules: boolean = false
  ): Promise<{ proxyUrl?: string }> {
    try {
      // Get app info
      const app = await window.electronAPI.db.getApp(appId);
      if (!app) {
        throw new Error('App not found');
      }

      // Get app path
      const appPath = await this.fileSystemService.getAppPath(app.name);
      
      // Store callbacks
      this.appOutputCallbacks.set(appId, onOutput);
      if (onError) {
        this.appErrorCallbacks.set(appId, onError);
      }

      // Use IPC to restart app in main process
      const result = await window.electronAPI.advancedApp.restart(appId, appPath, removeNodeModules);
      
      return result;
    } catch (error) {
      console.error(`Error restarting app ${appId}:`, error);
      throw error;
    }
  }

  async rebuildApp(
    appId: number,
    onOutput: (output: AppOutput) => void,
    onError?: (error: AppError) => void
  ): Promise<{ proxyUrl?: string }> {
    try {
      // Get app info
      const app = await window.electronAPI.db.getApp(appId);
      if (!app) {
        throw new Error('App not found');
      }

      // Get app path
      const appPath = await this.fileSystemService.getAppPath(app.name);
      
      // Store callbacks
      this.appOutputCallbacks.set(appId, onOutput);
      if (onError) {
        this.appErrorCallbacks.set(appId, onError);
      }

      // Use IPC to rebuild app in main process
      const result = await window.electronAPI.advancedApp.rebuild(appId, appPath);
      
      return result;
    } catch (error) {
      console.error(`Error rebuilding app ${appId}:`, error);
      throw error;
    }
  }

  async isAppRunning(appId: number): Promise<boolean> {
    try {
      return await window.electronAPI.advancedApp.isRunning(appId);
    } catch (error) {
      console.error(`Error checking if app ${appId} is running:`, error);
      return false;
    }
  }

  async getRunningApps(): Promise<number[]> {
    try {
      return await window.electronAPI.advancedApp.getRunning();
    } catch (error) {
      console.error('Error getting running apps:', error);
      return [];
    }
  }

  // Handle iframe errors from proxy (called by components)
  handleIframeError(appId: number, error: AppError): void {
    const onError = this.appErrorCallbacks.get(appId);
    onError?.(error);
  }

  // Other methods from original service (conversation management, etc.)
  async createConversation(params: CreateConversationParams): Promise<number> {
    try {
      // Verify app exists
      const apps = await window.electronAPI.db.getApps();
      const app = apps.find((a: App) => a.id === params.appId);

      if (!app) {
        throw new Error('App not found');
      }

      // Determine title
      let title: string;
      if (params.titleOverride && params.titleOverride.trim()) {
        title = params.titleOverride.trim();
      } else if (params.initialMessage && params.initialMessage.trim()) {
        title = await this.fileSystemService.generateConversationTitle(params.initialMessage);
      } else {
        // Fallback generic title with timestamp
        const ts = new Date();
        title = `Conversation ${ts.getHours().toString().padStart(2,'0')}:${ts.getMinutes().toString().padStart(2,'0')}`;
      }

      // Create conversation
      const conversationId = await window.electronAPI.db.createConversation({
        appId: params.appId,
        title: title,
      });

      // Add initial message only if provided
      if (params.initialMessage && params.initialMessage.trim()) {
        await window.electronAPI.db.addMessage({
          conversationId,
          role: 'user',
          content: params.initialMessage,
        });
      }

      console.log(`✅ Created conversation "${title}" for app "${app.name}"`);
      
      return conversationId;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      throw new Error(`Failed to create conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async addMessageToConversation(
    conversationId: number,
    role: 'user' | 'assistant',
    content: string,
    fileChanges?: FileChange[]
  ): Promise<void> {
    try {
      await window.electronAPI.db.addMessage({
        conversationId,
        role,
        content,
        fileChanges: fileChanges ? JSON.stringify(fileChanges) : undefined,
      });
    } catch (error) {
      console.error('Failed to add message:', error);
      throw new Error(`Failed to add message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getApps(): Promise<App[]> {
    try {
      return await window.electronAPI.db.getApps();
    } catch (error) {
      console.error('Failed to get apps:', error);
      throw new Error(`Failed to get apps: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getApp(appId: number): Promise<App | null> {
    try {
      const app = await window.electronAPI.db.getApp(appId);
      if (!app) {
        return null;
      }
      
      // Load the real file structure from the desktop folder
      const files = await this.fileSystemService.getAppDirectoryTree(app.name);
      
      return {
        ...app,
        files
      };
    } catch (error) {
      console.error(`Failed to get app ${appId}:`, error);
      throw new Error(`Failed to get app: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAppConversations(appId: number): Promise<Conversation[]> {
    try {
      return await window.electronAPI.db.getAppConversations(appId);
    } catch (error) {
      console.error(`Failed to get conversations for app ${appId}:`, error);
      throw new Error(`Failed to get conversations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getConversation(conversationId: number): Promise<Conversation | null> {
    try {
      return await window.electronAPI.db.getConversation(conversationId);
    } catch (error) {
      console.error(`Failed to get conversation ${conversationId}:`, error);
      throw new Error(`Failed to get conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteApp(appId: number): Promise<void> {
    try {
      // Stop app if running
      await this.stopApp(appId);
      
      // Delete from database
      await window.electronAPI.db.deleteApp(appId);
    } catch (error) {
      console.error('Failed to delete app:', error);
      throw new Error(`Failed to delete app: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteConversation(conversationId: number): Promise<void> {
    try {
      await window.electronAPI.db.deleteConversation(conversationId);
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      throw new Error(`Failed to delete conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async renameApp(appId: number, newName: string): Promise<void> {
    try {
      // Stop app if running
      await this.stopApp(appId);
      
      // Rename in database
      await window.electronAPI.db.renameApp(appId, newName);
    } catch (error) {
      console.error('Failed to rename app:', error);
      throw new Error(`Failed to rename app: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Cleanup method
  cleanup() {
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.advancedApp.removeAllListeners();
    }
    this.appOutputCallbacks.clear();
    this.appErrorCallbacks.clear();
  }
}