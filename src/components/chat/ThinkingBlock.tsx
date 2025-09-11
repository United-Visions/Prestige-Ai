import React, { useState, useEffect } from "react";
import { Brain, ChevronDown, ChevronUp, Loader, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";


interface ThinkingBlockProps {
  content: string;
  isStreaming?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
  showTokenSavings?: boolean;
  tokenSavings?: {
    original: number;
    optimized: number;
  };
}

export const ThinkingBlock: React.FC<ThinkingBlockProps> = ({ 
  content, 
  isStreaming = false,
  isExpanded: controlledExpanded,
  onToggle,
  showTokenSavings = false,
  tokenSavings
}) => {
  const [internalExpanded, setInternalExpanded] = useState(isStreaming);
  
  // Use controlled or internal state
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  
  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalExpanded(!internalExpanded);
    }
  };

  // Auto-collapse when streaming finishes
  useEffect(() => {
    if (!isStreaming && isExpanded && controlledExpanded === undefined) {
      setInternalExpanded(false);
    }
  }, [isStreaming, isExpanded, controlledExpanded]);

  // Token savings display
  const renderTokenSavings = () => {
    if (!showTokenSavings || !tokenSavings) return null;
    
    const savings = tokenSavings.original - tokenSavings.optimized;
    const savingsPercent = Math.round((savings / tokenSavings.original) * 100);
    
    return (
      <div className="flex items-center gap-2 mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-700">
        <Sparkles className="w-4 h-4 text-green-500" />
        <span className="text-xs text-green-700 dark:text-green-300">
          Saved {savings.toLocaleString()} tokens ({savingsPercent}%)
        </span>
        <span className="text-xs text-gray-500">
          {tokenSavings.original.toLocaleString()} → {tokenSavings.optimized.toLocaleString()}
        </span>
      </div>
    );
  };

  return (
    <Card 
      className={`relative cursor-pointer transition-all duration-200 my-3 ${
        isStreaming 
          ? "border-purple-500 shadow-lg shadow-purple-200/50 dark:shadow-purple-900/30" 
          : "border-purple-200 dark:border-purple-700 hover:border-purple-400 dark:hover:border-purple-500"
      }`}
      onClick={handleToggle}
      role="button"
      aria-expanded={isExpanded}
      tabIndex={0}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleToggle();
        }
      }}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <Badge 
            variant="outline" 
            className={`flex items-center gap-1.5 ${
              isStreaming 
                ? "text-purple-600 border-purple-500 bg-purple-50 dark:bg-purple-900/30" 
                : "text-purple-600 border-purple-300 bg-purple-50/50 dark:bg-purple-900/20"
            }`}
          >
            <Brain size={14} className="text-purple-500" />
            <span className="text-xs font-semibold">Thinking</span>
            {isStreaming && (
              <Loader size={12} className="text-purple-500 animate-spin" />
            )}
          </Badge>
          
          <div className="text-gray-400 dark:text-gray-500">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>

        {/* Content */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isExpanded ? "max-h-none opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="text-sm text-gray-600 dark:text-gray-300 prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              components={{
                a: ({ node, ...props }) => (
                  <a
                    {...props}
                    onClick={(e) => {
                      if (props.href) {
                        e.preventDefault();
                        e.stopPropagation();
                        window.open(props.href, '_blank');
                      }
                    }}
                    className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  />
                ),
                p: ({ children }) => (
                  <p className="mb-2 last:mb-0">{children}</p>
                ),
                code: ({ children, className }) => {
                  const isInline = !className;
                  if (isInline) {
                    return (
                      <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs font-mono">
                        {children}
                      </code>
                    );
                  }
                  return (
                    <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-x-auto">
                      <code className={className}>{children}</code>
                    </pre>
                  );
                },
              }}
            >
              {content || ""}
            </ReactMarkdown>
          </div>
          
          {renderTokenSavings()}
        </div>
        
        {/* Placeholder when collapsed */}
        {!isExpanded && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-2">
            <span>Click to expand thinking process</span>
            {isStreaming && (
              <>
                <span>•</span>
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />
                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse delay-75" />
                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse delay-150" />
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};