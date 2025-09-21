import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Claude Code CLI operations
  claudeCode: {
    checkAvailability: (): Promise<boolean> => 
      ipcRenderer.invoke('claude-code:check-availability'),
    checkStatus: (): Promise<{ available: boolean; hasUsageLimit: boolean; error?: string }> => 
      ipcRenderer.invoke('claude-code:check-status'),
    execute: (prompt: string, options?: { cwd?: string }): Promise<string> => 
      ipcRenderer.invoke('claude-code:execute', prompt, options),
  },

  // Aider AI CLI operations
  aider: {
    checkAvailability: (): Promise<boolean> =>
      ipcRenderer.invoke('aider:check-availability'),
    execute: (prompt: string, options?: { cwd?: string; model?: string; apiKeySpec?: string }): Promise<string> =>
      ipcRenderer.invoke('aider:execute', prompt, options),
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
    getPaths: () => ipcRenderer.invoke('app:get-paths'),
    getCwd: () => ipcRenderer.invoke('app:get-cwd'),
  },

  // Environment variables
  getEnvVar: (name: string): string | undefined => 
    ipcRenderer.sendSync('env:get-var', name),
  getAllEnvVars: (): Promise<Record<string, string | undefined>> => 
    ipcRenderer.invoke('env:get-all-vars'),

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
    deleteMessage: (messageId: number): Promise<void> => ipcRenderer.invoke('db:delete-message', messageId),
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

  // Terminal operations
  terminal: {
    createSession: (options: {
      cwd: string;
      env?: Record<string, string>;
      cols: number;
      rows: number;
      appId?: number;
      appName?: string;
    }): Promise<{ sessionId: string; pid: number }> => 
      ipcRenderer.invoke('terminal:create-session', options),
    
    write: (sessionId: string, data: string): Promise<boolean> => 
      ipcRenderer.invoke('terminal:write', sessionId, data),
    
    resize: (sessionId: string, cols: number, rows: number): Promise<boolean> => 
      ipcRenderer.invoke('terminal:resize', sessionId, cols, rows),
    
    kill: (sessionId: string): Promise<boolean> => 
      ipcRenderer.invoke('terminal:kill', sessionId),
    
    killSessionsForApp: (appId: number): Promise<void> => 
      ipcRenderer.invoke('terminal:kill-sessions-for-app', appId),
    
    checkClaudeAvailability: (): Promise<boolean> => 
      ipcRenderer.invoke('terminal:check-claude-availability'),
    
    // Event listeners for terminal data
    onData: (sessionId: string, callback: (data: string) => void) => {
      ipcRenderer.on(`terminal:data:${sessionId}`, (_event, data) => callback(data));
    },
    
    onExit: (sessionId: string, callback: (exitCode: number) => void) => {
      ipcRenderer.on(`terminal:exit:${sessionId}`, (_event, exitCode) => callback(exitCode));
    },
    
    removeListeners: (sessionId: string) => {
      ipcRenderer.removeAllListeners(`terminal:data:${sessionId}`);
      ipcRenderer.removeAllListeners(`terminal:exit:${sessionId}`);
    }
  },

  // OAuth operations
  oauth: {
    startServer: (port?: number): Promise<boolean> => 
      ipcRenderer.invoke('oauth:start-server', port),
    stopServer: (): Promise<void> => 
      ipcRenderer.invoke('oauth:stop-server'),
    openUrl: (url: string): Promise<void> => 
      ipcRenderer.invoke('oauth:open-url', url),
    onCallback: (callback: (data: any) => void) => {
      ipcRenderer.on('oauth:callback', (_event, data) => callback(data));
    },
    removeCallbackListener: () => {
      ipcRenderer.removeAllListeners('oauth:callback');
    }
  },

  // GitHub API operations (bypasses CORS)
  github: {
    startDeviceFlow: (params: { client_id: string; scope: string }) => 
      ipcRenderer.invoke('github:device-flow-start', params),
    pollDeviceFlow: (params: { client_id: string; device_code: string; grant_type: string }) => 
      ipcRenderer.invoke('github:device-flow-poll', params),
    apiRequest: (endpoint: string, options?: RequestInit) => 
      ipcRenderer.invoke('github:api-request', { endpoint, options }),
  },

  // Git operations
  git: {
    init: (repoPath: string) => ipcRenderer.invoke('git:init', repoPath),
    status: (repoPath: string) => ipcRenderer.invoke('git:status', repoPath),
    add: (repoPath: string, files: string[]) => ipcRenderer.invoke('git:add', repoPath, files),
    commit: (repoPath: string, message: string, description?: string) => 
      ipcRenderer.invoke('git:commit', repoPath, message, description),
    push: (repoPath: string, remote?: string, branch?: string) => 
      ipcRenderer.invoke('git:push', repoPath, remote, branch),
    forcePush: (repoPath: string, remote?: string, branch?: string) => 
      ipcRenderer.invoke('git:force-push', repoPath, remote, branch),
    remoteAdd: (repoPath: string, name: string, url: string) => 
      ipcRenderer.invoke('git:remote-add', repoPath, name, url),
    remoteList: (repoPath: string) => ipcRenderer.invoke('git:remote-list', repoPath),
    log: (repoPath: string, limit?: number) => ipcRenderer.invoke('git:log', repoPath, limit),
    diff: (repoPath: string, file?: string) => ipcRenderer.invoke('git:diff', repoPath, file),
    clone: (url: string, targetPath: string, name?: string) => 
      ipcRenderer.invoke('git:clone', url, targetPath, name),
    // Modern Git API methods for GitStatusService
    stageFile: (repoPath: string, filePath: string) => ipcRenderer.invoke('git:stageFile', repoPath, filePath),
    unstageFile: (repoPath: string, filePath: string) => ipcRenderer.invoke('git:unstageFile', repoPath, filePath),
    stageAll: (repoPath: string) => ipcRenderer.invoke('git:stageAll', repoPath),
    unstageAll: (repoPath: string) => ipcRenderer.invoke('git:unstageAll', repoPath),
    getCurrentBranch: (repoPath: string) => ipcRenderer.invoke('git:getCurrentBranch', repoPath),
    getAheadBehind: (repoPath: string) => ipcRenderer.invoke('git:getAheadBehind', repoPath),
    getDiff: (repoPath: string, filePath: string, staged?: boolean) => ipcRenderer.invoke('git:getDiff', repoPath, filePath, staged),
    pull: (repoPath: string) => ipcRenderer.invoke('git:pull', repoPath),
  },

  // MongoDB ephemeral controls
  mongo: {
    startEphemeral: (): Promise<{ ok: boolean; uri?: string; error?: string }> =>
      ipcRenderer.invoke('mongo:start-ephemeral'),
    stopEphemeral: (): Promise<{ ok: boolean; error?: string }> =>
      ipcRenderer.invoke('mongo:stop-ephemeral'),
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
      aider: {
        checkAvailability: () => Promise<boolean>
        execute: (prompt: string, options?: { cwd?: string; model?: string; apiKeySpec?: string }) => Promise<string>
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
        getPaths: () => Promise<{
          resourcesPath: string
          appPath: string
          isPackaged: boolean
        }>
      }
      getEnvVar: (name: string) => string | undefined
      getAllEnvVars: () => Promise<Record<string, string | undefined>>
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
        deleteMessage: (messageId: number) => Promise<void>
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
      terminal: {
        createSession: (options: {
          cwd: string;
          env?: Record<string, string>;
          cols: number;
          rows: number;
          appId?: number;
          appName?: string;
        }) => Promise<{ sessionId: string; pid: number }>
        write: (sessionId: string, data: string) => Promise<boolean>
        resize: (sessionId: string, cols: number, rows: number) => Promise<boolean>
        kill: (sessionId: string) => Promise<boolean>
        killSessionsForApp: (appId: number) => Promise<void>
        checkClaudeAvailability: () => Promise<boolean>
        onData: (sessionId: string, callback: (data: string) => void) => void
        onExit: (sessionId: string, callback: (exitCode: number) => void) => void
        removeListeners: (sessionId: string) => void
      }
      oauth: {
        startServer: (port?: number) => Promise<boolean>
        stopServer: () => Promise<void>
        openUrl: (url: string) => Promise<void>
        onCallback: (callback: (data: any) => void) => void
        removeCallbackListener: () => void
      }
      github: {
        startDeviceFlow: (params: { client_id: string; scope: string }) => Promise<any>
        pollDeviceFlow: (params: { client_id: string; device_code: string; grant_type: string }) => Promise<any>
        apiRequest: (endpoint: string, options?: RequestInit) => Promise<any>
      }
      git: {
        init: (repoPath: string) => Promise<any>
        status: (repoPath: string) => Promise<any>
        add: (repoPath: string, files: string[]) => Promise<any>
        commit: (repoPath: string, message: string, description?: string) => Promise<any>
        push: (repoPath: string, remote?: string, branch?: string) => Promise<any>
        forcePush: (repoPath: string, remote?: string, branch?: string) => Promise<any>
        remoteAdd: (repoPath: string, name: string, url: string) => Promise<any>
        remoteList: (repoPath: string) => Promise<any>
        log: (repoPath: string, limit?: number) => Promise<any>
        diff: (repoPath: string, file?: string) => Promise<any>
        // Modern Git API methods for GitStatusService
        stageFile: (repoPath: string, filePath: string) => Promise<any>
        unstageFile: (repoPath: string, filePath: string) => Promise<any>
        stageAll: (repoPath: string) => Promise<any>
        unstageAll: (repoPath: string) => Promise<any>
        getCurrentBranch: (repoPath: string) => Promise<string>
        getAheadBehind: (repoPath: string) => Promise<any>
        getDiff: (repoPath: string, filePath: string, staged?: boolean) => Promise<string>
        pull: (repoPath: string) => Promise<any>
        clone: (url: string, targetPath: string, name?: string) => Promise<any>
      }
      mongo: {
        startEphemeral: () => Promise<{ ok: boolean; uri?: string; error?: string }>
        stopEphemeral: () => Promise<{ ok: boolean; error?: string }>
      }
    }
  }
}