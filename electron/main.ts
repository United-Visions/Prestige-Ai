import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import { spawn } from 'child_process'
import { writeFileSync, unlinkSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs'
import { join, resolve } from 'path'
import { tmpdir } from 'os'
import { eq } from 'drizzle-orm';
import fs from 'fs';
import { createServer } from 'http';
import { URL } from 'url';
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

// MongoDB (ephemeral) management in main process
let mongoMemServer: any = null;

ipcMain.handle('mongo:start-ephemeral', async () => {
  try {
    if (mongoMemServer) {
      const uri = mongoMemServer.getUri();
      return { ok: true, uri };
    }
    // Require here to keep it out of the renderer bundle
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongoMemServer = await MongoMemoryServer.create();
    const uri = mongoMemServer.getUri();
    return { ok: true, uri };
  } catch (error: any) {
    console.warn('mongo:start-ephemeral failed:', error);
    return { ok: false, error: String(error?.message || error) };
  }
});

ipcMain.handle('mongo:stop-ephemeral', async () => {
  try {
    if (mongoMemServer) {
      await mongoMemServer.stop();
      mongoMemServer = null;
    }
    return { ok: true };
  } catch (error: any) {
    console.warn('mongo:stop-ephemeral failed:', error);
    return { ok: false, error: String(error?.message || error) };
  }
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
        orderBy: (messages, { asc }) => [asc(messages.createdAt)],
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

ipcMain.handle('db:delete-message', async (_, messageId) => {
  const db = ensureDb();
  await db.delete(schema.messages).where(eq(schema.messages.id, messageId));
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

ipcMain.handle('fs:path-exists', async (_, path: string): Promise<boolean> => {
  try {
    await fs.promises.access(path);
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

// Terminal utilities for dependency installation
const activeSessions = new Map<string, any>();

ipcMain.handle('terminal:create-session', async (_, options: {
  cwd: string;
  env?: Record<string, string>;
  shell?: string;
  commandLine?: string;
  appId?: number;
  appName?: string;
  cols?: number;
  rows?: number;
}): Promise<{ sessionId: string; pid: number }> => {
  try {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create a shell session for interactive command execution
    const shell = process.platform === 'win32' ? 'cmd.exe' : 'bash';

    console.log(`Terminal session ${sessionId}: Creating shell in ${options.cwd}`);

    const child = spawn(shell, [], {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: 'pipe'
    });

    // Store the session for later writes
    activeSessions.set(sessionId, child);

    // Send output to renderer
    child.stdout?.on('data', (data) => {
      mainWindow?.webContents.send(`terminal:data:${sessionId}`, data.toString());
    });

    child.stderr?.on('data', (data) => {
      mainWindow?.webContents.send(`terminal:data:${sessionId}`, data.toString());
    });

    child.on('exit', (code) => {
      activeSessions.delete(sessionId);
      mainWindow?.webContents.send(`terminal:exit:${sessionId}`, code);
    });

    child.on('error', (error) => {
      console.error(`Terminal session ${sessionId} error:`, error);
      activeSessions.delete(sessionId);
      mainWindow?.webContents.send(`terminal:exit:${sessionId}`, 1);
    });

    return { sessionId, pid: child.pid || 0 };
  } catch (error) {
    console.error('Failed to create terminal session:', error);
    throw error;
  }
});

ipcMain.handle('terminal:write', async (_, sessionId: string, data: string): Promise<boolean> => {
  try {
    const session = activeSessions.get(sessionId);
    if (!session || session.killed) {
      console.error(`Terminal session ${sessionId} not found or killed`);
      return false;
    }

    console.log(`Terminal write to ${sessionId}: ${data.trim()}`);
    session.stdin.write(data);
    return true;
  } catch (error) {
    console.error(`Error writing to terminal session ${sessionId}:`, error);
    return false;
  }
});

ipcMain.handle('terminal:kill', async (_, sessionId: string): Promise<boolean> => {
  try {
    const session = activeSessions.get(sessionId);
    if (session && !session.killed) {
      console.log(`Terminal killing session: ${sessionId}`);
      session.kill();
      activeSessions.delete(sessionId);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error killing terminal session ${sessionId}:`, error);
    return false;
  }
});

ipcMain.handle('terminal:resize', async (_, sessionId: string, cols: number, rows: number): Promise<boolean> => {
  // Terminal resize not needed for dependency installation
  return true;
});

ipcMain.handle('terminal:kill-sessions-for-app', async (_, appId: number): Promise<void> => {
  console.log(`Killing terminal sessions for app: ${appId}`);
  // For now, kill all active sessions since we don't track by app
  for (const [sessionId, session] of activeSessions.entries()) {
    try {
      if (session && !session.killed) {
        session.kill();
      }
    } catch (error) {
      console.error(`Error killing session ${sessionId}:`, error);
    }
  }
  activeSessions.clear();
});

ipcMain.handle('terminal:check-claude-availability', async (): Promise<boolean> => {
  // Check if Claude CLI is available
  try {
    const child = spawn('claude', ['--version'], { stdio: 'pipe' });
    return new Promise((resolve) => {
      child.on('exit', (code) => {
        resolve(code === 0);
      });
      child.on('error', () => {
        resolve(false);
      });
    });
  } catch {
    return false;
  }
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

// Combined paths utility similar to Dyad expectation
// Returns locations needed by template/scaffold logic in renderer
ipcMain.handle('app:get-paths', async () => {
  // In packaged builds, Electron's resources path differs; expose both
  const isPackaged = app.isPackaged;
  // resourcesPath: where extra assets (like scaffold) would be placed when packaged
  const resourcesPath = process.resourcesPath || app.getAppPath();
  // appPath: development project root (unpacked path during dev)
  const appPath = app.getAppPath();
  return { resourcesPath, appPath, isPackaged };
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

// OAuth callback server management
let oauthServer: any = null;

ipcMain.handle('oauth:start-server', async (_, port: number = 8080): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      if (oauthServer) {
        oauthServer.close();
      }

      oauthServer = createServer((req, res) => {
        try {
          const parsedUrl = new URL(req.url!, `http://localhost:${port}`);
          const query = Object.fromEntries(parsedUrl.searchParams);

          // Set CORS headers
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

          if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
          }

          let provider = '';
          let callbackPath = '';

          if (parsedUrl.pathname === '/auth/github/callback') {
            provider = 'github';
            callbackPath = '/auth/github/callback';
          } else if (parsedUrl.pathname === '/auth/supabase/callback') {
            provider = 'supabase';
            callbackPath = '/auth/supabase/callback';
          } else if (parsedUrl.pathname === '/auth/vercel/callback') {
            provider = 'vercel';
            callbackPath = '/auth/vercel/callback';
          }

          if (provider && callbackPath) {
            // Send success page
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <!DOCTYPE html>
              <html>
              <head>
                <title>Authentication Success</title>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                         text-align: center; padding: 50px; background: #f5f5f5; }
                  .container { max-width: 400px; margin: 0 auto; padding: 40px; 
                              background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                  .success { color: #22c55e; font-size: 48px; margin-bottom: 20px; }
                  h1 { color: #1f2937; margin-bottom: 16px; }
                  p { color: #6b7280; margin-bottom: 30px; }
                  .provider { color: #3b82f6; font-weight: 600; text-transform: capitalize; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="success">✓</div>
                  <h1>Authentication Successful</h1>
                  <p>You have successfully connected your <span class="provider">${provider}</span> account to Prestige AI.</p>
                  <p>You can now close this window and return to the application.</p>
                </div>
                <script>
                  // Send message to main window if it's a popup
                  if (window.opener) {
                    window.opener.postMessage({
                      type: 'OAUTH_CALLBACK',
                      provider: '${provider}',
                      code: '${query.code || ''}',
                      state: '${query.state || ''}',
                      error: '${query.error || ''}'
                    }, '*');
                    setTimeout(() => window.close(), 2000);
                  }
                </script>
              </body>
              </html>
            `);

            // Send callback data to renderer process
            if (mainWindow) {
              mainWindow.webContents.send('oauth:callback', {
                provider,
                code: query.code,
                state: query.state,
                error: query.error
              });
            }
          } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
          }
        } catch (error) {
          console.error('OAuth callback error:', error);
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Internal Server Error');
        }
      });

      oauthServer.listen(port, 'localhost', () => {
        console.log(`OAuth callback server started on port ${port}`);
        resolve(true);
      });

      oauthServer.on('error', (error: any) => {
        console.error('OAuth server error:', error);
        resolve(false);
      });

    } catch (error) {
      console.error('Failed to start OAuth server:', error);
      resolve(false);
    }
  });
});

ipcMain.handle('oauth:stop-server', async (): Promise<void> => {
  if (oauthServer) {
    oauthServer.close();
    oauthServer = null;
    console.log('OAuth callback server stopped');
  }
});

ipcMain.handle('oauth:open-url', async (_, url: string): Promise<void> => {
  await shell.openExternal(url);
});

// GitHub API handlers for device flow (bypasses CORS)
ipcMain.handle('github:device-flow-start', async (_, params: { client_id: string; scope: string }) => {
  try {
    const response = await fetch('https://github.com/login/device/code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`GitHub device flow failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('GitHub device flow start error:', error);
    throw error;
  }
});

ipcMain.handle('github:device-flow-poll', async (_, params: { 
  client_id: string; 
  device_code: string; 
  grant_type: string 
}) => {
  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();
    return { ok: response.ok, data };
  } catch (error) {
    console.error('GitHub device flow poll error:', error);
    throw error;
  }
});

ipcMain.handle('github:api-request', async (_, { endpoint, options }: { 
  endpoint: string; 
  options?: RequestInit 
}) => {
  try {
    const response = await fetch(`https://api.github.com${endpoint}`, {
      ...options,
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        ...options?.headers,
      },
    });

    const data = await response.json();
    return { ok: response.ok, status: response.status, statusText: response.statusText, data };
  } catch (error) {
    console.error('GitHub API request error:', error);
    throw error;
  }
});

// Git operations handlers
ipcMain.handle('git:init', async (_, repoPath: string) => {
  try {
    const { execSync } = require('child_process');
    
    // Try different Git paths and shells
    const gitPaths = ['/usr/bin/git', '/usr/local/bin/git', 'git'];
    const shells = ['/bin/zsh', '/bin/bash', '/bin/sh', true];
    
    let lastError;
    
    for (const gitPath of gitPaths) {
      for (const shell of shells) {
        try {
          const result = execSync(`${gitPath} init`, { 
            cwd: repoPath, 
            encoding: 'utf8',
            shell: shell,
            env: { ...process.env, PATH: `/usr/local/bin:/usr/bin:/bin:${process.env.PATH}` }
          });
          console.log(`✅ Git init succeeded with ${gitPath} and shell ${shell}`);
          return { success: true, output: result };
        } catch (error) {
          lastError = error;
          console.log(`⚠️ Git init failed with ${gitPath} and shell ${shell}:`, error.message);
        }
      }
    }
    
    throw lastError;
  } catch (error) {
    console.error('Git init error:', error);
    return { success: false, error: error.message };
  }
});

// Helper function for git command execution
const getGitExecOptions = (cwd: string) => ({
  cwd,
  encoding: 'utf8' as const,
  shell: process.platform === 'win32' ? true : '/bin/bash',
  env: { 
    ...process.env, 
    PATH: process.platform === 'win32' 
      ? process.env.PATH 
      : `/usr/local/bin:/usr/bin:/opt/homebrew/bin:${process.env.PATH}`
  },
  timeout: 10000 // 10 second timeout
});

ipcMain.handle('git:status', async (_, repoPath: string) => {
  try {
    const { execSync } = require('child_process');
    const result = execSync('git status --porcelain', getGitExecOptions(repoPath));
    
    // Parse git status output
    const lines = result.trim().split('\n').filter(line => line.length > 0);
    const staged = [];
    const unstaged = [];
    
    for (const line of lines) {
      const status = line.substring(0, 2);
      const file = line.substring(3);
      
      if (status[0] !== ' ') {
        staged.push({ file, status: status[0] });
      }
      if (status[1] !== ' ') {
        unstaged.push({ file, status: status[1] });
      }
    }
    
    return { success: true, staged, unstaged };
  } catch (error) {
    console.error('Git status error:', error);
    return { success: false, error: error.message, staged: [], unstaged: [] };
  }
});

ipcMain.handle('git:add', async (_, repoPath: string, files: string[]) => {
  try {
    const { execSync } = require('child_process');
    const fileList = files.length === 0 ? '.' : files.join(' ');
    const result = execSync(`git add ${fileList}`, { 
      cwd: repoPath, 
      encoding: 'utf8',
      shell: true,
      env: { ...process.env, PATH: `/usr/local/bin:/usr/bin:${process.env.PATH}` }
    });
    return { success: true, output: result };
  } catch (error) {
    console.error('Git add error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git:commit', async (_, repoPath: string, message: string, description?: string) => {
  try {
    const { execSync } = require('child_process');
    const fullMessage = description ? `${message}\n\n${description}` : message;
    const result = execSync(`git commit -m "${fullMessage}"`, { 
      cwd: repoPath, 
      encoding: 'utf8',
      shell: true,
      env: { ...process.env, PATH: `/usr/local/bin:/usr/bin:${process.env.PATH}` }
    });
    return { success: true, output: result };
  } catch (error) {
    console.error('Git commit error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git:push', async (_, repoPath: string, remote: string = 'origin', branch: string = 'main') => {
  try {
    const { execSync } = require('child_process');
    const execOptions = { 
      cwd: repoPath, 
      encoding: 'utf8',
      shell: true,
      env: { ...process.env, PATH: `/usr/local/bin:/usr/bin:${process.env.PATH}` }
    };
    
    // First try to push to the specified branch
    try {
      const result = execSync(`git push -u ${remote} ${branch}`, execOptions);
      return { success: true, output: result };
    } catch (pushError) {
      // If push fails, it might be because the branch doesn't exist on remote
      // Try to push with --set-upstream flag
      console.log('Retrying push with upstream set...');
      const result = execSync(`git push --set-upstream ${remote} ${branch}`, execOptions);
      return { success: true, output: result };
    }
  } catch (error) {
    console.error('Git push error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git:force-push', async (_, repoPath: string, remote: string = 'origin', branch: string = 'main') => {
  try {
    const { execSync } = require('child_process');
    
    // Try different Git paths and shells for force push
    const gitPaths = ['/usr/bin/git', '/usr/local/bin/git', 'git'];
    const shells = ['/bin/zsh', '/bin/bash', '/bin/sh', true];
    
    let lastError;
    
    for (const gitPath of gitPaths) {
      for (const shell of shells) {
        try {
          // Try force-with-lease first, then regular force push if needed
          let result;
          try {
            result = execSync(`${gitPath} push --force-with-lease ${remote} ${branch}`, { 
              cwd: repoPath, 
              encoding: 'utf8',
              shell: shell,
              env: { ...process.env, PATH: `/usr/local/bin:/usr/bin:/bin:${process.env.PATH}` }
            });
          } catch (leaseError) {
            // If force-with-lease fails, try regular force push
            console.log(`Force-with-lease failed, trying regular force push:`, leaseError.message);
            result = execSync(`${gitPath} push --force ${remote} ${branch}`, { 
              cwd: repoPath, 
              encoding: 'utf8',
              shell: shell,
              env: { ...process.env, PATH: `/usr/local/bin:/usr/bin:/bin:${process.env.PATH}` }
            });
          }
          console.log(`✅ Git force push succeeded with ${gitPath} and shell ${shell}`);
          return { success: true, output: result };
        } catch (error) {
          lastError = error;
          console.log(`⚠️ Git force push failed with ${gitPath} and shell ${shell}:`, error.message);
        }
      }
    }
    
    throw lastError;
  } catch (error) {
    console.error('Git force push error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git:remote-add', async (_, repoPath: string, name: string, url: string) => {
  try {
    const { execSync } = require('child_process');
    const result = execSync(`git remote add ${name} ${url}`, { 
      cwd: repoPath, 
      encoding: 'utf8',
      shell: true,
      env: { ...process.env, PATH: `/usr/local/bin:/usr/bin:${process.env.PATH}` }
    });
    return { success: true, output: result };
  } catch (error) {
    console.error('Git remote add error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git:remote-list', async (_, repoPath: string) => {
  try {
    const { execSync } = require('child_process');
    const result = execSync('git remote -v', { 
      cwd: repoPath, 
      encoding: 'utf8',
      shell: true,
      env: { ...process.env, PATH: `/usr/local/bin:/usr/bin:${process.env.PATH}` }
    });
    
    // Parse remote list
    const lines = result.trim().split('\n').filter(line => line.length > 0);
    const remotes = [];
    
    for (const line of lines) {
      const match = line.match(/^(\S+)\s+(\S+)\s+\((\w+)\)$/);
      if (match) {
        const [, name, url, type] = match;
        remotes.push({ name, url, type });
      }
    }
    
    return { success: true, remotes };
  } catch (error) {
    console.error('Git remote list error:', error);
    return { success: false, error: error.message, remotes: [] };
  }
});

ipcMain.handle('git:log', async (_, repoPath: string, limit: number = 10) => {
  try {
    const { execSync } = require('child_process');
    const result = execSync(`git log --oneline -${limit}`, { 
      cwd: repoPath, 
      encoding: 'utf8',
      shell: true,
      env: { ...process.env, PATH: `/usr/local/bin:/usr/bin:${process.env.PATH}` }
    });
    
    // Parse git log output
    const lines = result.trim().split('\n').filter(line => line.length > 0);
    const commits = lines.map(line => {
      const spaceIndex = line.indexOf(' ');
      const hash = line.substring(0, spaceIndex);
      const message = line.substring(spaceIndex + 1);
      return { hash, message };
    });
    
    return { success: true, commits };
  } catch (error) {
    console.error('Git log error:', error);
    return { success: false, error: error.message, commits: [] };
  }
});

ipcMain.handle('git:diff', async (_, repoPath: string, file?: string) => {
  try {
    const { execSync } = require('child_process');
    const command = file ? `git diff ${file}` : 'git diff';
    const result = execSync(command, { 
      cwd: repoPath, 
      encoding: 'utf8',
      shell: true,
      env: { ...process.env, PATH: `/usr/local/bin:/usr/bin:${process.env.PATH}` }
    });
    return { success: true, diff: result };
  } catch (error) {
    console.error('Git diff error:', error);
    return { success: false, error: error.message, diff: '' };
  }
});

ipcMain.handle('git:clone', async (_, url: string, targetPath: string, name?: string) => {
  try {
    const { execSync } = require('child_process');
    const clonePath = name ? `${targetPath}/${name}` : targetPath;
    const command = name ? `git clone ${url} ${name}` : `git clone ${url} .`;
    
    // Ensure target directory exists
    if (name) {
      const { mkdirSync } = require('fs');
      mkdirSync(targetPath, { recursive: true });
      const result = execSync(command, { 
        cwd: targetPath, 
        encoding: 'utf8',
        shell: true,
        env: { ...process.env, PATH: `/usr/local/bin:/usr/bin:${process.env.PATH}` }
      });
      return { success: true, output: result, path: clonePath };
    } else {
      const result = execSync(command, { 
        cwd: targetPath, 
        encoding: 'utf8',
        shell: true,
        env: { ...process.env, PATH: `/usr/local/bin:/usr/bin:${process.env.PATH}` }
      });
      return { success: true, output: result, path: targetPath };
    }
  } catch (error) {
    console.error('Git clone error:', error);
    return { success: false, error: error.message };
  }
});

// Modern Git API handlers for GitStatusService
ipcMain.handle('git:stageFile', async (_, repoPath: string, filePath: string) => {
  try {
    const { execSync } = require('child_process');
    execSync(`git add "${filePath}"`, getGitExecOptions(repoPath));
    return { success: true };
  } catch (error) {
    console.error('Git stage file error:', error);
    throw new Error(`Failed to stage ${filePath}: ${error.message}`);
  }
});

ipcMain.handle('git:unstageFile', async (_, repoPath: string, filePath: string) => {
  try {
    const { execSync } = require('child_process');
    execSync(`git reset HEAD "${filePath}"`, getGitExecOptions(repoPath));
    return { success: true };
  } catch (error) {
    console.error('Git unstage file error:', error);
    throw new Error(`Failed to unstage ${filePath}: ${error.message}`);
  }
});

ipcMain.handle('git:stageAll', async (_, repoPath: string) => {
  try {
    const { execSync } = require('child_process');
    execSync('git add .', getGitExecOptions(repoPath));
    return { success: true };
  } catch (error) {
    console.error('Git stage all error:', error);
    throw new Error(`Failed to stage all files: ${error.message}`);
  }
});

ipcMain.handle('git:unstageAll', async (_, repoPath: string) => {
  try {
    const { execSync } = require('child_process');
    execSync('git reset HEAD', getGitExecOptions(repoPath));
    return { success: true };
  } catch (error) {
    console.error('Git unstage all error:', error);
    throw new Error(`Failed to unstage all files: ${error.message}`);
  }
});

ipcMain.handle('git:getCurrentBranch', async (_, repoPath: string) => {
  try {
    const { execSync } = require('child_process');
    const result = execSync('git branch --show-current', getGitExecOptions(repoPath));
    return result.toString().trim() || 'main';
  } catch (error) {
    console.error('Git get current branch error:', error);
    return 'main';
  }
});

ipcMain.handle('git:getAheadBehind', async (_, repoPath: string) => {
  try {
    const { execSync } = require('child_process');
    const result = execSync('git status -b --porcelain', getGitExecOptions(repoPath));
    const statusLines = result.toString().split('\n');
    const branchLine = statusLines[0];
    
    let ahead = 0, behind = 0, upstream = '';
    
    if (branchLine.includes('[')) {
      const match = branchLine.match(/\[([^\]]+)\]/);
      if (match) {
        const info = match[1];
        const aheadMatch = info.match(/ahead (\d+)/);
        const behindMatch = info.match(/behind (\d+)/);
        if (aheadMatch) ahead = parseInt(aheadMatch[1]);
        if (behindMatch) behind = parseInt(behindMatch[1]);
        
        // Extract upstream branch name
        const upstreamMatch = branchLine.match(/##\s+\S+\.\.\.(\S+)/);
        if (upstreamMatch) upstream = upstreamMatch[1];
      }
    }
    
    return { ahead, behind, upstream };
  } catch (error) {
    console.error('Git get ahead/behind error:', error);
    return { ahead: 0, behind: 0, upstream: '' };
  }
});

ipcMain.handle('git:getDiff', async (_, repoPath: string, filePath: string, staged: boolean = false) => {
  try {
    const { execSync } = require('child_process');
    const command = staged ? `git diff --cached "${filePath}"` : `git diff "${filePath}"`;
    const result = execSync(command, getGitExecOptions(repoPath));
    return result.toString();
  } catch (error) {
    console.error('Git get diff error:', error);
    return '';
  }
});

ipcMain.handle('git:pull', async (_, repoPath: string) => {
  try {
    const { execSync } = require('child_process');
    const result = execSync('git pull', getGitExecOptions(repoPath));
    return { success: true, output: result.toString() };
  } catch (error) {
    console.error('Git pull error:', error);
    throw new Error(`Failed to pull: ${error.message}`);
  }
});

