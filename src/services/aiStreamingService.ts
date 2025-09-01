import { useStreamingErrorDetection } from '../hooks/useRealTimeErrorDetection';

/**
 * Enhanced AI streaming service with real-time error detection and auto-fixing
 * Inspired by CCdyad's streaming + auto-fix system
 */
export class AIStreamingService {
  private static instance: AIStreamingService;
  private activeStreams: Map<string, AbortController> = new Map();
  // private streamingCallbacks: Map<string, Function[]> = new Map();

  public static getInstance(): AIStreamingService {
    if (!AIStreamingService.instance) {
      AIStreamingService.instance = new AIStreamingService();
    }
    return AIStreamingService.instance;
  }

  /**
   * Start streaming with real-time error detection
   */
  async startStreamWithErrorDetection(
    streamId: string,
    prompt: string,
    options: {
      onChunk?: (chunk: string, fullResponse: string) => void;
      onError?: (error: Error) => void;
      onComplete?: (response: string) => void;
      onAutoFixNeeded?: (fixPrompt: string) => void;
      enableAutoFix?: boolean;
      affectedFiles?: string[];
    } = {}
  ): Promise<void> {
    const {
      onChunk,
      onError,
      onComplete,
      onAutoFixNeeded,
      enableAutoFix = true,
      affectedFiles = []
    } = options;

    // Create abort controller for this stream
    const abortController = new AbortController();
    this.activeStreams.set(streamId, abortController);

    let fullResponse = '';
    let errorDetectionPromises: Promise<void>[] = [];

    try {
      // Mock streaming - in real implementation this would connect to AI service
      const mockStreamingResponse = this.simulateAIStreaming(prompt, abortController.signal);

      for await (const chunk of mockStreamingResponse) {
        if (abortController.signal.aborted) {
          console.log(`Stream ${streamId} was aborted`);
          break;
        }

        fullResponse += chunk;
        
        // Process chunk with real-time error detection
        if (enableAutoFix) {
          const errorDetectionPromise = this.processChunkWithErrorDetection(
            chunk,
            fullResponse,
            affectedFiles[0], // Use first file for simplicity
            onAutoFixNeeded
          );
          errorDetectionPromises.push(errorDetectionPromise);
        }

        // Call chunk callback
        onChunk?.(chunk, fullResponse);

        // Simulate streaming delay
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Wait for all error detection promises to complete
      await Promise.all(errorDetectionPromises);

      // Process final response
      if (!abortController.signal.aborted && enableAutoFix) {
        await this.processFinalResponseWithErrorDetection(
          fullResponse,
          affectedFiles,
          onAutoFixNeeded
        );
      }

      // Stream completed successfully
      if (!abortController.signal.aborted) {
        onComplete?.(fullResponse);
      }

    } catch (error) {
      console.error(`Streaming error for ${streamId}:`, error);
      onError?.(error as Error);
    } finally {
      // Clean up
      this.activeStreams.delete(streamId);
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
   * Process chunk with error detection
   */
  private async processChunkWithErrorDetection(
    chunk: string,
    _fullResponse: string,
    _filePath?: string,
    onAutoFixNeeded?: (fixPrompt: string) => void
  ): Promise<void> {
    try {
      // This would integrate with the useStreamingErrorDetection hook
      // For now, simulate error detection
      const hasErrors = this.detectErrorsInCode(chunk);
      
      if (hasErrors && onAutoFixNeeded) {
        const fixPrompt = this.generateFixPrompt(chunk);
        onAutoFixNeeded(fixPrompt);
      }
    } catch (error) {
      console.error('Error in chunk processing:', error);
    }
  }

  /**
   * Process final response with comprehensive error checking
   */
  private async processFinalResponseWithErrorDetection(
    fullResponse: string,
    _affectedFiles: string[],
    onAutoFixNeeded?: (fixPrompt: string) => void
  ): Promise<void> {
    try {
      // Comprehensive error check
      const hasErrors = this.detectErrorsInCode(fullResponse);
      
      if (hasErrors && onAutoFixNeeded) {
        const fixPrompt = this.generateFixPrompt(fullResponse);
        onAutoFixNeeded(fixPrompt);
      }
    } catch (error) {
      console.error('Error in final response processing:', error);
    }
  }

  /**
   * Simulate AI streaming response
   */
  private async* simulateAIStreaming(
    _prompt: string, 
    signal: AbortSignal
  ): AsyncGenerator<string> {
    const mockResponse = `
// AI Generated Code Response
import React, { useState, useEffect } from 'react';

function GeneratedComponent() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    // Fetch data
    fetchData().then(setData);
  }, []);

  const fetchData = async () => {
    const response = await fetch('/api/data');
    return response.json();
  };

  if (!data) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Generated Component</h1>
      <p>Data: {JSON.stringify(data)}</p>
    </div>
  );
}

export default GeneratedComponent;
    `.trim();

    const chunks = mockResponse.split(' ');
    
    for (const chunk of chunks) {
      if (signal.aborted) break;
      yield chunk + ' ';
    }
  }

  /**
   * Basic error detection in code (simplified)
   */
  private detectErrorsInCode(code: string): boolean {
    // Simple checks for common issues
    const errorPatterns = [
      /undefined\s+variable/i,
      /syntax\s+error/i,
      /cannot\s+find\s+module/i,
      /type\s+error/i,
      /\bunused\s+variable/i
    ];

    return errorPatterns.some(pattern => pattern.test(code));
  }

  /**
   * Generate fix prompt for detected issues
   */
  private generateFixPrompt(code: string): string {
    return `Fix the following code issues in this generated code:\n\n${code}\n\nPlease provide corrected version.`;
  }
}

/**
 * React hook wrapper for the AI streaming service
 */
export const useAIStreaming = () => {
  const streamingService = AIStreamingService.getInstance();

  const startStream = async (
    prompt: string,
    options: {
      onChunk?: (chunk: string, fullResponse: string) => void;
      onError?: (error: Error) => void;
      onComplete?: (response: string) => void;
      onAutoFixNeeded?: (fixPrompt: string) => void;
      enableAutoFix?: boolean;
      affectedFiles?: string[];
    } = {}
  ) => {
    const streamId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const { processStreamChunk, processStreamEnd } = useStreamingErrorDetection(
      options.onAutoFixNeeded
    );

    return streamingService.startStreamWithErrorDetection(streamId, prompt, {
      ...options,
      onChunk: async (chunk, fullResponse) => {
        // Process with error detection
        await processStreamChunk(chunk, fullResponse);
        options.onChunk?.(chunk, fullResponse);
      },
      onComplete: async (response) => {
        // Process final response with error detection
        await processStreamEnd(response, options.affectedFiles);
        options.onComplete?.(response);
      }
    });
  };

  const cancelStream = (streamId: string) => {
    return streamingService.cancelStream(streamId);
  };

  const getActiveStreams = () => {
    return streamingService.getActiveStreams();
  };

  return {
    startStream,
    cancelStream,
    getActiveStreams
  };
};