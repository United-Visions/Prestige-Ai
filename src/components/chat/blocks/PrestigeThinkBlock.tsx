import React, { useState, useEffect } from "react";
import { Brain, ChevronDown, ChevronUp, Loader } from "lucide-react";
import { PrestigeBlockProps, PrestigeBlockState } from "./PrestigeBlockTypes";

interface PrestigeThinkBlockProps extends PrestigeBlockProps {
  children: React.ReactNode;
}

export const PrestigeThinkBlock: React.FC<PrestigeThinkBlockProps> = ({ children, node }) => {
  const state = node?.properties?.state as PrestigeBlockState;
  const inProgress = state === "pending";
  const [isExpanded, setIsExpanded] = useState(inProgress);

  // Auto-collapse when transitioning from in-progress to not-in-progress
  useEffect(() => {
    if (!inProgress && isExpanded) {
      setIsExpanded(false);
    }
  }, [inProgress]);

  const renderContent = () => {
    if (typeof children === "string") {
      return (
        <div className="px-0 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
          {children}
        </div>
      );
    }
    return children;
  };

  return (
    <div
      className={`relative bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 hover:from-purple-100 hover:to-blue-100 dark:hover:from-purple-900/30 dark:hover:to-blue-900/30 rounded-lg px-4 py-2 border my-3 cursor-pointer transition-colors duration-200 ${
        inProgress
          ? "border-purple-400 shadow-md shadow-purple-200 dark:shadow-purple-900/50"
          : "border-gray-200 dark:border-gray-700"
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
        className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold text-purple-600 bg-white dark:bg-gray-800 shadow-sm"
        style={{ zIndex: 1 }}
      >
        <Brain size={14} className="text-purple-500" />
        <span>AI Thinking</span>
        {inProgress && (
          <Loader size={12} className="ml-1 text-purple-500 animate-spin" />
        )}
      </div>

      {/* Indicator icon */}
      <div className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>

      {/* Main content with smooth transition */}
      <div
        className="pt-7 overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: isExpanded ? "600px" : "0px",
          opacity: isExpanded ? 1 : 0,
          marginBottom: isExpanded ? "0" : "-7px",
        }}
      >
        {renderContent()}
      </div>

      {/* Animated thinking indicator when collapsed and in progress */}
      {!isExpanded && inProgress && (
        <div className="absolute top-2 left-32 flex items-center gap-1">
          <div className="w-1 h-1 bg-purple-400 rounded-full animate-pulse" />
          <div className="w-1 h-1 bg-purple-400 rounded-full animate-pulse delay-100" />
          <div className="w-1 h-1 bg-purple-400 rounded-full animate-pulse delay-200" />
        </div>
      )}
    </div>
  );
};