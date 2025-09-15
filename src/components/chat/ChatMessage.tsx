import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Message } from '@/types';
import { formatTimestamp } from '@/lib/utils';
import { User, Bot, FileText, Download, Crown, Sparkles } from 'lucide-react';
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

  if (isUser) {
    // Enhanced User Message Styling
    return (
      <div className="flex gap-4 justify-end animate-slide-in-right mb-6">
        <div className="max-w-3xl flex-1">
          <div className="flex items-center justify-end gap-2 mb-2">
            <span className="text-xs text-muted-foreground">
              {formatTimestamp(message.createdAt)}
            </span>
            <span className="text-sm font-medium text-foreground">You</span>
          </div>
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-blue-400 shadow-lg">
            <CardContent className="p-5">
              <div className="text-white leading-relaxed whitespace-pre-wrap">
                {message.content}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-md border-2 border-blue-300">
          <User className="w-5 h-5 text-white" />
        </div>
      </div>
    );
  }

  // Enhanced AI Message Styling
  return (
    <div className="flex gap-4 justify-start animate-slide-in-left mb-6">
      {/* AI Avatar */}
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-md border-2 border-purple-300 relative">
        <Crown className="w-5 h-5 text-white" />
        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center">
          <Sparkles className="w-2 h-2 text-white" />
        </div>
      </div>

      <div className="max-w-4xl flex-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Prestige AI
          </span>
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 rounded-full bg-purple-500 opacity-60"></div>
            <div className="w-1 h-1 rounded-full bg-pink-500 opacity-60"></div>
          </div>
          <span className="text-xs text-muted-foreground">
            {formatTimestamp(message.createdAt)}
          </span>
        </div>

        <Card className="border-purple-200 bg-gradient-to-br from-white to-purple-50 dark:from-gray-900 dark:to-purple-950 shadow-lg">
          <CardContent className="p-6">
            <div className="prose prose-sm max-w-none">
              <PrestigeMarkdownRenderer content={message.content} isStreaming={false} />
            </div>
            
            {message.fileChanges && Array.isArray(message.fileChanges) && message.fileChanges.length > 0 && (
              <div className="mt-6 space-y-3">
                <div className="text-sm font-medium flex items-center gap-2 text-purple-700 dark:text-purple-300">
                  <FileText className="w-4 h-4" />
                  Generated Files ({message.fileChanges.length})
                </div>

                {message.fileChanges.map((file, index) => (
                  <div
                    key={index}
                    className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-sm text-purple-800 dark:text-purple-200">{file.path}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">
                          {file.action}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadFile(file.path, file.content)}
                          className="hover:bg-purple-100 dark:hover:bg-purple-800"
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {file.content && (
                      <pre className="text-xs bg-white dark:bg-gray-900 p-3 rounded border overflow-x-auto">
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
    </div>
  );
}