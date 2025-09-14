import { gitService } from './gitService';

export interface GitFileStatus {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'untracked' | 'staged' | 'renamed';
  diff?: string;
  originalPath?: string; // For renamed files
}

export interface GitBranchInfo {
  current: string;
  ahead: number;
  behind: number;
  upstream?: string;
}

export interface GitStatus {
  files: GitFileStatus[];
  branch: GitBranchInfo;
  isRepo: boolean;
  hasChanges: boolean;
}

export class GitStatusService {
  private static instance: GitStatusService;
  private gitStatusCache: Map<string, { status: GitStatus; timestamp: number }> = new Map();
  private watchers: Map<string, NodeJS.Timeout> = new Map();
  private loggedApps: Set<string> = new Set();
  private eventListeners: Map<string, ((status: GitStatus) => void)[]> = new Map();
  private readonly CACHE_DURATION = 30000; // 30 seconds cache

  static getInstance(): GitStatusService {
    if (!GitStatusService.instance) {
      GitStatusService.instance = new GitStatusService();
    }
    return GitStatusService.instance;
  }

  async getStatus(appPath: string, forceRefresh: boolean = false): Promise<GitStatus> {
    // Check cache first
    const cached = this.gitStatusCache.get(appPath);
    const now = Date.now();
    
    if (!forceRefresh && cached && (now - cached.timestamp) < this.CACHE_DURATION) {
      console.log(`[GitStatusService] Using cached status for ${appPath}`);
      return cached.status;
    }

    // Reduced logging - only log once per app session
    const shouldLog = !this.loggedApps.has(appPath);
    if (shouldLog) {
      console.log(`[GitStatusService] Getting status for app path: ${appPath}`);
      this.loggedApps.add(appPath);
    }
    
    try {
      // Check if it's a git repository first using the existing gitService
      const repoInfo = await gitService.getRepositoryInfo(appPath);
      
      if (shouldLog) {
        console.log(`[GitStatusService] Repository info:`, {
          isGitRepo: repoInfo.isGitRepo,
          githubRepo: repoInfo.githubRepo,
          remotes: repoInfo.remotes?.length || 0
        });
      }
      
      if (!repoInfo.isGitRepo) {
        if (shouldLog) console.log('[GitStatusService] Not a git repository, returning empty status');
        return {
          files: [],
          branch: { current: '', ahead: 0, behind: 0 },
          isRepo: false,
          hasChanges: false
        };
      }

      // Calculate the actual files path (same logic as gitService.getRepositoryInfo)
      const { FileSystemService } = await import('./fileSystemService');
      const fileSystemService = FileSystemService.getInstance();
      const actualAppPath = await fileSystemService.getAppPath(appPath);
      const filesPath = await window.electronAPI.path.join(actualAppPath, 'files');
      
      if (shouldLog) console.log(`[GitStatusService] Using files path for git operations: ${filesPath}`);

      // Single attempt to get git status - no retries
      let status: any[] = [];
      try {
        if (shouldLog) console.log('[GitStatusService] Attempting to get git status (single attempt)...');
        status = await window.electronAPI.git.status(filesPath) as any[];
        if (shouldLog) console.log(`[GitStatusService] Git status success, found ${status?.length || 0} file changes`);
      } catch (error) {
        if (shouldLog) console.warn('[GitStatusService] Git status API failed:', error);
        if (shouldLog) console.log('[GitStatusService] Continuing with empty status - this is acceptable for UI display');
      }
      
      // Get branch info with single attempt
      let branchInfo: GitBranchInfo;
      try {
        if (shouldLog) console.log('[GitStatusService] Getting branch info...');
        branchInfo = await this.getBranchInfo(filesPath, shouldLog);
        if (shouldLog) console.log(`[GitStatusService] Branch info:`, branchInfo);
      } catch (error) {
        if (shouldLog) console.warn('[GitStatusService] Branch info failed:', error);
        branchInfo = { current: repoInfo.githubRepo?.name || 'main', ahead: 0, behind: 0 };
        if (shouldLog) console.log(`[GitStatusService] Using fallback branch info:`, branchInfo);
      }

      const gitStatus: GitStatus = {
        files: Array.isArray(status) ? this.parseGitStatus(status) : [],
        branch: branchInfo,
        isRepo: true,
        hasChanges: Array.isArray(status) && status.length > 0
      };

      if (shouldLog) {
        console.log(`[GitStatusService] Final git status:`, {
          filesCount: gitStatus.files.length,
          branch: gitStatus.branch.current,
          hasChanges: gitStatus.hasChanges,
          isRepo: gitStatus.isRepo
        });
      }

      // Cache the result with timestamp
      this.gitStatusCache.set(appPath, { status: gitStatus, timestamp: now });
      
      // Notify listeners
      this.notifyListeners(appPath, gitStatus);
      
      return gitStatus;
    } catch (error) {
      console.error('[GitStatusService] Failed to get git status:', error);
      
      // Return a minimal git status using cached or existing repo info
      console.log('[GitStatusService] Attempting to provide fallback status...');
      const cachedStatus = this.gitStatusCache.get(appPath);
      if (cachedStatus) {
        console.log('[GitStatusService] Using cached status as fallback');
        return cachedStatus.status;
      }
      
      // Use repository info from gitService to provide basic git status
      try {
        const repoInfo = await gitService.getRepositoryInfo(appPath);
        const fallbackStatus = {
          files: [],
          branch: { 
            current: repoInfo.githubRepo?.name || 'main', 
            ahead: 0, 
            behind: 0 
          },
          isRepo: repoInfo.isGitRepo,
          hasChanges: false
        };
        console.log('[GitStatusService] Using repository info fallback:', fallbackStatus);
        return fallbackStatus;
      } catch (fallbackError) {
        console.error('[GitStatusService] Fallback also failed:', fallbackError);
        const emptyStatus = {
          files: [],
          branch: { current: 'main', ahead: 0, behind: 0 },
          isRepo: false,
          hasChanges: false
        };
        console.log('[GitStatusService] Using empty status as final fallback');
        return emptyStatus;
      }
    }
  }

  private parseGitStatus(status: any[]): GitFileStatus[] {
    return status.map(item => {
      const statusCode = item.status;
      let fileStatus: GitFileStatus['status'] = 'modified';

      // Parse git status codes
      if (statusCode.includes('M')) fileStatus = 'modified';
      else if (statusCode.includes('A')) fileStatus = 'added';
      else if (statusCode.includes('D')) fileStatus = 'deleted';
      else if (statusCode.includes('?')) fileStatus = 'untracked';
      else if (statusCode.includes('R')) fileStatus = 'renamed';

      // Check if staged (first character in status)
      if (statusCode[0] !== ' ' && statusCode[0] !== '?') {
        fileStatus = 'staged';
      }

      return {
        path: item.path,
        status: fileStatus,
        originalPath: item.originalPath
      };
    });
  }

  // Event-driven listener management
  addEventListener(appPath: string, callback: (status: GitStatus) => void): void {
    if (!this.eventListeners.has(appPath)) {
      this.eventListeners.set(appPath, []);
    }
    this.eventListeners.get(appPath)!.push(callback);
    console.log(`[GitStatusService] Added event listener for ${appPath}`);
  }

  removeEventListener(appPath: string, callback: (status: GitStatus) => void): void {
    const listeners = this.eventListeners.get(appPath);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
        if (listeners.length === 0) {
          this.eventListeners.delete(appPath);
        }
      }
    }
    console.log(`[GitStatusService] Removed event listener for ${appPath}`);
  }

  private notifyListeners(appPath: string, status: GitStatus): void {
    const listeners = this.eventListeners.get(appPath);
    if (listeners) {
      listeners.forEach(callback => callback(status));
    }
  }

  // Trigger refresh when files are modified
  async onFileChanged(appPath: string, filePath?: string): Promise<void> {
    console.log(`[GitStatusService] File changed in ${appPath}: ${filePath || 'unknown'}`);
    // Force refresh and notify listeners
    await this.getStatus(appPath, true);
  }

  // Trigger refresh after git operations
  async onGitOperationComplete(appPath: string, operation: string): Promise<void> {
    console.log(`[GitStatusService] Git operation completed in ${appPath}: ${operation}`);
    // Invalidate cache and force refresh
    this.gitStatusCache.delete(appPath);
    await this.getStatus(appPath, true);
  }

  private async getBranchInfo(filesPath: string, shouldLog: boolean = false): Promise<GitBranchInfo> {
    if (shouldLog) console.log(`[GitStatusService] Getting branch info for files path: ${filesPath}`);
    
    // Check if the git API methods exist before calling them
    if (!window.electronAPI?.git?.getCurrentBranch || !window.electronAPI?.git?.getAheadBehind) {
      if (shouldLog) console.warn('[GitStatusService] Git API methods not available, using default branch info');
      return {
        current: 'main',
        ahead: 0,
        behind: 0
      };
    }

    try {
      if (shouldLog) console.log('[GitStatusService] Making single attempt to get branch name and ahead/behind info...');
      
      const [branchName, aheadBehind] = await Promise.all([
        window.electronAPI.git.getCurrentBranch(filesPath).catch((error) => {
          if (shouldLog) console.warn('[GitStatusService] getCurrentBranch failed:', error);
          return 'main';
        }),
        window.electronAPI.git.getAheadBehind(filesPath).catch((error) => {
          if (shouldLog) console.warn('[GitStatusService] getAheadBehind failed:', error);
          return null;
        })
      ]);
      
      const result = {
        current: branchName || 'main',
        ahead: aheadBehind?.ahead || 0,
        behind: aheadBehind?.behind || 0,
        upstream: aheadBehind?.upstream
      };
      
      if (shouldLog) console.log(`[GitStatusService] Branch info result:`, result);
      return result;
    } catch (error) {
      if (shouldLog) console.warn('[GitStatusService] Failed to get branch info, using defaults:', error);
      return {
        current: 'main',
        ahead: 0,
        behind: 0
      };
    }
  }

  async stageFile(appPath: string, filePath: string): Promise<void> {
    console.log(`[GitStatusService] Staging file: ${filePath} in app: ${appPath}`);
    
    if (!window.electronAPI?.git?.stageFile) {
      console.error('[GitStatusService] Git staging API not available');
      throw new Error('Git staging API not available');
    }

    try {
      // Calculate the actual files path
      const { FileSystemService } = await import('./fileSystemService');
      const fileSystemService = FileSystemService.getInstance();
      const actualAppPath = await fileSystemService.getAppPath(appPath);
      const filesPath = await window.electronAPI.path.join(actualAppPath, 'files');
      
      console.log(`[GitStatusService] Using files path for staging: ${filesPath}`);
      
      // Single attempt - no timeout, no retries
      await window.electronAPI.git.stageFile(filesPath, filePath);
      console.log(`[GitStatusService] Successfully staged file: ${filePath}`);
      
      // Trigger event-driven refresh  
      await this.onGitOperationComplete(appPath, 'git operation');
    } catch (error) {
      console.error('[GitStatusService] Failed to stage file:', error);
      throw new Error(`Failed to stage ${filePath}: ${error.message}`);
    }
  }

  async unstageFile(appPath: string, filePath: string): Promise<void> {
    console.log(`[GitStatusService] Unstaging file: ${filePath} in app: ${appPath}`);
    
    try {
      // Calculate the actual files path
      const { FileSystemService } = await import('./fileSystemService');
      const fileSystemService = FileSystemService.getInstance();
      const actualAppPath = await fileSystemService.getAppPath(appPath);
      const filesPath = await window.electronAPI.path.join(actualAppPath, 'files');
      
      console.log(`[GitStatusService] Using files path for unstaging: ${filesPath}`);
      
      // Single attempt - no timeout, no retries
      await window.electronAPI.git.unstageFile(filesPath, filePath);
      console.log(`[GitStatusService] Successfully unstaged file: ${filePath}`);
      
      // Trigger event-driven refresh  
      await this.onGitOperationComplete(appPath, 'git operation');
    } catch (error) {
      console.error('[GitStatusService] Failed to unstage file:', error);
      throw new Error(`Failed to unstage ${filePath}: ${error.message}`);
    }
  }

  async stageAll(appPath: string): Promise<void> {
    console.log(`[GitStatusService] Staging all files in app: ${appPath}`);
    
    try {
      // Calculate the actual files path
      const { FileSystemService } = await import('./fileSystemService');
      const fileSystemService = FileSystemService.getInstance();
      const actualAppPath = await fileSystemService.getAppPath(appPath);
      const filesPath = await window.electronAPI.path.join(actualAppPath, 'files');
      
      console.log(`[GitStatusService] Using files path for staging all: ${filesPath}`);
      
      // Single attempt - no timeout, no retries
      await window.electronAPI.git.stageAll(filesPath);
      console.log(`[GitStatusService] Successfully staged all files`);
      
      this.gitStatusCache.delete(appPath);
    } catch (error) {
      console.error('[GitStatusService] Failed to stage all files:', error);
      throw new Error(`Failed to stage all files: ${error.message}`);
    }
  }

  async unstageAll(appPath: string): Promise<void> {
    console.log(`[GitStatusService] Unstaging all files in app: ${appPath}`);
    
    try {
      // Calculate the actual files path
      const { FileSystemService } = await import('./fileSystemService');
      const fileSystemService = FileSystemService.getInstance();
      const actualAppPath = await fileSystemService.getAppPath(appPath);
      const filesPath = await window.electronAPI.path.join(actualAppPath, 'files');
      
      console.log(`[GitStatusService] Using files path for unstaging all: ${filesPath}`);
      
      // Single attempt - no timeout, no retries
      await window.electronAPI.git.unstageAll(filesPath);
      console.log(`[GitStatusService] Successfully unstaged all files`);
      
      this.gitStatusCache.delete(appPath);
    } catch (error) {
      console.error('[GitStatusService] Failed to unstage all files:', error);
      throw new Error(`Failed to unstage all files: ${error.message}`);
    }
  }

  async commit(appPath: string, message: string): Promise<void> {
    console.log(`[GitStatusService] Committing changes in app: ${appPath}`);
    console.log(`[GitStatusService] Commit message: ${message}`);
    
    try {
      // Calculate the actual files path
      const { FileSystemService } = await import('./fileSystemService');
      const fileSystemService = FileSystemService.getInstance();
      const actualAppPath = await fileSystemService.getAppPath(appPath);
      const filesPath = await window.electronAPI.path.join(actualAppPath, 'files');
      
      console.log(`[GitStatusService] Using files path for commit: ${filesPath}`);
      
      // Single attempt - no timeout, no retries
      await window.electronAPI.git.commit(filesPath, message);
      console.log(`[GitStatusService] Successfully committed changes`);
      
      this.gitStatusCache.delete(appPath);
    } catch (error) {
      console.error('[GitStatusService] Failed to commit changes:', error);
      throw new Error(`Failed to commit changes: ${error.message}`);
    }
  }

  async push(appPath: string): Promise<void> {
    console.log(`[GitStatusService] Pushing changes in app: ${appPath}`);
    
    try {
      // Calculate the actual files path
      const { FileSystemService } = await import('./fileSystemService');
      const fileSystemService = FileSystemService.getInstance();
      const actualAppPath = await fileSystemService.getAppPath(appPath);
      const filesPath = await window.electronAPI.path.join(actualAppPath, 'files');
      
      console.log(`[GitStatusService] Using files path for push: ${filesPath}`);
      
      // Single attempt - no timeout, no retries
      await window.electronAPI.git.push(filesPath);
      console.log(`[GitStatusService] Successfully pushed changes`);
      
      this.gitStatusCache.delete(appPath);
    } catch (error) {
      console.error('[GitStatusService] Failed to push changes:', error);
      throw new Error(`Failed to push changes: ${error.message}`);
    }
  }

  async pull(appPath: string): Promise<void> {
    console.log(`[GitStatusService] Pulling changes in app: ${appPath}`);
    
    try {
      // Calculate the actual files path
      const { FileSystemService } = await import('./fileSystemService');
      const fileSystemService = FileSystemService.getInstance();
      const actualAppPath = await fileSystemService.getAppPath(appPath);
      const filesPath = await window.electronAPI.path.join(actualAppPath, 'files');
      
      console.log(`[GitStatusService] Using files path for pull: ${filesPath}`);
      
      // Single attempt - no timeout, no retries
      await window.electronAPI.git.pull(filesPath);
      console.log(`[GitStatusService] Successfully pulled changes`);
      
      this.gitStatusCache.delete(appPath);
    } catch (error) {
      console.error('[GitStatusService] Failed to pull changes:', error);
      throw new Error(`Failed to pull changes: ${error.message}`);
    }
  }

  async getDiff(appPath: string, filePath: string, staged: boolean = false): Promise<string> {
    console.log(`[GitStatusService] Getting diff for file: ${filePath} in app: ${appPath}, staged: ${staged}`);
    
    try {
      // Calculate the actual files path
      const { FileSystemService } = await import('./fileSystemService');
      const fileSystemService = FileSystemService.getInstance();
      const actualAppPath = await fileSystemService.getAppPath(appPath);
      const filesPath = await window.electronAPI.path.join(actualAppPath, 'files');
      
      console.log(`[GitStatusService] Using files path for diff: ${filesPath}`);
      
      // Single attempt - no timeout, no retries
      const diff = await window.electronAPI.git.getDiff(filesPath, filePath, staged);
      console.log(`[GitStatusService] Successfully got diff, length: ${diff?.length || 0}`);
      
      return diff || '';
    } catch (error) {
      console.error('[GitStatusService] Failed to get diff:', error);
      return '';
    }
  }

  // Generate AI commit message
  async generateCommitMessage(appPath: string, stagedFiles: GitFileStatus[]): Promise<string> {
    try {
      // Get diffs for staged files
      const diffs = await Promise.all(
        stagedFiles.map(async (file) => {
          const diff = await this.getDiff(appPath, file.path, true);
          return { path: file.path, diff, status: file.status };
        })
      );

      // Basic commit message generation based on files and changes
      const fileChanges = diffs.reduce((acc, { path, status }) => {
        const type = this.getChangeType(path, status);
        if (!acc[type]) acc[type] = [];
        acc[type].push(path);
        return acc;
      }, {} as Record<string, string[]>);

      let message = this.buildCommitMessage(fileChanges);
      message += '\n\n🤖 Generated with Claude Code\n\nCo-Authored-By: Claude <noreply@anthropic.com>';

      return message;
    } catch (error) {
      console.error('Failed to generate commit message:', error);
      return 'feat: Update project files\n\n🤖 Generated with Claude Code\n\nCo-Authored-By: Claude <noreply@anthropic.com>';
    }
  }

  private getChangeType(filePath: string, status: string): string {
    if (status === 'added') return 'feat';
    if (status === 'deleted') return 'feat';
    if (filePath.includes('test') || filePath.includes('spec')) return 'test';
    if (filePath.includes('README') || filePath.includes('.md')) return 'docs';
    if (filePath.includes('package.json') || filePath.includes('config')) return 'chore';
    if (filePath.includes('style') || filePath.includes('.css')) return 'style';
    return 'feat';
  }

  private buildCommitMessage(fileChanges: Record<string, string[]>): string {
    const types = Object.keys(fileChanges);
    const primaryType = types[0] || 'feat';
    
    if (types.length === 1) {
      const files = fileChanges[primaryType];
      if (files.length === 1) {
        return `${primaryType}: Update ${files[0]}`;
      } else {
        return `${primaryType}: Update ${files.length} files`;
      }
    } else {
      const totalFiles = Object.values(fileChanges).flat().length;
      return `feat: Update ${totalFiles} files across multiple areas`;
    }
  }

  // Event-driven approach - no polling, just register listener and load initial status
  startWatching(appPath: string, callback: (status: GitStatus) => void): void {
    console.log(`[GitStatusService] Starting event-driven watcher for app: ${appPath}`);
    
    // Register the callback for future updates
    this.addEventListener(appPath, callback);

    // Get initial status (uses cache if available)
    console.log(`[GitStatusService] Getting initial status (cached if available)`);
    this.getStatus(appPath).then(status => {
      console.log(`[GitStatusService] Initial status loaded`);
      callback(status);
    }).catch(error => {
      console.warn('[GitStatusService] Initial git status failed:', error);
      // Provide basic repo status even if git calls fail
      const fallbackStatus = {
        files: [],
        branch: { current: 'main', ahead: 0, behind: 0 },
        isRepo: true,
        hasChanges: false
      };
      console.log(`[GitStatusService] Using fallback status:`, fallbackStatus);
      callback(fallbackStatus);
    });

    console.log(`[GitStatusService] Event-driven watcher started successfully for: ${appPath}`);
  }

  stopWatching(appPath: string, callback?: (status: GitStatus) => void): void {
    console.log(`[GitStatusService] Stopping watcher for: ${appPath}`);
    if (callback) {
      // Remove specific callback
      this.removeEventListener(appPath, callback);
    } else {
      // Remove all listeners for this app
      this.eventListeners.delete(appPath);
    }
    
    // Clean up any old interval watchers if they exist
    const watcher = this.watchers.get(appPath);
    if (watcher) {
      clearInterval(watcher);
      this.watchers.delete(appPath);
    }
  }

  clearCache(): void {
    this.gitStatusCache.clear();
  }
}