import { z } from 'zod';

// Enhanced conversation schemas based on @dyad
export const MessageSchema = z.object({
  id: z.number(),
  conversationId: z.number(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.number(),
  metadata: z.object({
    model: z.string().optional(),
    tokenCount: z.number().optional(),
    processingTime: z.number().optional(),
    temperature: z.number().optional(),
    contextFiles: z.array(z.string()).optional(),
    flowControlBlocked: z.boolean().optional(),
    integrationChecks: z.array(z.any()).optional(),
  }).optional(),
});
export type Message = z.infer<typeof MessageSchema>;

export const ConversationSchema = z.object({
  id: z.number(),
  appId: z.number(),
  title: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
  metadata: z.object({
    totalMessages: z.number().optional(),
    totalTokens: z.number().optional(),
    primaryModel: z.string().optional(),
    lastActiveAt: z.number().optional(),
    contextPaths: z.array(z.string()).optional(),
    integrationStatus: z.record(z.boolean()).optional(),
    sessionSummary: z.string().optional(),
  }).optional(),
});
export type Conversation = z.infer<typeof ConversationSchema>;

export const ContextFileSchema = z.object({
  path: z.string(),
  content: z.string(),
  timestamp: z.number(),
  tokens: z.number().optional(),
  includeInContext: z.boolean().default(true),
});
export type ContextFile = z.infer<typeof ContextFileSchema>;

export const ConversationContextSchema = z.object({
  conversationId: z.number(),
  maxContextTokens: z.number().default(100000),
  maxTurnsInContext: z.number().default(50),
  contextFiles: z.array(ContextFileSchema),
  smartContextEnabled: z.boolean().default(true),
  contextPaths: z.array(z.string()).default([]),
  excludePaths: z.array(z.string()).default([]),
});
export type ConversationContext = z.infer<typeof ConversationContextSchema>;

export interface ContextManagementOptions {
  includeFiles: boolean;
  includeHistory: boolean;
  maxHistoryTurns: number;
  maxTokens: number;
  smartContext: boolean;
  prioritizeRecent: boolean;
}

export class ConversationContextService {
  private static instance: ConversationContextService;
  private contextCache = new Map<number, ConversationContext>();
  private messageCache = new Map<number, Message[]>();

  static getInstance(): ConversationContextService {
    if (!ConversationContextService.instance) {
      ConversationContextService.instance = new ConversationContextService();
    }
    return ConversationContextService.instance;
  }

  /**
   * Get conversation with full context and message history
   */
  async getConversationWithContext(conversationId: number): Promise<{
    conversation: Conversation;
    messages: Message[];
    context: ConversationContext;
    totalTokens: number;
  }> {
    try {
      // Get conversation details from database
      const conversation = await window.electronAPI.db.getConversation(conversationId);
      if (!conversation) {
        throw new Error(`Conversation ${conversationId} not found`);
      }

      // Get messages for this conversation
      const messages = await this.getMessagesForConversation(conversationId);
      
      // Get or create context
      const context = await this.getConversationContext(conversationId);
      
      // Calculate total tokens
      const totalTokens = messages.reduce((sum, msg) => 
        sum + (msg.metadata?.tokenCount || 0), 0
      );

      return {
        conversation,
        messages,
        context,
        totalTokens,
      };
    } catch (error) {
      console.error('Failed to get conversation with context:', error);
      throw error;
    }
  }

  /**
   * Get messages for a conversation with smart context management
   */
  async getMessagesForConversation(conversationId: number): Promise<Message[]> {
    // Check cache first
    if (this.messageCache.has(conversationId)) {
      return this.messageCache.get(conversationId)!;
    }

    try {
      // Get conversation data from electron API
      const conversation = await window.electronAPI.db.getConversation(conversationId);
      if (!conversation || !conversation.messages) {
        return [];
      }

      // Convert to our Message schema
      const messages: Message[] = conversation.messages.map((msg: any, index: number) => ({
        id: msg.id || index,
        conversationId: conversationId,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp || Date.now(),
        metadata: msg.metadata || {},
      }));

      // Cache messages
      this.messageCache.set(conversationId, messages);
      
      return messages;
    } catch (error) {
      console.error('Failed to get messages for conversation:', error);
      return [];
    }
  }

  /**
   * Add a new message to conversation with context tracking
   */
  async addMessage(
    conversationId: number, 
    message: Omit<Message, 'id' | 'conversationId'>
  ): Promise<Message> {
    try {
      // Add message to database
      const newMessage = await window.electronAPI.db.addMessage({
        conversationId,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp,
        metadata: message.metadata || {},
      });

      // Convert to our Message schema
      const formattedMessage: Message = {
        id: newMessage.id,
        conversationId: conversationId,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp,
        metadata: message.metadata,
      };

      // Update cache
      const cachedMessages = this.messageCache.get(conversationId) || [];
      cachedMessages.push(formattedMessage);
      this.messageCache.set(conversationId, cachedMessages);

      // Update conversation context
      await this.updateConversationContext(conversationId, formattedMessage);

      return formattedMessage;
    } catch (error) {
      console.error('Failed to add message:', error);
      throw error;
    }
  }

  /**
   * Get or create conversation context
   */
  async getConversationContext(conversationId: number): Promise<ConversationContext> {
    // Check cache first
    if (this.contextCache.has(conversationId)) {
      return this.contextCache.get(conversationId)!;
    }

    try {
      // Try to get existing context from storage or create default
      const defaultContext: ConversationContext = {
        conversationId,
        maxContextTokens: 100000,
        maxTurnsInContext: 50,
        contextFiles: [],
        smartContextEnabled: true,
        contextPaths: [],
        excludePaths: [
          'node_modules/**',
          '.git/**',
          'dist/**',
          'build/**',
          '**/*.log',
        ],
      };

      // Cache and return
      this.contextCache.set(conversationId, defaultContext);
      return defaultContext;
    } catch (error) {
      console.error('Failed to get conversation context:', error);
      throw error;
    }
  }

  /**
   * Update conversation context with new message
   */
  async updateConversationContext(conversationId: number, message: Message): Promise<void> {
    try {
      const context = await this.getConversationContext(conversationId);
      
      // Update context based on message content
      if (message.role === 'user') {
        // Analyze user message for context hints
        const contextFiles = this.extractContextFilesFromMessage(message.content);
        
        // Add any new context files
        for (const filePath of contextFiles) {
          if (!context.contextFiles.find(f => f.path === filePath)) {
            try {
              const fileContent = await window.electronAPI.fs.readFile(filePath);
              const tokens = this.estimateTokenCount(fileContent);
              
              context.contextFiles.push({
                path: filePath,
                content: fileContent,
                timestamp: Date.now(),
                tokens,
                includeInContext: true,
              });
            } catch (error) {
              console.warn(`Could not read context file ${filePath}:`, error);
            }
          }
        }
      }

      // Update cache
      this.contextCache.set(conversationId, context);
      
      // Trim context if it's getting too large
      await this.trimContextIfNeeded(conversationId);
    } catch (error) {
      console.error('Failed to update conversation context:', error);
    }
  }

  /**
   * Extract file paths mentioned in user message
   */
  private extractContextFilesFromMessage(content: string): string[] {
    const filePaths: string[] = [];
    
    // Look for file path patterns
    const filePatterns = [
      /(?:^|\s)([a-zA-Z0-9_\-./\\]+\.[a-zA-Z]{1,10})(?:\s|$)/g, // file.ext
      /(?:src|app|pages|components|lib|utils)\/[a-zA-Z0-9_\-./]+/g, // common folders
      /\.\/[a-zA-Z0-9_\-./]+/g, // relative paths
    ];

    for (const pattern of filePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        filePaths.push(...matches.map(m => m.trim()));
      }
    }

    return [...new Set(filePaths)]; // Remove duplicates
  }

  /**
   * Build conversation context for AI prompt
   */
  async buildContextForPrompt(
    conversationId: number, 
    options: Partial<ContextManagementOptions> = {}
  ): Promise<{
    context: string;
    tokenCount: number;
    includedFiles: string[];
    includedMessages: number;
  }> {
    const defaultOptions: ContextManagementOptions = {
      includeFiles: true,
      includeHistory: true,
      maxHistoryTurns: 20,
      maxTokens: 80000,
      smartContext: true,
      prioritizeRecent: true,
    };
    
    const opts = { ...defaultOptions, ...options };
    
    try {
      const { messages, context } = await this.getConversationWithContext(conversationId);
      
      let contextParts: string[] = [];
      let tokenCount = 0;
      let includedFiles: string[] = [];
      let includedMessages = 0;

      // Add file context if enabled
      if (opts.includeFiles && context.contextFiles.length > 0) {
        const fileContexts = context.contextFiles
          .filter(f => f.includeInContext)
          .sort((a, b) => b.timestamp - a.timestamp) // Most recent first
          .slice(0, 10); // Limit to 10 files

        for (const file of fileContexts) {
          const fileTokens = file.tokens || this.estimateTokenCount(file.content);
          
          if (tokenCount + fileTokens <= opts.maxTokens * 0.3) { // Use max 30% for files
            contextParts.push(`File: ${file.path}\n\`\`\`\n${file.content}\n\`\`\`\n`);
            tokenCount += fileTokens;
            includedFiles.push(file.path);
          }
        }
      }

      // Add message history if enabled
      if (opts.includeHistory && messages.length > 0) {
        const relevantMessages = opts.prioritizeRecent 
          ? messages.slice(-opts.maxHistoryTurns * 2) // Recent messages
          : messages.slice(0, opts.maxHistoryTurns * 2); // Older messages

        for (const message of relevantMessages.reverse()) {
          const messageTokens = message.metadata?.tokenCount || this.estimateTokenCount(message.content);
          
          if (tokenCount + messageTokens <= opts.maxTokens && includedMessages < opts.maxHistoryTurns) {
            contextParts.unshift(`${message.role}: ${message.content}`);
            tokenCount += messageTokens;
            includedMessages++;
          } else {
            break;
          }
        }
      }

      const finalContext = contextParts.join('\n\n');

      return {
        context: finalContext,
        tokenCount,
        includedFiles,
        includedMessages,
      };
    } catch (error) {
      console.error('Failed to build context for prompt:', error);
      return {
        context: '',
        tokenCount: 0,
        includedFiles: [],
        includedMessages: 0,
      };
    }
  }

  /**
   * Trim context if it's getting too large
   */
  async trimContextIfNeeded(conversationId: number): Promise<void> {
    try {
      const context = this.contextCache.get(conversationId);
      if (!context) return;

      const totalTokens = context.contextFiles.reduce((sum, file) => 
        sum + (file.tokens || 0), 0
      );

      if (totalTokens > context.maxContextTokens) {
        // Sort by timestamp and remove oldest files
        context.contextFiles.sort((a, b) => b.timestamp - a.timestamp);
        
        let currentTokens = 0;
        const keepFiles: ContextFile[] = [];
        
        for (const file of context.contextFiles) {
          const fileTokens = file.tokens || 0;
          if (currentTokens + fileTokens <= context.maxContextTokens * 0.8) {
            keepFiles.push(file);
            currentTokens += fileTokens;
          }
        }
        
        context.contextFiles = keepFiles;
        this.contextCache.set(conversationId, context);
        
        console.log(`Trimmed context for conversation ${conversationId}: ${keepFiles.length} files, ${currentTokens} tokens`);
      }
    } catch (error) {
      console.error('Failed to trim context:', error);
    }
  }

  /**
   * Estimate token count for text (rough approximation)
   */
  private estimateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
  }

  /**
   * Clear cache for conversation
   */
  clearConversationCache(conversationId: number): void {
    this.contextCache.delete(conversationId);
    this.messageCache.delete(conversationId);
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.contextCache.clear();
    this.messageCache.clear();
  }

  /**
   * Get conversation summary for context
   */
  async getConversationSummary(conversationId: number): Promise<string> {
    try {
      const { messages } = await this.getConversationWithContext(conversationId);
      
      if (messages.length === 0) {
        return 'No messages in this conversation yet.';
      }

      // Simple summary generation
      const userMessages = messages.filter(m => m.role === 'user').length;
      const assistantMessages = messages.filter(m => m.role === 'assistant').length;
      const totalMessages = messages.length;
      
      const latestMessage = messages[messages.length - 1];
      const firstMessage = messages[0];
      
      return `Conversation with ${totalMessages} messages (${userMessages} from user, ${assistantMessages} from assistant). Started ${new Date(firstMessage.timestamp).toLocaleDateString()}. Latest activity: ${new Date(latestMessage.timestamp).toLocaleString()}.`;
    } catch (error) {
      console.error('Failed to generate conversation summary:', error);
      return 'Unable to generate conversation summary.';
    }
  }
}

export const conversationContextService = ConversationContextService.getInstance();