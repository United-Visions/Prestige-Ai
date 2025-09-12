import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Message } from '@/types';
import { formatTimestamp } from '@/lib/utils';
import { User, Bot, FileText, Download } from 'lucide-react';
import { PrestigeMarkdownRenderer } from './PrestigeMarkdownRenderer';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  
  const handleDownloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
          <Bot className="w-4 h-4 text-primary-foreground" />
        </div>
      )}
      
      <div className={`max-w-2xl ${isUser ? 'ml-12' : 'mr-12'}`}>
        <Card className={isUser ? 'bg-primary text-primary-foreground' : ''}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <span className="text-sm font-medium">
                {isUser ? 'You' : 'Claude'}
              </span>
              <span className="text-xs opacity-70">
                {formatTimestamp(message.createdAt)}
              </span>
            </div>
            
            <div className="whitespace-pre-wrap">
              {isUser ? message.content : <PrestigeMarkdownRenderer content={message.content} isStreaming={false} />}
            </div>
            
            {message.fileChanges && Array.isArray(message.fileChanges) && message.fileChanges.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="text-sm font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Generated Files ({message.fileChanges.length})
                </div>
                
                {message.fileChanges.map((file, index) => (
                  <div
                    key={index}
                    className="bg-muted rounded-lg p-3 border"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-sm">{file.path}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                          {file.action}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadFile(file.path, file.content)}
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    
                    {file.content && (
                      <pre className="text-xs bg-background p-2 rounded border overflow-x-auto">
                        <code>{file.content.slice(0, 500)}{file.content.length > 500 ? '...' : ''}</code>
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}