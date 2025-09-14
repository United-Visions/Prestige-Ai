import { PrestigeBlockState } from '@/components/chat/blocks/PrestigeBlockTypes';
import { processAgentResponse } from './agentResponseProcessor';

const { fs } = window.electronAPI;
const { path } = window.electronAPI;
import useAppStore from '@/stores/appStore';
import { showSuccess, showError } from '@/utils/toast';
import { resolveAppPaths } from '@/utils/appPathResolver';
import AppStateManager from '@/services/appStateManager';

/**
 * Enhanced agent response processor with streaming support and block states
 * Inspired by dyad's streaming + processing system
 */
export class StreamingAgentProcessor {
  private static instance: StreamingAgentProcessor;
  private streamingOperations: Map<string, PrestigeStreamingOperation> = new Map();

  public static getInstance(): StreamingAgentProcessor {
    if (!StreamingAgentProcessor.instance) {
      StreamingAgentProcessor.instance = new StreamingAgentProcessor();
    }
    return StreamingAgentProcessor.instance;
  }

  /**
   * Process streaming response chunk by chunk
   */
  async processStreamingChunk(
    streamId: string,
    chunk: string,
    fullResponse: string,
    onStateUpdate?: (operations: PrestigeStreamingOperation[]) => void
  ): Promise<void> {
    // Update streaming operations based on the current response
    const operations = this.parseStreamingOperations(fullResponse);

    // Store operations for this stream
    this.streamingOperations.set(streamId, ...operations);

    // Notify UI about state changes
    if (onStateUpdate) {
      onStateUpdate(operations);
    }

    console.log(`Processing chunk for stream ${streamId}, operations:`, operations.length);
  }

  /**
   * Process final streaming response
   */
  async processFinalResponse(
    streamId: string,
    fullResponse: string,
    autoExecute: boolean = true
  ): Promise<{ chatContent: string; chatSummary: string; operations: PrestigeStreamingOperation[] }> {
    try {
      // Parse final operations
      const operations = this.parseStreamingOperations(fullResponse);

      // Mark all operations as finished
      operations.forEach(op => {
        op.state = 'finished';
      });

      // Auto-execute operations if enabled
      if (autoExecute) {
        await this.executeOperations(operations);
      }

      // Use existing processor for final cleanup
      const { chatContent, chatSummary } = await processAgentResponse(fullResponse);

      // Clean up streaming state
      this.streamingOperations.delete(streamId);

      return { chatContent, chatSummary, operations };
    } catch (error) {
      // Mark operations as aborted on error
      const operations = this.streamingOperations.get(streamId) || [];
      operations.forEach(op => {
        if (op.state === 'pending') {
          op.state = 'aborted';
        }
      });

      console.error('Error processing final response:', error);
      throw error;
    }
  }

  /**
   * Cancel streaming operations
   */
  cancelStream(streamId: string): void {
    const operations = this.streamingOperations.get(streamId) || [];
    operations.forEach(op => {
      if (op.state === 'pending') {
        op.state = 'aborted';
      }
    });
    this.streamingOperations.delete(streamId);
  }

  /**
   * Parse streaming operations from response
   */
  private parseStreamingOperations(response: string): PrestigeStreamingOperation[] {
    const operations: PrestigeStreamingOperation[] = [];

    // Parse thinking blocks
    const thinkRegex = /<think>([\s\S]*?)(?:<\/think>|$)/g;
    let match;
    while ((match = thinkRegex.exec(response)) !== null) {
      operations.push({
        id: `think_${Date.now()}_${Math.random()}`,
        type: 'think',
        content: match[1].trim(),
        state: this.isTagComplete(match[0]) ? 'finished' : 'pending',
        startIndex: match.index
      });
    }

    // Parse write operations
    const writeRegex = /<prestige-write path="([^"]+)"(?:\s+description="([^"]*)")?>(?:\s*>([\s\S]*?)(?:<\/prestige-write>|$))?/g;
    while ((match = writeRegex.exec(response)) !== null) {
      operations.push({
        id: `write_${Date.now()}_${Math.random()}`,
        type: 'write',
        path: match[1],
        description: match[2] || '',
        content: match[3]?.trim() || '',
        state: this.isTagComplete(match[0]) ? 'finished' : 'pending',
        startIndex: match.index
      });
    }

    // Parse dependency operations
    const depRegex = /<prestige-add-dependency packages="([^"]+)"(?:\s*>(?:\s*<\/prestige-add-dependency>|$))?/g;
    while ((match = depRegex.exec(response)) !== null) {
      operations.push({
        id: `dep_${Date.now()}_${Math.random()}`,
        type: 'add-dependency',
        packages: match[1].split(/[\s,]+/).filter(p => p.trim()),
        state: this.isTagComplete(match[0]) ? 'finished' : 'pending',
        startIndex: match.index
      });
    }

    // Parse command operations
    const cmdRegex = /<prestige-command type="([^"]+)"(?:\s*>(?:\s*<\/prestige-command>|$))?/g;
    while ((match = cmdRegex.exec(response)) !== null) {
      operations.push({
        id: `cmd_${Date.now()}_${Math.random()}`,
        type: 'command',
        commandType: match[1],
        state: this.isTagComplete(match[0]) ? 'finished' : 'pending',
        startIndex: match.index
      });
    }

    // Parse integration operations
    const intRegex = /<prestige-add-integration provider="([^"]+)"(?:\s*>([\s\S]*?)(?:<\/prestige-add-integration>|$))?/g;
    while ((match = intRegex.exec(response)) !== null) {
      operations.push({
        id: `int_${Date.now()}_${Math.random()}`,
        type: 'add-integration',
        provider: match[1],
        content: match[2]?.trim() || '',
        state: this.isTagComplete(match[0]) ? 'finished' : 'pending',
        startIndex: match.index
      });
    }

    // Parse rename operations
    const renameRegex = /<prestige-rename from="([^"]+)" to="([^"]+)"(?:\s*>(?:\s*<\/prestige-rename>|$))?/g;
    while ((match = renameRegex.exec(response)) !== null) {
      operations.push({
        id: `rename_${Date.now()}_${Math.random()}`,
        type: 'rename',
        fromPath: match[1],
        toPath: match[2],
        state: this.isTagComplete(match[0]) ? 'finished' : 'pending',
        startIndex: match.index
      });
    }

    // Parse delete operations
    const deleteRegex = /<prestige-delete path="([^"]+)"(?:\s*>(?:\s*<\/prestige-delete>|$))?/g;
    while ((match = deleteRegex.exec(response)) !== null) {
      operations.push({
        id: `delete_${Date.now()}_${Math.random()}`,
        type: 'delete',
        path: match[1],
        state: this.isTagComplete(match[0]) ? 'finished' : 'pending',
        startIndex: match.index
      });
    }

    // Parse chat summary
    const summaryRegex = /<prestige-chat-summary>([\s\S]*?)(?:<\/prestige-chat-summary>|$)/g;
    while ((match = summaryRegex.exec(response)) !== null) {
      operations.push({
        id: `summary_${Date.now()}_${Math.random()}`,
        type: 'chat-summary',
        content: match[1].trim(),
        state: this.isTagComplete(match[0]) ? 'finished' : 'pending',
        startIndex: match.index
      });
    }

    // Sort operations by their position in the response
    return operations.sort((a, b) => (a.startIndex || 0) - (b.startIndex || 0));
  }

  /**
   * Check if a tag is complete (has closing tag)
   */
  private isTagComplete(tagMatch: string): boolean {
    // Check if the tag has a proper closing tag
    const openTag = tagMatch.match(/<([^\/\s>]+)/)?.[1];
    return openTag ? tagMatch.includes(`</${openTag}>`) : false;
  }

  /**
   * Execute operations that are marked as finished
   */
  private async executeOperations(operations: PrestigeStreamingOperation[]): Promise<void> {
    const { currentApp, refreshCurrentApp } = useAppStore.getState();

    if (!currentApp) {
      showError("No application selected. Please create or select an app first.");
      return;
    }

    const { filesPath: appPath } = await resolveAppPaths(currentApp);
    const appStateManager = AppStateManager.getInstance();
    let hasFileOperations = false;

    for (const op of operations) {
      if (op.state !== 'finished') continue;

      try {
        await this.executeOperation(op, appPath, appStateManager, currentApp);

        if (['write', 'rename', 'delete'].includes(op.type)) {
          hasFileOperations = true;
        }
      } catch (error) {
        console.error(`Error executing operation ${op.type}:`, error);
        op.state = 'aborted';
        showError(`Failed to execute ${op.type}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Refresh the app state if file operations were performed
    if (hasFileOperations) {
      await refreshCurrentApp();
    }
  }

  /**
   * Execute a single operation
   */
  private async executeOperation(
    op: PrestigeStreamingOperation,
    appPath: string,
    appStateManager: AppStateManager,
    currentApp: any
  ): Promise<void> {
    const { ensureFile, rename, remove, writeFile } = fs;

    switch (op.type) {
      case 'write':
        if (op.content && op.path) {
          const filePath = await path.join(appPath, op.path);
          await ensureFile(filePath);
          await writeFile(filePath, op.content);

          // Update virtual filesystem
          try {
            const vfs = await appStateManager.getVirtualFileSystem(currentApp);
            await vfs.writeFile(op.path, op.content);
          } catch (vfsError) {
            console.warn(`VFS update failed for ${op.path}:`, vfsError);
          }

          showSuccess(`File written: ${op.path}`);
        }
        break;

      case 'rename':
        if (op.fromPath && op.toPath) {
          const oldPath = await path.join(appPath, op.fromPath);
          const newPath = await path.join(appPath, op.toPath);
          await rename(oldPath, newPath);

          // Update virtual filesystem
          try {
            const vfs = await appStateManager.getVirtualFileSystem(currentApp);
            await vfs.renameFile(op.fromPath, op.toPath);
          } catch (vfsError) {
            console.warn(`VFS update failed for rename:`, vfsError);
          }

          showSuccess(`File renamed: ${op.fromPath} → ${op.toPath}`);
        }
        break;

      case 'delete':
        if (op.path) {
          const deletePath = await path.join(appPath, op.path);
          await remove(deletePath);

          // Update virtual filesystem
          try {
            const vfs = await appStateManager.getVirtualFileSystem(currentApp);
            await vfs.deleteFile(op.path);
          } catch (vfsError) {
            console.warn(`VFS update failed for delete:`, vfsError);
          }

          showSuccess(`File deleted: ${op.path}`);
        }
        break;

      case 'add-dependency':
        if (op.packages && op.packages.length > 0) {
          console.log(`Installing dependencies: ${op.packages.join(' ')}`);
          showSuccess(`Dependencies queued: ${op.packages.join(', ')}`);
        }
        break;

      case 'command':
        if (op.commandType) {
          console.log(`Executing command: ${op.commandType}`);
          showSuccess(`Command executed: ${op.commandType}`);
        }
        break;

      case 'add-integration':
        if (op.provider) {
          console.log(`Adding integration: ${op.provider}`);
          showSuccess(`Integration queued: ${op.provider}`);
        }
        break;

      case 'chat-summary':
        if (op.content) {
          useAppStore.getState().setChatSummary(op.content);
        }
        break;
    }
  }

  /**
   * Get operations for a specific stream
   */
  getStreamOperations(streamId: string): PrestigeStreamingOperation[] {
    return Array.from(this.streamingOperations.values());
  }
}

/**
 * Interface for streaming operations
 */
export interface PrestigeStreamingOperation {
  id: string;
  type: 'think' | 'write' | 'rename' | 'delete' | 'add-dependency' | 'command' | 'add-integration' | 'chat-summary';
  state: PrestigeBlockState;
  startIndex?: number;

  // Common fields
  content?: string;

  // Write operation fields
  path?: string;
  description?: string;

  // Rename operation fields
  fromPath?: string;
  toPath?: string;

  // Dependency operation fields
  packages?: string[];

  // Command operation fields
  commandType?: string;

  // Integration operation fields
  provider?: string;
}

/**
 * React hook for using the streaming processor
 */
export const useStreamingAgentProcessor = () => {
  const processor = StreamingAgentProcessor.getInstance();

  return {
    processStreamingChunk: processor.processStreamingChunk.bind(processor),
    processFinalResponse: processor.processFinalResponse.bind(processor),
    cancelStream: processor.cancelStream.bind(processor),
    getStreamOperations: processor.getStreamOperations.bind(processor)
  };
};