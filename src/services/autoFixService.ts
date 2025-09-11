import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';

// Problem schemas
export interface Problem {
  file: string;
  line: number;
  column: number;
  message: string;
  code: number;
  severity: 'error' | 'warning' | 'info';
  snippet?: string;
}

export interface ProblemReport {
  problems: Problem[];
  totalErrors: number;
  totalWarnings: number;
  totalInfos: number;
  appPath: string;
  timestamp: number;
}

export interface AutoFixResult {
  success: boolean;
  fixedProblems: Problem[];
  remainingProblems: Problem[];
  changes: Array<{
    file: string;
    action: 'write' | 'delete' | 'rename';
    oldPath?: string;
    newPath?: string;
    content?: string;
  }>;
  error?: string;
}

export class AutoFixService {
  private static instance: AutoFixService;
  private maxAttempts = 2;
  private isRunning = false;

  static getInstance(): AutoFixService {
    if (!AutoFixService.instance) {
      AutoFixService.instance = new AutoFixService();
    }
    return AutoFixService.instance;
  }

  /**
   * Generate a problem report for a TypeScript project
   */
  async generateProblemReport(appPath: string): Promise<ProblemReport> {
    const problems: Problem[] = [];
    
    try {
      // Run TypeScript compiler to get diagnostics
      const tscOutput = await this.runTypeScriptCheck(appPath);
      const parsedProblems = this.parseTscOutput(tscOutput, appPath);
      problems.push(...parsedProblems);

      // Run ESLint if available
      try {
        const eslintOutput = await this.runEslintCheck(appPath);
        const eslintProblems = this.parseEslintOutput(eslintOutput, appPath);
        problems.push(...eslintProblems);
      } catch (error) {
        console.log("ESLint not available or failed, skipping...");
      }

      // Categorize problems
      const totalErrors = problems.filter(p => p.severity === 'error').length;
      const totalWarnings = problems.filter(p => p.severity === 'warning').length;
      const totalInfos = problems.filter(p => p.severity === 'info').length;

      return {
        problems,
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
   * Run TypeScript compiler to check for errors
   */
  private async runTypeScriptCheck(appPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const tscCommand = 'npx';
      const args = ['tsc', '--noEmit', '--pretty', 'false'];
      
      const tsc = spawn(tscCommand, args, {
        cwd: appPath,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      tsc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      tsc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      tsc.on('close', (code) => {
        // TypeScript exits with code 1 when there are errors, which is expected
        resolve(stdout + stderr);
      });

      tsc.on('error', (error) => {
        reject(new Error(`Failed to run TypeScript: ${error.message}`));
      });
    });
  }

  /**
   * Run ESLint to check for linting errors
   */
  private async runEslintCheck(appPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const eslintCommand = 'npx';
      const args = ['eslint', '.', '--format', 'json', '--ext', '.ts,.tsx,.js,.jsx'];
      
      const eslint = spawn(eslintCommand, args, {
        cwd: appPath,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      eslint.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      eslint.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      eslint.on('close', (code) => {
        if (stderr && !stdout) {
          reject(new Error(stderr));
        } else {
          resolve(stdout);
        }
      });

      eslint.on('error', (error) => {
        reject(new Error(`Failed to run ESLint: ${error.message}`));
      });
    });
  }

  /**
   * Parse TypeScript compiler output
   */
  private parseTscOutput(output: string, appPath: string): Problem[] {
    const problems: Problem[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      // TypeScript error format: path/to/file.ts(line,col): error TS#### message
      const match = line.match(/^(.+?)\((\d+),(\d+)\):\s+(error|warning|info)\s+TS(\d+):\s+(.+)$/);
      
      if (match) {
        const [, filePath, lineStr, colStr, severity, codeStr, message] = match;
        const fullPath = path.resolve(appPath, filePath);
        
        problems.push({
          file: path.relative(appPath, fullPath),
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
   * Parse ESLint JSON output
   */
  private parseEslintOutput(output: string, appPath: string): Problem[] {
    const problems: Problem[] = [];
    
    try {
      const results = JSON.parse(output);
      
      for (const result of results) {
        for (const message of result.messages) {
          const severity = message.severity === 2 ? 'error' : message.severity === 1 ? 'warning' : 'info';
          
          problems.push({
            file: path.relative(appPath, result.filePath),
            line: message.line,
            column: message.column,
            message: `${message.message} (${message.ruleId || 'eslint'})`,
            code: 0, // ESLint doesn't use numeric codes like TypeScript
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
   * Add code snippets to problems
   */
  async addCodeSnippets(problemReport: ProblemReport): Promise<ProblemReport> {
    const problemsWithSnippets = await Promise.all(
      problemReport.problems.map(async (problem) => {
        try {
          const filePath = path.resolve(problemReport.appPath, problem.file);
          const fileContent = await fs.readFile(filePath, 'utf8');
          const lines = fileContent.split('\n');
          
          // Get context around the problem line (3 lines before and after)
          const startLine = Math.max(0, problem.line - 4);
          const endLine = Math.min(lines.length - 1, problem.line + 2);
          
          const snippetLines = lines.slice(startLine, endLine + 1);
          const snippet = snippetLines
            .map((line, index) => {
              const lineNumber = startLine + index + 1;
              const prefix = lineNumber === problem.line ? '>>> ' : '    ';
              return `${prefix}${lineNumber.toString().padStart(3)}: ${line}`;
            })
            .join('\n');

          return {
            ...problem,
            snippet,
          };
        } catch (error) {
          console.error(`Failed to get snippet for ${problem.file}:`, error);
          return problem;
        }
      })
    );

    return {
      ...problemReport,
      problems: problemsWithSnippets,
    };
  }

  /**
   * Create a concise problem fix prompt for AI
   */
  createProblemFixPrompt(problemReport: ProblemReport): string {
    const { problems } = problemReport;

    if (problems.length === 0) {
      return "No problems detected.";
    }

    // Focus on errors first, then warnings
    const errors = problems.filter(p => p.severity === 'error');
    const warnings = problems.filter(p => p.severity === 'warning');
    
    const problemsToShow = errors.length > 0 ? errors.slice(0, 10) : warnings.slice(0, 10);
    
    const totalProblems = problemsToShow.length;
    let prompt = `Fix these ${totalProblems} ${errors.length > 0 ? 'TypeScript/JavaScript' : 'linting'} error${totalProblems === 1 ? '' : 's'}:\n\n`;

    problemsToShow.forEach((problem, index) => {
      prompt += `${index + 1}. ${problem.file}:${problem.line}:${problem.column} - ${problem.message}\n`;
      if (problem.snippet) {
        prompt += `\`\`\`\n${problem.snippet}\n\`\`\`\n`;
      }
      prompt += '\n';
    });

    if (problems.length > problemsToShow.length) {
      prompt += `... and ${problems.length - problemsToShow.length} more problems.\n\n`;
    }

    prompt += 'Please fix all errors in a concise way. Use proper TypeScript/JavaScript syntax and follow best practices.';

    return prompt;
  }

  /**
   * Attempt to automatically fix problems using AI
   */
  async attemptAutoFix(
    problemReport: ProblemReport,
    aiFixFunction: (prompt: string) => Promise<string>
  ): Promise<AutoFixResult> {
    if (this.isRunning) {
      throw new Error("Auto-fix is already running");
    }

    this.isRunning = true;
    
    try {
      const fixedProblems: Problem[] = [];
      const changes: AutoFixResult['changes'] = [];
      let remainingProblems = [...problemReport.problems];
      let attempts = 0;

      while (attempts < this.maxAttempts && remainingProblems.filter(p => p.severity === 'error').length > 0) {
        attempts++;
        console.log(`Auto-fix attempt ${attempts}/${this.maxAttempts}`);

        // Create problem report for current issues
        const currentReport: ProblemReport = {
          ...problemReport,
          problems: remainingProblems,
        };

        const fixPrompt = this.createProblemFixPrompt(currentReport);
        
        try {
          // Get AI fix response
          const aiResponse = await aiFixFunction(fixPrompt);
          
          // Parse AI response for file changes
          const responseChanges = this.parseAiResponse(aiResponse, problemReport.appPath);
          changes.push(...responseChanges);
          
          // Apply changes
          await this.applyChanges(responseChanges);
          
          // Re-run problem detection
          const updatedReport = await this.generateProblemReport(problemReport.appPath);
          
          // Calculate fixed problems
          const beforeErrors = remainingProblems.filter(p => p.severity === 'error').length;
          const afterErrors = updatedReport.problems.filter(p => p.severity === 'error').length;
          
          if (afterErrors < beforeErrors) {
            // Some problems were fixed
            const newlyFixed = remainingProblems.filter(oldProblem => 
              !updatedReport.problems.some(newProblem => 
                newProblem.file === oldProblem.file && 
                newProblem.line === oldProblem.line && 
                newProblem.column === oldProblem.column
              )
            );
            fixedProblems.push(...newlyFixed);
          }
          
          remainingProblems = updatedReport.problems;
          
          // If no errors remain, we're done
          if (afterErrors === 0) {
            break;
          }
          
          // If no improvement, stop trying
          if (afterErrors >= beforeErrors) {
            console.log("No improvement in auto-fix, stopping attempts");
            break;
          }
          
        } catch (error) {
          console.error(`Auto-fix attempt ${attempts} failed:`, error);
          break;
        }
      }

      return {
        success: remainingProblems.filter(p => p.severity === 'error').length === 0,
        fixedProblems,
        remainingProblems,
        changes,
      };
      
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Parse AI response for file changes
   */
  private parseAiResponse(response: string, appPath: string): AutoFixResult['changes'] {
    const changes: AutoFixResult['changes'] = [];
    
    // Look for file write patterns
    const writeRegex = /<DYAD_WRITE path="([^"]+)">([\s\S]*?)<\/DYAD_WRITE>/g;
    let match;
    
    while ((match = writeRegex.exec(response)) !== null) {
      const [, filePath, content] = match;
      changes.push({
        file: filePath,
        action: 'write',
        content: content.trim(),
      });
    }
    
    // Look for file delete patterns
    const deleteRegex = /<DYAD_DELETE path="([^"]+)">/g;
    while ((match = deleteRegex.exec(response)) !== null) {
      const [, filePath] = match;
      changes.push({
        file: filePath,
        action: 'delete',
      });
    }
    
    // Look for file rename patterns
    const renameRegex = /<DYAD_RENAME from="([^"]+)" to="([^"]+)">/g;
    while ((match = renameRegex.exec(response)) !== null) {
      const [, oldPath, newPath] = match;
      changes.push({
        file: newPath,
        action: 'rename',
        oldPath,
        newPath,
      });
    }
    
    return changes;
  }

  /**
   * Apply file changes
   */
  private async applyChanges(changes: AutoFixResult['changes']): Promise<void> {
    for (const change of changes) {
      try {
        switch (change.action) {
          case 'write':
            if (change.content !== undefined) {
              const fullPath = path.resolve(change.file);
              await fs.mkdir(path.dirname(fullPath), { recursive: true });
              await fs.writeFile(fullPath, change.content, 'utf8');
              console.log(`Wrote file: ${change.file}`);
            }
            break;
            
          case 'delete':
            const deletePath = path.resolve(change.file);
            try {
              await fs.unlink(deletePath);
              console.log(`Deleted file: ${change.file}`);
            } catch (error) {
              // File might not exist, that's ok
            }
            break;
            
          case 'rename':
            if (change.oldPath && change.newPath) {
              const oldFullPath = path.resolve(change.oldPath);
              const newFullPath = path.resolve(change.newPath);
              await fs.mkdir(path.dirname(newFullPath), { recursive: true });
              await fs.rename(oldFullPath, newFullPath);
              console.log(`Renamed file: ${change.oldPath} -> ${change.newPath}`);
            }
            break;
        }
      } catch (error) {
        console.error(`Failed to apply change ${change.action} for ${change.file}:`, error);
        throw error;
      }
    }
  }

  /**
   * Check if auto-fix is currently running
   */
  isAutoFixRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Set maximum auto-fix attempts
   */
  setMaxAttempts(attempts: number) {
    this.maxAttempts = Math.max(1, Math.min(5, attempts));
  }
}

export const autoFixService = AutoFixService.getInstance();