// Use Electron's exposed path API instead of direct Node.js import
const { path } = window.electronAPI;

export interface VirtualFile {
  relativePath: string;
  content: string;
}

export interface VirtualChanges {
  deletePaths: string[];
  renameTags: { from: string; to: string }[];
  writeTags: { path: string; content: string; description?: string }[];
}

export interface AsyncVirtualFileSystemInterface {
  fileExists(fileName: string): Promise<boolean>;
  readFile(fileName: string): Promise<string | undefined>;
  writeFile(fileName: string, content: string): Promise<void>;
  deleteFile(fileName: string): Promise<void>;
  renameFile(fromPath: string, toPath: string): Promise<void>;
  getVirtualFiles(): VirtualFile[];
  applyResponseChanges(changes: VirtualChanges): Promise<void>;
}

export interface AsyncFileSystemDelegate {
  fileExists?: (fileName: string) => Promise<boolean>;
  readFile?: (fileName: string) => Promise<string | undefined>;
}

/**
 * Base class containing shared virtual filesystem functionality
 */
export abstract class BaseVirtualFileSystem {
  protected virtualFiles = new Map<string, string>();
  protected deletedFiles = new Set<string>();
  protected baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir; // Store as-is since we'll resolve async
  }

  /**
   * Normalize path for consistent cross-platform behavior
   */
  private async normalizePathForKey(filePath: string): Promise<string> {
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
  private denormalizePath(normalizedPath: string): string {
    // Keep forward slashes for cross-platform compatibility
    return normalizedPath;
  }

  /**
   * Apply changes from a response containing dyad tags
   */
  public async applyResponseChanges({
    deletePaths,
    renameTags,
    writeTags,
  }: VirtualChanges): Promise<void> {
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
  protected async writeFile(relativePath: string, content: string): Promise<void> {
    const absolutePath = await path.join(this.baseDir, relativePath);
    const normalizedKey = await this.normalizePathForKey(absolutePath);

    this.virtualFiles.set(normalizedKey, content);
    // Remove from deleted files if it was previously deleted
    this.deletedFiles.delete(normalizedKey);
  }

  /**
   * Delete a file from the virtual filesystem
   */
  protected async deleteFile(relativePath: string): Promise<void> {
    const absolutePath = await path.join(this.baseDir, relativePath);
    const normalizedKey = await this.normalizePathForKey(absolutePath);

    this.deletedFiles.add(normalizedKey);
    // Remove from virtual files if it exists there
    this.virtualFiles.delete(normalizedKey);
  }

  /**
   * Rename a file in the virtual filesystem
   */
  protected async renameFile(fromPath: string, toPath: string): Promise<void> {
    const fromAbsolute = await path.join(this.baseDir, fromPath);
    const toAbsolute = await path.join(this.baseDir, toPath);
    const fromNormalized = await this.normalizePathForKey(fromAbsolute);
    const toNormalized = await this.normalizePathForKey(toAbsolute);

    // Mark old file as deleted
    this.deletedFiles.add(fromNormalized);

    // If the source file exists in virtual files, move its content
    if (this.virtualFiles.has(fromNormalized)) {
      const content = this.virtualFiles.get(fromNormalized)!;
      this.virtualFiles.delete(fromNormalized);
      this.virtualFiles.set(toNormalized, content);
    } else {
      // For files that exist on disk but not in virtual filesystem,
      // we'll need to handle this with the file system service
      console.warn(
        `Could not find virtual file for rename: ${fromPath}. This should be handled by the file system service.`
      );
    }

    // Remove destination from deleted files if it was previously deleted
    this.deletedFiles.delete(toNormalized);
  }

  /**
   * Get all virtual files (files that have been written or modified)
   */
  public getVirtualFiles(): VirtualFile[] {
    return Array.from(this.virtualFiles.entries()).map(
      ([normalizedKey, content]) => {
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
      }
    );
  }

  /**
   * Get all deleted file paths
   */
  public getDeletedFiles(): string[] {
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
   * Check if a file exists (either in virtual filesystem or on disk)
   */
  abstract fileExists(fileName: string): boolean | Promise<boolean>;

  /**
   * Read file content (from virtual filesystem first, then disk)
   */
  abstract readFile(fileName: string): string | undefined | Promise<string | undefined>;

  /**
   * Clear all virtual changes
   */
  public clearVirtualChanges(): void {
    this.virtualFiles.clear();
    this.deletedFiles.clear();
  }
}

/**
 * Virtual file system implementation for Electron compatibility
 */
export class ElectronVirtualFileSystem extends BaseVirtualFileSystem implements AsyncVirtualFileSystemInterface {
  constructor(baseDir: string, private delegate?: { readFile?: (fileName: string) => string | undefined }) {
    super(baseDir);
  }

  async fileExists(fileName: string): Promise<boolean> {
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

  async readFile(fileName: string): Promise<string | undefined> {
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

  async writeFile(fileName: string, content: string): Promise<void> {
    await super.writeFile(fileName, content);
  }

  async deleteFile(fileName: string): Promise<void> {
    await super.deleteFile(fileName);
  }

  async renameFile(fromPath: string, toPath: string): Promise<void> {
    await super.renameFile(fromPath, toPath);
  }
}

/**
 * Asynchronous virtual file system implementation for Electron/Node environment
 */
export class AsyncVirtualFileSystem extends BaseVirtualFileSystem implements AsyncVirtualFileSystemInterface {
  constructor(baseDir: string, private delegate?: AsyncFileSystemDelegate) {
    super(baseDir);
  }

  async fileExists(fileName: string): Promise<boolean> {
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

  async readFile(fileName: string): Promise<string | undefined> {
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

  async writeFile(fileName: string, content: string): Promise<void> {
    await super.writeFile(fileName, content);
  }

  async deleteFile(fileName: string): Promise<void> {
    await super.deleteFile(fileName);
  }

  async renameFile(fromPath: string, toPath: string): Promise<void> {
    await super.renameFile(fromPath, toPath);
  }
}