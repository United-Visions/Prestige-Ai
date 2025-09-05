import { FileSystemService } from './fileSystemService';
import { DEFAULT_TEMPLATE_ID } from '@/templates';
export class AppManagementService {
    constructor() {
        Object.defineProperty(this, "fileSystemService", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.fileSystemService = FileSystemService.getInstance();
    }
    static getInstance() {
        if (!AppManagementService.instance) {
            AppManagementService.instance = new AppManagementService();
        }
        return AppManagementService.instance;
    }
    async createApp(params) {
        try {
            // Generate app name from user prompt
            const appName = await this.fileSystemService.generateAppNameFromPrompt(params.userPrompt);
            // Check if app already exists
            const apps = await window.electronAPI.db.getApps();
            const existingApp = apps.find((app) => app.name === appName);
            if (existingApp) {
                throw new Error(`App with name "${appName}" already exists`);
            }
            // Create app directory structure on desktop
            await this.fileSystemService.createPrestigeAIDirectory();
            const appPath = await this.fileSystemService.createAppDirectory(appName);
            // Create from template and initialize app structure (like CCdyad does)
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
        }
        catch (error) {
            console.error('Failed to create app:', error);
            throw new Error(`Failed to create app: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async createConversation(params) {
        try {
            // Verify app exists
            const apps = await window.electronAPI.db.getApps();
            const app = apps.find((a) => a.id === params.appId);
            if (!app) {
                throw new Error('App not found');
            }
            // Generate conversation title
            const title = await this.fileSystemService.generateConversationTitle(params.initialMessage);
            // Create conversation
            const conversationId = await window.electronAPI.db.createConversation({
                appId: params.appId,
                title: title,
            });
            // Add initial message
            await window.electronAPI.db.addMessage({
                conversationId,
                role: 'user',
                content: params.initialMessage,
            });
            console.log(`✅ Created conversation "${title}" for app "${app.name}"`);
            return conversationId;
        }
        catch (error) {
            console.error('Failed to create conversation:', error);
            throw new Error(`Failed to create conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async addMessageToConversation(conversationId, role, content, fileChanges) {
        try {
            await window.electronAPI.db.addMessage({
                conversationId,
                role,
                content,
                fileChanges: fileChanges ? JSON.stringify(fileChanges) : undefined,
            });
        }
        catch (error) {
            console.error('Failed to add message:', error);
            throw new Error(`Failed to add message: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async addMessage(conversationId, role, content, fileChanges) {
        try {
            await window.electronAPI.db.addMessage({
                conversationId,
                role,
                content,
                fileChanges: fileChanges ? JSON.stringify(fileChanges) : undefined,
            });
            // The main process now handles file changes and database updates.
        }
        catch (error) {
            console.error('Failed to add message:', error);
            throw new Error(`Failed to add message: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async getApps() {
        try {
            return await window.electronAPI.db.getApps();
        }
        catch (error) {
            console.error('Failed to get apps:', error);
            throw new Error(`Failed to get apps: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async getApp(appId) {
        try {
            const app = await window.electronAPI.db.getApp(appId);
            if (!app) {
                return null;
            }
            // Load the real file structure from the desktop folder
            const fileSystemService = this.fileSystemService;
            const files = await fileSystemService.getAppDirectoryTree(app.name);
            return {
                ...app,
                files
            };
        }
        catch (error) {
            console.error(`Failed to get app ${appId}:`, error);
            throw new Error(`Failed to get app: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async getAppConversations(appId) {
        try {
            return await window.electronAPI.db.getAppConversations(appId);
        }
        catch (error) {
            console.error(`Failed to get conversations for app ${appId}:`, error);
            throw new Error(`Failed to get conversations: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async getConversation(conversationId) {
        try {
            return await window.electronAPI.db.getConversation(conversationId);
        }
        catch (error) {
            console.error(`Failed to get conversation ${conversationId}:`, error);
            throw new Error(`Failed to get conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async deleteApp(appId) {
        try {
            await window.electronAPI.db.deleteApp(appId);
            // Physical file deletion is now handled in the main process
        }
        catch (error) {
            console.error('Failed to delete app:', error);
            throw new Error(`Failed to delete app: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async deleteConversation(conversationId) {
        try {
            await window.electronAPI.db.deleteConversation(conversationId);
        }
        catch (error) {
            console.error('Failed to delete conversation:', error);
            throw new Error(`Failed to delete conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async renameApp(appId, newName) {
        try {
            await window.electronAPI.db.renameApp(appId, newName);
            // Physical directory renaming is now handled in the main process
        }
        catch (error) {
            console.error('Failed to rename app:', error);
            throw new Error(`Failed to rename app: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
