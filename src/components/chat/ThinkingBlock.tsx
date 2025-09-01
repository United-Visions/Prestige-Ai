import React, { useState, useEffect } from "react";
import { Brain, ChevronDown, ChevronUp, Loader } from "lucide-react";
import { CustomTagState } from "@/types/chat";

// Simple markdown-like text renderer to avoid circular imports
const SimpleTextRenderer: React.FC<{ content: string }> = ({ content }) => {
  return (
    <div className="whitespace-pre-wrap text-sm leading-relaxed">
      {content}
    </div>
  );
};

interface ThinkingBlockProps {
  content: string;
  state?: CustomTagState;
}

export const ThinkingBlock: React.FC<ThinkingBlockProps> = ({ 
  content, 
  state = "finished" 
}) => {
  const inProgress = state === "pending";
  const [isExpanded, setIsExpanded] = useState(inProgress);

  // Collapse when transitioning from in-progress to not-in-progress
  useEffect(() => {
    if (!inProgress && isExpanded) {
      setIsExpanded(false);
    }
  }, [inProgress]);

  return (
    <div
      className={`relative bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 hover:from-purple-100 hover:to-indigo-100 dark:hover:from-purple-800/30 dark:hover:to-indigo-800/30 rounded-lg px-4 py-2 border my-2 cursor-pointer transition-all duration-200 ${
        inProgress ? "border-purple-500 shadow-purple-200 shadow-md" : "border-purple-200 dark:border-purple-700"
      }`}
      onClick={() => setIsExpanded(!isExpanded)}
      role="button"
      aria-expanded={isExpanded}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setIsExpanded(!isExpanded);
        }
      }}
    >
      {/* Top-left label badge */}
      <div
        className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-purple-600 dark:text-purple-400 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm"
        style={{ zIndex: 1 }}
      >
        <Brain size={16} className="text-purple-600 dark:text-purple-400" />
        <span>Thinking</span>
        {inProgress && (
          <Loader size={14} className="ml-1 text-purple-600 dark:text-purple-400 animate-spin" />
        )}
      </div>

      {/* Indicator icon */}
      <div className="absolute top-2 right-2 p-1 text-purple-500 dark:text-purple-400">
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>

      {/* Main content with smooth transition */}
      <div
        className="pt-6 overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: isExpanded ? "none" : "0px",
          opacity: isExpanded ? 1 : 0,
          marginBottom: isExpanded ? "0" : "-6px", // Compensate for padding
        }}
      >
        <div className="px-0 text-sm text-gray-700 dark:text-gray-300">
          <SimpleTextRenderer content={content} />
        </div>
      </div>
    </div>
  );
};