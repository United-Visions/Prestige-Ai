import type { Message } from '@/types';

export interface CoreMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class MessageProcessingService {
  private static instance: MessageProcessingService;

  private constructor() {}

  public static getInstance(): MessageProcessingService {
    if (!MessageProcessingService.instance) {
      MessageProcessingService.instance = new MessageProcessingService();
    }
    return MessageProcessingService.instance;
  }

  /**
   * Removes non-essential tags from message content to save tokens
   */
  removeNonEssentialTags(content: string): string {
    // Remove thinking tags
    content = content.replace(/<think>[\s\S]*?<\/think>/g, '');
    
    // Remove any other non-essential tags but keep prestige tags
    content = content.replace(/<prestige-chat-summary>[\s\S]*?<\/prestige-chat-summary>/g, '');
    
    return content.trim();
  }

  /**
   * Remove all prestige tags for "ask" mode
   */
  removePrestigeTags(content: string): string {
    // Remove all prestige-* tags
    content = content.replace(/<prestige-[^>]*>[\s\S]*?<\/prestige-[^>]*>/g, '');
    content = content.replace(/<prestige-[^>]*\/>/g, '');
    
    return content.trim();
  }

  /**
   * Limit chat history based on turn pairs (user-assistant pairs)
   * Similar to CCdyad's approach
   */
  limitChatHistory(messages: Message[], maxChatTurns: number): CoreMessage[] {
    // Convert to CoreMessage format
    const messageHistory: CoreMessage[] = messages.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content
    }));

    // If we need to limit the context, we take only the most recent turns
    let limitedMessageHistory = messageHistory;
    
    if (messageHistory.length > maxChatTurns * 2) {
      // Each turn is a user + assistant pair
      // Calculate how many messages to keep (maxChatTurns * 2)
      let recentMessages = messageHistory
        .filter((msg) => msg.role !== 'system')
        .slice(-maxChatTurns * 2);

      // Ensure the first message is a user message
      if (recentMessages.length > 0 && recentMessages[0].role !== 'user') {
        // Find the first user message
        const firstUserIndex = recentMessages.findIndex(
          (msg) => msg.role === 'user'
        );
        if (firstUserIndex > 0) {
          // Drop assistant messages before the first user message
          recentMessages = recentMessages.slice(firstUserIndex);
        } else if (firstUserIndex === -1) {
          console.warn(
            'No user messages found in recent history, set recent messages to empty'
          );
          recentMessages = [];
        }
      }

      limitedMessageHistory = [...recentMessages];
      
      console.log(
        `Limiting chat history from ${messageHistory.length} to ${limitedMessageHistory.length} messages (max ${maxChatTurns} turns)`
      );
    }

    return limitedMessageHistory;
  }

  /**
   * Prepare chat messages in CCdyad format with codebase prefix
   */
  prepareChatMessages(
    codebaseInfo: string,
    limitedHistory: CoreMessage[],
    chatMode: 'build' | 'ask' = 'build'
  ): CoreMessage[] {
    // Codebase prefix (like CCdyad)
    const codebasePrefix: CoreMessage[] = [
      {
        role: 'user',
        content: `This is my codebase. ${codebaseInfo}`
      },
      {
        role: 'assistant',
        content: 'OK, got it. I\'m ready to help'
      }
    ];

    // Process message history with tag cleanup
    const processedHistory = limitedHistory.map(msg => ({
      role: msg.role,
      content: chatMode === 'ask' 
        ? this.removePrestigeTags(this.removeNonEssentialTags(msg.content))
        : this.removeNonEssentialTags(msg.content)
    }));

    return [
      ...codebasePrefix,
      ...processedHistory
    ];
  }
}