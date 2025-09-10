import React, { useMemo } from "react";
import { ThinkingBlock } from "./ThinkingBlock";

interface EnhancedMarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
}

// Simple markdown renderer for basic formatting
const SimpleMarkdown: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n');
  
  return (
    <div className="space-y-2">
      {lines.map((line, index) => {
        // Handle code blocks
        if (line.startsWith('```')) {
          return <div key={index} />; // Skip code fence lines
        }
        
        // Handle bullet points
        if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
          return (
            <div key={index} className="flex items-start gap-2">
              <span className="text-purple-500 mt-1">•</span>
              <span dangerouslySetInnerHTML={{ 
                __html: line.trim().substring(1).trim().replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
              }} />
            </div>
          );
        }
        
        // Handle bold text
        if (line.trim()) {
          return (
            <p key={index} dangerouslySetInnerHTML={{ 
              __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
            }} />
          );
        }
        
        return <div key={index} />;
      })}
    </div>
  );
};

export const EnhancedMarkdownRenderer: React.FC<EnhancedMarkdownRendererProps> = ({ 
  content, 
  isStreaming = false 
}) => {
  // Separate thinking content from regular content
  const { thinkingContent, regularContent } = useMemo(() => {
    const result = separateThinkingContent(content);
    
    // Debug logging removed to reduce console congestion
    
    return result;
  }, [content]);

  return (
    <div className="space-y-4">
      {/* Thinking Block - Always shown separately first */}
      {thinkingContent && (
        <ThinkingBlock
          content={thinkingContent}
          isStreaming={isStreaming}
        />
      )}
      
      {/* Regular Content */}
      {regularContent && (
        <div className="prose dark:prose-invert max-w-none">
          <SimpleMarkdown content={regularContent} />
        </div>
      )}
    </div>
  );
};

/**
 * Separate thinking content from regular content for display
 */
function separateThinkingContent(content: string): {
  thinkingContent: string;
  regularContent: string;
} {
  if (!content) {
    return { thinkingContent: '', regularContent: '' };
  }

  // Extract all thinking blocks (both complete and incomplete)
  const completeThinkingRegex = /<think>([\s\S]*?)<\/think>/g;
  const incompleteThinkingRegex = /<think>([\s\S]*?)$/;
  
  const thinkingMatches: string[] = [];
  let match;
  
  // First, find all complete thinking blocks
  while ((match = completeThinkingRegex.exec(content)) !== null) {
    thinkingMatches.push(match[1].trim());
  }
  
  // Then check for incomplete thinking blocks (for streaming)
  const incompleteMatch = content.match(incompleteThinkingRegex);
  if (incompleteMatch) {
    thinkingMatches.push(incompleteMatch[1].trim());
  }
  
  // Remove all thinking blocks (complete and incomplete) from regular content
  let regularContent = content
    .replace(completeThinkingRegex, '')
    .replace(incompleteThinkingRegex, '')
    .trim();
  
  // Clean up any extra whitespace or newlines at the beginning
  regularContent = regularContent.replace(/^\s*\n+/, '').trim();
  
  // Combine all thinking content
  const thinkingContent = thinkingMatches.join('\n\n').trim();
  
  return {
    thinkingContent,
    regularContent
  };
}