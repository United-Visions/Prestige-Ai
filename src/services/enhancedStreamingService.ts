import { useStreamingErrorDetection } from '../hooks/useRealTimeErrorDetection';
import { useStreamingAgentProcessor } from './streamingAgentProcessor';
import { prestigeAutoFixService } from './prestigeAutoFixService';
import { processAgentResponse } from './agentResponseProcessor';
import useAppStore from '@/stores/appStore';
import { resolveAppPaths } from '@/utils/appPathResolver';
import { showSuccess, showError, showInfo } from '@/utils/toast';

/**
 * Enhanced AI streaming service with dyad-inspired auto-fix integration
 * Includes 2-retry system and aggressive dependency management
 */
export class EnhancedStreamingService {
  private static instance: EnhancedStreamingService;
  private activeStreams: Map<string, AbortController> = new Map();
  private autoFixStreams: Map<string, boolean> = new Map();

  public static getInstance(): EnhancedStreamingService {
    if (!EnhancedStreamingService.instance) {
      EnhancedStreamingService.instance = new EnhancedStreamingService();
    }
    return EnhancedStreamingService.instance;
  }

  /**
   * Start enhanced streaming with integrated error handling and auto-fix
   */
  async startEnhancedStream(
    streamId: string,
    prompt: string,
    options: {
      onChunk?: (chunk: string, fullResponse: string) => void;
      onError?: (error: Error) => void;
      onComplete?: (response: string) => void;
      onAutoFixNeeded?: (fixPrompt: string) => void;
      enableAutoFix?: boolean;
      enableAggressiveFixes?: boolean;
      aiRequestFunction?: (prompt: string) => Promise<string>;
      affectedFiles?: string[];
    } = {}
  ): Promise<void> {
    const {
      onChunk,
      onError,
      onComplete,
      onAutoFixNeeded,
      enableAutoFix = true,
      enableAggressiveFixes = true,
      aiRequestFunction,
      affectedFiles = []
    } = options;

    // Create abort controller for this stream
    const abortController = new AbortController();
    this.activeStreams.set(streamId, abortController);

    let fullResponse = '';
    let autoFixAttempts = 0;
    const maxAutoFixAttempts = 2; // Like dyad's system

    try {
      // Get current app context
      const { currentApp } = useAppStore.getState();
      if (!currentApp) {
        throw new Error("No application selected");
      }

      const { filesPath: appPath } = await resolveAppPaths(currentApp);

      // Initialize streaming processors
      const { processStreamingChunk, processFinalResponse } = useStreamingAgentProcessor();

      // Mock streaming response (replace with actual AI streaming)
      const streamingResponse = this.simulateEnhancedAIStreaming(prompt, abortController.signal);

      for await (const chunk of streamingResponse) {
        if (abortController.signal.aborted) {
          console.log(`Stream ${streamId} was aborted`);
          break;
        }

        fullResponse += chunk;

        // Process chunk with streaming processor
        await processStreamingChunk(streamId, chunk, fullResponse, (operations) => {
          console.log(`Stream ${streamId} operations update:`, operations.length);
        });

        // Real-time error detection during streaming
        if (enableAutoFix) {
          await this.processChunkWithErrorDetection(
            chunk,
            fullResponse,
            appPath,
            streamId,
            onAutoFixNeeded
          );
        }

        // Call chunk callback
        onChunk?.(chunk, fullResponse);

        // Simulate streaming delay
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (abortController.signal.aborted) {
        return;
      }

      // Process final response
      console.log(`🏁 Processing final response for stream ${streamId}`);
      const finalResult = await processFinalResponse(streamId, fullResponse, true);

      // Enhanced auto-fix system (like dyad's approach)
      if (enableAutoFix && enableAggressiveFixes && aiRequestFunction) {
        await this.performEnhancedAutoFix(
          streamId,
          fullResponse,
          appPath,
          aiRequestFunction,
          {
            maxAttempts: maxAutoFixAttempts,
            onProgress: (attempt, problems) => {
              console.log(`🔧 Auto-fix attempt ${attempt} for ${problems.length} problem(s)`);
              showInfo(`🔧 Auto-fix attempt ${attempt}: Working on ${problems.length} problem(s)...`);
            }
          }
        );
      }

      // Stream completed successfully
      onComplete?.(fullResponse);
      showSuccess(`✅ Stream ${streamId} completed successfully`);

    } catch (error) {
      console.error(`❌ Enhanced streaming error for ${streamId}:`, error);
      onError?.(error as Error);
      showError(`Streaming failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      // Clean up
      this.activeStreams.delete(streamId);
      this.autoFixStreams.delete(streamId);
    }
  }

  /**
   * Enhanced auto-fix system with dyad-style 2-retry approach
   */
  private async performEnhancedAutoFix(
    streamId: string,
    response: string,
    appPath: string,
    aiFunction: (prompt: string) => Promise<string>,
    options: {
      maxAttempts: number;
      onProgress?: (attempt: number, problems: any[]) => void;
    }
  ): Promise<void> {
    if (this.autoFixStreams.get(streamId)) {
      console.log(`⚠️ Auto-fix already running for stream ${streamId}`);
      return;
    }

    this.autoFixStreams.set(streamId, true);

    try {
      // Enhanced auto-fix with AI integration
      const autoFixResult = await prestigeAutoFixService.attemptAutoFix(
        response,
        appPath,
        async (fixPrompt: string, currentResponse: string) => {
          console.log(`🤖 Requesting AI fix for problems...`);

          // Enhanced prompt that includes current context
          const enhancedPrompt = `${fixPrompt}

Current response context:
\`\`\`
${currentResponse.slice(-500)} // Last 500 chars for context
\`\`\`

Please provide the necessary fixes using prestige tags:
- Use <prestige-write path="..."> for file changes
- Use <prestige-add-dependency packages="..."> for missing packages
- Only make minimal changes to fix the specific errors mentioned`;

          return aiFunction(enhancedPrompt);
        },
        options.onProgress
      );

      if (autoFixResult.success) {
        showSuccess(`🎉 Auto-fix completed successfully! Fixed ${autoFixResult.fixedProblems.length} problem(s) in ${autoFixResult.attempts} attempt(s)`);
      } else {
        const remainingErrors = autoFixResult.remainingProblems.filter(p => p.severity === 'error').length;
        if (remainingErrors > 0) {
          showInfo(`⚠️ Auto-fix completed with ${remainingErrors} error(s) remaining after ${autoFixResult.attempts} attempt(s)`);
        } else {
          showSuccess(`✅ Auto-fix resolved all errors after ${autoFixResult.attempts} attempt(s)`);
        }
      }

      // Log the changes made
      if (autoFixResult.changes.length > 0) {
        console.log(`📝 Auto-fix made ${autoFixResult.changes.length} change(s):`);
        autoFixResult.changes.forEach((change, index) => {
          console.log(`  ${index + 1}. ${change.type}: ${change.path || change.packages?.join(', ') || 'unknown'}`);
        });
      }

    } catch (error) {
      console.error(`❌ Enhanced auto-fix failed for stream ${streamId}:`, error);
      showError(`Auto-fix failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.autoFixStreams.set(streamId, false);
    }
  }

  /**
   * Process streaming chunks with real-time error detection
   */
  private async processChunkWithErrorDetection(
    chunk: string,
    fullResponse: string,
    appPath: string,
    streamId: string,
    onAutoFixNeeded?: (fixPrompt: string) => void
  ): Promise<void> {
    try {
      // Quick error detection on streaming content
      const hasImportErrors = this.detectImportErrors(chunk);
      const hasSyntaxErrors = this.detectSyntaxErrors(chunk);

      if (hasImportErrors || hasSyntaxErrors) {
        console.log(`⚠️ Stream ${streamId}: Detected potential errors in chunk`);

        if (onAutoFixNeeded) {
          const quickFixPrompt = this.generateQuickFixPrompt(chunk, hasImportErrors, hasSyntaxErrors);
          onAutoFixNeeded(quickFixPrompt);
        }
      }
    } catch (error) {
      console.error('Error in chunk processing:', error);
    }
  }

  /**
   * Detect import errors in streaming content
   */
  private detectImportErrors(content: string): boolean {
    const importErrorPatterns = [
      /Failed to resolve import/,
      /Cannot find module/,
      /Module not found/,
      /import.*not found/i
    ];

    return importErrorPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Detect syntax errors in streaming content
   */
  private detectSyntaxErrors(content: string): boolean {
    const syntaxErrorPatterns = [
      /SyntaxError/,
      /Unexpected token/,
      /Unexpected identifier/,
      /TypeError.*is not a function/
    ];

    return syntaxErrorPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Generate quick fix prompt for streaming errors
   */
  private generateQuickFixPrompt(content: string, hasImportErrors: boolean, hasSyntaxErrors: boolean): string {
    let prompt = "Quick fix needed for streaming content:\n\n";

    if (hasImportErrors) {
      prompt += "- Import resolution errors detected\n";
      prompt += "- Consider using <prestige-add-dependency> tags for missing packages\n";
    }

    if (hasSyntaxErrors) {
      prompt += "- Syntax errors detected\n";
      prompt += "- Review code syntax and fix any issues\n";
    }

    prompt += `\nContent with issues:\n\`\`\`\n${content.slice(-200)}\n\`\`\``;

    return prompt;
  }

  /**
   * Simulate enhanced AI streaming (replace with actual streaming implementation)
   */
  private async* simulateEnhancedAIStreaming(
    prompt: string,
    signal: AbortSignal
  ): AsyncGenerator<string> {
    const mockResponse = `I'll help you create that component. Let me start by analyzing what we need.

<think>
The user wants to create a new component. I should check the current structure and then create the files needed. I'll also need to install any missing dependencies if required.
</think>

Let me create a new Button component for you.

<prestige-write path="src/components/Button.tsx" description="Creating a reusable Button component">
import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}) => {
  return (
    <button
      className={cn(
        'rounded-lg font-medium transition-colors focus:outline-none focus:ring-2',
        {
          'bg-blue-500 hover:bg-blue-600 text-white focus:ring-blue-300': variant === 'primary',
          'bg-gray-200 hover:bg-gray-300 text-gray-900 focus:ring-gray-300': variant === 'secondary',
          'border border-gray-300 hover:bg-gray-50 text-gray-700 focus:ring-gray-300': variant === 'outline',
          'px-3 py-1.5 text-sm': size === 'sm',
          'px-4 py-2 text-base': size === 'md',
          'px-6 py-3 text-lg': size === 'lg',
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};
</prestige-write>

<prestige-add-dependency packages="clsx tailwind-merge"></prestige-add-dependency>

<prestige-command type="rebuild"></prestige-command>

<prestige-chat-summary>Created Button component with TypeScript and Tailwind CSS</prestige-chat-summary>`;

    // Split into chunks and yield
    const chunks = mockResponse.split(' ');
    let currentChunk = '';

    for (const word of chunks) {
      if (signal.aborted) break;

      currentChunk += word + ' ';

      // Yield chunks at reasonable intervals
      if (currentChunk.length > 50 || word.includes('\n')) {
        yield currentChunk;
        currentChunk = '';
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    if (currentChunk.trim()) {
      yield currentChunk;
    }
  }

  /**
   * Cancel an active stream
   */
  cancelStream(streamId: string): boolean {
    const abortController = this.activeStreams.get(streamId);
    if (abortController) {
      abortController.abort();
      this.activeStreams.delete(streamId);
      this.autoFixStreams.delete(streamId);
      return true;
    }
    return false;
  }

  /**
   * Get active stream IDs
   */
  getActiveStreams(): string[] {
    return Array.from(this.activeStreams.keys());
  }

  /**
   * Check if auto-fix is running for a stream
   */
  isAutoFixRunning(streamId: string): boolean {
    return this.autoFixStreams.get(streamId) || false;
  }
}

/**
 * React hook wrapper for the enhanced streaming service
 */
export const useEnhancedStreaming = () => {
  const streamingService = EnhancedStreamingService.getInstance();

  const startEnhancedStream = async (
    prompt: string,
    options: {
      onChunk?: (chunk: string, fullResponse: string) => void;
      onError?: (error: Error) => void;
      onComplete?: (response: string) => void;
      onAutoFixNeeded?: (fixPrompt: string) => void;
      enableAutoFix?: boolean;
      enableAggressiveFixes?: boolean;
      aiRequestFunction?: (prompt: string) => Promise<string>;
      affectedFiles?: string[];
    } = {}
  ) => {
    const streamId = `enhanced_stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return streamingService.startEnhancedStream(streamId, prompt, options);
  };

  const cancelStream = (streamId: string) => {
    return streamingService.cancelStream(streamId);
  };

  const getActiveStreams = () => {
    return streamingService.getActiveStreams();
  };

  const isAutoFixRunning = (streamId: string) => {
    return streamingService.isAutoFixRunning(streamId);
  };

  return {
    startEnhancedStream,
    cancelStream,
    getActiveStreams,
    isAutoFixRunning
  };
};

export default EnhancedStreamingService;