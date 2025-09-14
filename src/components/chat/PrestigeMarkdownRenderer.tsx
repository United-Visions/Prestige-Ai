import React, { useMemo } from "react";
import { PrestigeBlockRenderer } from "./blocks/PrestigeBlockRenderer";
import { ThinkingDisplay } from "./ThinkingDisplay";
import { PrestigeAddIntegration } from "./PrestigeAddIntegration";
import { PrestigeCommandProcessor } from "./PrestigeCommandProcessor";

interface PrestigeMarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
}

type ContentPiece =
  | { type: "markdown"; content: string }
  | { type: "thinking"; content: string }
  | { type: "prestige-add-integration"; provider: string; content?: string }
  | { type: "prestige-command"; commandType: string }
  | { type: "prestige-chat-summary"; content: string };

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

export const PrestigeMarkdownRenderer: React.FC<PrestigeMarkdownRendererProps> = ({
  content,
  isStreaming = false
}) => {
  // Use the new block-based renderer instead of the legacy parser
  return (
    <div className="space-y-4">
      <PrestigeBlockRenderer content={content} isStreaming={isStreaming} />

      {/* Fallback to legacy components for backward compatibility */}
      <div className="hidden">
        <LegacyPrestigeRenderer content={content} isStreaming={isStreaming} />
      </div>
    </div>
  );
};

/**
 * Legacy renderer for backward compatibility
 */
const LegacyPrestigeRenderer: React.FC<PrestigeMarkdownRendererProps> = ({
  content,
  isStreaming = false
}) => {
  // Parse content into different types (thinking, integrations, commands, markdown)
  const contentPieces = useMemo(() => {
    return parsePrestigeContent(content);
  }, [content]);

  return (
    <div className="space-y-4">
      {contentPieces.map((piece, index) => (
        <React.Fragment key={index}>
          {piece.type === "thinking" && (
            <div className="mb-4">
              <div className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                Thinking Process
              </div>
              <ThinkingDisplay content={piece.content} isActive={isStreaming} />
            </div>
          )}

          {piece.type === "prestige-add-integration" && (
            <PrestigeAddIntegration
              provider={piece.provider as 'github' | 'supabase' | 'vercel'}
            >
              {piece.content}
            </PrestigeAddIntegration>
          )}

          {piece.type === "prestige-command" && (
            <PrestigeCommandProcessor
              type={piece.commandType as 'rebuild' | 'restart' | 'refresh'}
            />
          )}

          {piece.type === "prestige-chat-summary" && (
            // Chat summary is typically not displayed to users
            <div className="hidden" data-chat-summary={piece.content} />
          )}

          {piece.type === "markdown" && piece.content.trim() && (
            <div className="prose dark:prose-invert max-w-none">
              <SimpleMarkdown content={piece.content} />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

/**
 * Parse Prestige-specific content including custom tags and thinking blocks
 * Similar to dyad's parseCustomTags function but adapted for Prestige AI
 */
function parsePrestigeContent(content: string): ContentPiece[] {
  if (!content) {
    return [];
  }

  const contentPieces: ContentPiece[] = [];
  
  // First, extract and separate thinking content
  const { thinkingContent, nonThinkingContent } = extractThinkingContent(content);
  
  // Add thinking content if it exists
  if (thinkingContent) {
    contentPieces.push({
      type: "thinking",
      content: thinkingContent
    });
  }
  
  // Parse Prestige tags using simpler, more targeted approach
  const allTags: Array<{
    match: RegExpMatchArray;
    type: string;
    provider?: string;
    commandType?: string;
    content?: string;
  }> = [];
  
  // Find prestige-add-integration tags
  const integrationRegex = /<prestige-add-integration\s+provider="([^"]*)"[^>]*>(?:<\/prestige-add-integration>|([^<]*))?/g;
  let match;
  while ((match = integrationRegex.exec(nonThinkingContent)) !== null) {
    allTags.push({
      match,
      type: 'prestige-add-integration',
      provider: match[1],
      content: match[2] || ''
    });
  }
  
  // Find prestige-command tags
  const commandRegex = /<prestige-command\s+type="([^"]*)"[^>]*>(?:<\/prestige-command>)?/g;
  while ((match = commandRegex.exec(nonThinkingContent)) !== null) {
    allTags.push({
      match,
      type: 'prestige-command',
      commandType: match[1]
    });
  }
  
  // Find prestige-chat-summary tags
  const summaryRegex = /<prestige-chat-summary>(.*?)<\/prestige-chat-summary>/g;
  while ((match = summaryRegex.exec(nonThinkingContent)) !== null) {
    allTags.push({
      match,
      type: 'prestige-chat-summary',
      content: match[1]
    });
  }
  
  // Sort tags by position in the content
  allTags.sort((a, b) => (a.match.index || 0) - (b.match.index || 0));
  
  let lastIndex = 0;
  
  // Process tags in order
  for (const tag of allTags) {
    const startIndex = tag.match.index || 0;
    const fullMatch = tag.match[0];

    // Add the markdown content before this tag
    if (startIndex > lastIndex) {
      const markdownContent = nonThinkingContent.substring(lastIndex, startIndex).trim();
      if (markdownContent) {
        contentPieces.push({
          type: "markdown",
          content: markdownContent
        });
      }
    }

    // Add the tag based on its type
    if (tag.type === 'prestige-add-integration') {
      contentPieces.push({
        type: "prestige-add-integration",
        provider: tag.provider || '',
        content: tag.content || ''
      });
    } else if (tag.type === 'prestige-command') {
      contentPieces.push({
        type: "prestige-command",
        commandType: tag.commandType || ''
      });
    } else if (tag.type === 'prestige-chat-summary') {
      contentPieces.push({
        type: "prestige-chat-summary",
        content: tag.content || ''
      });
    }

    lastIndex = startIndex + fullMatch.length;
  }

  // Add the remaining markdown content
  if (lastIndex < nonThinkingContent.length) {
    const remainingContent = nonThinkingContent.substring(lastIndex).trim();
    if (remainingContent) {
      contentPieces.push({
        type: "markdown",
        content: remainingContent
      });
    }
  }

  return contentPieces;
}

/**
 * Extract thinking content separately from other content
 */
function extractThinkingContent(content: string): {
  thinkingContent: string;
  nonThinkingContent: string;
} {
  if (!content) {
    return { thinkingContent: '', nonThinkingContent: '' };
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
  let nonThinkingContent = content
    .replace(completeThinkingRegex, '')
    .replace(incompleteThinkingRegex, '')
    .trim();
  
  // Clean up any extra whitespace or newlines at the beginning
  nonThinkingContent = nonThinkingContent.replace(/^\s*\n+/, '').trim();
  
  // Combine all thinking content
  const thinkingContent = thinkingMatches.join('\n\n').trim();
  
  return {
    thinkingContent,
    nonThinkingContent
  };
}