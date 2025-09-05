import { AIProblemDetector } from './aiProblemDetector';
export class ProblemScannerService {
    constructor() {
        Object.defineProperty(this, "isScanning", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "scanQueue", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "lastScanResults", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        Object.defineProperty(this, "aiDetector", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.aiDetector = AIProblemDetector.getInstance();
    }
    static getInstance() {
        if (!ProblemScannerService.instance) {
            ProblemScannerService.instance = new ProblemScannerService();
        }
        return ProblemScannerService.instance;
    }
    /**
     * Scan a file or directory for TypeScript/JavaScript problems
     */
    async scanForProblems(filePath) {
        this.isScanning = true;
        // Add to scan queue for potential batch processing
        if (!this.scanQueue.includes(filePath)) {
            this.scanQueue.push(filePath);
        }
        try {
            // Simulate TypeScript compilation check
            const problems = await this.runTypeScriptCheck(filePath);
            this.lastScanResults.set(filePath, problems);
            // Remove from queue after processing
            this.scanQueue = this.scanQueue.filter(path => path !== filePath);
            return problems;
        }
        catch (error) {
            console.error('Error scanning for problems:', error);
            this.scanQueue = this.scanQueue.filter(path => path !== filePath);
            return [];
        }
        finally {
            this.isScanning = false;
        }
    }
    /**
     * Scan multiple files concurrently
     */
    async scanMultipleFiles(filePaths) {
        const allProblems = [];
        const scanPromises = filePaths.map(async (filePath) => {
            const fileProblems = await this.scanForProblems(filePath);
            return fileProblems;
        });
        const results = await Promise.all(scanPromises);
        results.forEach(problems => allProblems.push(...problems));
        return {
            problems: allProblems,
            timestamp: Date.now(),
            totalErrors: allProblems.filter(p => p.severity === 'error').length,
            totalWarnings: allProblems.filter(p => p.severity === 'warning').length,
        };
    }
    /**
     * Real-time problem detection during streaming using AI
     */
    async detectProblemsInRealTime(code, filePath) {
        try {
            // Use AI-powered detection for intelligent analysis
            const aiProblems = await this.aiDetector.analyzeCodeWithAI(code, filePath);
            // Fallback to rule-based detection if AI fails
            if (aiProblems.length === 0) {
                const problems = [];
                const syntaxErrors = this.detectSyntaxErrors(code);
                const typeErrors = this.detectTypeErrors(code);
                const eslintErrors = this.detectLintingIssues(code);
                problems.push(...syntaxErrors, ...typeErrors, ...eslintErrors);
                return problems;
            }
            return aiProblems;
        }
        catch (error) {
            console.error('Real-time problem detection failed:', error);
            return [];
        }
    }
    /**
     * Enhanced streaming analysis with AI
     */
    async detectProblemsInStream(partialCode, fullCode, filePath) {
        try {
            return await this.aiDetector.streamingAnalyze(partialCode, fullCode, filePath);
        }
        catch (error) {
            console.error('Streaming problem detection failed:', error);
            return this.detectProblemsInRealTime(partialCode, filePath);
        }
    }
    /**
     * Generate problem fix suggestions
     */
    generateFixSuggestions(problems) {
        const suggestions = [];
        problems.forEach(problem => {
            switch (problem.code) {
                case '2304':
                    suggestions.push(`Import or declare '${this.extractIdentifierFromMessage(problem.message)}'`);
                    break;
                case '2322':
                    suggestions.push('Fix type mismatch - check assigned value type');
                    break;
                case '2345':
                    suggestions.push('Check function argument types and count');
                    break;
                case '2339':
                    suggestions.push('Add missing property or check object structure');
                    break;
                default:
                    suggestions.push(`Fix ${problem.severity}: ${problem.message}`);
            }
        });
        return suggestions;
    }
    /**
     * Create automated fix prompt for AI
     */
    createAutoFixPrompt(problems) {
        if (problems.length === 0)
            return 'No problems detected.';
        const errorCount = problems.filter(p => p.severity === 'error').length;
        const warningCount = problems.filter(p => p.severity === 'warning').length;
        let prompt = `Fix the following code issues:\n\n`;
        if (errorCount > 0) {
            prompt += `**Errors (${errorCount}):**\n`;
            problems.filter(p => p.severity === 'error').forEach((problem, index) => {
                prompt += `${index + 1}. ${problem.file}:${problem.line}:${problem.column} - ${problem.message} (${problem.code})\n`;
            });
            prompt += '\n';
        }
        if (warningCount > 0) {
            prompt += `**Warnings (${warningCount}):**\n`;
            problems.filter(p => p.severity === 'warning').forEach((problem, index) => {
                prompt += `${index + 1}. ${problem.file}:${problem.line}:${problem.column} - ${problem.message} (${problem.code})\n`;
            });
            prompt += '\n';
        }
        prompt += 'Please provide concise fixes for these issues while maintaining code functionality.';
        return prompt;
    }
    async runTypeScriptCheck(filePath) {
        // This would integrate with the TypeScript compiler API
        // For now, return mock data
        const mockProblems = [];
        // Simulate some common TypeScript errors
        if (filePath.includes('.ts') || filePath.includes('.tsx')) {
            // Mock detection logic would go here
        }
        return mockProblems;
    }
    detectSyntaxErrors(code) {
        const problems = [];
        try {
            // Basic syntax validation
            const lines = code.split('\n');
            lines.forEach((line, index) => {
                // Check for unclosed brackets, quotes, etc.
                if (this.hasUnmatchedBrackets(line)) {
                    problems.push({
                        file: 'current',
                        line: index + 1,
                        column: 1,
                        message: 'Syntax error: unmatched brackets',
                        code: 'SYNTAX_ERROR',
                        severity: 'error'
                    });
                }
                // Check for undefined variables (basic check)
                const undefinedVars = this.findUndefinedVariables(line);
                undefinedVars.forEach(variable => {
                    problems.push({
                        file: 'current',
                        line: index + 1,
                        column: line.indexOf(variable) + 1,
                        message: `'${variable}' is not defined`,
                        code: '2304',
                        severity: 'error'
                    });
                });
            });
        }
        catch (error) {
            console.error('Syntax error detection failed:', error);
        }
        return problems;
    }
    detectTypeErrors(code) {
        const problems = [];
        const lines = code.split('\n');
        // Basic type checking patterns
        lines.forEach((line, index) => {
            // Check for common type issues
            if (line.includes('any') && !line.includes('//')) {
                problems.push({
                    file: 'current',
                    line: index + 1,
                    column: line.indexOf('any') + 1,
                    message: 'Type \'any\' should be avoided - specify a more precise type',
                    code: 'TS2322',
                    severity: 'warning'
                });
            }
            // Check for missing type annotations on functions
            const functionMatch = line.match(/function\s+(\w+)\s*\([^)]*\)\s*{/);
            if (functionMatch && !line.includes(':')) {
                problems.push({
                    file: 'current',
                    line: index + 1,
                    column: functionMatch.index + 1,
                    message: 'Function missing return type annotation',
                    code: 'TS7006',
                    severity: 'warning'
                });
            }
        });
        return problems;
    }
    detectLintingIssues(code) {
        const problems = [];
        const lines = code.split('\n');
        lines.forEach((line, index) => {
            // Check for console statements (common lint rule)
            if (line.includes('console.log') || line.includes('console.error')) {
                problems.push({
                    file: 'current',
                    line: index + 1,
                    column: line.indexOf('console') + 1,
                    message: 'Unexpected console statement',
                    code: 'no-console',
                    severity: 'warning'
                });
            }
            // Check for unused variables (basic pattern)
            const unusedVarMatch = line.match(/(?:const|let|var)\s+(\w+)\s*=/);
            if (unusedVarMatch) {
                const varName = unusedVarMatch[1];
                const restOfCode = lines.slice(index + 1).join('\n');
                if (!restOfCode.includes(varName)) {
                    problems.push({
                        file: 'current',
                        line: index + 1,
                        column: unusedVarMatch.index + 1,
                        message: `'${varName}' is assigned a value but never used`,
                        code: 'no-unused-vars',
                        severity: 'warning'
                    });
                }
            }
        });
        return problems;
    }
    hasUnmatchedBrackets(line) {
        let brackets = 0;
        let braces = 0;
        let parens = 0;
        for (const char of line) {
            switch (char) {
                case '[':
                    brackets++;
                    break;
                case ']':
                    brackets--;
                    break;
                case '{':
                    braces++;
                    break;
                case '}':
                    braces--;
                    break;
                case '(':
                    parens++;
                    break;
                case ')':
                    parens--;
                    break;
            }
        }
        return brackets !== 0 || braces !== 0 || parens !== 0;
    }
    findUndefinedVariables(line) {
        // Very basic undefined variable detection
        // In a real implementation, this would use AST parsing
        const undefinedVars = [];
        // Look for variable usage patterns (simplified)
        const variablePattern = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?:\(|\[|\.)/g;
        let match;
        while ((match = variablePattern.exec(line)) !== null) {
            const varName = match[1];
            // Skip common globals and keywords
            const skipList = [
                'console', 'window', 'document', 'process', 'global',
                'require', 'module', 'exports', '__dirname', '__filename',
                'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
                'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'Array',
                'Object', 'String', 'Number', 'Boolean', 'Date', 'RegExp',
                'Error', 'Promise', 'JSON', 'Math'
            ];
            if (!skipList.includes(varName) && !line.includes(`const ${varName}`) &&
                !line.includes(`let ${varName}`) && !line.includes(`var ${varName}`)) {
                undefinedVars.push(varName);
            }
        }
        return undefinedVars;
    }
    extractIdentifierFromMessage(message) {
        const match = message.match(/'([^']+)'/);
        return match ? match[1] : 'identifier';
    }
    getScanStatus() {
        return this.isScanning;
    }
    getLastResults(filePath) {
        return this.lastScanResults.get(filePath) || [];
    }
    clearCache() {
        this.lastScanResults.clear();
    }
}
