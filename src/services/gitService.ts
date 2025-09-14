import { showToast } from '@/utils/toast';

export interface GitStatus {
  staged: Array<{ file: string; status: string }>;
  unstaged: Array<{ file: string; status: string }>;
}

export interface GitCommit {
  hash: string;
  message: string;
}

export interface GitRemote {
  name: string;
  url: string;
  type: string;
}

export interface GitOperationResult {
  success: boolean;
  output?: string;
  error?: string;
}

export class GitService {
  private static instance: GitService;

  static getInstance(): GitService {
    if (!GitService.instance) {
      GitService.instance = new GitService();
    }
    return GitService.instance;
  }

  /**
   * Initialize a Git repository
   */
  async initRepository(repoPath: string): Promise<GitOperationResult> {
    try {
      const result = await window.electronAPI.git.init(repoPath);
      if (result.success) {
        showToast('Git repository initialized', 'success');
        console.log('✅ Git repository initialized:', repoPath);
      } else {
        showToast(`Failed to initialize Git repository: ${result.error}`, 'error');
      }
      return result;
    } catch (error) {
      console.error('Git init error:', error);
      const result = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      showToast(`Git init failed: ${result.error}`, 'error');
      return result;
    }
  }

  /**
   * Get repository status
   */
  async getStatus(repoPath: string): Promise<GitStatus> {
    try {
      const result = await window.electronAPI.git.status(repoPath);
      if (result.success) {
        return { staged: result.staged, unstaged: result.unstaged };
      } else {
        console.warn('Git status error:', result.error);
        return { staged: [], unstaged: [] };
      }
    } catch (error) {
      console.error('Git status error:', error);
      return { staged: [], unstaged: [] };
    }
  }

  /**
   * Stage files
   */
  async stageFiles(repoPath: string, files: string[]): Promise<GitOperationResult> {
    try {
      const result = await window.electronAPI.git.add(repoPath, files);
      if (result.success) {
        const fileCount = files.length === 0 ? 'all files' : `${files.length} file(s)`;
        showToast(`Staged ${fileCount}`, 'success');
        console.log('✅ Files staged:', files);
      } else {
        showToast(`Failed to stage files: ${result.error}`, 'error');
      }
      return result;
    } catch (error) {
      console.error('Git add error:', error);
      const result = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      showToast(`Git add failed: ${result.error}`, 'error');
      return result;
    }
  }

  /**
   * Commit changes
   */
  async commit(repoPath: string, message: string, description?: string): Promise<GitOperationResult> {
    try {
      const result = await window.electronAPI.git.commit(repoPath, message, description);
      if (result.success) {
        showToast('Changes committed successfully', 'success');
        console.log('✅ Commit created:', message);
      } else {
        showToast(`Failed to commit: ${result.error}`, 'error');
      }
      return result;
    } catch (error) {
      console.error('Git commit error:', error);
      const result = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      showToast(`Commit failed: ${result.error}`, 'error');
      return result;
    }
  }

  /**
   * Push to remote repository
   */
  async push(repoPath: string, remote: string = 'origin', branch: string = 'main'): Promise<GitOperationResult> {
    try {
      const result = await window.electronAPI.git.push(repoPath, remote, branch);
      if (result.success) {
        showToast(`Pushed to ${remote}/${branch}`, 'success');
        console.log(`✅ Pushed to ${remote}/${branch}`);
      } else {
        showToast(`Failed to push: ${result.error}`, 'error');
      }
      return result;
    } catch (error) {
      console.error('Git push error:', error);
      const result = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      showToast(`Push failed: ${result.error}`, 'error');
      return result;
    }
  }

  /**
   * Force push with lease (safer than regular force push)
   */
  async forcePushWithLease(repoPath: string, remote: string = 'origin', branch: string = 'main'): Promise<GitOperationResult> {
    try {
      const result = await window.electronAPI.git.forcePush(repoPath, remote, branch);
      if (result.success) {
        showToast(`Force pushed to ${remote}/${branch}`, 'success');
        console.log(`✅ Force pushed to ${remote}/${branch}`);
      } else {
        showToast(`Failed to force push: ${result.error}`, 'error');
      }
      return result;
    } catch (error) {
      console.error('Git force push error:', error);
      const result = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      showToast(`Force push failed: ${result.error}`, 'error');
      return result;
    }
  }

  /**
   * Add remote repository
   */
  async addRemote(repoPath: string, name: string, url: string): Promise<GitOperationResult> {
    try {
      const result = await window.electronAPI.git.remoteAdd(repoPath, name, url);
      if (result.success) {
        showToast(`Remote '${name}' added`, 'success');
        console.log(`✅ Remote added: ${name} -> ${url}`);
      } else {
        showToast(`Failed to add remote: ${result.error}`, 'error');
      }
      return result;
    } catch (error) {
      console.error('Git remote add error:', error);
      const result = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      showToast(`Add remote failed: ${result.error}`, 'error');
      return result;
    }
  }

  /**
   * List remotes
   */
  async listRemotes(repoPath: string): Promise<GitRemote[]> {
    try {
      const result = await window.electronAPI.git.remoteList(repoPath);
      if (result.success) {
        return result.remotes;
      } else {
        console.warn('Git remote list error:', result.error);
        return [];
      }
    } catch (error) {
      console.error('Git remote list error:', error);
      return [];
    }
  }

  /**
   * Get commit history
   */
  async getHistory(repoPath: string, limit: number = 10): Promise<GitCommit[]> {
    try {
      const result = await window.electronAPI.git.log(repoPath, limit);
      if (result.success) {
        return result.commits;
      } else {
        console.warn('Git log error:', result.error);
        return [];
      }
    } catch (error) {
      console.error('Git log error:', error);
      return [];
    }
  }

  /**
   * Get diff for a file or all files
   */
  async getDiff(repoPath: string, file?: string): Promise<string> {
    try {
      const result = await window.electronAPI.git.diff(repoPath, file);
      if (result.success) {
        return result.diff;
      } else {
        console.warn('Git diff error:', result.error);
        return '';
      }
    } catch (error) {
      console.error('Git diff error:', error);
      return '';
    }
  }

  /**
   * Clone a repository
   */
  async clone(url: string, targetPath: string, name?: string): Promise<GitOperationResult & { path?: string }> {
    try {
      const result = await window.electronAPI.git.clone(url, targetPath, name);
      if (result.success) {
        showToast(`Repository cloned to ${result.path}`, 'success');
        console.log('✅ Repository cloned:', result.path);
      } else {
        showToast(`Failed to clone repository: ${result.error}`, 'error');
      }
      return result;
    } catch (error) {
      console.error('Git clone error:', error);
      const result = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      showToast(`Clone failed: ${result.error}`, 'error');
      return result;
    }
  }

  /**
   * Initialize repository and connect to GitHub
   */
  async initializeWithGitHub(repoPath: string, githubRepoUrl: string): Promise<GitOperationResult> {
    try {
      console.log('🔄 Starting GitHub initialization for:', repoPath);
      
      // Use the exact same method as the file tree to get app files
      // Extract app name from repoPath (it should be the app name directly)
      const appName = repoPath;
      console.log('📱 App name:', appName);
      
      // Use FileSystemService to get files exactly like the code viewer does
      const { FileSystemService } = await import('./fileSystemService');
      const fileSystemService = FileSystemService.getInstance();
      
      try {
        const files = await fileSystemService.getAppDirectoryTree(appName);
        console.log('📁 App files from FileSystemService:', files);
        
        // Flatten tree to count actual files (same logic)
        const flattenFiles = (nodes: any[]): string[] => {
          const files: string[] = [];
          for (const node of nodes) {
            if (node.type === 'file') {
              files.push(node.path);
            } else if (node.type === 'directory' && node.children) {
              files.push(...flattenFiles(node.children));
            }
          }
          return files;
        };
        
        const allFiles = flattenFiles(files);
        console.log('📄 Found files:', allFiles);
        
        if (allFiles.length === 0) {
          console.warn('⚠️ No files found - no files to commit');
          return { success: false, error: 'No files found in app directory' };
        }
      } catch (dirError) {
        console.error('❌ Cannot read app files:', dirError);
        return { success: false, error: `Cannot read app files: ${dirError}` };
      }
      
      // Now get the actual files directory path for Git operations
      const filesPath = await fileSystemService.getAppPath(appName);
      const actualFilesPath = await window.electronAPI.path.join(filesPath, 'files');
      console.log('📂 Git operations will run in:', actualFilesPath);

      // Initialize Git repository in the files directory
      console.log('1️⃣ Initializing Git repository...');
      const initResult = await this.initRepository(actualFilesPath);
      if (!initResult.success) {
        console.error('❌ Git init failed:', initResult.error);
        return initResult;
      }
      console.log('✅ Git repository initialized');

      // Add remote origin
      console.log('2️⃣ Adding remote origin...');
      const remoteResult = await this.addRemote(actualFilesPath, 'origin', githubRepoUrl);
      if (!remoteResult.success) {
        console.error('❌ Add remote failed:', remoteResult.error);
        return remoteResult;
      }
      console.log('✅ Remote origin added:', githubRepoUrl);

      // Stage all files
      console.log('3️⃣ Staging all files...');
      const stageResult = await this.stageFiles(actualFilesPath, []);
      if (!stageResult.success) {
        console.error('❌ Staging files failed:', stageResult.error);
        return stageResult;
      }
      console.log('✅ Files staged');

      // Check what was staged
      const statusAfterStaging = await this.getStatus(actualFilesPath);
      console.log('📊 Git status after staging:', statusAfterStaging);

      // Create initial commit
      console.log('4️⃣ Creating initial commit...');
      const commitResult = await this.commit(
        actualFilesPath,
        'Initial commit',
        'Project created with Prestige AI'
      );
      if (!commitResult.success) {
        console.error('❌ Commit failed:', commitResult.error);
        return commitResult;
      }
      console.log('✅ Initial commit created');

      // Push to GitHub
      console.log('5️⃣ Pushing to GitHub...');
      const pushResult = await this.push(actualFilesPath, 'origin', 'main');
      
      if (pushResult.success) {
        console.log('🎉 Successfully pushed to GitHub!');
        showToast('✅ Project successfully linked to GitHub!', 'success');
      } else {
        console.error('❌ Push failed:', pushResult.error);
        // If push still fails with empty repo, something else is wrong
        showToast(`Push failed: ${pushResult.error}`, 'error');
      }

      return pushResult;
    } catch (error) {
      console.error('💥 GitHub initialization error:', error);
      const result = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      showToast(`GitHub setup failed: ${result.error}`, 'error');
      return result;
    }
  }

  /**
   * Check if directory is a Git repository
   */
  async isGitRepository(repoPath: string): Promise<boolean> {
    try {
      const status = await this.getStatus(repoPath);
      // If we can get status without error, it's a Git repo
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Setup Git user configuration (required for commits)
   */
  async setupGitUser(repoPath: string, name: string, email: string): Promise<GitOperationResult> {
    try {
      // This would need additional IPC handlers for git config
      // For now, we'll assume git is configured globally
      console.log(`Setting up Git user: ${name} <${email}>`);
      return { success: true, output: 'Git user configuration skipped (using global config)' };
    } catch (error) {
      console.error('Git user setup error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get repository information (remote URL, current branch, etc.)
   */
  async getRepositoryInfo(repoPath: string): Promise<{
    isGitRepo: boolean;
    remotes: GitRemote[];
    currentBranch?: string;
    githubRepo?: { owner: string; name: string; url: string };
  }> {
    try {
      // Use the same method as initializeWithGitHub to get the files path
      const appName = repoPath;
      const { FileSystemService } = await import('./fileSystemService');
      const fileSystemService = FileSystemService.getInstance();
      const appPath = await fileSystemService.getAppPath(appName);
      const filesPath = await window.electronAPI.path.join(appPath, 'files');
      
      const isGitRepo = await this.isGitRepository(filesPath);
      if (!isGitRepo) {
        return { isGitRepo: false, remotes: [] };
      }

      const remotes = await this.listRemotes(filesPath);
      
      // Find GitHub remote (usually origin)
      const githubRemote = remotes.find(remote => 
        remote.url.includes('github.com') && remote.type === 'push'
      );

      let githubRepo;
      if (githubRemote) {
        // Parse GitHub URL to extract owner/repo
        const match = githubRemote.url.match(/github\.com[\/:]([^\/]+)\/([^\/\.]+)/);
        if (match) {
          const [, owner, name] = match;
          githubRepo = {
            owner,
            name,
            url: `https://github.com/${owner}/${name}`
          };
        }
      }

      return {
        isGitRepo: true,
        remotes,
        githubRepo
      };
    } catch (error) {
      console.error('Error getting repository info:', error);
      return { isGitRepo: false, remotes: [] };
    }
  }
}

// Auto-initialize
export const gitService = GitService.getInstance();