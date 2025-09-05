// Use Electron's exposed path API instead of direct Node.js import
const { path } = window.electronAPI;
/**
 * Base class containing shared virtual filesystem functionality
 */
export class BaseVirtualFileSystem {
    constructor(baseDir) {
        Object.defineProperty(this, "virtualFiles", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        Object.defineProperty(this, "deletedFiles", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Set()
        });
        Object.defineProperty(this, "baseDir", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.baseDir = baseDir; // Store as-is since we'll resolve async
    }
    /**
     * Normalize path for consistent cross-platform behavior
     */
    async normalizePathForKey(filePath) {
        // Use simple path joining since we're in browser context
        const absolutePath = filePath.startsWith('/') || filePath.includes(':')
            ? filePath
            : await path.join(this.baseDir, filePath);
        // Normalize separators - replace backslashes with forward slashes
        const normalized = absolutePath.replace(/\\/g, '/');
        return normalized;
    }
    /**
     * Convert normalized path back to platform-appropriate format
     */
    denormalizePath(normalizedPath) {
        // Keep forward slashes for cross-platform compatibility
        return normalizedPath;
    }
    /**
     * Apply changes from a response containing dyad tags
     */
    async applyResponseChanges({ deletePaths, renameTags, writeTags, }) {
        // Process deletions
        for (const deletePath of deletePaths) {
            await this.deleteFile(deletePath);
        }
        // Process renames (delete old, create new)
        for (const rename of renameTags) {
            await this.renameFile(rename.from, rename.to);
        }
        // Process writes
        for (const writeTag of writeTags) {
            await this.writeFile(writeTag.path, writeTag.content);
        }
    }
    /**
     * Write a file to the virtual filesystem
     */
    async writeFile(relativePath, content) {
        const absolutePath = await path.join(this.baseDir, relativePath);
        const normalizedKey = await this.normalizePathForKey(absolutePath);
        this.virtualFiles.set(normalizedKey, content);
        // Remove from deleted files if it was previously deleted
        this.deletedFiles.delete(normalizedKey);
    }
    /**
     * Delete a file from the virtual filesystem
     */
    async deleteFile(relativePath) {
        const absolutePath = await path.join(this.baseDir, relativePath);
        const normalizedKey = await this.normalizePathForKey(absolutePath);
        this.deletedFiles.add(normalizedKey);
        // Remove from virtual files if it exists there
        this.virtualFiles.delete(normalizedKey);
    }
    /**
     * Rename a file in the virtual filesystem
     */
    async renameFile(fromPath, toPath) {
        const fromAbsolute = await path.join(this.baseDir, fromPath);
        const toAbsolute = await path.join(this.baseDir, toPath);
        const fromNormalized = await this.normalizePathForKey(fromAbsolute);
        const toNormalized = await this.normalizePathForKey(toAbsolute);
        // Mark old file as deleted
        this.deletedFiles.add(fromNormalized);
        // If the source file exists in virtual files, move its content
        if (this.virtualFiles.has(fromNormalized)) {
            const content = this.virtualFiles.get(fromNormalized);
            this.virtualFiles.delete(fromNormalized);
            this.virtualFiles.set(toNormalized, content);
        }
        else {
            // For files that exist on disk but not in virtual filesystem,
            // we'll need to handle this with the file system service
            console.warn(`Could not find virtual file for rename: ${fromPath}. This should be handled by the file system service.`);
        }
        // Remove destination from deleted files if it was previously deleted
        this.deletedFiles.delete(toNormalized);
    }
    /**
     * Get all virtual files (files that have been written or modified)
     */
    getVirtualFiles() {
        return Array.from(this.virtualFiles.entries()).map(([normalizedKey, content]) => {
            // Simple relative path calculation - remove baseDir from the beginning
            let relativePath = normalizedKey;
            if (normalizedKey.startsWith(this.baseDir)) {
                relativePath = normalizedKey.substring(this.baseDir.length);
                // Remove leading slash if present
                if (relativePath.startsWith('/') || relativePath.startsWith('\\')) {
                    relativePath = relativePath.substring(1);
                }
            }
            return { relativePath, content };
        });
    }
    /**
     * Get all deleted file paths
     */
    getDeletedFiles() {
        return Array.from(this.deletedFiles).map((normalizedKey) => {
            // Simple relative path calculation - remove baseDir from the beginning
            let relativePath = normalizedKey;
            if (normalizedKey.startsWith(this.baseDir)) {
                relativePath = normalizedKey.substring(this.baseDir.length);
                // Remove leading slash if present
                if (relativePath.startsWith('/') || relativePath.startsWith('\\')) {
                    relativePath = relativePath.substring(1);
                }
            }
            return relativePath;
        });
    }
    /**
     * Clear all virtual changes
     */
    clearVirtualChanges() {
        this.virtualFiles.clear();
        this.deletedFiles.clear();
    }
}
/**
 * Virtual file system implementation for Electron compatibility
 */
export class ElectronVirtualFileSystem extends BaseVirtualFileSystem {
    constructor(baseDir, delegate) {
        super(baseDir);
        Object.defineProperty(this, "delegate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: delegate
        });
    }
    async fileExists(fileName) {
        const absolutePath = await path.join(this.baseDir, fileName);
        const normalizedKey = await this.normalizePathForKey(absolutePath);
        // Check if it's been deleted
        if (this.deletedFiles.has(normalizedKey)) {
            return false;
        }
        // Check if it exists in virtual filesystem
        if (this.virtualFiles.has(normalizedKey)) {
            return true;
        }
        // For files not in virtual filesystem, assume they exist on disk
        // In a real implementation, you'd check the actual filesystem
        return true;
    }
    async readFile(fileName) {
        const absolutePath = await path.join(this.baseDir, fileName);
        const normalizedKey = await this.normalizePathForKey(absolutePath);
        // Check if it's been deleted
        if (this.deletedFiles.has(normalizedKey)) {
            return undefined;
        }
        // Check virtual filesystem first
        if (this.virtualFiles.has(normalizedKey)) {
            return this.virtualFiles.get(normalizedKey);
        }
        // Fall back to delegate or actual filesystem
        return this.delegate?.readFile?.(fileName);
    }
    async writeFile(fileName, content) {
        await super.writeFile(fileName, content);
    }
    async deleteFile(fileName) {
        await super.deleteFile(fileName);
    }
    async renameFile(fromPath, toPath) {
        await super.renameFile(fromPath, toPath);
    }
}
/**
 * Asynchronous virtual file system implementation for Electron/Node environment
 */
export class AsyncVirtualFileSystem extends BaseVirtualFileSystem {
    constructor(baseDir, delegate) {
        super(baseDir);
        Object.defineProperty(this, "delegate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: delegate
        });
    }
    async fileExists(fileName) {
        const absolutePath = await path.join(this.baseDir, fileName);
        const normalizedKey = await this.normalizePathForKey(absolutePath);
        // Check if it's been deleted
        if (this.deletedFiles.has(normalizedKey)) {
            return false;
        }
        // Check if it exists in virtual filesystem
        if (this.virtualFiles.has(normalizedKey)) {
            return true;
        }
        // Fall back to delegate
        if (this.delegate?.fileExists) {
            return await this.delegate.fileExists(fileName);
        }
        return true; // Default assumption
    }
    async readFile(fileName) {
        const absolutePath = await path.join(this.baseDir, fileName);
        const normalizedKey = await this.normalizePathForKey(absolutePath);
        // Check if it's been deleted
        if (this.deletedFiles.has(normalizedKey)) {
            return undefined;
        }
        // Check virtual filesystem first
        if (this.virtualFiles.has(normalizedKey)) {
            return this.virtualFiles.get(normalizedKey);
        }
        // Fall back to delegate
        if (this.delegate?.readFile) {
            return await this.delegate.readFile(fileName);
        }
        return undefined;
    }
    async writeFile(fileName, content) {
        await super.writeFile(fileName, content);
    }
    async deleteFile(fileName) {
        await super.deleteFile(fileName);
    }
    async renameFile(fromPath, toPath) {
        await super.renameFile(fromPath, toPath);
    }
}
