import { Problem } from '../stores/problemsStore';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  context?: any;
  source?: string;
  stackTrace?: string;
}

export interface ErrorContext {
  streamId?: string;
  fileName?: string;
  lineNumber?: number;
  columnNumber?: number;
  problems?: Problem[];
  autoFixAttempted?: boolean;
  fixSuccess?: boolean;
}

/**
 * Comprehensive logging service for error tracking and debugging
 * Similar to CCdyad's logging but enhanced for Prestige-AI
 */
export class LoggingService {
  private static instance: LoggingService;
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;
  private logLevel: LogLevel = LogLevel.DEBUG;

  public static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  /**
   * Log debug information
   */
  debug(message: string, context?: any, source?: string): void {
    this.log(LogLevel.DEBUG, message, context, source);
  }

  /**
   * Log general information
   */
  info(message: string, context?: any, source?: string): void {
    this.log(LogLevel.INFO, message, context, source);
  }

  /**
   * Log warnings
   */
  warn(message: string, context?: any, source?: string): void {
    this.log(LogLevel.WARN, message, context, source);
  }

  /**
   * Log errors
   */
  error(message: string, context?: any, source?: string, error?: Error): void {
    const stackTrace = error?.stack;
    this.log(LogLevel.ERROR, message, context, source, stackTrace);
  }

  /**
   * Log streaming events
   */
  logStreamEvent(
    streamId: string, 
    event: 'started' | 'chunk' | 'error_detected' | 'auto_fix' | 'completed' | 'cancelled',
    context?: ErrorContext
  ): void {
    const message = `Stream ${streamId}: ${event}`;
    const logContext = { streamId, event, ...context };
    
    switch (event) {
      case 'error_detected':
      case 'auto_fix':
        this.warn(message, logContext, 'streaming');
        break;
      case 'cancelled':
        this.warn(message, logContext, 'streaming');
        break;
      default:
        this.info(message, logContext, 'streaming');
    }
  }

  /**
   * Log problem detection events
   */
  logProblemDetection(
    problems: Problem[], 
    context?: { filePath?: string; scanType?: 'realtime' | 'full' | 'file' }
  ): void {
    const errorCount = problems.filter(p => p.severity === 'error').length;
    const warningCount = problems.filter(p => p.severity === 'warning').length;
    
    const message = `Problems detected: ${errorCount} errors, ${warningCount} warnings`;
    const logContext = { problems, errorCount, warningCount, ...context };
    
    if (errorCount > 0) {
      this.error(message, logContext, 'problem_scanner');
    } else if (warningCount > 0) {
      this.warn(message, logContext, 'problem_scanner');
    } else {
      this.info('No problems detected', logContext, 'problem_scanner');
    }
  }

  /**
   * Log auto-fix attempts
   */
  logAutoFixAttempt(
    problems: Problem[], 
    fixPrompt: string, 
    success: boolean,
    context?: ErrorContext
  ): void {
    const message = `Auto-fix attempt: ${success ? 'successful' : 'failed'} for ${problems.length} problems`;
    const logContext = { 
      problems, 
      fixPrompt, 
      success, 
      autoFixAttempted: true,
      fixSuccess: success,
      ...context 
    };
    
    if (success) {
      this.info(message, logContext, 'auto_fix');
    } else {
      this.error(message, logContext, 'auto_fix');
    }
  }

  /**
   * Log AI interaction
   */
  logAIInteraction(
    type: 'request' | 'response' | 'error',
    prompt?: string,
    response?: string,
    error?: Error
  ): void {
    const message = `AI ${type}`;
    const logContext = { type, prompt, response, error: error?.message };
    
    switch (type) {
      case 'request':
        this.info(message, logContext, 'ai_service');
        break;
      case 'response':
        this.info(message, logContext, 'ai_service');
        break;
      case 'error':
        this.error(message, logContext, 'ai_service', error);
        break;
    }
  }

  /**
   * Get all logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Get logs filtered by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level >= level);
  }

  /**
   * Get logs filtered by source
   */
  getLogsBySource(source: string): LogEntry[] {
    return this.logs.filter(log => log.source === source);
  }

  /**
   * Get recent logs
   */
  getRecentLogs(count: number = 100): LogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Set log level threshold
   */
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Get error summary
   */
  getErrorSummary(since?: Date): {
    totalErrors: number;
    totalWarnings: number;
    recentProblems: Problem[];
    streamingErrors: LogEntry[];
    autoFixSuccessRate: number;
  } {
    const sinceTimestamp = since?.getTime() || 0;
    const relevantLogs = this.logs.filter(log => log.timestamp >= sinceTimestamp);
    
    const errors = relevantLogs.filter(log => log.level === LogLevel.ERROR);
    const warnings = relevantLogs.filter(log => log.level === LogLevel.WARN);
    
    const streamingErrors = errors.filter(log => log.source === 'streaming');
    
    // Extract problems from logs
    const recentProblems: Problem[] = [];
    relevantLogs.forEach(log => {
      if (log.context?.problems && Array.isArray(log.context.problems)) {
        recentProblems.push(...log.context.problems);
      }
    });

    // Calculate auto-fix success rate
    const autoFixLogs = relevantLogs.filter(log => log.source === 'auto_fix');
    const successfulFixes = autoFixLogs.filter(log => log.context?.fixSuccess === true);
    const autoFixSuccessRate = autoFixLogs.length > 0 
      ? (successfulFixes.length / autoFixLogs.length) * 100 
      : 0;

    return {
      totalErrors: errors.length,
      totalWarnings: warnings.length,
      recentProblems: recentProblems.slice(-10), // Last 10 problems
      streamingErrors,
      autoFixSuccessRate
    };
  }

  /**
   * Private method to create log entry
   */
  private log(
    level: LogLevel, 
    message: string, 
    context?: any, 
    source?: string, 
    stackTrace?: string
  ): void {
    if (level < this.logLevel) return;

    const logEntry: LogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      level,
      message,
      context,
      source,
      stackTrace
    };

    this.logs.push(logEntry);

    // Trim logs if we exceed max count
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output for development
    if (typeof console !== 'undefined') {
      const logMethod = this.getConsoleMethod(level);
      const prefix = `[${source || 'APP'}] ${this.formatTimestamp(logEntry.timestamp)}`;
      
      if (context) {
        logMethod(`${prefix} ${message}`, context);
      } else {
        logMethod(`${prefix} ${message}`);
      }
    }
  }

  /**
   * Get appropriate console method for log level
   */
  private getConsoleMethod(level: LogLevel) {
    switch (level) {
      case LogLevel.DEBUG:
        return console.debug;
      case LogLevel.INFO:
        return console.info;
      case LogLevel.WARN:
        return console.warn;
      case LogLevel.ERROR:
        return console.error;
      default:
        return console.log;
    }
  }

  /**
   * Format timestamp for display
   */
  private formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString();
  }
}

// Export singleton instance
export const logger = LoggingService.getInstance();