import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Claude Code CLI operations
  claudeCode: {
    checkAvailability: (): Promise<boolean> => 
      ipcRenderer.invoke('claude-code:check-availability'),
    execute: (prompt: string, options?: { cwd?: string }): Promise<string> => 
      ipcRenderer.invoke('claude-code:execute', prompt, options),
  },

  // File system operations
  fs: {
    readFile: (filePath: string): Promise<string> => 
      ipcRenderer.invoke('fs:read-file', filePath),
    writeFile: (filePath: string, content: string): Promise<void> => 
      ipcRenderer.invoke('fs:write-file', filePath, content),
    createProjectDir: (projectPath: string): Promise<void> => 
      ipcRenderer.invoke('fs:create-project-dir', projectPath),
    listFiles: (dirPath: string): Promise<string[]> => 
      ipcRenderer.invoke('fs:list-files', dirPath),
    getFileStats: (filePath: string): Promise<{ isDirectory: boolean; isFile: boolean }> => 
      ipcRenderer.invoke('fs:get-file-stats', filePath),
    readDirectoryTree: (dirPath: string): Promise<any> => 
      ipcRenderer.invoke('fs:read-directory-tree', dirPath),
    ensureFile: (filePath: string): Promise<void> =>
      ipcRenderer.invoke('fs:ensure-file', filePath),
    rename: (oldPath: string, newPath: string): Promise<void> =>
      ipcRenderer.invoke('fs:rename', oldPath, newPath),
    remove: (path: string): Promise<void> =>
      ipcRenderer.invoke('fs:remove', path),
    deleteDirectory: (dirPath: string): Promise<void> =>
      ipcRenderer.invoke('fs:delete-directory', dirPath),
    copy: (src: string, dest: string, options?: any): Promise<void> =>
      ipcRenderer.invoke('fs:copy', src, dest, options),
    pathExists: (path: string): Promise<boolean> =>
      ipcRenderer.invoke('fs:path-exists', path),
    readJson: (path: string): Promise<any> =>
      ipcRenderer.invoke('fs:read-json', path),
    writeJson: (path: string, data: any, options?: object): Promise<void> =>
      ipcRenderer.invoke('fs:write-json', path, data, options),
    ensureDir: (path: string): Promise<void> =>
      ipcRenderer.invoke('fs:ensure-dir', path),
    existsSync: (path: string): boolean =>
      ipcRenderer.sendSync('fs:exists-sync', path),
  },

  // App paths and utilities
  app: {
    getAppDataPath: (): Promise<string> => 
      ipcRenderer.invoke('app:get-app-data-path'),
    getDesktopPath: (): Promise<string> => 
      ipcRenderer.invoke('app:get-desktop-path'),
    initializePrestigeFolder: (): Promise<string> => 
      ipcRenderer.invoke('app:initialize-prestige-folder'),
    getCwd: (): Promise<string> =>
      ipcRenderer.invoke('app:get-cwd'),
  },

  // Path utilities
  path: {
    join: (...paths: string[]): Promise<string> =>
      ipcRenderer.invoke('path:join', paths),
    basename: (filePath: string, ext?: string): Promise<string> =>
      ipcRenderer.invoke('path:basename', filePath, ext),
    dirname: (filePath: string): Promise<string> =>
      ipcRenderer.invoke('path:dirname', filePath),
    resolve: (...paths: string[]): Promise<string> =>
      ipcRenderer.invoke('path:resolve', paths),
    relative: (from: string, to: string): Promise<string> =>
      ipcRenderer.invoke('path:relative', from, to),
  },

  // Database operations
  db: {
    getApps: (): Promise<any[]> => ipcRenderer.invoke('db:get-apps'),
    getApp: (appId: number): Promise<any> => ipcRenderer.invoke('db:get-app', appId),
    getAppConversations: (appId: number): Promise<any[]> => ipcRenderer.invoke('db:get-app-conversations', appId),
    createApp: (app: any): Promise<any> => ipcRenderer.invoke('db:create-app', app),
    getConversation: (conversationId: number): Promise<any> => ipcRenderer.invoke('db:get-conversation', conversationId),
    addMessage: (message: any): Promise<any> => ipcRenderer.invoke('db:add-message', message),
    deleteApp: (appId: number): Promise<void> => ipcRenderer.invoke('db:delete-app', appId),
    deleteConversation: (conversationId: number): Promise<void> => ipcRenderer.invoke('db:delete-conversation', conversationId),
    renameApp: (appId: number, newName: string): Promise<void> => ipcRenderer.invoke('db:rename-app', appId, newName),
    createConversation: (conversation: any): Promise<number> => ipcRenderer.invoke('db:create-conversation', conversation),
  },

  // Advanced app management
  advancedApp: {
    run: (appId: number, appPath: string): Promise<{ proxyUrl?: string }> => 
      ipcRenderer.invoke('advanced-app:run', appId, appPath),
    stop: (appId: number): Promise<void> => 
      ipcRenderer.invoke('advanced-app:stop', appId),
    restart: (appId: number, appPath: string, removeNodeModules: boolean = false): Promise<{ proxyUrl?: string }> => 
      ipcRenderer.invoke('advanced-app:restart', appId, appPath, removeNodeModules),
    rebuild: (appId: number, appPath: string): Promise<{ proxyUrl?: string }> => 
      ipcRenderer.invoke('advanced-app:rebuild', appId, appPath),
    isRunning: (appId: number): Promise<boolean> => 
      ipcRenderer.invoke('advanced-app:is-running', appId),
    getRunning: (): Promise<number[]> => 
      ipcRenderer.invoke('advanced-app:get-running'),
    
    // Event listeners for output and errors
    onOutput: (callback: (appId: number, output: any) => void) => {
      ipcRenderer.on('advanced-app:output', (_event, appId, output) => callback(appId, output));
    },
    onError: (callback: (appId: number, error: any) => void) => {
      ipcRenderer.on('advanced-app:error', (_event, appId, error) => callback(appId, error));
    },
    removeAllListeners: () => {
      ipcRenderer.removeAllListeners('advanced-app:output');
      ipcRenderer.removeAllListeners('advanced-app:error');
    }
  },
})

// Type definitions for the exposed API
declare global {
  interface Window {
    electronAPI: {
      claudeCode: {
        checkAvailability: () => Promise<boolean>
        execute: (prompt: string, options?: { cwd?: string }) => Promise<string>
      }
      fs: {
        readFile: (filePath: string) => Promise<string>
        writeFile: (filePath: string, content: string) => Promise<void>
        createProjectDir: (projectPath: string) => Promise<void>
        listFiles: (dirPath: string) => Promise<string[]>
        getFileStats: (filePath: string) => Promise<{ isDirectory: boolean; isFile: boolean }>
        readDirectoryTree: (dirPath: string) => Promise<any>
        ensureFile: (filePath: string) => Promise<void>
        rename: (oldPath: string, newPath: string) => Promise<void>
        remove: (path: string) => Promise<void>
        deleteDirectory: (dirPath: string) => Promise<void>
        copy: (src: string, dest: string, options?: any) => Promise<void>
        pathExists: (path: string) => Promise<boolean>
        readJson: (path: string) => Promise<any>
        writeJson: (path: string, data: any, options?: object) => Promise<void>
        ensureDir: (path: string) => Promise<void>
        existsSync: (path: string) => boolean
      }
      app: {
        getAppDataPath: () => Promise<string>
        getDesktopPath: () => Promise<string>
        initializePrestigeFolder: () => Promise<string>
        getCwd: () => Promise<string>
      }
      path: {
        join: (...paths: string[]) => Promise<string>
        basename: (filePath: string, ext?: string) => Promise<string>
        dirname: (filePath: string) => Promise<string>
        resolve: (...paths: string[]) => Promise<string>
        relative: (from: string, to: string) => Promise<string>
      }
      db: {
        getApps: () => Promise<any[]>
        getApp: (appId: number) => Promise<any>
        getAppConversations: (appId: number) => Promise<any[]>
        createApp: (app: any) => Promise<any>
        getConversation: (conversationId: number) => Promise<any>
        addMessage: (message: any) => Promise<any>
        deleteApp: (appId: number) => Promise<void>
        deleteConversation: (conversationId: number) => Promise<void>
        renameApp: (appId: number, newName: string) => Promise<void>
        createConversation: (conversation: any) => Promise<number>
      }
      advancedApp: {
        run: (appId: number, appPath: string) => Promise<{ proxyUrl?: string }>
        stop: (appId: number) => Promise<void>
        restart: (appId: number, appPath: string, removeNodeModules?: boolean) => Promise<{ proxyUrl?: string }>
        rebuild: (appId: number, appPath: string) => Promise<{ proxyUrl?: string }>
        isRunning: (appId: number) => Promise<boolean>
        getRunning: () => Promise<number[]>
        onOutput: (callback: (appId: number, output: any) => void) => void
        onError: (callback: (appId: number, error: any) => void) => void
        removeAllListeners: () => void
      }
    }
  }
}