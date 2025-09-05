export var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
})(LogLevel || (LogLevel = {}));
/**
 * Comprehensive logging service for error tracking and debugging
 * Similar to CCdyad's logging but enhanced for Prestige-AI
 */
export class LoggingService {
    constructor() {
        Object.defineProperty(this, "logs", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "maxLogs", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 1000
        });
        Object.defineProperty(this, "logLevel", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: LogLevel.DEBUG
        });
    }
    static getInstance() {
        if (!LoggingService.instance) {
            LoggingService.instance = new LoggingService();
        }
        return LoggingService.instance;
    }
    /**
     * Log debug information
     */
    debug(message, context, source) {
        this.log(LogLevel.DEBUG, message, context, source);
    }
    /**
     * Log general information
     */
    info(message, context, source) {
        this.log(LogLevel.INFO, message, context, source);
    }
    /**
     * Log warnings
     */
    warn(message, context, source) {
        this.log(LogLevel.WARN, message, context, source);
    }
    /**
     * Log errors
     */
    error(message, context, source, error) {
        const stackTrace = error?.stack;
        this.log(LogLevel.ERROR, message, context, source, stackTrace);
    }
    /**
     * Log streaming events
     */
    logStreamEvent(streamId, event, context) {
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
    logProblemDetection(problems, context) {
        const errorCount = problems.filter(p => p.severity === 'error').length;
        const warningCount = problems.filter(p => p.severity === 'warning').length;
        const message = `Problems detected: ${errorCount} errors, ${warningCount} warnings`;
        const logContext = { problems, errorCount, warningCount, ...context };
        if (errorCount > 0) {
            this.error(message, logContext, 'problem_scanner');
        }
        else if (warningCount > 0) {
            this.warn(message, logContext, 'problem_scanner');
        }
        else {
            this.info('No problems detected', logContext, 'problem_scanner');
        }
    }
    /**
     * Log auto-fix attempts
     */
    logAutoFixAttempt(problems, fixPrompt, success, context) {
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
        }
        else {
            this.error(message, logContext, 'auto_fix');
        }
    }
    /**
     * Log AI interaction
     */
    logAIInteraction(type, prompt, response, error) {
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
    getLogs() {
        return [...this.logs];
    }
    /**
     * Get logs filtered by level
     */
    getLogsByLevel(level) {
        return this.logs.filter(log => log.level >= level);
    }
    /**
     * Get logs filtered by source
     */
    getLogsBySource(source) {
        return this.logs.filter(log => log.source === source);
    }
    /**
     * Get recent logs
     */
    getRecentLogs(count = 100) {
        return this.logs.slice(-count);
    }
    /**
     * Clear all logs
     */
    clearLogs() {
        this.logs = [];
    }
    /**
     * Set log level threshold
     */
    setLogLevel(level) {
        this.logLevel = level;
    }
    /**
     * Export logs as JSON
     */
    exportLogs() {
        return JSON.stringify(this.logs, null, 2);
    }
    /**
     * Get error summary
     */
    getErrorSummary(since) {
        const sinceTimestamp = since?.getTime() || 0;
        const relevantLogs = this.logs.filter(log => log.timestamp >= sinceTimestamp);
        const errors = relevantLogs.filter(log => log.level === LogLevel.ERROR);
        const warnings = relevantLogs.filter(log => log.level === LogLevel.WARN);
        const streamingErrors = errors.filter(log => log.source === 'streaming');
        // Extract problems from logs
        const recentProblems = [];
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
    log(level, message, context, source, stackTrace) {
        if (level < this.logLevel)
            return;
        const logEntry = {
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
            }
            else {
                logMethod(`${prefix} ${message}`);
            }
        }
    }
    /**
     * Get appropriate console method for log level
     */
    getConsoleMethod(level) {
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
    formatTimestamp(timestamp) {
        return new Date(timestamp).toLocaleTimeString();
    }
}
// Export singleton instance
export const logger = LoggingService.getInstance();
