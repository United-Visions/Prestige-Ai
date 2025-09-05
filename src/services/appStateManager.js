import { AsyncVirtualFileSystem } from '@/shared/VirtualFilesystem';
import { resolveAppPaths } from '@/utils/appPathResolver';
const { fs, path } = window.electronAPI;
/**
 * Manages continuous app state and virtual filesystems across conversations
 * This ensures that changes persist and build incrementally like dyad does
 */
class AppStateManager {
    constructor() {
        Object.defineProperty(this, "appVirtualFileSystems", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        Object.defineProperty(this, "appInitialStates", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        }); // Track initial file contents
    }
    static getInstance() {
        if (!AppStateManager.instance) {
            AppStateManager.instance = new AppStateManager();
        }
        return AppStateManager.instance;
    }
    /**
     * Initialize or get virtual filesystem for an app
     */
    async getVirtualFileSystem(app) {
        if (!this.appVirtualFileSystems.has(app.id)) {
            await this.initializeAppState(app);
        }
        return this.appVirtualFileSystems.get(app.id);
    }
    /**
     * Initialize app state by loading current files into virtual filesystem
     */
    async initializeAppState(app) {
        const { filesPath: appPath } = await resolveAppPaths(app);
        // Create virtual filesystem with delegate for reading actual files
        const vfs = new AsyncVirtualFileSystem(appPath, {
            fileExists: async (fileName) => {
                try {
                    const filePath = await path.join(appPath, fileName);
                    const stats = await fs.stat(filePath);
                    return stats.isFile();
                }
                catch {
                    return false;
                }
            },
            readFile: async (fileName) => {
                try {
                    const filePath = await path.join(appPath, fileName);
                    return await fs.readFile(filePath, 'utf8');
                }
                catch {
                    return undefined;
                }
            }
        });
        // Store initial state snapshot (for potential resets or comparisons)
        const initialFiles = new Map();
        if (app.files) {
            for (const file of app.files) {
                if (file.type === 'file') {
                    try {
                        const content = await vfs.readFile(file.path);
                        if (content !== undefined) {
                            initialFiles.set(file.path, content);
                        }
                    }
                    catch (error) {
                        console.warn(`Could not read initial file ${file.path}:`, error);
                    }
                }
            }
        }
        this.appVirtualFileSystems.set(app.id, vfs);
        this.appInitialStates.set(app.id, initialFiles);
        console.log(`Initialized virtual filesystem for app ${app.name} (${app.id}) with ${initialFiles.size} initial files`);
    }
    /**
     * Get the current state of virtual changes for an app
     */
    getVirtualChanges(appId) {
        const vfs = this.appVirtualFileSystems.get(appId);
        if (!vfs)
            return { virtualFiles: [], deletedFiles: [] };
        return {
            virtualFiles: vfs.getVirtualFiles(),
            deletedFiles: vfs.getDeletedFiles()
        };
    }
    /**
     * Clear virtual changes for an app (reset to initial state)
     */
    resetAppToInitialState(appId) {
        const vfs = this.appVirtualFileSystems.get(appId);
        if (vfs) {
            vfs.clearVirtualChanges();
            console.log(`Reset app ${appId} to initial state`);
        }
    }
    /**
     * Switch app context - important for maintaining separate virtual states
     */
    async switchToApp(app) {
        console.log(`Switching to app: ${app.name} (${app.id})`);
        return await this.getVirtualFileSystem(app);
    }
    /**
     * Cleanup virtual filesystem when app is deleted
     */
    cleanupApp(appId) {
        this.appVirtualFileSystems.delete(appId);
        this.appInitialStates.delete(appId);
        console.log(`Cleaned up virtual filesystem for app ${appId}`);
    }
    /**
     * Get summary of changes for debugging
     */
    getAppStateInfo(appId) {
        const vfs = this.appVirtualFileSystems.get(appId);
        const initialState = this.appInitialStates.get(appId);
        if (!vfs || !initialState) {
            return { initialized: false };
        }
        const virtualFiles = vfs.getVirtualFiles();
        const deletedFiles = vfs.getDeletedFiles();
        return {
            initialized: true,
            initialFileCount: initialState.size,
            virtualFileCount: virtualFiles.length,
            deletedFileCount: deletedFiles.length,
            hasChanges: virtualFiles.length > 0 || deletedFiles.length > 0
        };
    }
    /**
     * Force sync virtual changes to disk (useful for save operations)
     */
    async syncAppToDisk(app) {
        const vfs = this.appVirtualFileSystems.get(app.id);
        if (!vfs)
            return;
        const { filesPath: appPath } = await resolveAppPaths(app);
        // Write all virtual files to disk
        const virtualFiles = vfs.getVirtualFiles();
        for (const virtualFile of virtualFiles) {
            const filePath = await path.join(appPath, virtualFile.relativePath);
            await fs.ensureFile(filePath);
            await fs.writeFile(filePath, virtualFile.content);
        }
        // Handle deleted files
        const deletedFiles = vfs.getDeletedFiles();
        for (const deletedPath of deletedFiles) {
            try {
                const filePath = await path.join(appPath, deletedPath);
                await fs.remove(filePath);
            }
            catch (error) {
                // File might already be deleted, ignore error
                console.warn(`Could not delete file ${deletedPath}:`, error);
            }
        }
        console.log(`Synced ${virtualFiles.length} virtual files and ${deletedFiles.length} deletions to disk for app ${app.name}`);
    }
}
export default AppStateManager;
