import { AppManagementService } from './appManagementService';
import { CodebaseExtractionService } from './codebaseExtractionService';
import { MessageProcessingService } from './messageProcessingService';
import { resolveAppPaths } from '@/utils/appPathResolver';
export class ClaudeCodeService {
    constructor() {
        Object.defineProperty(this, "isAvailable", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "isElectron", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "appManagementService", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "codebaseService", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "messageProcessor", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.isElectron = typeof window !== 'undefined' && window.electronAPI;
        this.appManagementService = AppManagementService.getInstance();
        this.codebaseService = CodebaseExtractionService.getInstance();
        this.messageProcessor = MessageProcessingService.getInstance();
        // Initialize availability check
        this.checkAvailability().catch(error => {
            console.error('Failed to check Claude Code availability during service initialization:', error);
        });
    }
    static getInstance() {
        if (!ClaudeCodeService.instance) {
            ClaudeCodeService.instance = new ClaudeCodeService();
        }
        return ClaudeCodeService.instance;
    }
    async checkAvailability() {
        try {
            if (this.isElectron) {
                // Use the new status check that provides more detailed information
                const status = await window.electronAPI.claudeCode.checkStatus();
                this.isAvailable = status.available;
                if (status.available && status.hasUsageLimit) {
                    console.warn('Claude Code CLI is installed but has usage limits:', status.error);
                }
                else if (!status.available) {
                    console.warn('Claude Code CLI is not available:', status.error);
                }
                return this.isAvailable;
            }
            // Simulate for web
            this.isAvailable = true;
            return true;
        }
        catch (error) {
            console.error('Failed to check Claude Code availability:', error);
            this.isAvailable = false;
            return false;
        }
    }
    async createAppFromPrompt(userPrompt) {
        const { app, conversationId } = await this.appManagementService.createApp({ userPrompt });
        // Get the prestige-ai folder path for execution
        let workingDirectory = '';
        if (this.isElectron) {
            workingDirectory = await window.electronAPI.app.initializePrestigeFolder();
        }
        // Get app path
        const appPath = workingDirectory ? `${workingDirectory}/${app.path}` : '';
        // For new apps, extract the scaffold codebase as starting context
        let codebaseInfo = '';
        try {
            if (appPath) {
                const fullAppPath = await window.electronAPI.path.join(workingDirectory, app.path);
                const { formattedOutput } = await this.codebaseService.extractCodebase(fullAppPath);
                codebaseInfo = formattedOutput;
            }
        }
        catch (error) {
            console.warn('Could not extract scaffold codebase for new app:', error);
            codebaseInfo = 'No existing codebase found. This is a new application.';
        }
        // Create messages in CCdyad format for new app creation
        const chatMessages = [
            {
                role: 'user',
                content: `This is my codebase. ${codebaseInfo}`
            },
            {
                role: 'assistant',
                content: 'OK, got it. I\'m ready to help'
            },
            {
                role: 'user',
                content: userPrompt
            }
        ];
        const response = await this.executeWithMessages(chatMessages, {
            cwd: appPath,
            chatMode: 'build'
        });
        const processedResponse = await this.processClaudeResponse(response);
        await this.appManagementService.addMessage(conversationId, 'assistant', processedResponse.explanation, processedResponse.fileChanges);
        return { app, conversationId };
    }
    async continueConversation(conversationId, userMessage, chatMode = 'build') {
        await this.appManagementService.addMessage(conversationId, 'user', userMessage);
        const conversation = await this.appManagementService.getConversation(conversationId);
        if (!conversation?.appId) {
            throw new Error('No app associated with this conversation');
        }
        // Get the app and extract codebase (like CCdyad)
        const app = await this.appManagementService.getApp(conversation.appId);
        if (!app) {
            throw new Error('App not found');
        }
        // Resolve absolute app root via shared utility
        const { appRoot: appPath } = await resolveAppPaths(app);
        // Extract full codebase context (like CCdyad)
        const { formattedOutput: codebaseInfo } = await this.codebaseService.extractCodebase(appPath);
        console.log(`Extracted codebase information from ${appPath}`, `codebase length: ${codebaseInfo.length}, estimated tokens: ${codebaseInfo.length / 4}`);
        // Limit chat history by turns (like CCdyad) - max 10 turns
        const maxChatTurns = 10;
        const limitedHistory = this.messageProcessor.limitChatHistory(conversation.messages || [], maxChatTurns);
        // Prepare chat messages with codebase prefix (like CCdyad)
        const chatMessages = this.messageProcessor.prepareChatMessages(codebaseInfo, limitedHistory, chatMode);
        // Use the new message-based execution
        const response = await this.executeWithMessages(chatMessages, { cwd: appPath, chatMode });
        return response;
    }
    async executeWithMessages(messages, options = {}) {
        if (!this.isAvailable) {
            throw new Error('Claude Code CLI is not available.');
        }
        // Convert messages to a single prompt format for Claude Code CLI
        const conversationPrompt = this.formatMessagesForClaudeCode(messages, options.chatMode);
        if (this.isElectron) {
            try {
                return await window.electronAPI.claudeCode.execute(conversationPrompt, {
                    cwd: options.cwd
                });
            }
            catch (error) {
                if (error instanceof Error && (error.message.includes('limit reached') || error.message.includes('exit code 1'))) {
                    return this.simulateClaudeCodeResponse(conversationPrompt);
                }
                throw error;
            }
        }
        return this.simulateClaudeCodeResponse(conversationPrompt);
    }
    formatMessagesForClaudeCode(messages, chatMode = 'build') {
        // Format conversation in a way Claude Code can understand
        let prompt = `You are Prestige AI, an AI editor that creates and modifies web applications. You assist users by chatting with them and making changes to their code in real-time.\n\n`;
        if (chatMode === 'ask') {
            prompt += `You are in "ask" mode - provide explanations and guidance without making code changes. Do not use any prestige-write, prestige-edit, or prestige-delete tags.\n\n`;
        }
        else {
            prompt += `You are in "build" mode - you can make changes to the codebase using prestige-write, prestige-edit, and prestige-delete tags.\n\n`;
        }
        // Add the conversation
        for (let i = 0; i < messages.length; i++) {
            const message = messages[i];
            const role = message.role.charAt(0).toUpperCase() + message.role.slice(1);
            prompt += `${role}: ${message.content}\n\n`;
        }
        // Add final instruction
        prompt += `Assistant: `;
        return prompt;
    }
    async executePrompt(prompt, options = {}) {
        if (!this.isAvailable) {
            throw new Error('Claude Code CLI is not available.');
        }
        const mode = options.mode || 'edit';
        let transformedPrompt = this.transformPromptForClaudeCode(prompt, mode);
        if (options.context) {
            transformedPrompt = `${options.context}\n\n${transformedPrompt}`;
        }
        if (this.isElectron) {
            try {
                return await window.electronAPI.claudeCode.execute(transformedPrompt, options);
            }
            catch (error) {
                if (error instanceof Error && (error.message.includes('limit reached') || error.message.includes('exit code 1'))) {
                    return this.simulateClaudeCodeResponse(transformedPrompt);
                }
                throw error;
            }
        }
        return this.simulateClaudeCodeResponse(transformedPrompt);
    }
    transformPromptForClaudeCode(prompt, mode = 'edit') {
        let transformed = prompt.replace(/Prestige-AI/g, 'this development environment');
        transformed = transformed.replace(/You are an AI assistant/g, 'You are helping with development');
        // Different prompt prefixes based on mode
        switch (mode) {
            case 'create':
                return `You are working in a development environment. Please create a new application with the following requirements. Generate all necessary files and implement the complete functionality:\n\n${transformed}`;
            case 'fix':
                return `You are working on an existing application that has errors. Please analyze the errors and fix them with minimal changes. Only modify the specific files and lines that are causing the issues:\n\n${transformed}`;
            case 'edit':
            default:
                return `You are working on an existing application. Please make the requested changes to the existing codebase. Make incremental updates without recreating the entire application:\n\n${transformed}`;
        }
    }
    async processClaudeResponse(response) {
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
    detectFileOperations(response) {
        const operations = [];
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
    async simulateClaudeCodeResponse(prompt) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        if (prompt.toLowerCase().includes('react')) {
            return this.generateReactAppResponse();
        }
        return this.generateGenericResponse(prompt);
    }
    generateReactAppResponse() {
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
    generateGenericResponse(prompt) {
        return `I can help with: "${prompt.substring(0, 50)}...". What would you like to do?`;
    }
}
