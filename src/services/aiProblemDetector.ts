import { Problem } from '../stores/problemsStore';

/**
 * AI-powered problem detection service
 * Uses Claude/GPT models for intelligent code analysis
 */
export class AIProblemDetector {
  private static instance: AIProblemDetector;
  private readonly modelEndpoint: string;
  private readonly apiKey: string | null;
  private cache: Map<string, Problem[]> = new Map();

  private constructor() {
    this.modelEndpoint = process.env.REACT_APP_AI_ENDPOINT || 'https://api.anthropic.com/v1/messages';
    this.apiKey = process.env.REACT_APP_ANTHROPIC_API_KEY || null;
  }

  public static getInstance(): AIProblemDetector {
    if (!AIProblemDetector.instance) {
      AIProblemDetector.instance = new AIProblemDetector();
    }
    return AIProblemDetector.instance;
  }

  /**
   * Analyze code using Claude/GPT for intelligent problem detection
   */
  async analyzeCodeWithAI(
    code: string,
    filePath?: string,
    language: 'typescript' | 'javascript' | 'react' = 'typescript'
  ): Promise<Problem[]> {
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(code, language);
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey)!;
      }

      const systemPrompt = this.buildSystemPrompt(language);
      const userPrompt = this.buildUserPrompt(code, language, filePath);

      const response = await this.callAIModel(systemPrompt, userPrompt);
      const problems = this.parseAIResponse(response, filePath || 'current');

      // Cache results
      this.cache.set(cacheKey, problems);
      
      return problems;
    } catch (error) {
      console.error('AI problem detection failed:', error);
      return this.fallbackToRuleBasedDetection(code, filePath);
    }
  }

  /**
   * Real-time streaming analysis for live problem detection
   */
  async streamingAnalyze(
    partialCode: string,
    fullCode: string,
    filePath?: string
  ): Promise<Problem[]> {
    // For streaming, focus on the most recent changes
    const recentChanges = this.extractRecentChanges(partialCode, fullCode);
    
    if (recentChanges.length < 10) {
      return []; // Too small to analyze meaningfully
    }

    return this.analyzeCodeWithAI(recentChanges, filePath);
  }

  /**
   * Build system prompt for the AI model
   */
  private buildSystemPrompt(language: string): string {
    return `You are an expert ${language} code analyzer. Analyze the provided code and identify potential issues, errors, and warnings.

Your task:
1. Detect syntax errors, type errors, and logical issues
2. Identify code quality problems and potential bugs
3. Flag missing imports, undefined variables, or type mismatches
4. Suggest best practices violations

Response format: Return a JSON array of problem objects with this exact structure:
[
  {
    "file": "filename or 'current'",
    "line": number,
    "column": number,
    "message": "clear description of the issue",
    "code": "error code or rule name",
    "severity": "error" | "warning" | "info"
  }
]

Only return the JSON array, no additional text or explanation.`;
  }

  /**
   * Build user prompt with code to analyze
   */
  private buildUserPrompt(code: string, language: string, filePath?: string): string {
    return `Analyze this ${language} code for problems:

File: ${filePath || 'current'}

\`\`\`${language}
${code}
\`\`\`

Return JSON array of problems found:`;
  }

  /**
   * Call the AI model (Claude/GPT)
   */
  private async callAIModel(systemPrompt: string, userPrompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('AI API key not configured');
    }

    // For Anthropic Claude
    const response = await fetch(this.modelEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307', // Fast model for real-time analysis
        max_tokens: 1000,
        temperature: 0.1,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }

  /**
   * Parse AI response into Problem objects
   */
  private parseAIResponse(response: string, filePath: string): Problem[] {
    try {
      // Extract JSON from response (sometimes AI adds extra text)
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const problems = JSON.parse(jsonMatch[0]);
      
      return problems.map((problem: any) => ({
        file: problem.file || filePath,
        line: problem.line || 1,
        column: problem.column || 1,
        message: problem.message || 'Unknown issue',
        code: problem.code || 'AI_DETECTED',
        severity: this.normalizeSeverity(problem.severity)
      }));
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return [];
    }
  }

  /**
   * Fallback to rule-based detection when AI fails
   */
  private fallbackToRuleBasedDetection(code: string, filePath?: string): Problem[] {
    const problems: Problem[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      // Basic syntax checks
      if (this.hasUnmatchedBrackets(line)) {
        problems.push({
          file: filePath || 'current',
          line: index + 1,
          column: 1,
          message: 'Unmatched brackets detected',
          code: 'SYNTAX_ERROR',
          severity: 'error'
        });
      }

      // Check for common issues
      if (line.includes('console.log')) {
        problems.push({
          file: filePath || 'current',
          line: index + 1,
          column: line.indexOf('console.log') + 1,
          message: 'Console statement should be removed in production',
          code: 'no-console',
          severity: 'warning'
        });
      }

      // Undefined variable check (simplified)
      const undefinedMatch = line.match(/\b(\w+)\s+is\s+not\s+defined/);
      if (undefinedMatch) {
        problems.push({
          file: filePath || 'current',
          line: index + 1,
          column: 1,
          message: `'${undefinedMatch[1]}' is not defined`,
          code: '2304',
          severity: 'error'
        });
      }
    });

    return problems;
  }

  /**
   * Extract recent changes from streaming code
   */
  private extractRecentChanges(partialCode: string, fullCode: string): string {
    // Simple approach: get the last portion that was added
    if (fullCode.length <= partialCode.length) {
      return partialCode;
    }
    
    // Get last 200 characters plus some context
    const recentStart = Math.max(0, fullCode.length - 200);
    return fullCode.substring(recentStart);
  }

  /**
   * Generate cache key for code analysis
   */
  private generateCacheKey(code: string, language: string): string {
    // Simple hash of code + language
    const hash = this.simpleHash(code + language);
    return `analysis_${hash}`;
  }

  /**
   * Simple hash function for caching
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Check for unmatched brackets
   */
  private hasUnmatchedBrackets(line: string): boolean {
    let brackets = 0;
    let braces = 0;
    let parens = 0;

    for (const char of line) {
      switch (char) {
        case '[': brackets++; break;
        case ']': brackets--; break;
        case '{': braces++; break;
        case '}': braces--; break;
        case '(': parens++; break;
        case ')': parens--; break;
      }
    }

    return brackets !== 0 || braces !== 0 || parens !== 0;
  }

  /**
   * Normalize severity levels
   */
  private normalizeSeverity(severity: string): 'error' | 'warning' | 'info' {
    const normalized = severity?.toLowerCase();
    if (normalized === 'error') return 'error';
    if (normalized === 'warning' || normalized === 'warn') return 'warning';
    return 'info';
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  public getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}