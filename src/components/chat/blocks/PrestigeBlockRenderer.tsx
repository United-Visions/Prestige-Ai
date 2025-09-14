import React, { useMemo } from "react";
import { PrestigeThinkBlock } from "./PrestigeThinkBlock";
import { PrestigeWriteBlock } from "./PrestigeWriteBlock";
import { PrestigeAddDependencyBlock } from "./PrestigeAddDependencyBlock";
import { PrestigeCommandBlock } from "./PrestigeCommandBlock";
import { PrestigeAddIntegrationBlock } from "./PrestigeAddIntegrationBlock";
import { PrestigeContentPiece, PrestigeTagInfo, PrestigeBlockState } from "./PrestigeBlockTypes";

interface PrestigeBlockRendererProps {
  content: string;
  isStreaming?: boolean;
}

/**
 * Simple markdown renderer for Prestige AI content
 */
const PrestigeMarkdown: React.FC<{ content: string }> = ({ content }) => {
  if (!content.trim()) return null;

  const lines = content.split('\n');

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none space-y-2">
      {lines.map((line, index) => {
        // Handle code blocks
        if (line.startsWith('```')) {
          return <div key={index} />; // Skip code fence lines for now
        }

        // Handle headers
        if (line.startsWith('# ')) {
          return (
            <h1 key={index} className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-4 mb-2">
              {line.substring(2)}
            </h1>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <h2 key={index} className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-3 mb-2">
              {line.substring(3)}
            </h2>
          );
        }

        // Handle bullet points
        if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
          return (
            <div key={index} className="flex items-start gap-2 ml-4">
              <span className="text-blue-500 mt-1 font-bold">•</span>
              <span
                className="text-gray-700 dark:text-gray-300"
                dangerouslySetInnerHTML={{
                  __html: line.trim().substring(1).trim().replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                }}
              />
            </div>
          );
        }

        // Handle regular paragraphs
        if (line.trim()) {
          return (
            <p
              key={index}
              className="text-gray-700 dark:text-gray-300 leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900 dark:text-gray-100">$1</strong>')
              }}
            />
          );
        }

        return <div key={index} className="h-2" />; // Empty line spacing
      })}
    </div>
  );
};

/**
 * Main Prestige Block Renderer
 * Inspired by dyad's DyadMarkdownParser but adapted for Prestige AI tags
 */
export const PrestigeBlockRenderer: React.FC<PrestigeBlockRendererProps> = ({
  content,
  isStreaming = false
}) => {
  // Parse content into different pieces (markdown and custom tags)
  const contentPieces = useMemo(() => {
    return parsePrestigeBlocks(content, isStreaming);
  }, [content, isStreaming]);

  return (
    <div className="space-y-3">
      {contentPieces.map((piece, index) => (
        <React.Fragment key={index}>
          {renderPrestigeBlock(piece, { isStreaming })}
        </React.Fragment>
      ))}
    </div>
  );
};

/**
 * Pre-process content to handle unclosed Prestige tags
 * Similar to dyad's preprocessUnclosedTags function
 */
function preprocessUnclosedTags(content: string): {
  processedContent: string;
  inProgressTags: Map<string, Set<number>>;
} {
  const prestigeTagNames = [
    "prestige-write",
    "prestige-rename",
    "prestige-delete",
    "prestige-add-dependency",
    "prestige-command",
    "prestige-add-integration",
    "prestige-chat-summary",
    "think"
  ];

  let processedContent = content;
  const inProgressTags = new Map<string, Set<number>>();

  // For each tag type, check if there are unclosed tags
  for (const tagName of prestigeTagNames) {
    const openTagPattern = new RegExp(`<${tagName}(?:\\s[^>]*)?>`, "g");
    const closeTagPattern = new RegExp(`</${tagName}>`, "g");

    // Track the positions of opening tags
    const openingMatches: RegExpExecArray[] = [];
    let match;

    openTagPattern.lastIndex = 0;
    while ((match = openTagPattern.exec(processedContent)) !== null) {
      openingMatches.push({ ...match });
    }

    const openCount = openingMatches.length;
    const closeCount = (processedContent.match(closeTagPattern) || []).length;

    // If we have more opening than closing tags
    const missingCloseTags = openCount - closeCount;
    if (missingCloseTags > 0) {
      // Add the required number of closing tags at the end
      processedContent += Array(missingCloseTags)
        .fill(`</${tagName}>`)
        .join("");

      // Mark the last N tags as in progress
      const inProgressIndexes = new Set<number>();
      const startIndex = openCount - missingCloseTags;
      for (let i = startIndex; i < openCount; i++) {
        inProgressIndexes.add(openingMatches[i].index);
      }
      inProgressTags.set(tagName, inProgressIndexes);
    }
  }

  return { processedContent, inProgressTags };
}

/**
 * Parse the content to extract Prestige tags and markdown sections
 * Similar to dyad's parseCustomTags function
 */
function parsePrestigeBlocks(content: string, isStreaming: boolean): PrestigeContentPiece[] {
  if (!content) return [];

  const { processedContent, inProgressTags } = preprocessUnclosedTags(content);

  const prestigeTagNames = [
    "prestige-write",
    "prestige-rename",
    "prestige-delete",
    "prestige-add-dependency",
    "prestige-command",
    "prestige-add-integration",
    "prestige-chat-summary",
    "think"
  ];

  const tagPattern = new RegExp(
    `<(${prestigeTagNames.join("|")})\\s*([^>]*)>(.*?)<\\/\\1>`,
    "gs"
  );

  const contentPieces: PrestigeContentPiece[] = [];
  let lastIndex = 0;
  let match;

  // Find all Prestige tags
  while ((match = tagPattern.exec(processedContent)) !== null) {
    const [fullMatch, tag, attributesStr, tagContent] = match;
    const startIndex = match.index;

    // Add the markdown content before this tag
    if (startIndex > lastIndex) {
      const markdownContent = processedContent.substring(lastIndex, startIndex);
      if (markdownContent.trim()) {
        contentPieces.push({
          type: "markdown",
          content: markdownContent
        });
      }
    }

    // Parse attributes
    const attributes: Record<string, string> = {};
    const attrPattern = /(\w+)="([^"]*)"/g;
    let attrMatch;
    while ((attrMatch = attrPattern.exec(attributesStr)) !== null) {
      attributes[attrMatch[1]] = attrMatch[2];
    }

    // Check if this tag was marked as in progress
    const tagInProgressSet = inProgressTags.get(tag);
    const isInProgress = tagInProgressSet?.has(startIndex);

    // Create the appropriate content piece based on tag type
    switch (tag) {
      case "think":
        contentPieces.push({
          type: "prestige-think",
          content: tagContent,
          inProgress: isInProgress || false
        });
        break;

      case "prestige-write":
        contentPieces.push({
          type: "prestige-write",
          path: attributes.path || "",
          description: attributes.description || "",
          content: tagContent,
          inProgress: isInProgress || false
        });
        break;

      case "prestige-rename":
        contentPieces.push({
          type: "prestige-rename",
          from: attributes.from || "",
          to: attributes.to || "",
          inProgress: isInProgress || false
        });
        break;

      case "prestige-delete":
        contentPieces.push({
          type: "prestige-delete",
          path: attributes.path || "",
          inProgress: isInProgress || false
        });
        break;

      case "prestige-add-dependency":
        contentPieces.push({
          type: "prestige-add-dependency",
          packages: attributes.packages || "",
          inProgress: isInProgress || false
        });
        break;

      case "prestige-command":
        contentPieces.push({
          type: "prestige-command",
          commandType: attributes.type || "",
          inProgress: isInProgress || false
        });
        break;

      case "prestige-add-integration":
        contentPieces.push({
          type: "prestige-add-integration",
          provider: attributes.provider || "",
          content: tagContent,
          inProgress: isInProgress || false
        });
        break;

      case "prestige-chat-summary":
        contentPieces.push({
          type: "prestige-chat-summary",
          content: tagContent
        });
        break;
    }

    lastIndex = startIndex + fullMatch.length;
  }

  // Add the remaining markdown content
  if (lastIndex < processedContent.length) {
    const remainingContent = processedContent.substring(lastIndex);
    if (remainingContent.trim()) {
      contentPieces.push({
        type: "markdown",
        content: remainingContent
      });
    }
  }

  return contentPieces;
}

/**
 * Get the appropriate state based on streaming status and progress
 */
function getBlockState({
  isStreaming,
  inProgress,
}: {
  isStreaming?: boolean;
  inProgress?: boolean;
}): PrestigeBlockState {
  if (!inProgress) {
    return "finished";
  }
  return isStreaming ? "pending" : "aborted";
}

/**
 * Render a Prestige block based on its type
 * Similar to dyad's renderCustomTag function
 */
function renderPrestigeBlock(
  piece: PrestigeContentPiece,
  { isStreaming }: { isStreaming: boolean }
): React.ReactNode {
  switch (piece.type) {
    case "prestige-think":
      return (
        <PrestigeThinkBlock
          node={{
            properties: {
              state: getBlockState({ isStreaming, inProgress: piece.inProgress })
            }
          }}
        >
          {piece.content}
        </PrestigeThinkBlock>
      );

    case "prestige-write":
      return (
        <PrestigeWriteBlock
          node={{
            properties: {
              path: piece.path,
              description: piece.description,
              state: getBlockState({ isStreaming, inProgress: piece.inProgress })
            }
          }}
        >
          {piece.content}
        </PrestigeWriteBlock>
      );

    case "prestige-add-dependency":
      return (
        <PrestigeAddDependencyBlock
          node={{
            properties: {
              packages: piece.packages,
              state: getBlockState({ isStreaming, inProgress: piece.inProgress })
            }
          }}
        />
      );

    case "prestige-command":
      return (
        <PrestigeCommandBlock
          node={{
            properties: {
              commandType: piece.commandType,
              state: getBlockState({ isStreaming, inProgress: piece.inProgress })
            }
          }}
        />
      );

    case "prestige-add-integration":
      return (
        <PrestigeAddIntegrationBlock
          node={{
            properties: {
              provider: piece.provider,
              state: getBlockState({ isStreaming, inProgress: piece.inProgress })
            }
          }}
        >
          {piece.content}
        </PrestigeAddIntegrationBlock>
      );

    case "prestige-chat-summary":
      // Chat summary is typically not displayed to users
      return <div className="hidden" data-chat-summary={piece.content} />;

    case "markdown":
      return <PrestigeMarkdown content={piece.content} />;

    default:
      return null;
  }
}