import type { ExecuteOptions, ProcessedResponse, FileOperation, App } from '@/types';
import { AppManagementService } from './appManagementService';

export class ClaudeCodeService {
  private static instance: ClaudeCodeService;
  private isAvailable: boolean = false;
  private isElectron: boolean = false;
  private appManagementService: AppManagementService;

  private constructor() {
    this.isElectron = typeof window !== 'undefined' && (window as any).electronAPI;
    this.appManagementService = AppManagementService.getInstance();
  }

  public static getInstance(): ClaudeCodeService {
    if (!ClaudeCodeService.instance) {
      ClaudeCodeService.instance = new ClaudeCodeService();
    }
    return ClaudeCodeService.instance;
  }

  async checkAvailability(): Promise<boolean> {
    try {
      if (this.isElectron) {
        this.isAvailable = await (window as any).electronAPI.claudeCode.checkAvailability();
        return this.isAvailable;
      }
      // Simulate for web
      this.isAvailable = true;
      return true;
    } catch (error) {
      console.error('Failed to check Claude Code availability:', error);
      this.isAvailable = false;
      return false;
    }
  }

  async createAppFromPrompt(userPrompt: string): Promise<{ app: App; conversationId: number }> {
    const { app, conversationId } = await this.appManagementService.createApp({ userPrompt });
    
    // Get the prestige-ai folder path for execution
    let workingDirectory = '';
    if (this.isElectron) {
      workingDirectory = await (window as any).electronAPI.app.initializePrestigeFolder();
    }
    
    const response = await this.executePrompt(userPrompt, {
      context: `Create a new app named ${app.name} in the directory ${app.path}.`,
      cwd: workingDirectory ? `${workingDirectory}/${app.path}` : undefined,
    });
    const processedResponse = await this.processClaudeResponse(response);
    await this.appManagementService.addMessage(
      conversationId,
      'assistant',
      processedResponse.explanation,
      processedResponse.fileChanges,
    );
    return { app, conversationId };
  }

  async continueConversation(conversationId: number, userMessage: string): Promise<string> {
    await this.appManagementService.addMessage(conversationId, 'user', userMessage);
    const conversation = await this.appManagementService.getConversation(conversationId);
    const context = conversation?.messages?.map((m) => `${m.role}: ${m.content}`).join('\n') || '';
    const response = await this.executePrompt(userMessage, { context });
    return response;
  }

  async executePrompt(prompt: string, options: ExecuteOptions = {}): Promise<string> {
    if (!this.isAvailable) {
      throw new Error('Claude Code CLI is not available.');
    }
    let transformedPrompt = this.transformPromptForClaudeCode(prompt);
    if (options.context) {
      transformedPrompt = `${options.context}\n\n${transformedPrompt}`;
    }

    if (this.isElectron) {
      try {
        return await (window as any).electronAPI.claudeCode.execute(transformedPrompt, options);
      } catch (error) {
        if (error instanceof Error && (error.message.includes('limit reached') || error.message.includes('exit code 1'))) {
          return this.simulateClaudeCodeResponse(transformedPrompt);
        }
        throw error;
      }
    }
    return this.simulateClaudeCodeResponse(transformedPrompt);
  }

  transformPromptForClaudeCode(prompt: string): string {
    let transformed = prompt.replace(/Prestige-AI/g, 'this development environment');
    transformed = transformed.replace(/You are an AI assistant/g, 'You are helping with development');
    return `You are working in a development environment. Please help with the following request and create any necessary files or code as requested:\n\n${transformed}`;
  }

  async processClaudeResponse(response: string): Promise<ProcessedResponse> {
    const fileOperations = this.detectFileOperations(response);
    const fileChanges = fileOperations.map((op) => ({
      path: op.path,
      content: op.content,
      action: op.action,
    }));
    return {
      explanation: response,
      fileChanges,
      hasChanges: fileChanges.length > 0,
      rawResponse: response,
    };
  }

  private detectFileOperations(response: string): FileOperation[] {
    const operations: FileOperation[] = [];
    const codeBlockPattern = /```(?:[\w]*\n)?([\s\S]*?)```/g;
    const filePathPattern = /\/\/\s*([^\s]+\.[a-zA-Z]+)|#\s*([^\s]+\.[a-zA-Z]+)/;
    let match;
    while ((match = codeBlockPattern.exec(response)) !== null) {
      const lines = match[1].split('\n');
      const pathMatch = filePathPattern.exec(lines[0]);
      if (pathMatch) {
        operations.push({
          path: pathMatch[1] || pathMatch[2],
          content: lines.slice(1).join('\n'),
          action: 'create',
        });
      }
    }
    return operations;
  }

  private async simulateClaudeCodeResponse(prompt: string): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    if (prompt.toLowerCase().includes('react')) {
      return this.generateReactAppResponse();
    }
    return this.generateGenericResponse(prompt);
  }

  private generateReactAppResponse(): string {
    return `I'll create a React application for you.

\`\`\`tsx
// src/App.tsx
import React from 'react';

function App() {
  return <h1>My React App</h1>;
}

export default App;
\`\`\`

I've created a basic React application.`;
  }

  private generateGenericResponse(prompt: string): string {
    return `I can help with: "${prompt.substring(0, 50)}...". What would you like to do?`;
  }
}
