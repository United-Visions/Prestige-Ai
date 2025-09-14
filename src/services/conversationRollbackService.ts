import { showToast } from '@/utils/toast';

export interface FileSnapshot {
  path: string;
  content: string;
  timestamp: number;
}

export interface ConversationSnapshot {
  id: string;
  conversationId: number;
  messageId: number;
  timestamp: number;
  title: string;
  fileSnapshots: FileSnapshot[];
  appId: number;
  messageCount: number;
}

export interface RollbackResult {
  success: boolean;
  filesRestored: number;
  messagesRemoved: number;
  error?: string;
}

export class ConversationRollbackService {
  private static instance: ConversationRollbackService;
  private snapshots: Map<string, ConversationSnapshot> = new Map();

  static getInstance(): ConversationRollbackService {
    if (!ConversationRollbackService.instance) {
      ConversationRollbackService.instance = new ConversationRollbackService();
    }
    return ConversationRollbackService.instance;
  }

  /**
   * Create a snapshot before agent makes changes
   */
  async createSnapshot(
    conversationId: number,
    messageId: number,
    appId: number,
    title?: string
  ): Promise<string> {
    try {
      // Get current app files
      const app = await window.electronAPI.db.getApp(appId);
      if (!app) {
        throw new Error('App not found');
      }

      // Create file snapshots
      const fileSnapshots: FileSnapshot[] = [];
      
      if (app.files && app.files.length > 0) {
        for (const file of app.files) {
          if (file.type === 'file' && file.content) {
            fileSnapshots.push({
              path: file.path,
              content: file.content,
              timestamp: Date.now()
            });
          }
        }
      }

      // Get current message count
      const conversation = await window.electronAPI.db.getConversation(conversationId);
      const messageCount = conversation?.messages?.length || 0;

      const snapshotId = `${conversationId}-${messageId}-${Date.now()}`;
      const snapshot: ConversationSnapshot = {
        id: snapshotId,
        conversationId,
        messageId,
        timestamp: Date.now(),
        title: title || `Snapshot at message ${messageCount}`,
        fileSnapshots,
        appId,
        messageCount
      };

      this.snapshots.set(snapshotId, snapshot);
      
      // Store in localStorage for persistence
      this.saveSnapshots();
      
      console.log(`📸 Created snapshot ${snapshotId} with ${fileSnapshots.length} files`);
      return snapshotId;
    } catch (error) {
      console.error('Failed to create snapshot:', error);
      throw error;
    }
  }

  /**
   * Get all snapshots for a conversation
   */
  getConversationSnapshots(conversationId: number): ConversationSnapshot[] {
    const conversationSnapshots = Array.from(this.snapshots.values())
      .filter(snapshot => snapshot.conversationId === conversationId)
      .sort((a, b) => a.timestamp - b.timestamp);
    
    return conversationSnapshots;
  }

  /**
   * Rollback to a specific snapshot
   */
  async rollbackToSnapshot(snapshotId: string): Promise<RollbackResult> {
    try {
      const snapshot = this.snapshots.get(snapshotId);
      if (!snapshot) {
        throw new Error('Snapshot not found');
      }

      console.log(`🔄 Rolling back to snapshot ${snapshotId}`);

      // 1. Restore file contents
      let filesRestored = 0;
      const app = await window.electronAPI.db.getApp(snapshot.appId);
      if (!app) {
        throw new Error('App not found');
      }

      // Get app path for file operations
      let projectRoot = app.path;
      if (!projectRoot) {
        const desktop = await window.electronAPI.app.getDesktopPath();
        projectRoot = await window.electronAPI.path.join(desktop, 'prestige-ai', app.name);
      }

      // Restore each file from snapshot
      for (const fileSnapshot of snapshot.fileSnapshots) {
        try {
          const fullPath = await window.electronAPI.path.join(projectRoot, fileSnapshot.path);
          await window.electronAPI.fs.writeFile(fullPath, fileSnapshot.content);
          
          // Update in-memory file content if it exists in app.files
          if (app.files) {
            const fileIndex = app.files.findIndex(f => f.path === fileSnapshot.path);
            if (fileIndex !== -1) {
              app.files[fileIndex].content = fileSnapshot.content;
            }
          }
          
          filesRestored++;
        } catch (error) {
          console.warn(`Failed to restore file ${fileSnapshot.path}:`, error);
        }
      }

      // 2. Remove messages after the snapshot point
      const conversation = await window.electronAPI.db.getConversation(snapshot.conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const messagesAfterSnapshot = conversation.messages.filter(
        msg => msg.id > snapshot.messageId
      );

      let messagesRemoved = 0;
      for (const message of messagesAfterSnapshot) {
        try {
          await window.electronAPI.db.deleteMessage(message.id);
          messagesRemoved++;
        } catch (error) {
          console.warn(`Failed to delete message ${message.id}:`, error);
        }
      }

      // 3. Remove snapshots after this point
      const snapshotsToRemove = Array.from(this.snapshots.values())
        .filter(s => 
          s.conversationId === snapshot.conversationId && 
          s.timestamp > snapshot.timestamp
        );

      for (const snapshotToRemove of snapshotsToRemove) {
        this.snapshots.delete(snapshotToRemove.id);
      }

      this.saveSnapshots();

      const result: RollbackResult = {
        success: true,
        filesRestored,
        messagesRemoved
      };

      console.log(`✅ Rollback completed: ${filesRestored} files restored, ${messagesRemoved} messages removed`);
      showToast(`Rolled back to ${snapshot.title} - ${filesRestored} files restored`, 'success');

      // Trigger app refresh to reload files
      window.dispatchEvent(new CustomEvent('appRollbackCompleted', { 
        detail: { appId: snapshot.appId, snapshotId } 
      }));

      return result;
    } catch (error) {
      console.error('Rollback failed:', error);
      const result: RollbackResult = {
        success: false,
        filesRestored: 0,
        messagesRemoved: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      showToast(`Rollback failed: ${result.error}`, 'error');
      return result;
    }
  }

  /**
   * Delete a snapshot
   */
  deleteSnapshot(snapshotId: string): boolean {
    const deleted = this.snapshots.delete(snapshotId);
    if (deleted) {
      this.saveSnapshots();
      console.log(`🗑️ Deleted snapshot ${snapshotId}`);
    }
    return deleted;
  }

  /**
   * Clear all snapshots for a conversation
   */
  clearConversationSnapshots(conversationId: number): number {
    const snapshots = Array.from(this.snapshots.entries());
    let cleared = 0;
    
    for (const [id, snapshot] of snapshots) {
      if (snapshot.conversationId === conversationId) {
        this.snapshots.delete(id);
        cleared++;
      }
    }
    
    if (cleared > 0) {
      this.saveSnapshots();
      console.log(`🗑️ Cleared ${cleared} snapshots for conversation ${conversationId}`);
    }
    
    return cleared;
  }

  /**
   * Get snapshot details
   */
  getSnapshot(snapshotId: string): ConversationSnapshot | undefined {
    return this.snapshots.get(snapshotId);
  }

  /**
   * Auto-create snapshot before agent response
   */
  async autoSnapshot(conversationId: number, messageId: number, appId: number): Promise<string | null> {
    try {
      // Check if we should create a snapshot (not for every message to avoid clutter)
      const conversation = await window.electronAPI.db.getConversation(conversationId);
      const messageCount = conversation?.messages?.length || 0;
      
      // Create snapshots for every assistant response (user messages don't change files)
      const lastMessage = conversation?.messages?.[messageCount - 1];
      if (lastMessage?.role === 'user') {
        const title = `Before AI Response #${Math.ceil(messageCount / 2)}`;
        return await this.createSnapshot(conversationId, messageId, appId, title);
      }
      
      return null;
    } catch (error) {
      console.warn('Auto-snapshot failed:', error);
      return null;
    }
  }

  /**
   * Save snapshots to localStorage
   */
  private saveSnapshots(): void {
    try {
      const snapshotsArray = Array.from(this.snapshots.entries());
      localStorage.setItem('conversation-snapshots', JSON.stringify(snapshotsArray));
    } catch (error) {
      console.warn('Failed to save snapshots:', error);
    }
  }

  /**
   * Load snapshots from localStorage
   */
  loadSnapshots(): void {
    try {
      const stored = localStorage.getItem('conversation-snapshots');
      if (stored) {
        const snapshotsArray = JSON.parse(stored);
        this.snapshots = new Map(snapshotsArray);
        console.log(`📚 Loaded ${this.snapshots.size} conversation snapshots`);
      }
    } catch (error) {
      console.warn('Failed to load snapshots:', error);
      this.snapshots.clear();
    }
  }

  /**
   * Initialize the service
   */
  initialize(): void {
    this.loadSnapshots();
    console.log('🔄 Conversation Rollback Service initialized');
  }
}

// Auto-initialize
ConversationRollbackService.getInstance().initialize();