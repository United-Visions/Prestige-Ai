import React, { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { PrestigeMarkdownRenderer } from '@/components/chat/PrestigeMarkdownRenderer';
import { ThinkingDisplay } from '@/components/chat/ThinkingDisplay';
import { AIThinkingIndicator } from '@/components/chat/AIThinkingIndicator';
import {
  Crown,
  Sparkles,
  Loader,
  StopCircle,
  Bot,
  Zap
} from 'lucide-react';
import type { Message } from '@/types';

interface PrestigeChatAreaProps {
  currentApp?: { name: string } | null;
  currentConversation?: { messages?: Message[] } | null;
  isStreamingResponse: boolean;
  streamingContent: string;
  isGenerating: boolean;
  onStopGeneration: () => void;
  pendingUserMessage?: Message | null;
}

export function PrestigeChatArea({
  currentApp,
  currentConversation,
  isStreamingResponse,
  streamingContent,
  isGenerating,
  onStopGeneration,
  pendingUserMessage
}: PrestigeChatAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const smoothScrollToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  };

  useEffect(() => {
    // Scroll when new tokens arrive
    if (isStreamingResponse) {
      smoothScrollToBottom();
    }
  }, [isStreamingResponse, streamingContent]);

  useEffect(() => {
    // Scroll when messages list changes (new user/assistant messages)
    smoothScrollToBottom();
  }, [currentConversation?.messages?.length, pendingUserMessage]);
  
  // No current app state
  if (!currentApp) {
    return null; // This will be handled by the welcome screen
  }
  
  // App exists but no conversation
  if (!currentConversation) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md space-y-6">
          {/* App Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
          </div>
          
          {/* App Welcome */}
          <div className="space-y-3">
            <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
              <Crown className="w-6 h-6 text-primary" />
              {currentApp.name}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Your premium development environment is ready. Start a conversation to begin 
              building, refining, and enhancing your project with AI assistance.
            </p>
          </div>
          
          {/* Status Indicators */}
          <div className="flex justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-muted-foreground">Project Active</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-3 h-3 text-accent" />
              <span className="text-muted-foreground">AI Ready</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Active conversation
  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar bg-gradient-to-br from-gray-50/50 to-blue-50/30 dark:from-gray-950/50 dark:to-blue-950/30">
      <div className="p-6 space-y-6">
        {/* Existing Messages */}
        {currentConversation?.messages?.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {/* Pending User Message */}
        {pendingUserMessage && (
          <ChatMessage key={`pending-${pendingUserMessage.id}`} message={pendingUserMessage} />
        )}
        
        {/* Enhanced Streaming Response */}
        {isStreamingResponse && streamingContent && (
          <div className="flex gap-4 justify-start animate-slide-in-left">
            {/* Enhanced AI Avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-md border-2 border-purple-300 relative animate-pulse-slow">
              <Crown className="w-5 h-5 text-white" />
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center animate-spin">
                <Sparkles className="w-2 h-2 text-white" />
              </div>
              {/* Streaming Animation Ring */}
              <div className="absolute inset-0 rounded-full border-2 border-purple-300 animate-ping opacity-75"></div>
            </div>

            {/* Enhanced Streaming Content */}
            <div className="max-w-4xl flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Prestige AI
                </span>
                <div className="flex items-center gap-1">
                  <div className="w-1 h-1 rounded-full bg-purple-500 animate-pulse"></div>
                  <div className="w-1 h-1 rounded-full bg-pink-500 animate-pulse" style={{animationDelay: '0.2s'}}></div>
                  <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" style={{animationDelay: '0.4s'}}></div>
                </div>
                <span className="text-xs text-muted-foreground">
                  streaming...
                </span>
              </div>

              <Card className="border-purple-200 bg-gradient-to-br from-white to-purple-50 dark:from-gray-900 dark:to-purple-950 shadow-lg animate-block-appear">
                <CardContent className="p-6">
                  {/* Enhanced Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center animate-pulse">
                        <Zap className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-foreground">
                          Generating Response
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Real-time AI processing
                        </div>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={onStopGeneration}
                      className="h-8 px-3 text-xs hover:scale-105 transition-transform"
                    >
                      <StopCircle className="w-3 h-3 mr-1" />
                      Stop
                    </Button>
                  </div>

                  {/* Enhanced Content with Typing Effect */}
                  <div className="prose prose-sm max-w-none space-y-4">
                    {(() => {
                      const thinkingMatch = streamingContent.match(/<think>([\s\S]*?)<\/think>/);
                      const thinkingContent = thinkingMatch ? thinkingMatch[1] : '';
                      const responseContent = streamingContent.replace(/<think>[\s\S]*?<\/think>\s*/, '');

                      return (
                        <>
                          {thinkingContent && (
                            <div className="mb-6 animate-block-expand">
                              <div className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-3 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                                AI Thinking Process
                              </div>
                              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                                <ThinkingDisplay content={thinkingContent} isActive={true} />
                              </div>
                            </div>
                          )}
                          {responseContent && (
                            <div className="typing-cursor">
                              <PrestigeMarkdownRenderer content={responseContent} isStreaming={true} />
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
        
        {/* AI Thinking Indicator */}
        {isGenerating && !isStreamingResponse && (
          <AIThinkingIndicator
            onStop={onStopGeneration}
            stage={pendingUserMessage ? 'thinking' : 'processing'}
          />
        )}
      </div>
    </div>
  );
}