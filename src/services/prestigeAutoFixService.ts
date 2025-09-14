import useAppStore from '@/stores/appStore';
import { showSuccess, showError, showInfo } from '@/utils/toast';
import { resolveAppPaths } from '@/utils/appPathResolver';
import AppStateManager from '@/services/appStateManager';

// Use Electron APIs instead of Node.js imports
const { fs: electronFS, path: electronPath, spawn } = window.electronAPI;
const { writeFile, ensureFile, readFile } = electronFS;

// Helper function to execute commands using Electron API
const execAsync = async (command: string, options: { cwd: string; timeout?: number }) => {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const [cmd, ...args] = command.split(' ');
    const child = spawn(cmd, args, {
      cwd: options.cwd,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    const timer = options.timeout ? setTimeout(() => {
      child.kill();
      reject(new Error('Command timeout'));
    }, options.timeout) : null;

    child.on('close', (code) => {
      if (timer) clearTimeout(timer);
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr}`));
      }
    });

    child.on('error', (error) => {
      if (timer) clearTimeout(timer);
      reject(error);
    });
  });
};

export interface PrestigeProblem {
  file: string;
  line: number;
  column: number;
  message: string;
  code: number | string;
  severity: 'error' | 'warning' | 'info';
  snippet?: string;
}

export interface PrestigeProblemReport {
  problems: PrestigeProblem[];
  totalErrors: number;
  totalWarnings: number;
  totalInfos: number;
  appPath: string;
  timestamp: number;
}

export interface PrestigeAutoFixResult {
  success: boolean;
  fixedProblems: PrestigeProblem[];
  remainingProblems: PrestigeProblem[];
  attempts: number;
  error?: string;
  changes: Array<{
    type: 'write' | 'delete' | 'rename' | 'add-dependency';
    path?: string;
    content?: string;
    packages?: string[];
    from?: string;
    to?: string;
  }>;
}

/**
 * Enhanced Auto-Fix Service for Prestige AI
 * Inspired by dyad's sophisticated error handling with 2-retry system
 */
export class PrestigeAutoFixService {
  private static instance: PrestigeAutoFixService;
  private maxAttempts = 2; // Like dyad's system
  private isRunning = false;
  private abortControllers: Map<string, AbortController> = new Map();

  static getInstance(): PrestigeAutoFixService {
    if (!PrestigeAutoFixService.instance) {
      PrestigeAutoFixService.instance = new PrestigeAutoFixService();
    }
    return PrestigeAutoFixService.instance;
  }

  /**
   * Generate comprehensive problem report (TypeScript + Vite + ESLint)
   * Similar to dyad's generateProblemReport
   */
  async generateProblemReport(appPath: string): Promise<PrestigeProblemReport> {
    const problems: PrestigeProblem[] = [];

    try {
      // 1. TypeScript compilation check
      const tscProblems = await this.runTypeScriptCheck(appPath);
      problems.push(...tscProblems);

      // 2. Build/Import resolution check (similar to Vite)
      const buildProblems = await this.runBuildCheck(appPath);
      problems.push(...buildProblems);

      // 3. ESLint check (if available)
      try {
        const eslintProblems = await this.runESLintCheck(appPath);
        problems.push(...eslintProblems);
      } catch (error) {
        console.log("ESLint not available, skipping...");
      }

      // Remove duplicates
      const uniqueProblems = this.deduplicateProblems(problems);

      // Add code snippets
      const problemsWithSnippets = await this.addCodeSnippets(uniqueProblems, appPath);

      const totalErrors = problemsWithSnippets.filter(p => p.severity === 'error').length;
      const totalWarnings = problemsWithSnippets.filter(p => p.severity === 'warning').length;
      const totalInfos = problemsWithSnippets.filter(p => p.severity === 'info').length;

      return {
        problems: problemsWithSnippets,
        totalErrors,
        totalWarnings,
        totalInfos,
        appPath,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("Failed to generate problem report:", error);
      throw error;
    }
  }

  /**
   * Auto-fix problems with 2-retry system like dyad
   */
  async attemptAutoFix(
    initialResponse: string,
    appPath: string,
    aiFixFunction: (prompt: string, response: string) => Promise<string>,
    onProgress?: (attempt: number, problems: PrestigeProblem[]) => void
  ): Promise<PrestigeAutoFixResult> {
    const fixId = `fix_${Date.now()}`;

    if (this.isRunning) {
      throw new Error("Auto-fix is already running");
    }

    this.isRunning = true;
    const abortController = new AbortController();
    this.abortControllers.set(fixId, abortController);

    try {
      const changes: PrestigeAutoFixResult['changes'] = [];
      const fixedProblems: PrestigeProblem[] = [];
      let attempts = 0;
      let currentResponse = initialResponse;

      // Check if there are dependencies to install first (like dyad does)
      const hasPendingDependencies = this.hasPendingDependencies(initialResponse);

      if (hasPendingDependencies) {
        console.log("Dependencies pending installation, skipping auto-fix for now");
        return {
          success: false,
          fixedProblems: [],
          remainingProblems: [],
          attempts: 0,
          changes: [],
          error: "Dependencies need to be installed first"
        };
      }

      // Initial problem report
      let problemReport = await this.generateProblemReport(appPath);

      while (
        attempts < this.maxAttempts &&
        problemReport.totalErrors > 0 &&
        !abortController.signal.aborted
      ) {
        attempts++;
        console.log(`🔧 Auto-fix attempt ${attempts}/${this.maxAttempts}`);

        if (onProgress) {
          onProgress(attempts, problemReport.problems);
        }

        // Create fix prompt similar to dyad's createProblemFixPrompt
        const fixPrompt = this.createProblemFixPrompt(problemReport);

        try {
          // Get AI fix response
          const aiResponse = await aiFixFunction(fixPrompt, currentResponse);
          currentResponse = aiResponse;

          // Parse and apply changes
          const responseChanges = this.parsePrestigeTagsForFixes(aiResponse);
          changes.push(...responseChanges);

          // Apply the changes (write files, install dependencies, etc.)
          await this.applyChanges(responseChanges, appPath);

          // Re-run problem detection to see if we improved
          const updatedReport = await this.generateProblemReport(appPath);

          // Calculate improvements
          const beforeErrors = problemReport.totalErrors;
          const afterErrors = updatedReport.totalErrors;

          if (afterErrors < beforeErrors) {
            // Some problems were fixed
            const newlyFixed = problemReport.problems.filter(oldProblem =>
              !updatedReport.problems.some(newProblem =>
                this.isSameProblem(oldProblem, newProblem)
              )
            );
            fixedProblems.push(...newlyFixed);
            showSuccess(`🎉 Fixed ${newlyFixed.length} problem${newlyFixed.length !== 1 ? 's' : ''} in attempt ${attempts}`);
          }

          problemReport = updatedReport;

          // If no errors remain, we're done
          if (afterErrors === 0) {
            break;
          }

          // If no improvement, stop trying (like dyad does)
          if (afterErrors >= beforeErrors) {
            console.log("❌ No improvement in auto-fix, stopping attempts");
            showInfo("Auto-fix couldn't improve the errors further");
            break;
          }

        } catch (error) {
          console.error(`❌ Auto-fix attempt ${attempts} failed:`, error);
          showError(`Auto-fix attempt ${attempts} failed: ${error instanceof Error ? error.message : String(error)}`);
          break;
        }
      }

      const isSuccess = problemReport.totalErrors === 0;

      if (isSuccess) {
        showSuccess(`✅ Auto-fix completed successfully after ${attempts} attempt${attempts !== 1 ? 's' : ''}`);
      } else {
        showInfo(`⚠️ Auto-fix completed with ${problemReport.totalErrors} error${problemReport.totalErrors !== 1 ? 's' : ''} remaining`);
      }

      return {
        success: isSuccess,
        fixedProblems,
        remainingProblems: problemReport.problems,
        attempts,
        changes,
      };

    } finally {
      this.isRunning = false;
      this.abortControllers.delete(fixId);
    }
  }

  /**
   * Run TypeScript compiler check
   */
  private async runTypeScriptCheck(appPath: string): Promise<PrestigeProblem[]> {
    try {
      const { stdout, stderr } = await execAsync('npx tsc --noEmit --pretty false', {
        cwd: appPath,
        timeout: 30000 // 30 second timeout
      });

      return this.parseTypeScriptOutput(stdout + stderr, appPath);
    } catch (error: any) {
      // TypeScript exits with code 1 when there are errors, which is expected
      const output = error.stdout || error.stderr || '';
      return this.parseTypeScriptOutput(output, appPath);
    }
  }

  /**
   * Run build check to detect import/resolution issues
   */
  private async runBuildCheck(appPath: string): Promise<PrestigeProblem[]> {
    try {
      // Try to run a quick build check
      const { stdout, stderr } = await execAsync('npm run build --if-present', {
        cwd: appPath,
        timeout: 60000 // 1 minute timeout
      });

      return this.parseBuildOutput(stderr, appPath);
    } catch (error: any) {
      const output = error.stdout || error.stderr || '';
      return this.parseBuildOutput(output, appPath);
    }
  }

  /**
   * Run ESLint check
   */
  private async runESLintCheck(appPath: string): Promise<PrestigeProblem[]> {
    try {
      const { stdout } = await execAsync('npx eslint . --format json --ext .ts,.tsx,.js,.jsx', {
        cwd: appPath,
        timeout: 30000
      });

      return this.parseESLintOutput(stdout, appPath);
    } catch (error: any) {
      if (error.stdout) {
        return this.parseESLintOutput(error.stdout, appPath);
      }
      throw error;
    }
  }

  /**
   * Parse TypeScript compiler output
   */
  private parseTypeScriptOutput(output: string, appPath: string): PrestigeProblem[] {
    const problems: PrestigeProblem[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      // TypeScript error format: path/to/file.ts(line,col): error TS#### message
      const match = line.match(/^(.+?)\((\d+),(\d+)\):\s+(error|warning|info)\s+TS(\d+):\s+(.+)$/);

      if (match) {
        const [, filePath, lineStr, colStr, severity, codeStr, message] = match;

        problems.push({
          file: electronPath.relative(appPath, electronPath.resolve(appPath, filePath)),
          line: parseInt(lineStr, 10),
          column: parseInt(colStr, 10),
          message: message.trim(),
          code: parseInt(codeStr, 10),
          severity: severity as 'error' | 'warning' | 'info',
        });
      }
    }

    return problems;
  }

  /**
   * Parse build output for import/resolution errors
   */
  private parseBuildOutput(output: string, appPath: string): PrestigeProblem[] {
    const problems: PrestigeProblem[] = [];

    // Parse Vite import resolution errors (like the uuid example)
    const importErrorRegex = /Failed to resolve import "([^"]+)" from "([^"]+)"/g;
    let match;

    while ((match = importErrorRegex.exec(output)) !== null) {
      const [, importName, fileName] = match;

      // Try to extract line/column info if available
      const fileLocationMatch = output.match(new RegExp(`${fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:(\\d+):(\\d+)`));
      const line = fileLocationMatch ? parseInt(fileLocationMatch[1]) : 1;
      const column = fileLocationMatch ? parseInt(fileLocationMatch[2]) : 1;

      problems.push({
        file: electronPath.relative(appPath, fileName),
        line,
        column,
        message: `Failed to resolve import "${importName}". Package may not be installed.`,
        code: 'MODULE_NOT_FOUND',
        severity: 'error',
      });
    }

    return problems;
  }

  /**
   * Parse ESLint JSON output
   */
  private parseESLintOutput(output: string, appPath: string): PrestigeProblem[] {
    const problems: PrestigeProblem[] = [];

    try {
      const results = JSON.parse(output);

      for (const result of results) {
        for (const message of result.messages) {
          const severity = message.severity === 2 ? 'error' : message.severity === 1 ? 'warning' : 'info';

          problems.push({
            file: electronPath.relative(appPath, result.filePath),
            line: message.line,
            column: message.column,
            message: `${message.message} (${message.ruleId || 'eslint'})`,
            code: message.ruleId || 'eslint',
            severity,
          });
        }
      }
    } catch (error) {
      console.error("Failed to parse ESLint output:", error);
    }

    return problems;
  }

  /**
   * Create problem fix prompt (like dyad's createProblemFixPrompt)
   */
  private createProblemFixPrompt(problemReport: PrestigeProblemReport): string {
    const { problems } = problemReport;

    if (problems.length === 0) {
      return "No problems detected.";
    }

    // Focus on errors first, prioritize import/dependency issues
    const errors = problems.filter(p => p.severity === 'error');
    const importErrors = errors.filter(p =>
      p.message.includes('Failed to resolve import') ||
      p.message.includes('Cannot find module') ||
      p.code === 'MODULE_NOT_FOUND'
    );

    const otherErrors = errors.filter(p => !importErrors.includes(p));
    const warnings = problems.filter(p => p.severity === 'warning');

    // Show import errors first, then other errors, then warnings
    const problemsToShow = [...importErrors, ...otherErrors.slice(0, 5), ...warnings.slice(0, 3)].slice(0, 10);

    const totalProblems = problemsToShow.length;
    let prompt = `Fix these ${totalProblems} TypeScript/build error${totalProblems === 1 ? '' : 's'}:\n\n`;

    problemsToShow.forEach((problem, index) => {
      const codeInfo = typeof problem.code === 'number' ? `TS${problem.code}` : problem.code;
      prompt += `${index + 1}. ${problem.file}:${problem.line}:${problem.column} - ${problem.message}${codeInfo ? ` (${codeInfo})` : ''}\n`;

      if (problem.snippet) {
        prompt += `\`\`\`\n${problem.snippet}\n\`\`\`\n`;
      }
      prompt += '\n';
    });

    if (problems.length > problemsToShow.length) {
      prompt += `... and ${problems.length - problemsToShow.length} more problem${problems.length - problemsToShow.length !== 1 ? 's' : ''}.\n\n`;
    }

    // Add specific instructions like dyad's system prompt
    prompt += `Please fix all errors in a concise way. Important instructions:

- If you see import resolution errors like "Failed to resolve import", use <prestige-add-dependency packages="package-name"> to install the missing package
- If you need to create files that are missing, use <prestige-write> tags
- Only make changes necessary to fix these specific errors
- Use proper TypeScript/JavaScript syntax and follow best practices
- Do not leave any import unresolved`;

    return prompt;
  }

  /**
   * Check if response has pending dependencies (like dyad does)
   */
  private hasPendingDependencies(response: string): boolean {
    const dependencyRegex = /<prestige-add-dependency[^>]*>/g;
    return dependencyRegex.test(response);
  }

  /**
   * Parse Prestige tags from AI response for fixes
   */
  private parsePrestigeTagsForFixes(response: string): PrestigeAutoFixResult['changes'] {
    const changes: PrestigeAutoFixResult['changes'] = [];

    // Parse prestige-write tags
    const writeRegex = /<prestige-write path="([^"]+)"[^>]*>([\s\S]*?)<\/prestige-write>/g;
    let match;

    while ((match = writeRegex.exec(response)) !== null) {
      const [, filePath, content] = match;
      changes.push({
        type: 'write',
        path: filePath,
        content: content.trim(),
      });
    }

    // Parse prestige-add-dependency tags
    const depRegex = /<prestige-add-dependency packages="([^"]+)"[^>]*>/g;
    while ((match = depRegex.exec(response)) !== null) {
      const [, packagesStr] = match;
      const packages = packagesStr.split(/[\s,]+/).filter(p => p.trim());
      changes.push({
        type: 'add-dependency',
        packages,
      });
    }

    return changes;
  }

  /**
   * Apply changes from auto-fix
   */
  private async applyChanges(changes: PrestigeAutoFixResult['changes'], appPath: string): Promise<void> {
    const { currentApp } = useAppStore.getState();
    if (!currentApp) return;

    const { filesPath } = await resolveAppPaths(currentApp);
    const appStateManager = AppStateManager.getInstance();

    for (const change of changes) {
      try {
        switch (change.type) {
          case 'write':
            if (change.path && change.content !== undefined) {
              const fullPath = electronPath.join(filesPath, change.path);
              await ensureFile(fullPath);
              await writeFile(fullPath, change.content);

              // Update virtual filesystem
              try {
                const vfs = await appStateManager.getVirtualFileSystem(currentApp);
                await velectronFS.writeFile(change.path, change.content);
              } catch (vfsError) {
                console.warn(`VFS update failed for ${change.path}:`, vfsError);
              }

              console.log(`✅ Auto-fix wrote file: ${change.path}`);
            }
            break;

          case 'add-dependency':
            if (change.packages && change.packages.length > 0) {
              await this.installDependencies(change.packages, filesPath);
            }
            break;
        }
      } catch (error) {
        console.error(`❌ Failed to apply change ${change.type}:`, error);
        throw error;
      }
    }
  }

  /**
   * Install dependencies with fallback (like dyad's executeAddDependency)
   */
  private async installDependencies(packages: string[], appPath: string): Promise<void> {
    const packageStr = packages.join(' ');

    try {
      // Try pnpm first, fallback to npm (like dyad)
      const { stdout, stderr } = await execAsync(
        `(pnpm add ${packageStr}) || (npm install --legacy-peer-deps ${packageStr})`,
        { cwd: appPath, timeout: 120000 } // 2 minute timeout
      );

      console.log(`✅ Installed dependencies: ${packageStr}`);
      console.log(stdout);
      if (stderr) console.warn(stderr);

      showSuccess(`📦 Installed: ${packages.join(', ')}`);
    } catch (error) {
      console.error(`❌ Failed to install dependencies: ${packageStr}`, error);
      throw new Error(`Failed to install ${packageStr}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Helper methods
   */
  private deduplicateProblems(problems: PrestigeProblem[]): PrestigeProblem[] {
    const seen = new Set<string>();
    return problems.filter(problem => {
      const key = `${problem.file}:${problem.line}:${problem.column}:${problem.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private async addCodeSnippets(problems: PrestigeProblem[], appPath: string): Promise<PrestigeProblem[]> {
    return Promise.all(
      problems.map(async (problem) => {
        try {
          const filePath = electronPath.resolve(appPath, problem.file);
          const fileContent = await electronFS.readFile(filePath, 'utf8');
          const lines = fileContent.split('\n');

          const startLine = Math.max(0, problem.line - 3);
          const endLine = Math.min(lines.length - 1, problem.line + 1);

          const snippetLines = lines.slice(startLine, endLine + 1);
          const snippet = snippetLines
            .map((line, index) => {
              const lineNumber = startLine + index + 1;
              const prefix = lineNumber === problem.line ? '>>> ' : '    ';
              return `${prefix}${lineNumber.toString().padStart(3)}: ${line}`;
            })
            .join('\n');

          return { ...problem, snippet };
        } catch (error) {
          return problem;
        }
      })
    );
  }

  private isSameProblem(problem1: PrestigeProblem, problem2: PrestigeProblem): boolean {
    return problem1.file === problem2.file &&
           problem1.line === problem2.line &&
           problem1.column === problem2.column &&
           problem1.message === problem2.message;
  }

  /**
   * Public API methods
   */
  isAutoFixRunning(): boolean {
    return this.isRunning;
  }

  cancelAutoFix(fixId?: string): void {
    if (fixId && this.abortControllers.has(fixId)) {
      this.abortControllers.get(fixId)?.abort();
      this.abortControllers.delete(fixId);
    } else {
      // Cancel all
      this.abortControllers.forEach(controller => controller.abort());
      this.abortControllers.clear();
    }
    this.isRunning = false;
  }

  setMaxAttempts(attempts: number): void {
    this.maxAttempts = Math.max(1, Math.min(5, attempts));
  }
}

export const prestigeAutoFixService = PrestigeAutoFixService.getInstance();