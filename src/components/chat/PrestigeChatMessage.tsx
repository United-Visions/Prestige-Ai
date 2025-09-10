import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Message } from '@/types';
import { formatTimestamp } from '@/lib/utils';
import { User, Bot, FileText, Download, Crown, Sparkles, Copy, Check } from 'lucide-react';
import { EnhancedMarkdownRenderer } from './EnhancedMarkdownRenderer';
import { useState } from 'react';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const [isCopied, setIsCopied] = useState(false);
  
  const handleDownloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  return (
    <div className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'} group animate-fade-in`}>
      {/* Avatar */}
      {!isUser && (
        <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0 shadow-md group-hover:shadow-lg transition-shadow duration-200">
          <Crown className="w-5 h-5 text-white" />
        </div>
      )}
      
      {isUser && (
        <div className="w-10 h-10 rounded-full bg-gradient-secondary flex items-center justify-center flex-shrink-0 shadow-md order-2">
          <User className="w-5 h-5 text-secondary-foreground" />
        </div>
      )}
      
      {/* Message Content */}
      <div className={`max-w-3xl ${isUser ? 'order-1' : ''}`}>
        <Card className={`${
          isUser 
            ? 'bg-gradient-primary text-white border-primary/20 shadow-lg' 
            : 'bg-card border-border shadow-md hover:shadow-lg'
        } transition-all duration-200 group-hover:shadow-lg`}>
          <CardContent className="p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${
                  isUser ? 'text-white' : 'text-foreground'
                }`}>
                  {isUser ? 'You' : 'Prestige AI'}
                </span>
                {!isUser && (
                  <Badge variant="secondary" className="text-xs px-2 py-0.5">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Elite
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <span className={`text-xs ${
                  isUser ? 'text-white/70' : 'text-muted-foreground'
                }`}>
                  {formatTimestamp(message.createdAt)}
                </span>
                
                {/* Copy Button */}
                <Button
                  size="sm"
                  variant="ghost"
                  className={`w-7 h-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity ${
                    isUser 
                      ? 'hover:bg-white/10 text-white/70 hover:text-white' 
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={handleCopyMessage}
                >
                  {isCopied ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </div>
            
            {/* Message Content */}
            <div className={`${
              isUser ? 'text-white' : 'text-foreground'
            }`}>
              {isUser ? (
                <div className="whitespace-pre-wrap text-base leading-relaxed">
                  {message.content}
                </div>
              ) : (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <EnhancedMarkdownRenderer 
                    content={message.content} 
                    isStreaming={false} 
                  />
                </div>
              )}
            </div>
            
            {/* File Changes */}
            {message.fileChanges && Array.isArray(message.fileChanges) && message.fileChanges.length > 0 && (
              <div className="mt-5 space-y-3">
                <div className={`text-sm font-semibold flex items-center gap-2 ${
                  isUser ? 'text-white' : 'text-foreground'
                }`}>
                  <FileText className="w-4 h-4" />
                  Generated Files ({message.fileChanges.length})
                </div>
                
                <div className="space-y-2">
                  {message.fileChanges.map((file, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${
                        isUser 
                          ? 'bg-white/10 border-white/20' 
                          : 'bg-muted/30 border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-medium font-mono ${
                          isUser ? 'text-white' : 'text-foreground'
                        }`}>
                          {file.path || file.name || 'Unknown file'}
                        </span>
                        <Button
                          size="sm"
                          variant={isUser ? "ghost" : "outline"}
                          className={`h-7 px-3 text-xs ${
                            isUser 
                              ? 'hover:bg-white/10 text-white/80 hover:text-white' 
                              : ''
                          }`}
                          onClick={() => handleDownloadFile(file.path || file.name || 'file.txt', file.content)}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Download
                        </Button>
                      </div>
                      
                      <div className={`text-xs ${
                        isUser ? 'text-white/60' : 'text-muted-foreground'
                      }`}>
                        {file.content.split('\n').length} lines • {file.content.length} characters
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export { ChatMessage as PrestigeChatMessage };