import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { PrestigeMarkdownRenderer } from '@/components/chat/PrestigeMarkdownRenderer';
import { ThinkingDisplay } from '@/components/chat/ThinkingDisplay';
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
}

export function PrestigeChatArea({ 
  currentApp,
  currentConversation,
  isStreamingResponse,
  streamingContent,
  isGenerating,
  onStopGeneration
}: PrestigeChatAreaProps) {
  
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
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="p-6 space-y-6">
        {/* Messages */}
        {currentConversation?.messages?.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        
        {/* Streaming Response */}
        {isStreamingResponse && streamingContent && (
          <div className="flex gap-4 justify-start animate-fade-in">
            {/* AI Avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0 shadow-md">
              <Bot className="w-5 h-5 text-white" />
            </div>
            
            {/* Streaming Content */}
            <div className="max-w-4xl flex-1">
              <Card className="border-primary/20 shadow-md">
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">Prestige AI</span>
                      <div className="flex items-center gap-1">
                        <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                        <div className="w-1 h-1 rounded-full bg-primary animate-pulse" style={{animationDelay: '0.2s'}} />
                        <div className="w-1 h-1 rounded-full bg-primary animate-pulse" style={{animationDelay: '0.4s'}} />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground font-medium">
                        Thinking...
                      </span>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={onStopGeneration}
                        className="h-7 px-3 text-xs"
                      >
                        <StopCircle className="w-3 h-3 mr-1" />
                        Stop
                      </Button>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="prose prose-sm max-w-none space-y-4">
                    {/* Extract thinking content */}
                    {(() => {
                      const thinkingMatch = streamingContent.match(/<think>([\s\S]*?)<\/think>/);
                      const thinkingContent = thinkingMatch ? thinkingMatch[1] : '';
                      const responseContent = streamingContent.replace(/<think>[\s\S]*?<\/think>\s*/, '');
                      
                      return (
                        <>
                          {thinkingContent && (
                            <div className="mb-6">
                              <div className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                Thinking Process
                              </div>
                              <ThinkingDisplay content={thinkingContent} isActive={true} />
                            </div>
                          )}
                          {responseContent && (
                            <PrestigeMarkdownRenderer content={responseContent} isStreaming={true} />
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
        
        {/* Non-streaming Loading */}
        {isGenerating && !isStreamingResponse && (
          <div className="flex items-center justify-center py-8 animate-fade-in">
            <Card className="border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                    <Loader className="w-5 h-5 text-white animate-spin" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Prestige AI is thinking</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{animationDelay: '0.3s'}} />
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{animationDelay: '0.6s'}} />
                      </div>
                      <span>Processing your request...</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}