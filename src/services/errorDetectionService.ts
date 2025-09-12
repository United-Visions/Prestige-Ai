import { AppError, AppOutput } from '@/types/appTypes';

export interface BuildError {
  file: string;
  line: number;
  column: number;
  message: string;
  code?: string;
}

export interface ErrorReport {
  buildErrors: BuildError[];
  runtimeErrors: AppError[];
  hasErrors: boolean;
}

export class ErrorDetectionService {
  private static instance: ErrorDetectionService;
  private errorCallbacks: Map<number, (errors: ErrorReport) => void> = new Map();

  private constructor() {}

  public static getInstance(): ErrorDetectionService {
    if (!ErrorDetectionService.instance) {
      ErrorDetectionService.instance = new ErrorDetectionService();
    }
    return ErrorDetectionService.instance;
  }

  // Register a callback to receive error reports for an app
  registerErrorCallback(appId: number, callback: (errors: ErrorReport) => void) {
    this.errorCallbacks.set(appId, callback);
  }

  // Unregister error callback for an app
  unregisterErrorCallback(appId: number) {
    this.errorCallbacks.delete(appId);
  }

  // Parse build errors from app output
  parseBuildErrors(outputs: AppOutput[]): BuildError[] {
    const buildErrors: BuildError[] = [];
    
    for (const output of outputs) {
      if (output.type === 'stderr') {
        // Parse TypeScript errors
        const tsErrorRegex = /([^:\s]+):(\d+):(\d+)\s*-\s*error\s*TS(\d+):\s*(.+)/g;
        let match;
        while ((match = tsErrorRegex.exec(output.message)) !== null) {
          buildErrors.push({
            file: match[1],
            line: parseInt(match[2]),
            column: parseInt(match[3]),
            code: match[4],
            message: match[5].trim()
          });
        }

        // Parse Vite build errors
        const viteErrorRegex = /([^:\s]+):(\d+):(\d+):\s*(.+)/g;
        while ((match = viteErrorRegex.exec(output.message)) !== null) {
          // Avoid duplicates with TS errors
          if (!output.message.includes('TS' + match[4])) {
            buildErrors.push({
              file: match[1],
              line: parseInt(match[2]),
              column: parseInt(match[3]),
              message: match[4].trim()
            });
          }
        }

        // Parse ESLint errors
        const eslintErrorRegex = /([^:\s]+)\s+(\d+):(\d+)\s+error\s+(.+)/g;
        while ((match = eslintErrorRegex.exec(output.message)) !== null) {
          buildErrors.push({
            file: match[1],
            line: parseInt(match[2]),
            column: parseInt(match[3]),
            message: match[4].trim()
          });
        }

        // Parse Vite import/resolve errors
        const viteImportErrorRegex = /Failed to resolve import "([^"]+)" from "([^"]+)"/g;
        while ((match = viteImportErrorRegex.exec(output.message)) !== null) {
          const importName = match[1];
          const fileName = match[2];
          
          // Look for file location info
          const fileLocationMatch = output.message.match(new RegExp(`File: [^:]+${fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:(\\d+):(\\d+)`));
          const line = fileLocationMatch ? parseInt(fileLocationMatch[1]) : 1;
          const column = fileLocationMatch ? parseInt(fileLocationMatch[2]) : 1;
          
          buildErrors.push({
            file: fileName,
            line,
            column,
            message: `Failed to resolve import "${importName}". Package may not be installed.`
          });
        }

        // Parse general Vite build errors with file locations
        const viteGeneralErrorRegex = /File: ([^:]+):(\d+):(\d+)/g;
        while ((match = viteGeneralErrorRegex.exec(output.message)) !== null) {
          // Extract error message from the output
          const lines = output.message.split('\n');
          let errorMessage = 'Build error';
          for (const line of lines) {
            if (line.includes('error') && !line.includes('File:') && !line.includes('Plugin:')) {
              errorMessage = line.replace(/^\s*\d+\s*\|\s*/, '').trim();
              break;
            }
          }
          
          // Check if we already added this error from import parsing
          const isDuplicate = buildErrors.some(existing => 
            existing.file === match[1] && existing.line === parseInt(match[2]) && existing.column === parseInt(match[3])
          );
          
          if (!isDuplicate) {
            buildErrors.push({
              file: match[1],
              line: parseInt(match[2]),
              column: parseInt(match[3]),
              message: errorMessage
            });
          }
        }
      }
    }

    return buildErrors;
  }

  // Create an error report from outputs and runtime errors
  createErrorReport(outputs: AppOutput[], runtimeErrors: AppError[]): ErrorReport {
    const buildErrors = this.parseBuildErrors(outputs);
    
    return {
      buildErrors,
      runtimeErrors,
      hasErrors: buildErrors.length > 0 || runtimeErrors.length > 0
    };
  }

  // Generate a fix prompt for errors (similar to CCdyad's problem_prompt.ts)
  generateErrorFixPrompt(errorReport: ErrorReport): string {
    const { buildErrors, runtimeErrors } = errorReport;
    
    if (!errorReport.hasErrors) {
      return "No errors detected.";
    }

    let prompt = '';

    if (buildErrors.length > 0) {
      const totalBuildErrors = buildErrors.length;
      prompt += `Fix these ${totalBuildErrors} build error${totalBuildErrors === 1 ? '' : 's'}:\n\n`;
      
      buildErrors.forEach((error, index) => {
        prompt += `${index + 1}. ${error.file}:${error.line}:${error.column} - ${error.message}${error.code ? ` (TS${error.code})` : ''}\n`;
      });
      prompt += '\n';
    }

    if (runtimeErrors.length > 0) {
      const totalRuntimeErrors = runtimeErrors.length;
      prompt += `Fix these ${totalRuntimeErrors} runtime error${totalRuntimeErrors === 1 ? '' : 's'}:\n\n`;
      
      runtimeErrors.forEach((error, index) => {
        const errorMessage = error.payload?.message || 'Unknown error';
        const stack = error.payload?.stack || '';
        prompt += `${index + 1}. Runtime Error: ${errorMessage}\n`;
        if (stack) {
          // Only include first few lines of stack trace
          const stackLines = stack.split('\n').slice(0, 3);
          prompt += `   Stack: ${stackLines.join(' -> ')}\n`;
        }
      });
      prompt += '\n';
    }

    prompt += "Please fix all errors in a concise way. Make only the necessary changes to resolve these specific errors.";

    return prompt;
  }

  // Send error report to registered callback
  reportErrors(appId: number, errorReport: ErrorReport) {
    const callback = this.errorCallbacks.get(appId);
    if (callback) {
      callback(errorReport);
    }
  }

  // Analyze outputs and runtime errors, then report if there are issues
  analyzeAndReport(appId: number, outputs: AppOutput[], runtimeErrors: AppError[]) {
    const errorReport = this.createErrorReport(outputs, runtimeErrors);
    if (errorReport.hasErrors) {
      this.reportErrors(appId, errorReport);
    }
  }
}