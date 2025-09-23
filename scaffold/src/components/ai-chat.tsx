import React, { useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Loader2, MessageSquare, Send } from 'lucide-react';
import { streamChatWithAI, isAIConfigured, getAPIKeyInstructions } from '@/lib/ai';
import { Alert, AlertDescription } from './ui/alert';
import { ScrollArea } from './ui/scroll-area';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface AIChatProps {
  title?: string;
  description?: string;
  systemPrompt?: string;
  placeholder?: string;
}

export function AIChat({
  title = "AI Chat Assistant",
  description = "Chat with AI powered by Gemini 2.5 Flash",
  systemPrompt = "You are a helpful AI assistant. Provide clear, concise, and helpful responses.",
  placeholder = "Type your message..."
}: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'system',
      content: systemPrompt,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setStreamingMessage('');

    const assistantMessage: Message = {
      role: 'assistant',
      content: '',
      timestamp: new Date()
    };

    try {
      await streamChatWithAI(
        [...messages, userMessage].map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        (chunk) => {
          setStreamingMessage(prev => prev + chunk);
        }
      );

      // Add the complete message
      setMessages(prev => [...prev, {
        ...assistantMessage,
        content: streamingMessage
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        ...assistantMessage,
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
      }]);
    } finally {
      setIsLoading(false);
      setStreamingMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isAIConfigured()) {
    const instructions = getAPIKeyInstructions();
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <MessageSquare className="w-4 h-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p><strong>AI not configured.</strong> To use chat features, you need a {instructions.provider} API key:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  {instructions.instructions.map((instruction, index) => (
                    <li key={index}>{instruction}</li>
                  ))}
                </ol>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const visibleMessages = messages.filter(msg => msg.role !== 'system');

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          {title}
        </CardTitle>
        <CardDescription className="flex items-center gap-2">
          {description}
          <Badge variant="secondary">Gemini 2.5 Flash</Badge>
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col space-y-4 p-4">
        <ScrollArea className="flex-1">
          <div className="space-y-4 pr-4">
            {visibleMessages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            
            {/* Streaming message */}
            {isLoading && streamingMessage && (
              <div className="flex justify-start">
                <div className="max-w-[80%] p-3 rounded-lg bg-muted">
                  <p className="whitespace-pre-wrap">{streamingMessage}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span className="text-xs opacity-70">AI is typing...</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Loading indicator without streaming */}
            {isLoading && !streamingMessage && (
              <div className="flex justify-start">
                <div className="p-3 rounded-lg bg-muted">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        
        <div className="flex gap-2">
          <Textarea
            placeholder={placeholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 min-h-[60px] max-h-[120px]"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="sm"
            className="self-end"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}