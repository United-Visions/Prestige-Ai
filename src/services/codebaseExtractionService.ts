import type { FileNode } from '@/types';

export interface CodebaseContext {
  formattedOutput: string;
  files: FileNode[];
}

export class CodebaseExtractionService {
  private static instance: CodebaseExtractionService;

  private constructor() {}

  public static getInstance(): CodebaseExtractionService {
    if (!CodebaseExtractionService.instance) {
      CodebaseExtractionService.instance = new CodebaseExtractionService();
    }
    return CodebaseExtractionService.instance;
  }

  async extractCodebase(appPath: string): Promise<CodebaseContext> {
    try {
      // Get all files in the app's files directory
      const filesPath = await window.electronAPI.path.join(appPath, 'files');
      const files = await this.getFilesRecursively(filesPath);
      
      // Format the codebase information
      const formattedOutput = await this.formatCodebaseInfo(files, filesPath);
      
      return {
        formattedOutput,
        files
      };
    } catch (error) {
      console.error('Failed to extract codebase:', error);
      return {
        formattedOutput: 'Error: Unable to extract codebase information.',
        files: []
      };
    }
  }

  private async getFilesRecursively(dirPath: string, relativePath: string = ''): Promise<FileNode[]> {
    try {
      const entries = await window.electronAPI.fs.readdir(dirPath);
      const files: FileNode[] = [];

      for (const entry of entries) {
        // Skip certain directories and files
        if (this.shouldSkipFile(entry)) {
          continue;
        }

        const fullPath = await window.electronAPI.path.join(dirPath, entry);
        const entryRelativePath = relativePath ? `${relativePath}/${entry}` : entry;
        
        try {
          const stats = await window.electronAPI.fs.stat(fullPath);
          
          if (stats.isDirectory()) {
            const children = await this.getFilesRecursively(fullPath, entryRelativePath);
            files.push({
              name: entry,
              type: 'directory',
              path: entryRelativePath,
              children
            });
          } else {
            // Only read text files
            let content: string | undefined;
            if (this.isTextFile(entry)) {
              try {
                content = await window.electronAPI.fs.readFile(fullPath, 'utf8');
              } catch (error) {
                console.warn(`Failed to read file ${fullPath}:`, error);
                content = `// Error reading file: ${error}`;
              }
            }

            files.push({
              name: entry,
              type: 'file',
              path: entryRelativePath,
              content
            });
          }
        } catch (error) {
          console.warn(`Failed to stat ${fullPath}:`, error);
        }
      }

      return files;
    } catch (error) {
      console.error(`Failed to read directory ${dirPath}:`, error);
      return [];
    }
  }

  private shouldSkipFile(fileName: string): boolean {
    const skipPatterns = [
      'node_modules',
      '.git',
      '.DS_Store',
      'package-lock.json',
      'pnpm-lock.yaml',
      'yarn.lock',
      'dist',
      'build',
      '.next',
      '.vite',
      'coverage',
      '.nyc_output',
      '.tmp',
      '.temp'
    ];

    return skipPatterns.some(pattern => fileName.includes(pattern));
  }

  private isTextFile(fileName: string): boolean {
    const textExtensions = [
      '.ts', '.tsx', '.js', '.jsx',
      '.json', '.md', '.txt', '.html', '.css', '.scss', '.sass',
      '.vue', '.svelte', '.py', '.php', '.rb', '.go', '.rs',
      '.c', '.cpp', '.h', '.hpp', '.java', '.kt', '.swift',
      '.xml', '.yml', '.yaml', '.toml', '.ini', '.env',
      '.gitignore', '.gitkeep', '.editorconfig',
      '.eslintrc', '.prettierrc', '.babelrc'
    ];

    const ext = fileName.toLowerCase();
    return textExtensions.some(textExt => ext.endsWith(textExt)) || 
           !fileName.includes('.'); // Files without extension (like Dockerfile, Makefile)
  }

  private async formatCodebaseInfo(files: FileNode[], basePath: string): Promise<string> {
    let output = '';
    
    // Add file tree structure
    output += '## File Structure\n\n';
    output += this.generateFileTree(files);
    output += '\n\n## File Contents\n\n';
    
    // Add file contents
    const fileContents = this.extractFileContents(files);
    for (const file of fileContents) {
      if (file.content && file.content.trim()) {
        output += `### ${file.path}\n\n`;
        output += '```' + this.getFileExtension(file.path) + '\n';
        output += file.content;
        output += '\n```\n\n';
      }
    }

    return output;
  }

  private generateFileTree(files: FileNode[], indent: string = ''): string {
    let tree = '';
    
    for (const file of files) {
      tree += `${indent}- ${file.name}`;
      if (file.type === 'directory') {
        tree += '/\n';
        if (file.children) {
          tree += this.generateFileTree(file.children, indent + '  ');
        }
      } else {
        tree += '\n';
      }
    }
    
    return tree;
  }

  private extractFileContents(files: FileNode[]): FileNode[] {
    const contents: FileNode[] = [];
    
    for (const file of files) {
      if (file.type === 'file' && file.content) {
        contents.push(file);
      } else if (file.type === 'directory' && file.children) {
        contents.push(...this.extractFileContents(file.children));
      }
    }
    
    return contents;
  }

  private getFileExtension(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'py': 'python',
      'rb': 'ruby',
      'php': 'php',
      'go': 'go',
      'rs': 'rust',
      'java': 'java',
      'kt': 'kotlin',
      'swift': 'swift',
      'c': 'c',
      'cpp': 'cpp',
      'h': 'c',
      'hpp': 'cpp',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'html': 'html',
      'xml': 'xml',
      'json': 'json',
      'yml': 'yaml',
      'yaml': 'yaml',
      'toml': 'toml',
      'md': 'markdown'
    };
    
    return languageMap[ext || ''] || '';
  }
}

export const createCodebasePrompt = (codebaseInfo: string): string => {
  return `This is my codebase. ${codebaseInfo}`;
};