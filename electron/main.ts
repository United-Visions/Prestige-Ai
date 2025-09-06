import { app, BrowserWindow, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import { spawn } from 'child_process'
import { writeFileSync, unlinkSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs'
import { join, resolve } from 'path'
import { tmpdir } from 'os'
import { eq } from 'drizzle-orm';
import fs from 'fs';
import { initializeDatabase, closeDatabase, getDatabase } from './db';
import * as schema from './db/schema';
import { AdvancedAppManager } from './advancedAppManager';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

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
    console.log('[MAIN] Window closed');
    if (process.env.NODE_ENV !== 'development') {
      AdvancedAppManager.getInstance().cleanup();
    }
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => {
  console.log('[MAIN] Before quit - cleaning up');
  AdvancedAppManager.getInstance().cleanup();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    closeDatabase();
    app.quit();
  }
});

// Lazily initialize the database only after Electron is ready.
// This avoids calling app.getPath(...) before the app 'ready' event,
// which was causing initialization to fail and leaving `db` undefined.
let dbInitialized = false;
function ensureDb() {
  if (!dbInitialized) {
    try {
      initializeDatabase();
      dbInitialized = true;
      console.log('Database initialized successfully.');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      if (process.env.NODE_ENV !== 'development') {
        app.quit();
      }
      throw error;
    }
  }
  return getDatabase();
}

app.whenReady().then(() => {
  // Proactively initialize so first renderer requests are fast.
  try { ensureDb(); } catch { /* already logged */ }
});

// Database IPC handlers
ipcMain.handle('db:get-apps', async () => {
  const db = ensureDb();
  return db.query.apps.findMany();
});

ipcMain.handle('db:get-app', async (_, appId) => {
  const db = ensureDb();
  return db.query.apps.findFirst({
    where: (apps, { eq }) => eq(apps.id, appId),
    with: {
      files: true,
    },
  });
});

ipcMain.handle('db:get-app-conversations', async (_, appId) => {
  const db = ensureDb();
  return db.query.conversations.findMany({
    where: (conversations, { eq }) => eq(conversations.appId, appId),
    orderBy: (conversations, { desc }) => [desc(conversations.createdAt)],
  });
});

ipcMain.handle('db:create-app', async (_, app) => {
  const db = ensureDb();
  const [newApp] = await db.insert(schema.apps).values(app).returning();
  return newApp;
});

ipcMain.handle('db:get-conversation', async (_, conversationId) => {
  const db = ensureDb();
  return db.query.conversations.findFirst({
    where: (conversations, { eq }) => eq(conversations.id, conversationId),
    with: {
      messages: {
        orderBy: (messages, { desc }) => [desc(messages.createdAt)],
      },
    },
  });
});

ipcMain.handle('db:add-message', async (_, message) => {
  const db = ensureDb();
  const [newMessage] = await db.insert(schema.messages).values(message).returning();
  return newMessage;
});

ipcMain.handle('db:delete-app', async (_, appId) => {
  const db = ensureDb();
  await db.delete(schema.apps).where(eq(schema.apps.id, appId));
});

ipcMain.handle('db:delete-conversation', async (_, conversationId) => {
  const db = ensureDb();
  await db.delete(schema.conversations).where(eq(schema.conversations.id, conversationId));
});

ipcMain.handle('db:rename-app', async (_, appId, newName) => {
  const db = ensureDb();
  await db.update(schema.apps).set({ name: newName, path: newName, updatedAt: new Date() }).where(eq(schema.apps.id, appId));
});

ipcMain.handle('db:create-conversation', async (_, conversation) => {
  const db = ensureDb();
  const [newConversation] = await db.insert(schema.conversations).values(conversation).returning({ id: schema.conversations.id });
  return newConversation.id;
});

// File system IPC handlers
ipcMain.handle('fs:read-file', async (_, filePath: string): Promise<string> => {
  try {
    return await fs.promises.readFile(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Failed to read file ${filePath}: ${error}`);
  }
});

ipcMain.handle('fs:write-file', async (_, filePath: string, content: string): Promise<void> => {
  try {
    await fs.promises.mkdir(require('path').dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, content, 'utf8');
  } catch (error) {
    throw new Error(`Failed to write file ${filePath}: ${error}`);
  }
});

ipcMain.handle('fs:exists', async (_, filePath: string): Promise<boolean> => {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('fs:mkdir', async (_, dirPath: string): Promise<void> => {
  try {
    await fs.promises.mkdir(dirPath, { recursive: true });
  } catch (error) {
    throw new Error(`Failed to create directory ${dirPath}: ${error}`);
  }
});

ipcMain.handle('fs:readdir', async (_, dirPath: string): Promise<string[]> => {
  try {
    return await fs.promises.readdir(dirPath);
  } catch (error) {
    throw new Error(`Failed to read directory ${dirPath}: ${error}`);
  }
});

ipcMain.handle('fs:stat', async (_, filePath: string) => {
  try {
    return await fs.promises.stat(filePath);
  } catch (error) {
    throw new Error(`Failed to get file stats ${filePath}: ${error}`);
  }
});

ipcMain.handle('fs:ensure-file', async (_, filePath: string): Promise<void> => {
  try {
    await fs.promises.mkdir(require('path').dirname(filePath), { recursive: true });
    const handle = await fs.promises.open(filePath, 'a');
    await handle.close();
  } catch (error) {
    throw new Error(`Failed to ensure file ${filePath}: ${error}`);
  }
});

ipcMain.handle('fs:rename', async (_, oldPath: string, newPath: string): Promise<void> => {
  try {
    await fs.promises.rename(oldPath, newPath);
  } catch (error) {
    throw new Error(`Failed to rename from ${oldPath} to ${newPath}: ${error}`);
  }
});

ipcMain.handle('fs:remove', async (_, path: string): Promise<void> => {
  try {
    await fs.promises.rm(path, { recursive: true, force: true });
  } catch (error) {
    throw new Error(`Failed to remove ${path}: ${error}`);
  }
});

ipcMain.handle('fs:copy', async (_, src: string, dest: string, options?: any): Promise<void> => {
  try {
    await fs.promises.cp(src, dest, { recursive: true, ...options });
  } catch (error) {
    throw new Error(`Failed to copy from ${src} to ${dest}: ${error}`);
  }
});

ipcMain.handle('fs:read-json', async (_, path: string): Promise<any> => {
  const content = await fs.promises.readFile(path, 'utf8');
  return JSON.parse(content);
});

ipcMain.handle('fs:write-json', async (_, path: string, data: any, options?: { spaces?: number }): Promise<void> => {
  const content = JSON.stringify(data, null, options?.spaces || 2);
  await fs.promises.writeFile(path, content, 'utf8');
});

ipcMain.handle('fs:create-project-dir', async (_, projectPath: string): Promise<void> => {
  try {
    if (!existsSync(projectPath)) {
      mkdirSync(projectPath, { recursive: true });
    }
  } catch (error) {
    throw new Error(`Failed to create project directory ${projectPath}: ${error}`);
  }
});

ipcMain.handle('fs:list-files', async (_, dirPath: string): Promise<string[]> => {
  try {
    if (!existsSync(dirPath)) {
      return [];
    }
    return readdirSync(dirPath);
  } catch (error) {
    throw new Error(`Failed to list files in ${dirPath}: ${error}`);
  }
});

ipcMain.handle('fs:get-file-stats', async (_, filePath: string): Promise<{ isDirectory: boolean; isFile: boolean }> => {
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

ipcMain.handle('fs:read-directory-tree', async (_, dirPath: string): Promise<any> => {
  const readTree = (currentPath: string, relativePath: string = ''): any => {
    try {
      if (!existsSync(currentPath)) {
        return [];
      }

      const items = readdirSync(currentPath);
      const tree: any[] = [];

      for (const item of items) {
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

// Path utilities
ipcMain.handle('path:join', async (_, paths: string[]): Promise<string> => {
  return join(...paths);
});

ipcMain.handle('path:basename', async (_, filePath: string, ext?: string): Promise<string> => {
  return require('path').basename(filePath, ext);
});

ipcMain.handle('path:dirname', async (_, filePath: string): Promise<string> => {
  return require('path').dirname(filePath);
});

ipcMain.handle('path:resolve', async (_, paths: string[]): Promise<string> => {
  return resolve(...paths);
});

ipcMain.handle('path:relative', async (_, from: string, to: string): Promise<string> => {
  return require('path').relative(from, to);
});

// App utilities
ipcMain.handle('app:get-app-data-path', async (): Promise<string> => {
  return app.getPath('userData');
});

ipcMain.handle('app:get-desktop-path', async (): Promise<string> => {
  return app.getPath('desktop');
});

ipcMain.handle('app:initialize-prestige-folder', async (): Promise<string> => {
  const desktopPath = app.getPath('desktop');
  const prestigeAIPath = join(desktopPath, 'prestige-ai');
  
  if (!existsSync(prestigeAIPath)) {
    mkdirSync(prestigeAIPath, { recursive: true });
    console.log(`Created prestige-ai folder at: ${prestigeAIPath}`);
  }
  
  return prestigeAIPath;
});

ipcMain.handle('app:get-cwd', async (): Promise<string> => {
  return process.cwd();
});

// Environment variable handlers
ipcMain.on('env:get-var', (event, name: string) => {
  event.returnValue = process.env[name];
});

ipcMain.handle('env:get-all-vars', async (): Promise<Record<string, string | undefined>> => {
  return {
    'OPENAI_API_KEY': process.env.OPENAI_API_KEY,
    'ANTHROPIC_API_KEY': process.env.ANTHROPIC_API_KEY,
    'GOOGLE_API_KEY': process.env.GOOGLE_API_KEY,
    'OPENROUTER_API_KEY': process.env.OPENROUTER_API_KEY,
  };
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