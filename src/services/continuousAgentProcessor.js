const { fs } = window.electronAPI;
const { path } = window.electronAPI;
const { ensureFile, rename, remove, writeFile, readFile } = fs;
import useAppStore from '@/stores/appStore';
import { showSuccess, showError } from '@/utils/toast';
import AppStateManager from '@/services/appStateManager';
function parsePrestigeTags(response) {
    const operations = [];
    let chatSummary = '';
    let chatContent = response;
    const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
    chatContent = chatContent.replace(thinkRegex, '').trim();
    const writeRegex = /<prestige-write path="([^"]+)" description="([^"]*)">([\s\S]*?)<\/prestige-write>/g;
    let match;
    while ((match = writeRegex.exec(response)) !== null) {
        operations.push({
            type: 'write',
            path: match[1],
            description: match[2],
            content: match[3].trim(),
        });
        chatContent = chatContent.replace(match[0], '').trim();
    }
    const renameRegex = /<prestige-rename from="([^"]+)" to="([^"]+)"><\/prestige-rename>/g;
    while ((match = renameRegex.exec(response)) !== null) {
        operations.push({ type: 'rename', path: match[1], newPath: match[2] });
        chatContent = chatContent.replace(match[0], '').trim();
    }
    const deleteRegex = /<prestige-delete path="([^"]+)"><\/prestige-delete>/g;
    while ((match = deleteRegex.exec(response)) !== null) {
        operations.push({ type: 'delete', path: match[1] });
        chatContent = chatContent.replace(match[0], '').trim();
    }
    const dependencyRegex = /<prestige-add-dependency packages="([^"]+)"><\/prestige-add-dependency>/g;
    while ((match = dependencyRegex.exec(response)) !== null) {
        operations.push({ type: 'add-dependency', packages: match[1].split(' ') });
        chatContent = chatContent.replace(match[0], '').trim();
    }
    const commandRegex = /<prestige-command type="([^"]+)"><\/prestige-command>/g;
    while ((match = commandRegex.exec(response)) !== null) {
        operations.push({ type: 'command', command: match[1] });
        chatContent = chatContent.replace(match[0], '').trim();
    }
    const summaryRegex = /<prestige-chat-summary>([\s\S]*?)<\/prestige-chat-summary>/;
    const summaryMatch = response.match(summaryRegex);
    if (summaryMatch) {
        chatSummary = summaryMatch[1].trim();
        chatContent = chatContent.replace(summaryMatch[0], '').trim();
    }
    return { operations, chatSummary, chatContent };
}
async function getVirtualFileSystemForApp(app) {
    const stateManager = AppStateManager.getInstance();
    return await stateManager.getVirtualFileSystem(app);
}
export async function processContinuousAgentResponse(response) {
    const { operations, chatSummary, chatContent } = parsePrestigeTags(response);
    const { currentApp, refreshCurrentApp } = useAppStore.getState();
    if (!currentApp) {
        showError("No application selected. Please create or select an app first.");
        return { chatContent: response, chatSummary: '' };
    }
    // Get virtual filesystem for this app using state manager
    const vfs = await getVirtualFileSystemForApp(currentApp);
    const stateManager = AppStateManager.getInstance();
    let hasFileOperations = false;
    let hasVirtualChanges = false;
    // Convert operations to VirtualChanges format for batch processing
    const virtualChanges = {
        deletePaths: [],
        renameTags: [],
        writeTags: []
    };
    for (const op of operations) {
        try {
            switch (op.type) {
                case 'write':
                    if (typeof op.content === 'string') {
                        virtualChanges.writeTags.push({
                            path: op.path,
                            content: op.content,
                            description: op.description
                        });
                        hasVirtualChanges = true;
                        hasFileOperations = true;
                    }
                    else {
                        showError(`No content provided for file write operation: ${op.path}`);
                    }
                    break;
                case 'rename':
                    virtualChanges.renameTags.push({
                        from: op.path,
                        to: op.newPath
                    });
                    hasVirtualChanges = true;
                    hasFileOperations = true;
                    break;
                case 'delete':
                    virtualChanges.deletePaths.push(op.path);
                    hasVirtualChanges = true;
                    hasFileOperations = true;
                    break;
                case 'add-dependency':
                    // This would be handled by a terminal command execution service
                    console.log(`Installing dependencies: ${op.packages.join(' ')}`);
                    showSuccess(`Dependencies added: ${op.packages.join(' ')}`);
                    break;
                case 'command':
                    // This would be handled by a command execution service
                    console.log(`Executing command: ${op.command}`);
                    showSuccess(`Command executed: ${op.command}`);
                    break;
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            let opIdentifier = '';
            if ('path' in op) {
                opIdentifier = op.path;
            }
            else if (op.type === 'add-dependency') {
                opIdentifier = op.packages.join(' ');
            }
            showError(`Error processing ${op.type} for ${opIdentifier}: ${errorMessage}`);
        }
    }
    // Apply virtual changes in batch
    if (hasVirtualChanges) {
        try {
            await vfs.applyResponseChanges(virtualChanges);
            // Now synchronize virtual changes to actual filesystem using state manager
            await stateManager.syncAppToDisk(currentApp);
            showSuccess(`Applied ${operations.filter(op => ['write', 'rename', 'delete'].includes(op.type)).length} file changes`);
            // Log state info for debugging
            const stateInfo = stateManager.getAppStateInfo(currentApp.id);
            console.log(`App state after changes:`, stateInfo);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            showError(`Error applying virtual changes: ${errorMessage}`);
        }
    }
    // Update file tree, chat summary etc.
    if (chatSummary) {
        useAppStore.getState().setChatSummary(chatSummary);
    }
    if (hasFileOperations) {
        // Update the app's file structure in the store
        await refreshCurrentApp();
    }
    return { chatContent, chatSummary };
}
// Utility functions for external access to app state
export function getAppStateManager() {
    return AppStateManager.getInstance();
}
// Utility function to get virtual changes for an app
export function getAppVirtualChanges(appId) {
    const stateManager = AppStateManager.getInstance();
    return stateManager.getVirtualChanges(appId);
}
// Utility function to reset app to initial state
export function resetAppToInitialState(appId) {
    const stateManager = AppStateManager.getInstance();
    stateManager.resetAppToInitialState(appId);
}
// Utility function to get app state info (for debugging)
export function getAppStateInfo(appId) {
    const stateManager = AppStateManager.getInstance();
    return stateManager.getAppStateInfo(appId);
}
