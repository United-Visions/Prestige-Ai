import { app, BrowserWindow, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import { spawn, ChildProcess } from 'child_process'
import { writeFileSync, unlinkSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs'
import { join, resolve } from 'path'
import { tmpdir } from 'os'
import { eq, desc } from 'drizzle-orm';
import fs from 'fs';
import { initializeDatabase, closeDatabase } from './db';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './db/schema';
import { AdvancedAppManager } from './advancedAppManager';
 
// Add error handling to prevent crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the app, just log the error
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception thrown:', error);
  // Don't exit the app, just log the error
});

// Enable live reload for development
if (process.env.NODE_ENV === 'development') {
  try {
    require('electron-reload')(__dirname, {
      electron: require(`${__dirname}/../node_modules/electron/dist/electron`),
      hardResetMethod: 'restart',  // Use restart instead of exit to prevent crashes
      ignored: [
        /node_modules/,
        /[\/\\]\./,
        /\.git/,
        /builds/,
        /dist/,
        /\.log$/,
        /\.sqlite$/,
        /\.db$/,
        // Ignore files that might change during app rebuild to prevent restart loops
        /prestige-ai\/.*\/files/  // Ignore changes in scaffolded app files
      ]
    });
  } catch (error) {
    console.log('electron-reload not available in development mode');
  }
}

let mainWindow: BrowserWindow | null = null

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.cjs'),
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false,
  })

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    
    // Initialize advanced app manager
    const advancedAppManager = AdvancedAppManager.getInstance()
    advancedAppManager.setMainWindow(mainWindow!)
  })

  mainWindow.on('closed', () => {
    console.log('[MAIN] ===== MAIN WINDOW CLOSED EVENT =====');
    console.log(`[MAIN] NODE_ENV: ${process.env.NODE_ENV}`);
    // Only cleanup if we're actually closing the app, not during development restarts
    if (process.env.NODE_ENV !== 'development') {
      console.log('[MAIN] Production mode: triggering cleanup from window close');
      // Cleanup all running apps when window is closed
      AdvancedAppManager.getInstance().cleanup();
    } else {
      console.log('[MAIN] Development mode: skipping cleanup from window close');
    }
    console.log('[MAIN] Setting mainWindow to null');
    mainWindow = null
    console.log('[MAIN] ===== MAIN WINDOW CLOSED EVENT END =====');
  })
}

app.whenReady().then(() => {
  createWindow()

  // Auto-updater configuration
  if (!app.isPackaged) {
    console.log('Development mode: Auto-updater disabled')
  } else {
    // Auto-updater event handlers
    autoUpdater.on('checking-for-update', () => {
      console.log('Checking for update...')
    })

    autoUpdater.on('update-available', (info) => {
      console.log('Update available:', info)
    })

    autoUpdater.on('update-not-available', (info) => {
      console.log('Update not available:', info)
    })

    autoUpdater.on('error', (err) => {
      console.log('Error in auto-updater:', err)
    })

    autoUpdater.on('download-progress', (progressObj) => {
      console.log(`Download speed: ${progressObj.bytesPerSecond}`)
      console.log(`Downloaded ${progressObj.percent}%`)
    })

    autoUpdater.on('update-downloaded', (info) => {
      console.log('Update downloaded:', info)
      // You could show a notification to the user here
      autoUpdater.quitAndInstall()
    })

    // Check for updates on app start
    autoUpdater.checkForUpdatesAndNotify()
    
    // Check for updates every hour
    setInterval(() => {
      autoUpdater.checkForUpdatesAndNotify()
    }, 60 * 60 * 1000)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => {
  console.log('[MAIN] ===== BEFORE QUIT EVENT =====');
  console.log(`[MAIN] NODE_ENV: ${process.env.NODE_ENV}`);
  console.log('[MAIN] Triggering cleanup from before-quit event');
  // Cleanup advanced app manager
  AdvancedAppManager.getInstance().cleanup();
  console.log('[MAIN] ===== BEFORE QUIT EVENT END =====');
});

app.on('window-all-closed', () => {
  console.log('[MAIN] ===== WINDOW ALL CLOSED EVENT =====');
  console.log(`[MAIN] Platform: ${process.platform}`);
  if (process.platform !== 'darwin') {
    console.log('[MAIN] Non-Darwin platform: closing database and quitting app');
    closeDatabase();
    app.quit();
  } else {
    console.log('[MAIN] Darwin platform: keeping app alive');
  }
  console.log('[MAIN] ===== WINDOW ALL CLOSED EVENT END =====');
});

let db: BetterSQLite3Database<typeof schema>;
try {
  db = initializeDatabase();
  console.log('Database initialized successfully.');
} catch (error) {
  console.error('Failed to initialize database:', error);
  // In development, don't quit the app immediately - retry initialization
  if (process.env.NODE_ENV === 'development') {
    console.log('Development mode: Will retry database initialization...');
    // Try to initialize the database again after a delay
    setTimeout(() => {
      try {
        db = initializeDatabase();
        console.log('Database initialized successfully on retry.');
      } catch (retryError) {
        console.error('Failed to initialize database on retry:', retryError);
      }
    }, 2000);
  } else {
    // Only quit in production if database fails
    app.quit();
  }
}

// IPC Handlers for Claude Code CLI integration
ipcMain.handle('claude-code:check-availability', async (): Promise<boolean> => {
  return new Promise((resolve) => {
    const childProcess = spawn('claude', ['--version'], {
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    childProcess.on('close', (code: number | null) => {
      resolve(code === 0);
    });

    childProcess.on('error', () => {
      resolve(false);
    });
  });
});

ipcMain.handle('claude-code:execute', async (event, prompt: string, options: { cwd?: string } = {}): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Default to prestige-ai folder on desktop for project creation
    const desktopPath = app.getPath('desktop');
    const prestigeAIPath = join(desktopPath, 'prestige-ai');
    const { cwd = prestigeAIPath } = options;
    
    console.log('Executing Claude Code with prompt length:', prompt.length);
    console.log('Working directory:', cwd);
    
    // Create temporary file for the prompt
    const tempFileName = `prestige-ai-prompt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.txt`;
    const tempFilePath = join(tmpdir(), tempFileName);
    
    try {
      writeFileSync(tempFilePath, prompt, 'utf8');
      console.log(`Created temporary prompt file: ${tempFilePath}`);
      
      const cleanup = () => {
        try {
          if (existsSync(tempFilePath)) {
            unlinkSync(tempFilePath);
            console.log(`Cleaned up temporary file: ${tempFilePath}`);
          }
        } catch (cleanupError) {
          console.warn(`Failed to clean up temporary file: ${cleanupError}`);
        }
      };

      // Execute Claude Code CLI
      const childProcess = spawn('claude', [
        '--continue',
        '--print',
        '--dangerously-skip-permissions',
        tempFilePath
      ], {
        cwd,
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env }
      });

      let stdout = '';
      let stderr = '';

      childProcess.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      childProcess.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      childProcess.on('close', (code: number | null) => {
        cleanup();
        
        if (code === 0) {
          console.log('Claude Code executed successfully');
          resolve(stdout.trim());
        } else {
          console.error(`Claude Code failed with exit code ${code}`);
          console.error('STDERR:', stderr);
          console.error('STDOUT:', stdout);
          
          // Check for common error conditions
          let errorMessage = stderr || 'Unknown error';
          
          if (stdout.includes('limit reached') || stdout.includes('resets')) {
            errorMessage = `Usage limit reached. ${stdout.trim()}`;
          } else if (code === 1 && !stderr.trim() && !stdout.trim()) {
            errorMessage = 'Authentication failed or usage limit reached. Please check your Claude CLI status.';
          }
          
          reject(new Error(`Claude Code failed (exit code ${code}): ${errorMessage}`));
        }
      });

      childProcess.on('error', (err: Error) => {
        cleanup();
        console.error('Failed to spawn Claude Code:', err);
        reject(new Error(`Failed to execute Claude Code: ${err.message}`));
      });

      // Handle process termination signals
      process.once('SIGINT', cleanup);
      process.once('SIGTERM', cleanup);
      
    } catch (fileError) {
      console.error('Failed to create temporary prompt file:', fileError);
      reject(new Error(`Failed to create temporary file: ${fileError}`));
    }
  });
});

// IPC Handlers for Database
ipcMain.handle('db:get-apps', async () => {
  return db.query.apps.findMany();
});

ipcMain.handle('db:get-app', async (event, appId) => {
  return db.query.apps.findFirst({
    where: (apps, { eq }) => eq(apps.id, appId),
    with: {
      files: true,
    },
  });
});

ipcMain.handle('db:get-app-conversations', async (event, appId) => {
  return db.query.conversations.findMany({
    where: (conversations, { eq }) => eq(conversations.appId, appId),
    orderBy: (conversations, { desc }) => [desc(conversations.createdAt)],
  });
});

ipcMain.handle('db:create-app', async (event, app) => {
  const [newApp] = await db.insert(schema.apps).values(app).returning();
  return newApp;
});

ipcMain.handle('db:get-conversation', async (event, conversationId) => {
    return db.query.conversations.findFirst({
        where: (conversations, { eq }) => eq(conversations.id, conversationId),
        with: {
            messages: {
                orderBy: (messages, { desc }) => [desc(messages.createdAt)],
            },
        },
    });
});

ipcMain.handle('db:add-message', async (event, message) => {
    const [newMessage] = await db.insert(schema.messages).values(message).returning();
    return newMessage;
});

ipcMain.handle('db:delete-app', async (event, appId) => {
    await db.delete(schema.apps).where(eq(schema.apps.id, appId));
});

ipcMain.handle('db:delete-conversation', async (event, conversationId) => {
    await db.delete(schema.conversations).where(eq(schema.conversations.id, conversationId));
});

ipcMain.handle('db:rename-app', async (event, appId, newName) => {
    await db.update(schema.apps).set({ name: newName, path: newName, updatedAt: new Date() }).where(eq(schema.apps.id, appId));
});

ipcMain.handle('db:create-conversation', async (event, conversation) => {
    const [newConversation] = await db.insert(schema.conversations).values(conversation).returning({ id: schema.conversations.id });
    return newConversation.id;
});

// Additional fs handlers
ipcMain.handle('fs:ensure-file', async (event, filePath: string): Promise<void> => {
  try {
    const path = require('path');
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    const handle = await fs.promises.open(filePath, 'a');
    await handle.close();
  } catch (error) {
    throw new Error(`Failed to ensure file ${filePath}: ${error}`);
  }
});

ipcMain.handle('fs:rename', async (event, oldPath: string, newPath: string): Promise<void> => {
  try {
    await fs.promises.rename(oldPath, newPath);
  } catch (error) {
    throw new Error(`Failed to rename from ${oldPath} to ${newPath}: ${error}`);
  }
});

ipcMain.handle('fs:remove', async (event, path: string): Promise<void> => {
  try {
    await fs.promises.rm(path, { recursive: true, force: true });
  } catch (error) {
    throw new Error(`Failed to remove ${path}: ${error}`);
  }
});

ipcMain.handle('fs:delete-directory', async (event, dirPath: string): Promise<void> => {
  try {
    await fs.promises.rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    throw new Error(`Failed to delete directory ${dirPath}: ${error}`);
  }
});

ipcMain.handle('fs:copy', async (event, src: string, dest: string, options?: any): Promise<void> => {
  try {
    await fs.promises.cp(src, dest, { recursive: true, ...options });
  } catch (error) {
    throw new Error(`Failed to copy from ${src} to ${dest}: ${error}`);
  }
});

ipcMain.handle('fs:path-exists', async (event, path: string): Promise<boolean> => {
  try {
    await fs.promises.access(path);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('fs:read-json', async (event, path: string): Promise<any> => {
  const content = await fs.promises.readFile(path, 'utf8');
  return JSON.parse(content);
});

ipcMain.handle('fs:write-json', async (event, path: string, data: any, options?: object): Promise<void> => {
  const content = JSON.stringify(data, null, options?.spaces || 2);
  await fs.promises.writeFile(path, content, 'utf8');
});

ipcMain.handle('fs:ensure-dir', async (event, path: string): Promise<void> => {
  await fs.promises.mkdir(path, { recursive: true });
});

ipcMain.on('fs:exists-sync', (event, path: string) => {
  event.returnValue = existsSync(path);
});

// File system operations
ipcMain.handle('fs:read-file', async (event, filePath: string): Promise<string> => {
  const fs = require('fs').promises;
  try {
    return await fs.promises.readFile(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Failed to read file ${filePath}: ${error}`);
  }
});

ipcMain.handle('fs:write-file', async (event, filePath: string, content: string): Promise<void> => {
  const fs = require('fs').promises;
  const path = require('path');
  
  try {
    // Ensure directory exists
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, content, 'utf8');
  } catch (error) {
    throw new Error(`Failed to write file ${filePath}: ${error}`);
  }
});

ipcMain.handle('fs:create-project-dir', async (event, projectPath: string): Promise<void> => {
  try {
    if (!existsSync(projectPath)) {
      mkdirSync(projectPath, { recursive: true });
    }
  } catch (error) {
    throw new Error(`Failed to create project directory ${projectPath}: ${error}`);
  }
});

ipcMain.handle('fs:list-files', async (event, dirPath: string): Promise<string[]> => {
  try {
    if (!existsSync(dirPath)) {
      return [];
    }
    return readdirSync(dirPath);
  } catch (error) {
    throw new Error(`Failed to list files in ${dirPath}: ${error}`);
  }
});

ipcMain.handle('fs:get-file-stats', async (event, filePath: string): Promise<{ isDirectory: boolean; isFile: boolean }> => {
  try {
    if (!existsSync(filePath)) {
      throw new Error(`Path does not exist: ${filePath}`);
    }
    const stats = statSync(filePath);
    return {
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile()
    };
  } catch (error) {
    throw new Error(`Failed to get file stats for ${filePath}: ${error}`);
  }
});

ipcMain.handle('fs:read-directory-tree', async (event, dirPath: string): Promise<any> => {
  const readTree = (currentPath: string, relativePath: string = ''): any => {
    try {
      if (!existsSync(currentPath)) {
        return [];
      }

      const items = readdirSync(currentPath);
      const tree: any[] = [];

      for (const item of items) {
        // Skip hidden files and certain directories
        if (item.startsWith('.') || item === 'node_modules' || item === 'conversations') {
          continue;
        }

        const fullPath = join(currentPath, item);
        const stats = statSync(fullPath);
        const itemRelativePath = relativePath ? `${relativePath}/${item}` : item;

        if (stats.isDirectory()) {
          tree.push({
            name: item,
            path: itemRelativePath,
            type: 'directory',
            children: readTree(fullPath, itemRelativePath)
          });
        } else if (stats.isFile()) {
          tree.push({
            name: item,
            path: itemRelativePath,
            type: 'file'
          });
        }
      }

      return tree;
    } catch (error) {
      console.error(`Error reading directory tree for ${currentPath}:`, error);
      return [];
    }
  };

  return readTree(dirPath);
});

ipcMain.handle('app:get-app-data-path', async (): Promise<string> => {
  return app.getPath('userData');
});

ipcMain.handle('app:get-desktop-path', async (): Promise<string> => {
  return app.getPath('desktop');
});

ipcMain.handle('app:initialize-prestige-folder', async (): Promise<string> => {
  const desktopPath = app.getPath('desktop');
  const prestigeAIPath = join(desktopPath, 'prestige-ai');
  
  // Create prestige-ai folder if it doesn't exist
  if (!existsSync(prestigeAIPath)) {
    mkdirSync(prestigeAIPath, { recursive: true });
    console.log(`Created prestige-ai folder at: ${prestigeAIPath}`);
  }
  
  return prestigeAIPath;
});

ipcMain.handle('app:get-cwd', async (): Promise<string> => {
  return process.cwd();
});

// Path utility handlers
ipcMain.handle('path:join', async (event, paths: string[]): Promise<string> => {
  return join(...paths);
});

ipcMain.handle('path:basename', async (event, filePath: string, ext?: string): Promise<string> => {
  const path = require('path');
  return path.basename(filePath, ext);
});

ipcMain.handle('path:dirname', async (event, filePath: string): Promise<string> => {
  const path = require('path');
  return path.dirname(filePath);
});

ipcMain.handle('path:resolve', async (event, paths: string[]): Promise<string> => {
  return resolve(...paths);
});

ipcMain.handle('path:relative', async (event, from: string, to: string): Promise<string> => {
  const path = require('path');
  return path.relative(from, to);
});

// Clean up old temp files on startup
function cleanupOldTempFiles(): void {
  try {
    const tempDir = tmpdir();
    const files = readdirSync(tempDir);
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    files.forEach(file => {
      if (file.startsWith('prestige-ai-prompt-') && file.endsWith('.txt')) {
        const filePath = join(tempDir, file);
        try {
          const stats = statSync(filePath);
          if (stats.mtimeMs < oneHourAgo) {
            unlinkSync(filePath);
            console.log(`Cleaned up old temp file: ${file}`);
          }
        } catch (err) {
          console.debug(`Could not clean up temp file ${file}: ${err}`);
        }
      }
    });
  } catch (err) {
    console.warn(`Failed to clean up old temp files: ${err}`);
  }
}

// Clean up old temp files on startup
app.whenReady().then(() => {
  cleanupOldTempFiles();
});