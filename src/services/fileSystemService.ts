import type { FileNode, Project } from '@/types';

// Path utilities for cross-platform compatibility
const joinPath = (...paths: string[]): string => {
  return paths.join('/').replace(/\/+/g, '/');
};

export class FileSystemService {
  private static instance: FileSystemService;
  private isElectron: boolean = false;

  private constructor() {
    this.isElectron = typeof window !== 'undefined' && (window as any).electronAPI;
  }

  public static getInstance(): FileSystemService {
    if (!FileSystemService.instance) {
      FileSystemService.instance = new FileSystemService();
    }
    return FileSystemService.instance;
  }

  async getDesktopPath(): Promise<string> {
    if (this.isElectron) {
      // Use Electron API to get desktop path
      return await (window as any).electronAPI.app.getDesktopPath();
    } else {
      // Fallback for web development
      return '/Users/' + (process.env.USER || 'user') + '/Desktop';
    }
  }

  async getPrestigeAIPath(): Promise<string> {
    const desktopPath = await this.getDesktopPath();
    return joinPath(desktopPath, 'prestige-ai');
  }

  async createPrestigeAIDirectory(): Promise<string> {
    const prestigePath = await this.getPrestigeAIPath();
    
    if (this.isElectron) {
      await (window as any).electronAPI.fs.createProjectDir(prestigePath);
    } else {
      // In web mode, we can't actually create directories
      console.log('Would create directory:', prestigePath);
    }
    
    return prestigePath;
  }

  async createAppDirectory(appName: string): Promise<string> {
    const prestigePath = await this.getPrestigeAIPath();
    const appPath = joinPath(prestigePath, appName);
    
    if (this.isElectron) {
      await (window as any).electronAPI.fs.createProjectDir(appPath);
      
      // Create subdirectories
      const subdirs = ['conversations', 'files'];
      for (const subdir of subdirs) {
        await (window as any).electronAPI.fs.createProjectDir(joinPath(appPath, subdir));
      }
    } else {
      // Store in virtual file system for web mode
      const virtualPaths = this.getVirtualPaths();
      virtualPaths[appPath] = { type: 'directory', created: new Date() };
      virtualPaths[joinPath(appPath, 'conversations')] = { type: 'directory', created: new Date() };
      virtualPaths[joinPath(appPath, 'files')] = { type: 'directory', created: new Date() };
      localStorage.setItem('prestige-ai-paths', JSON.stringify(virtualPaths));
    }
    
    return appPath;
  }

  async generateAppNameFromPrompt(userPrompt: string): Promise<string> {
    // Extract potential app name from user prompt
    const prompt = userPrompt.toLowerCase();
    
    // Look for common patterns
    let appName = '';
    
    if (prompt.includes('todo') || prompt.includes('task')) {
      appName = 'todo-app';
    } else if (prompt.includes('blog') || prompt.includes('cms')) {
      appName = 'blog-cms';
    } else if (prompt.includes('chat') || prompt.includes('messaging')) {
      appName = 'chat-app';
    } else if (prompt.includes('e-commerce') || prompt.includes('shop')) {
      appName = 'ecommerce-store';
    } else if (prompt.includes('dashboard') || prompt.includes('admin')) {
      appName = 'admin-dashboard';
    } else if (prompt.includes('portfolio') || prompt.includes('resume')) {
      appName = 'portfolio-site';
    } else if (prompt.includes('api') || prompt.includes('backend')) {
      appName = 'api-server';
    } else if (prompt.includes('landing') || prompt.includes('website')) {
      appName = 'landing-page';
    } else {
      // Extract first few meaningful words
      const words = prompt
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 2 && !['the', 'and', 'for', 'with', 'create', 'make', 'build'].includes(word))
        .slice(0, 2);
      
      appName = words.length > 0 ? words.join('-') + '-app' : 'custom-app';
    }
    
    // Ensure unique name
    const timestamp = Date.now().toString().slice(-4);
    return `${appName}-${timestamp}`;
  }

  async generateConversationTitle(userMessage: string): Promise<string> {
    // Generate a meaningful title from the user's first message
    const message = userMessage.trim();
    
    if (message.length <= 50) {
      return message;
    }
    
    // Extract key phrases or first sentence
    const firstSentence = message.split(/[.!?]/)[0];
    if (firstSentence.length <= 50) {
      return firstSentence;
    }
    
    // Truncate and add ellipsis
    return message.substring(0, 47) + '...';
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    if (this.isElectron) {
      await (window as any).electronAPI.fs.writeFile(filePath, content);
    } else {
      // In web mode, store in localStorage
      const files = this.getVirtualFiles();
      files[filePath] = content;
      localStorage.setItem('prestige-ai-files', JSON.stringify(files));
    }
  }

  async readFile(filePath: string): Promise<string> {
    if (this.isElectron) {
      return await (window as any).electronAPI.fs.readFile(filePath);
    } else {
      // In web mode, read from localStorage
      const files = this.getVirtualFiles();
      return files[filePath] || '';
    }
  }

  async writeProjectFiles(appPath: string, files: FileNode[]): Promise<void> {
    for (const file of files) {
      await this.writeFileNode(appPath, file);
    }
  }

  private async writeFileNode(basePath: string, node: FileNode): Promise<void> {
    const fullPath = joinPath(basePath, node.path);
    
    if (node.type === 'directory') {
      if (this.isElectron) {
        await (window as any).electronAPI.fs.createProjectDir(fullPath);
      }
      
      // Recursively write children
      if (node.children) {
        for (const child of node.children) {
          await this.writeFileNode(basePath, child);
        }
      }
    } else if (node.type === 'file' && node.content) {
      await this.writeFile(fullPath, node.content);
    }
  }



  async saveProject(project: Project): Promise<string> {
    try {
      // Create app directory on desktop
      await this.createPrestigeAIDirectory();
      const appPath = await this.createAppDirectory(project.name);
      
      // Write all project files to the app directory
      await this.writeProjectFiles(appPath, project.files);
      
      // The AppManagementService will handle creating the app record.
      
      // Create project metadata file
      const metadata = {
        id: project.id,
        name: project.name,
        description: project.description,
        createdAt: project.createdAt,
        updatedAt: new Date(),
      };
      
      const metadataPath = joinPath(appPath, '.prestige-ai.json');
      await this.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
      
      console.log(`✅ Project saved to: ${appPath}`);
      return appPath;
      
    } catch (error) {
      console.error('Failed to save project:', error);
      throw new Error(`Failed to save project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private getVirtualFiles(): Record<string, string> {
    try {
      const stored = localStorage.getItem('prestige-ai-files');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  private getVirtualPaths(): Record<string, any> {
    try {
      const stored = localStorage.getItem('prestige-ai-paths');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  async getAppDirectoryTree(appName: string): Promise<FileNode[]> {
    try {
      const prestigePath = await this.getPrestigeAIPath();
      const appPath = joinPath(prestigePath, appName);
      
      // Read from the 'files' subdirectory where the actual project files are stored
      const filesPath = joinPath(appPath, 'files');
      
      if (this.isElectron) {
        const tree = await (window as any).electronAPI.fs.readDirectoryTree(filesPath);
        return this.convertTreeToFileNodes(tree);
      } else {
        // In web mode, return empty array or mock data
        return [];
      }
    } catch (error) {
      console.error('Failed to read app directory tree:', error);
      return [];
    }
  }

  private convertTreeToFileNodes(tree: any[]): FileNode[] {
    return tree.map(item => {
      const node: FileNode = {
        name: item.name,
        path: item.path,
        type: item.type as 'file' | 'directory'
      };

      if (item.type === 'directory' && item.children) {
        node.children = this.convertTreeToFileNodes(item.children);
      }

      return node;
    });
  }

  async getAppPath(appName: string): Promise<string> {
    const prestigePath = await this.getPrestigeAIPath();
    return joinPath(prestigePath, appName);
  }

  async deleteDirectory(dirPath: string): Promise<void> {
    if (this.isElectron) {
      await (window as any).electronAPI.fs.deleteDirectory(dirPath);
    } else {
      // In web mode, remove from virtual storage
      const files = this.getVirtualFiles();
      const paths = this.getVirtualPaths();
      
      // Remove all files that start with the directory path
      Object.keys(files).forEach(filePath => {
        if (filePath.startsWith(dirPath)) {
          delete files[filePath];
        }
      });
      
      // Remove directory from paths
      delete paths[dirPath];
      
      localStorage.setItem('prestige-ai-files', JSON.stringify(files));
      localStorage.setItem('prestige-ai-paths', JSON.stringify(paths));
    }
  }

  async exportProjectAsZip(project: Project): Promise<Blob> {
    // For web environments, create a text bundle
    const files: string[] = [];
    
    const processNode = (node: FileNode, path: string = '') => {
      const fullPath = path ? `${path}/${node.name}` : node.name;
      
      if (node.type === 'file' && node.content) {
        files.push(`// File: ${fullPath}`);
        files.push(node.content);
        files.push(''); // Empty line separator
      }
      
      if (node.children) {
        node.children.forEach(child => processNode(child, fullPath));
      }
    };
    
    project.files.forEach(file => processNode(file));
    
    const content = files.join('\n');
    return new Blob([content], { type: 'text/plain' });
  }
}