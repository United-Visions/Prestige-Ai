import { contextBridge, ipcRenderer } from 'electron';
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Claude Code CLI operations
    claudeCode: {
        checkAvailability: () => ipcRenderer.invoke('claude-code:check-availability'),
        checkStatus: () => ipcRenderer.invoke('claude-code:check-status'),
        execute: (prompt, options) => ipcRenderer.invoke('claude-code:execute', prompt, options),
    },
    // Aider AI CLI operations
    aider: {
        checkAvailability: () => ipcRenderer.invoke('aider:check-availability'),
        execute: (prompt, options) => ipcRenderer.invoke('aider:execute', prompt, options),
    },
    // File system operations
    fs: {
        readFile: (filePath) => ipcRenderer.invoke('fs:read-file', filePath),
        writeFile: (filePath, content) => ipcRenderer.invoke('fs:write-file', filePath, content),
        createProjectDir: (projectPath) => ipcRenderer.invoke('fs:create-project-dir', projectPath),
        listFiles: (dirPath) => ipcRenderer.invoke('fs:list-files', dirPath),
        getFileStats: (filePath) => ipcRenderer.invoke('fs:get-file-stats', filePath),
        readDirectoryTree: (dirPath) => ipcRenderer.invoke('fs:read-directory-tree', dirPath),
        ensureFile: (filePath) => ipcRenderer.invoke('fs:ensure-file', filePath),
        rename: (oldPath, newPath) => ipcRenderer.invoke('fs:rename', oldPath, newPath),
        remove: (path) => ipcRenderer.invoke('fs:remove', path),
        deleteDirectory: (dirPath) => ipcRenderer.invoke('fs:delete-directory', dirPath),
        copy: (src, dest, options) => ipcRenderer.invoke('fs:copy', src, dest, options),
        pathExists: (path) => ipcRenderer.invoke('fs:path-exists', path),
        readJson: (path) => ipcRenderer.invoke('fs:read-json', path),
        writeJson: (path, data, options) => ipcRenderer.invoke('fs:write-json', path, data, options),
        ensureDir: (path) => ipcRenderer.invoke('fs:ensure-dir', path),
        existsSync: (path) => ipcRenderer.sendSync('fs:exists-sync', path),
    },
    // App paths and utilities
    app: {
        getAppDataPath: () => ipcRenderer.invoke('app:get-app-data-path'),
        getDesktopPath: () => ipcRenderer.invoke('app:get-desktop-path'),
        initializePrestigeFolder: () => ipcRenderer.invoke('app:initialize-prestige-folder'),
        getPaths: () => ipcRenderer.invoke('app:get-paths'),
        getCwd: () => ipcRenderer.invoke('app:get-cwd'),
    },
    // Path utilities
    path: {
        join: (...paths) => ipcRenderer.invoke('path:join', paths),
        basename: (filePath, ext) => ipcRenderer.invoke('path:basename', filePath, ext),
        dirname: (filePath) => ipcRenderer.invoke('path:dirname', filePath),
        resolve: (...paths) => ipcRenderer.invoke('path:resolve', paths),
        relative: (from, to) => ipcRenderer.invoke('path:relative', from, to),
    },
    // Database operations
    db: {
        getApps: () => ipcRenderer.invoke('db:get-apps'),
        getApp: (appId) => ipcRenderer.invoke('db:get-app', appId),
        getAppConversations: (appId) => ipcRenderer.invoke('db:get-app-conversations', appId),
        createApp: (app) => ipcRenderer.invoke('db:create-app', app),
        getConversation: (conversationId) => ipcRenderer.invoke('db:get-conversation', conversationId),
        addMessage: (message) => ipcRenderer.invoke('db:add-message', message),
        deleteApp: (appId) => ipcRenderer.invoke('db:delete-app', appId),
        deleteConversation: (conversationId) => ipcRenderer.invoke('db:delete-conversation', conversationId),
        renameApp: (appId, newName) => ipcRenderer.invoke('db:rename-app', appId, newName),
        createConversation: (conversation) => ipcRenderer.invoke('db:create-conversation', conversation),
    },
    // Advanced app management
    advancedApp: {
        run: (appId, appPath) => ipcRenderer.invoke('advanced-app:run', appId, appPath),
        stop: (appId) => ipcRenderer.invoke('advanced-app:stop', appId),
        restart: (appId, appPath, removeNodeModules = false) => ipcRenderer.invoke('advanced-app:restart', appId, appPath, removeNodeModules),
        rebuild: (appId, appPath) => ipcRenderer.invoke('advanced-app:rebuild', appId, appPath),
        isRunning: (appId) => ipcRenderer.invoke('advanced-app:is-running', appId),
        getRunning: () => ipcRenderer.invoke('advanced-app:get-running'),
        // Event listeners for output and errors
        onOutput: (callback) => {
            ipcRenderer.on('advanced-app:output', (_event, appId, output) => callback(appId, output));
        },
        onError: (callback) => {
            ipcRenderer.on('advanced-app:error', (_event, appId, error) => callback(appId, error));
        },
        removeAllListeners: () => {
            ipcRenderer.removeAllListeners('advanced-app:output');
            ipcRenderer.removeAllListeners('advanced-app:error');
        }
    },
    // Terminal operations
    terminal: {
        createSession: (options) => ipcRenderer.invoke('terminal:create-session', options),
        write: (sessionId, data) => ipcRenderer.invoke('terminal:write', sessionId, data),
        resize: (sessionId, cols, rows) => ipcRenderer.invoke('terminal:resize', sessionId, cols, rows),
        kill: (sessionId) => ipcRenderer.invoke('terminal:kill', sessionId),
        killSessionsForApp: (appId) => ipcRenderer.invoke('terminal:kill-sessions-for-app', appId),
        checkClaudeAvailability: () => ipcRenderer.invoke('terminal:check-claude-availability'),
        // Event listeners for terminal data
        onData: (sessionId, callback) => {
            ipcRenderer.on(`terminal:data:${sessionId}`, (_event, data) => callback(data));
        },
        onExit: (sessionId, callback) => {
            ipcRenderer.on(`terminal:exit:${sessionId}`, (_event, exitCode) => callback(exitCode));
        },
        removeListeners: (sessionId) => {
            ipcRenderer.removeAllListeners(`terminal:data:${sessionId}`);
            ipcRenderer.removeAllListeners(`terminal:exit:${sessionId}`);
        }
    },
});
