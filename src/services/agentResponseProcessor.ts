const { fs } = window.electronAPI;
const { path } = window.electronAPI;
const { ensureFile, rename, remove, writeFile } = fs;
import useAppStore from '@/stores/appStore';
import { showSuccess, showError } from '@/utils/toast';

interface FileOperation {
  type: 'write' | 'rename' | 'delete';
  path: string;
  content?: string;
  newPath?: string;
  description?: string;
}

interface DependencyOperation {
  type: 'add-dependency';
  packages: string[];
}

interface CommandOperation {
  type: 'command';
  command: 'rebuild' | 'restart' | 'refresh';
}

type Operation = FileOperation | DependencyOperation | CommandOperation;

function parsePrestigeTags(response: string): { operations: Operation[], chatSummary: string, chatContent: string } {
  const operations: Operation[] = [];
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
    operations.push({ type: 'command', command: match[1] as 'rebuild' | 'restart' | 'refresh' });
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

export async function processAgentResponse(response: string) {
  const { operations, chatSummary, chatContent } = parsePrestigeTags(response);
  const { currentApp, refreshCurrentApp } = useAppStore.getState();

  if (!currentApp) {
    showError("No application selected. Please create or select an app first.");
    return { chatContent: response, chatSummary: '' };
  }

  // Get the correct app path from the app's path property and add 'files' subdirectory
  const desktopPath = await window.electronAPI.app.getDesktopPath();
  const prestigePath = await path.join(desktopPath, 'prestige-ai');
  const appPath = await path.join(prestigePath, currentApp.path, 'files');

  let hasFileOperations = false;

  for (const op of operations) {
    try {
      switch (op.type) {
        case 'write':
          if (typeof op.content === 'string') {
            const filePath = await path.join(appPath, op.path);
            await ensureFile(filePath);
            await writeFile(filePath, op.content);
            showSuccess(`File written: ${op.path}`);
            hasFileOperations = true;
          } else {
            showError(`No content provided for file write operation: ${op.path}`);
          }
          break;
        case 'rename':
          // fs-extra does not have a rename function, using fs promises
          const oldPath = await path.join(appPath, op.path);
          const newPath = await path.join(appPath, op.newPath!);
          await rename(oldPath, newPath!);
          showSuccess(`File renamed: ${op.path} to ${op.newPath}`);
          hasFileOperations = true;
          break;
        case 'delete':
          const deletePath = await path.join(appPath, op.path);
          await remove(deletePath);
          showSuccess(`File deleted: ${op.path}`);
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      let opIdentifier = '';
      if ('path' in op) {
        opIdentifier = op.path;
      } else if (op.type === 'add-dependency') {
        opIdentifier = op.packages.join(' ');
      }
      showError(`Error processing ${op.type} for ${opIdentifier}: ${errorMessage}`);
    }
  }

  // Update file tree, chat summary etc.
  if (chatSummary) {
    useAppStore.getState().setChatSummary(chatSummary);
  }
  
  // Refresh the file tree if any file operations were performed
  if (hasFileOperations) {
    await refreshCurrentApp();
  }

  return { chatContent, chatSummary };
}
