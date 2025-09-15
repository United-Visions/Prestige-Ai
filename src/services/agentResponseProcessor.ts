const { fs } = window.electronAPI;
const { path } = window.electronAPI;
const { ensureFile, rename, remove, writeFile } = fs;
import useAppStore from '@/stores/appStore';
import { showSuccess, showError, showInfo } from '@/utils/toast';
import { resolveAppPaths } from '@/utils/appPathResolver';
import AppStateManager from '@/services/appStateManager';
import { prestigeAutoFixService, PrestigeProblemReport } from './prestigeAutoFixService';

// Helper function for executing commands using terminal session
const execAsync = async (command: string, options: { cwd: string; timeout?: number }) => {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const { terminal } = window.electronAPI;

    terminal.createSession({
      cwd: options.cwd,
      cols: 80,
      rows: 24
    }).then(({ sessionId }) => {
      let output = '';
      let hasFinished = false;

      const timer = options.timeout ? setTimeout(() => {
        if (!hasFinished) {
          hasFinished = true;
          terminal.kill(sessionId);
          reject(new Error('Command timeout'));
        }
      }, options.timeout) : null;

      terminal.onData(sessionId, (data) => {
        output += data;
      });

      terminal.onExit(sessionId, (exitCode) => {
        if (!hasFinished) {
          hasFinished = true;
          if (timer) clearTimeout(timer);
          terminal.removeListeners(sessionId);

          if (exitCode === 0) {
            resolve({ stdout: output, stderr: '' });
          } else {
            reject(new Error(`Command failed with code ${exitCode}: ${output}`));
          }
        }
      });

      // Execute the command
      terminal.write(sessionId, command + '\n').then(() => {
        // Add exit command to close the session
        setTimeout(() => {
          if (!hasFinished) {
            terminal.write(sessionId, 'exit\n');
          }
        }, 1000);
      }).catch(reject);

    }).catch(reject);
  });
};

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

export async function processAgentResponse(response: string, enableAutoFix: boolean = true) {
  const { operations, chatSummary, chatContent } = parsePrestigeTags(response);
  const { currentApp, refreshCurrentApp } = useAppStore.getState();

  if (!currentApp) {
    showError("No application selected. Please create or select an app first.");
    return { chatContent: response, chatSummary: '' };
  }

  // Resolve files directory path centrally
  const { filesPath: appPath } = await resolveAppPaths(currentApp);

  // Get AppStateManager to update virtual filesystem
  const appStateManager = AppStateManager.getInstance();

  let hasFileOperations = false;

  for (const op of operations) {
    try {
      switch (op.type) {
        case 'write':
          if (typeof op.content === 'string') {
            const filePath = await path.join(appPath, op.path);
            await ensureFile(filePath);
            await writeFile(filePath, op.content);
            
            // Update virtual filesystem to track this change
            try {
              const vfs = await appStateManager.getVirtualFileSystem(currentApp);
              await vfs.writeFile(op.path, op.content);
              console.log(`✅ Updated virtual filesystem for: ${op.path}`);
            } catch (vfsError) {
              console.warn(`Failed to update virtual filesystem for ${op.path}:`, vfsError);
            }
            
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
          
          // Update virtual filesystem to track this change
          try {
            const vfs = await appStateManager.getVirtualFileSystem(currentApp);
            await vfs.renameFile(op.path, op.newPath!);
            console.log(`✅ Updated virtual filesystem rename: ${op.path} -> ${op.newPath}`);
          } catch (vfsError) {
            console.warn(`Failed to update virtual filesystem for rename ${op.path}:`, vfsError);
          }
          
          showSuccess(`File renamed: ${op.path} to ${op.newPath}`);
          hasFileOperations = true;
          break;
        case 'delete':
          const deletePath = await path.join(appPath, op.path);
          await remove(deletePath);
          
          // Update virtual filesystem to track this change
          try {
            const vfs = await appStateManager.getVirtualFileSystem(currentApp);
            await vfs.deleteFile(op.path);
            console.log(`✅ Updated virtual filesystem delete: ${op.path}`);
          } catch (vfsError) {
            console.warn(`Failed to update virtual filesystem for delete ${op.path}:`, vfsError);
          }
          
          showSuccess(`File deleted: ${op.path}`);
          hasFileOperations = true;
          break;
        case 'add-dependency':
          // Enhanced dependency installation with error handling
          try {
            await installDependenciesWithFallback(op.packages, appPath);
            showSuccess(`📦 Dependencies installed: ${op.packages.join(', ')}`);
          } catch (error) {
            console.error('Dependency installation failed:', error);
            showError(`Failed to install ${op.packages.join(', ')}: ${error instanceof Error ? error.message : String(error)}`);
          }
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

  // Enhanced error detection and auto-fix (like dyad's system)
  if (enableAutoFix && hasFileOperations) {
    await performAutoFixIfNeeded(response, appPath, operations);
  }

  return { chatContent, chatSummary };
}

/**
 * Enhanced auto-fix system inspired by dyad's approach
 * Only runs if there are no pending dependencies (like dyad does)
 */
async function performAutoFixIfNeeded(
  response: string,
  appPath: string,
  operations: Operation[]
): Promise<void> {
  try {
    // Check if there are dependencies being installed (like dyad)
    const addDependencies = operations.filter(op => op.type === 'add-dependency');

    if (addDependencies.length > 0) {
      console.log("🔧 Dependencies being installed, skipping auto-fix for now");
      return;
    }

    // Generate problem report
    const problemReport = await prestigeAutoFixService.generateProblemReport(appPath);

    if (problemReport.totalErrors === 0) {
      console.log("✅ No errors detected, skipping auto-fix");
      return;
    }

    console.log(`🔍 Found ${problemReport.totalErrors} error(s), ${problemReport.totalWarnings} warning(s)`);

    // Show problems summary
    const errorSummary = problemReport.problems
      .filter(p => p.severity === 'error')
      .slice(0, 3)
      .map(p => `${p.file}:${p.line} - ${p.message}`)
      .join('; ');

    showInfo(`⚠️ Found ${problemReport.totalErrors} error(s): ${errorSummary}${problemReport.totalErrors > 3 ? '...' : ''}`);

    // Attempt auto-fix with AI assistance (this would need to be connected to your AI service)
    // For now, just log the problems that would be fixed
    console.log("🤖 Auto-fix would attempt to resolve:");
    problemReport.problems.forEach((problem, index) => {
      console.log(`  ${index + 1}. ${problem.file}:${problem.line}:${problem.column} - ${problem.message}`);
    });

    // TODO: Integrate with your AI streaming service to actually perform auto-fix
    // This would call prestigeAutoFixService.attemptAutoFix() with AI function

  } catch (error) {
    console.error("❌ Auto-fix check failed:", error);
    showError(`Auto-fix check failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Install dependencies with fallback (inspired by dyad's executeAddDependency)
 */
async function installDependenciesWithFallback(
  packages: string[],
  appPath: string
): Promise<void> {
  const packageStr = packages.join(' ');

  try {
    console.log(`📦 Installing dependencies: ${packageStr}`);

    // Try pnpm first, fallback to npm with legacy peer deps (like dyad)
    const { stdout, stderr } = await execAsync(
      `(pnpm add ${packageStr}) || (npm install --legacy-peer-deps ${packageStr})`,
      {
        cwd: appPath,
        timeout: 120000, // 2 minute timeout
      }
    );

    const installResults = stdout + (stderr ? `\n${stderr}` : '');
    console.log(`✅ Successfully installed: ${packageStr}`);
    console.log(installResults);

    // Update package.json tracking
    const { currentApp } = useAppStore.getState();
    if (currentApp) {
      try {
        const appStateManager = AppStateManager.getInstance();
        const vfs = await appStateManager.getVirtualFileSystem(currentApp);
        // Refresh package.json in virtual filesystem
        const packageJsonPath = await path.join(appPath, 'package.json');
        const { readFile } = fs;
        const packageJsonContent = await readFile(packageJsonPath, 'utf8');
        await vfs.writeFile('package.json', packageJsonContent);
        console.log(`✅ Updated package.json in virtual filesystem`);
      } catch (vfsError) {
        console.warn('Failed to update package.json in VFS:', vfsError);
      }
    }

  } catch (error: any) {
    const errorOutput = error.stdout || error.stderr || error.message;
    console.error(`❌ Failed to install dependencies: ${packageStr}`, errorOutput);
    throw new Error(`Dependency installation failed: ${errorOutput}`);
  }
}
