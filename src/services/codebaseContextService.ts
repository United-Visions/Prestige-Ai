import { resolveAppPaths } from '@/utils/appPathResolver';
import AppStateManager from './appStateManager';
import useAppStore from '@/stores/appStore';
import { showInfo, showError } from '@/utils/toast';

const { fs, path } = window.electronAPI;

export interface CodebaseFile {
  path: string;
  content: string;
  type: 'file' | 'directory';
  size: number;
  lastModified: Date;
  language?: string;
}

export interface ContextAnalysis {
  files: CodebaseFile[];
  patterns: string[];
  dependencies: string[];
  architecture: {
    framework: string;
    patterns: string[];
    structure: string[];
  };
  relevantFiles: string[];
}

export interface ContextRequest {
  type: 'full-analysis' | 'template' | 'targeted' | 'clear-and-replace';
  templateId?: string;
  files?: string[];
  patterns?: string[];
  query?: string;
  keep?: string[];
}

/**
 * Service for intelligent codebase context management
 * Provides targeted context extraction for AI responses
 */
export class CodebaseContextService {
  private static instance: CodebaseContextService;
  private contextCache: Map<string, ContextAnalysis> = new Map();
  private currentContext: ContextAnalysis | null = null;

  public static getInstance(): CodebaseContextService {
    if (!CodebaseContextService.instance) {
      CodebaseContextService.instance = new CodebaseContextService();
    }
    return CodebaseContextService.instance;
  }

  /**
   * Process codebase context request and return relevant context
   */
  async processContextRequest(request: ContextRequest): Promise<ContextAnalysis | null> {
    const { currentApp } = useAppStore.getState();
    if (!currentApp) {
      showError("No application selected for context analysis");
      return null;
    }

    try {
      switch (request.type) {
        case 'full-analysis':
          return await this.performFullAnalysis(currentApp);

        case 'template':
          return await this.analyzeTemplate(request.templateId!);

        case 'targeted':
          return await this.extractTargetedContext(currentApp, request);

        case 'clear-and-replace':
          return await this.clearAndReplaceContext(currentApp, request.keep || []);

        default:
          throw new Error(`Unknown context type: ${request.type}`);
      }
    } catch (error) {
      console.error('Context processing failed:', error);
      showError(`Context analysis failed: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Perform full codebase analysis
   */
  private async performFullAnalysis(app: any): Promise<ContextAnalysis> {
    const cacheKey = `full-${app.id}-${Date.now()}`;

    showInfo("🔍 Analyzing full codebase...");

    const { filesPath } = await resolveAppPaths(app);
    const appStateManager = AppStateManager.getInstance();
    const vfs = await appStateManager.getVirtualFileSystem(app);

    // Get all files from virtual filesystem
    const allFiles = await this.getAllFiles(filesPath);

    // Analyze project structure and patterns
    const analysis: ContextAnalysis = {
      files: allFiles,
      patterns: await this.detectPatterns(allFiles),
      dependencies: await this.extractDependencies(filesPath),
      architecture: await this.analyzeArchitecture(allFiles),
      relevantFiles: allFiles.map(f => f.path)
    };

    this.currentContext = analysis;
    this.contextCache.set(cacheKey, analysis);

    showInfo(`✅ Analyzed ${allFiles.length} files, found ${analysis.patterns.length} patterns`);
    return analysis;
  }

  /**
   * Analyze template structure for app creation
   */
  private async analyzeTemplate(templateId: string): Promise<ContextAnalysis> {
    showInfo(`🎯 Analyzing template: ${templateId}`);

    // Get template files from templates directory
    const templateFiles = await this.getTemplateFiles(templateId);

    const analysis: ContextAnalysis = {
      files: templateFiles,
      patterns: await this.detectPatterns(templateFiles),
      dependencies: await this.extractTemplateDependencies(templateId),
      architecture: await this.analyzeArchitecture(templateFiles),
      relevantFiles: templateFiles.map(f => f.path)
    };

    this.currentContext = analysis;
    showInfo(`✅ Template analysis complete: ${templateFiles.length} files`);
    return analysis;
  }

  /**
   * Extract targeted context based on files/patterns/query
   */
  private async extractTargetedContext(app: any, request: ContextRequest): Promise<ContextAnalysis> {
    showInfo("🎯 Extracting targeted context...");

    const { filesPath } = await resolveAppPaths(app);
    let relevantFiles: CodebaseFile[] = [];

    // Start with specified files if provided
    if (request.files && request.files.length > 0) {
      for (const filePath of request.files) {
        try {
          const fullPath = await path.join(filesPath, filePath);
          const exists = await fs.pathExists(fullPath);
          if (exists) {
            const content = await fs.readFile(fullPath, 'utf8');
            const stats = await fs.stat(fullPath);
            relevantFiles.push({
              path: filePath,
              content,
              type: 'file',
              size: stats.size,
              lastModified: new Date(stats.mtime),
              language: this.detectLanguage(filePath)
            });
          }
        } catch (error) {
          console.warn(`Failed to read file ${filePath}:`, error);
        }
      }
    }

    // Expand context based on patterns/query
    if (request.patterns || request.query) {
      const additionalFiles = await this.findRelatedFiles(
        filesPath,
        request.patterns || [],
        request.query,
        relevantFiles.map(f => f.path)
      );
      relevantFiles.push(...additionalFiles);
    }

    const analysis: ContextAnalysis = {
      files: relevantFiles,
      patterns: await this.detectPatterns(relevantFiles),
      dependencies: await this.extractDependenciesFromFiles(relevantFiles),
      architecture: await this.analyzeArchitecture(relevantFiles),
      relevantFiles: relevantFiles.map(f => f.path)
    };

    this.currentContext = analysis;
    showInfo(`✅ Targeted context: ${relevantFiles.length} relevant files`);
    return analysis;
  }

  /**
   * Clear current context and replace with specific files
   */
  private async clearAndReplaceContext(app: any, keepFiles: string[]): Promise<ContextAnalysis> {
    showInfo("🧹 Clearing context and keeping relevant files...");

    const { filesPath } = await resolveAppPaths(app);
    const relevantFiles: CodebaseFile[] = [];

    // Only keep specified files
    for (const filePath of keepFiles) {
      try {
        const fullPath = await path.join(filesPath, filePath);
        const exists = await fs.pathExists(fullPath);
        if (exists) {
          const content = await fs.readFile(fullPath, 'utf8');
          const stats = await fs.stat(fullPath);
          relevantFiles.push({
            path: filePath,
            content,
            type: 'file',
            size: stats.size,
            lastModified: new Date(stats.mtime),
            language: this.detectLanguage(filePath)
          });
        }
      } catch (error) {
        console.warn(`Failed to read file ${filePath}:`, error);
      }
    }

    const analysis: ContextAnalysis = {
      files: relevantFiles,
      patterns: await this.detectPatterns(relevantFiles),
      dependencies: await this.extractDependenciesFromFiles(relevantFiles),
      architecture: await this.analyzeArchitecture(relevantFiles),
      relevantFiles: relevantFiles.map(f => f.path)
    };

    this.currentContext = analysis;
    showInfo(`✅ Context cleared, kept ${relevantFiles.length} files`);
    return analysis;
  }

  /**
   * Get all files recursively from a directory
   */
  private async getAllFiles(dirPath: string): Promise<CodebaseFile[]> {
    const files: CodebaseFile[] = [];

    try {
      const items = await fs.readdir(dirPath);

      for (const item of items) {
        // Skip common ignore patterns
        if (this.shouldIgnoreFile(item)) continue;

        const fullPath = await path.join(dirPath, item);
        const stats = await fs.stat(fullPath);

        if (stats.isDirectory()) {
          // Recursively get files from subdirectory
          const subFiles = await this.getAllFiles(fullPath);
          files.push(...subFiles);
        } else {
          // Add file to collection
          try {
            const content = await fs.readFile(fullPath, 'utf8');
            const relativePath = fullPath.replace(dirPath + '/', '');

            files.push({
              path: relativePath,
              content,
              type: 'file',
              size: stats.size,
              lastModified: new Date(stats.mtime),
              language: this.detectLanguage(relativePath)
            });
          } catch (error) {
            // Skip binary files or files that can't be read as text
            console.warn(`Skipping file ${item}:`, error);
          }
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dirPath}:`, error);
    }

    return files;
  }

  /**
   * Detect patterns in the codebase
   */
  private async detectPatterns(files: CodebaseFile[]): Promise<string[]> {
    const patterns = new Set<string>();

    for (const file of files) {
      // React patterns
      if (file.content.includes('import React') || file.content.includes('from \'react\'')) {
        patterns.add('react');
      }

      // Component patterns
      if (file.content.includes('export default function') || file.content.includes('export const')) {
        patterns.add('functional-components');
      }

      // Hook patterns
      if (file.content.includes('useState') || file.content.includes('useEffect')) {
        patterns.add('react-hooks');
      }

      // TypeScript patterns
      if (file.language === 'typescript' || file.path.endsWith('.ts') || file.path.endsWith('.tsx')) {
        patterns.add('typescript');
      }

      // Styling patterns
      if (file.content.includes('className=') || file.content.includes('tailwind')) {
        patterns.add('tailwind-css');
      }

      // State management patterns
      if (file.content.includes('useState') || file.content.includes('useReducer')) {
        patterns.add('state-management');
      }

      // API patterns
      if (file.content.includes('fetch(') || file.content.includes('axios')) {
        patterns.add('api-calls');
      }

      // Routing patterns
      if (file.content.includes('useRouter') || file.content.includes('BrowserRouter')) {
        patterns.add('routing');
      }
    }

    return Array.from(patterns);
  }

  /**
   * Extract dependencies from package.json
   */
  private async extractDependencies(appPath: string): Promise<string[]> {
    try {
      const packageJsonPath = await path.join(appPath, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

      const dependencies = [
        ...Object.keys(packageJson.dependencies || {}),
        ...Object.keys(packageJson.devDependencies || {})
      ];

      return dependencies;
    } catch (error) {
      console.warn('Could not read package.json:', error);
      return [];
    }
  }

  /**
   * Extract dependencies from file contents
   */
  private async extractDependenciesFromFiles(files: CodebaseFile[]): Promise<string[]> {
    const deps = new Set<string>();

    for (const file of files) {
      // Extract import statements
      const importMatches = file.content.match(/import .* from ['"]([^'"]+)['"]/g);
      if (importMatches) {
        importMatches.forEach(match => {
          const dep = match.match(/from ['"]([^'"]+)['"]/)?.[1];
          if (dep && !dep.startsWith('.') && !dep.startsWith('/')) {
            deps.add(dep.split('/')[0]); // Get package name
          }
        });
      }
    }

    return Array.from(deps);
  }

  /**
   * Analyze architecture patterns
   */
  private async analyzeArchitecture(files: CodebaseFile[]): Promise<any> {
    const structure = new Set<string>();
    const frameworks = new Set<string>();
    const archPatterns = new Set<string>();

    for (const file of files) {
      // Detect folder structure patterns
      const pathParts = file.path.split('/');
      if (pathParts.includes('components')) structure.add('components');
      if (pathParts.includes('hooks')) structure.add('hooks');
      if (pathParts.includes('services')) structure.add('services');
      if (pathParts.includes('utils')) structure.add('utils');
      if (pathParts.includes('stores')) structure.add('stores');
      if (pathParts.includes('pages')) structure.add('pages');

      // Detect frameworks
      if (file.content.includes('import React')) frameworks.add('React');
      if (file.content.includes('import Vue')) frameworks.add('Vue');
      if (file.content.includes('import { Component }')) frameworks.add('Angular');

      // Detect architectural patterns
      if (file.content.includes('useState') || file.content.includes('useReducer')) {
        archPatterns.add('hooks-pattern');
      }
      if (file.path.includes('store') || file.content.includes('createStore')) {
        archPatterns.add('state-management');
      }
    }

    return {
      framework: Array.from(frameworks)[0] || 'unknown',
      patterns: Array.from(archPatterns),
      structure: Array.from(structure)
    };
  }

  /**
   * Find related files based on patterns and queries
   */
  private async findRelatedFiles(
    appPath: string,
    patterns: string[],
    query?: string,
    excludeFiles: string[] = []
  ): Promise<CodebaseFile[]> {
    const allFiles = await this.getAllFiles(appPath);
    const relatedFiles: CodebaseFile[] = [];

    for (const file of allFiles) {
      if (excludeFiles.includes(file.path)) continue;

      let isRelevant = false;

      // Check patterns
      for (const pattern of patterns) {
        if (file.content.toLowerCase().includes(pattern.toLowerCase()) ||
            file.path.toLowerCase().includes(pattern.toLowerCase())) {
          isRelevant = true;
          break;
        }
      }

      // Check query
      if (query && !isRelevant) {
        const queryTerms = query.toLowerCase().split(/\s+/);
        const searchContent = (file.content + ' ' + file.path).toLowerCase();

        if (queryTerms.some(term => searchContent.includes(term))) {
          isRelevant = true;
        }
      }

      if (isRelevant) {
        relatedFiles.push(file);
      }
    }

    return relatedFiles;
  }

  /**
   * Get template files from scaffold directory
   */
  private async getTemplateFiles(templateId: string): Promise<CodebaseFile[]> {
    try {
      let scaffoldPath: string;

      if (templateId === "vite-react") {
        // Get scaffold path based on environment
        const { resourcesPath, appPath: electronAppPath, isPackaged } = await window.electronAPI.app.getPaths();

        if (isPackaged) {
          // Production: scaffold is in Resources folder
          scaffoldPath = await path.join(resourcesPath, "scaffold");
        } else {
          // Development: scaffold is in the project root
          scaffoldPath = await path.join(electronAppPath, "scaffold");
        }

        // Get all files from scaffold directory
        return await this.getAllFiles(scaffoldPath);
      } else {
        // For other templates, we would need to load from GitHub or cache
        console.warn(`Template analysis for ${templateId} not fully implemented`);

        // Try to get from cache
        const appDataPath = await window.electronAPI.app.getAppDataPath();
        const cachePath = await path.join(appDataPath, "templates-cache", templateId);

        if (await fs.pathExists(cachePath)) {
          return await this.getAllFiles(cachePath);
        }

        return [];
      }
    } catch (error) {
      console.error(`Failed to load template ${templateId}:`, error);
      return [];
    }
  }

  /**
   * Extract template dependencies from package.json
   */
  private async extractTemplateDependencies(templateId: string): Promise<string[]> {
    try {
      const templateFiles = await this.getTemplateFiles(templateId);
      const packageJsonFile = templateFiles.find(f => f.path === 'package.json');

      if (packageJsonFile) {
        const packageJson = JSON.parse(packageJsonFile.content);
        return [
          ...Object.keys(packageJson.dependencies || {}),
          ...Object.keys(packageJson.devDependencies || {})
        ];
      }

      return [];
    } catch (error) {
      console.error(`Failed to extract template dependencies for ${templateId}:`, error);
      return [];
    }
  }

  /**
   * Detect file language
   */
  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const langMap: Record<string, string> = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.vue': 'vue',
      '.py': 'python',
      '.css': 'css',
      '.scss': 'scss',
      '.html': 'html',
      '.json': 'json',
      '.md': 'markdown'
    };
    return langMap[ext] || 'text';
  }

  /**
   * Check if file should be ignored
   */
  private shouldIgnoreFile(fileName: string): boolean {
    const ignorePatterns = [
      'node_modules',
      '.git',
      '.DS_Store',
      'dist',
      'build',
      '.next',
      '.nuxt',
      'coverage',
      '.env',
      '.env.local',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml'
    ];

    return ignorePatterns.some(pattern => fileName.includes(pattern));
  }

  /**
   * Get current context
   */
  getCurrentContext(): ContextAnalysis | null {
    return this.currentContext;
  }

  /**
   * Clear all context
   */
  clearContext(): void {
    this.currentContext = null;
    this.contextCache.clear();
  }

  /**
   * Get context summary for system prompt
   */
  getContextSummary(): string {
    if (!this.currentContext) return '';

    const { files, patterns, dependencies, architecture } = this.currentContext;

    return `
## Current Codebase Context

**Files in Context:** ${files.length} files
**Architecture:** ${architecture.framework} with ${architecture.patterns.join(', ')} patterns
**Key Patterns:** ${patterns.join(', ')}
**Dependencies:** ${dependencies.slice(0, 10).join(', ')}${dependencies.length > 10 ? '...' : ''}
**Structure:** ${architecture.structure.join(', ')}

**Relevant Files:**
${files.slice(0, 10).map(f => `- ${f.path} (${f.language})`).join('\n')}
${files.length > 10 ? `... and ${files.length - 10} more files` : ''}
`;
  }
}

export const codebaseContextService = CodebaseContextService.getInstance();