import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
import { ThinkingBlock } from "./ThinkingBlock";
// Simple markdown renderer for basic formatting
const SimpleMarkdown = ({ content }) => {
    const lines = content.split('\n');
    return (_jsx("div", { className: "space-y-2", children: lines.map((line, index) => {
            // Handle code blocks
            if (line.startsWith('```')) {
                return _jsx("div", {}, index); // Skip code fence lines
            }
            // Handle bullet points
            if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
                return (_jsxs("div", { className: "flex items-start gap-2", children: [_jsx("span", { className: "text-purple-500 mt-1", children: "\u2022" }), _jsx("span", { dangerouslySetInnerHTML: {
                                __html: line.trim().substring(1).trim().replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                            } })] }, index));
            }
            // Handle bold text
            if (line.trim()) {
                return (_jsx("p", { dangerouslySetInnerHTML: {
                        __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    } }, index));
            }
            return _jsx("div", {}, index);
        }) }));
};
export const EnhancedMarkdownRenderer = ({ content, isStreaming = false }) => {
    // Separate thinking content from regular content
    const { thinkingContent, regularContent } = useMemo(() => {
        const result = separateThinkingContent(content);
        // Debug logging removed to reduce console congestion
        return result;
    }, [content]);
    return (_jsxs("div", { className: "space-y-4", children: [thinkingContent && (_jsx(ThinkingBlock, { content: thinkingContent, state: isStreaming ? "pending" : "finished" })), regularContent && (_jsx("div", { className: "prose dark:prose-invert max-w-none", children: _jsx(SimpleMarkdown, { content: regularContent }) }))] }));
};
/**
 * Separate thinking content from regular content for display
 */
function separateThinkingContent(content) {
    if (!content) {
        return { thinkingContent: '', regularContent: '' };
    }
    // Extract all thinking blocks (both complete and incomplete)
    const completeThinkingRegex = /<think>([\s\S]*?)<\/think>/g;
    const incompleteThinkingRegex = /<think>([\s\S]*?)$/;
    const thinkingMatches = [];
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
