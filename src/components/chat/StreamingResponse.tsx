import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader, StopCircle, Zap, Brain } from 'lucide-react';
import { ThinkingBlock } from './ThinkingBlock';
import { EnhancedMarkdownRenderer } from './EnhancedMarkdownRenderer';
import { PrestigeBlockRenderer } from './blocks/PrestigeBlockRenderer';
import { useStreamingAgentProcessor } from '@/services/streamingAgentProcessor';

interface StreamingChunk {
  type: 'thinking' | 'content' | 'code' | 'artifact';
  content: string;
  timestamp: number;
  metadata?: {
    model?: string;
    tokenCount?: number;
    temperature?: number;
  };
}

interface StreamingResponseProps {
  streamId: string;
  isStreaming: boolean;
  chunks: StreamingChunk[];
  onStop?: () => void;
  model?: string;
  totalTokens?: number;
  streamingSpeed?: number; // chars per second
  className?: string;
  useBlockRenderer?: boolean; // New prop to enable block-based rendering
}

export function StreamingResponse({
  streamId,
  isStreaming,
  chunks,
  onStop,
  model = 'Unknown',
  totalTokens = 0,
  streamingSpeed = 0,
  className = '',
  useBlockRenderer = true // Default to using block renderer
}: StreamingResponseProps) {
  const [displayedContent, setDisplayedContent] = useState('');
  const [currentThinking, setCurrentThinking] = useState('');
  const [showThinkingExpanded, setShowThinkingExpanded] = useState(isStreaming);
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    if (autoScroll && containerRef.current && isStreaming) {
      containerRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'end' 
      });
    }
  }, [displayedContent, currentThinking, autoScroll, isStreaming]);

  // Process chunks to separate thinking from content
  useEffect(() => {
    let content = '';
    let thinking = '';
    
    chunks.forEach(chunk => {
      if (chunk.type === 'thinking') {
        thinking += chunk.content;
      } else {
        content += chunk.content;
      }
    });
    
    setDisplayedContent(content);
    setCurrentThinking(thinking);
  }, [chunks]);

  // Loading animation dots
  const renderLoadingDots = () => {
    return (
      <div className="flex gap-1 items-center">
        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse delay-75" />
        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse delay-150" />
      </div>
    );
  };

  // Streaming status badge
  const renderStatusBadge = () => {
    if (!isStreaming) return null;
    
    return (
      <div className="flex items-center gap-2 mb-3">
        <Badge variant="outline" className="flex items-center gap-1.5 text-blue-600 border-blue-300 bg-blue-50 dark:bg-blue-900/30">
          <Zap size={12} className="text-blue-500" />
          <span className="text-xs font-semibold">Streaming</span>
          <Loader size={10} className="text-blue-500 animate-spin" />
        </Badge>
        
        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
          <span>{model}</span>
          {totalTokens > 0 && (
            <>
              <span>•</span>
              <span>{totalTokens.toLocaleString()} tokens</span>
            </>
          )}
          {streamingSpeed > 0 && (
            <>
              <span>•</span>
              <span>{streamingSpeed} chars/s</span>
            </>
          )}
        </div>
        
        {onStop && (
          <Button
            variant="outline"
            size="sm"
            onClick={onStop}
            className="ml-auto flex items-center gap-1 text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/30"
          >
            <StopCircle size={12} />
            <span className="text-xs">Stop</span>
          </Button>
        )}
      </div>
    );
  };

  // Progress indicator
  const renderProgressIndicator = () => {
    if (!isStreaming) return null;
    
    return (
      <div className="w-full h-0.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
        <div 
          className="h-full bg-gradient-to-r from-blue-400 to-purple-500 rounded-full animate-pulse"
          style={{
            animation: 'shimmer 2s ease-in-out infinite alternate',
            background: 'linear-gradient(90deg, #60A5FA, #A78BFA, #60A5FA)',
            backgroundSize: '200% 100%',
          }}
        />
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes shimmer {
              0% { background-position: -200% 0; }
              100% { background-position: 200% 0; }
            }
          `
        }} />
      </div>
    );
  };

  return (
    <div ref={containerRef} className={`space-y-3 ${className}`}>
      {renderStatusBadge()}
      {renderProgressIndicator()}
      
      {/* Thinking Block */}
      {currentThinking && (
        <ThinkingBlock
          content={currentThinking}
          isStreaming={isStreaming}
          isExpanded={showThinkingExpanded}
          onToggle={() => setShowThinkingExpanded(!showThinkingExpanded)}
        />
      )}
      
      {/* Main Content */}
      {displayedContent && (
        <Card className="relative">
          <CardContent className="p-4">
            {useBlockRenderer ? (
              // Use new Prestige block-based renderer
              <div className="prestige-block-content">
                <PrestigeBlockRenderer content={displayedContent} isStreaming={isStreaming} />

                {/* Streaming cursor */}
                {isStreaming && (
                  <span className="inline-block w-2 h-4 bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse ml-2 align-middle rounded" />
                )}
              </div>
            ) : (
              // Legacy markdown renderer
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <EnhancedMarkdownRenderer content={displayedContent} />

                {/* Streaming cursor */}
                {isStreaming && (
                  <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1 align-middle" />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Loading state when no content yet */}
      {isStreaming && !displayedContent && !currentThinking && (
        <Card className="border-dashed border-gray-300 dark:border-gray-600">
          <CardContent className="p-6 text-center">
            <div className="flex flex-col items-center gap-3">
              <Brain className="w-8 h-8 text-gray-400 animate-pulse" />
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>AI is thinking</span>
                {renderLoadingDots()}
              </div>
              <div className="text-xs text-gray-400">
                Generating response using {model}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Auto-scroll toggle */}
      {isStreaming && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAutoScroll(!autoScroll)}
            className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Auto-scroll: {autoScroll ? 'On' : 'Off'}
          </Button>
        </div>
      )}
    </div>
  );
}

export default StreamingResponse;