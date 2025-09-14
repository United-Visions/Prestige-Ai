import React, { useState, useEffect } from "react";
import { FileText, ChevronDown, ChevronUp, Loader, CheckCircle } from "lucide-react";
import { PrestigeBlockProps, PrestigeBlockState } from "./PrestigeBlockTypes";

interface PrestigeWriteBlockProps extends PrestigeBlockProps {
  children: React.ReactNode;
  path?: string;
  description?: string;
}

export const PrestigeWriteBlock: React.FC<PrestigeWriteBlockProps> = ({
  children,
  node,
  path: propPath,
  description: propDescription
}) => {
  const state = node?.properties?.state as PrestigeBlockState;
  const path = propPath || node?.properties?.path || "";
  const description = propDescription || node?.properties?.description || "";
  const inProgress = state === "pending";
  const [isExpanded, setIsExpanded] = useState(inProgress);

  // Auto-collapse when transitioning from in-progress to not-in-progress
  useEffect(() => {
    if (!inProgress && isExpanded) {
      setIsExpanded(false);
    }
  }, [inProgress]);

  const renderStatusIcon = () => {
    if (inProgress) {
      return <Loader size={14} className="text-emerald-500 animate-spin" />;
    }
    if (state === "finished") {
      return <CheckCircle size={14} className="text-emerald-500" />;
    }
    return <FileText size={14} className="text-emerald-500" />;
  };

  const getStatusText = () => {
    if (inProgress) return "Writing...";
    if (state === "finished") return "File Created";
    if (state === "aborted") return "Cancelled";
    return "Create File";
  };

  const renderContent = () => {
    if (typeof children === "string") {
      return (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3">
          <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono overflow-x-auto">
            {children}
          </pre>
        </div>
      );
    }
    return children;
  };

  const fileName = path.split('/').pop() || path;
  const filePath = path.substring(0, path.length - fileName.length) || '';

  return (
    <div
      className={`relative bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 hover:from-emerald-100 hover:to-green-100 dark:hover:from-emerald-900/30 dark:hover:to-green-900/30 rounded-lg px-4 py-3 border my-3 cursor-pointer transition-all duration-200 ${
        inProgress
          ? "border-emerald-400 shadow-md shadow-emerald-200 dark:shadow-emerald-900/50"
          : state === "finished"
          ? "border-emerald-300"
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
        className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold text-emerald-600 bg-white dark:bg-gray-800 shadow-sm"
        style={{ zIndex: 1 }}
      >
        {renderStatusIcon()}
        <span>{getStatusText()}</span>
      </div>

      {/* File path display */}
      <div className="absolute top-2 left-36 flex items-center text-xs text-gray-600 dark:text-gray-400 max-w-md truncate">
        <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs">
          {fileName}
        </span>
        {filePath && (
          <span className="ml-1 text-xs opacity-70">
            in {filePath}
          </span>
        )}
      </div>

      {/* Indicator icon */}
      <div className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>

      {/* Description */}
      {description && (
        <div className="pt-7 pb-2 text-sm text-gray-600 dark:text-gray-400">
          {description}
        </div>
      )}

      {/* Main content with smooth transition */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${description ? 'pt-0' : 'pt-7'}`}
        style={{
          maxHeight: isExpanded ? "800px" : "0px",
          opacity: isExpanded ? 1 : 0,
        }}
      >
        {renderContent()}
      </div>

      {/* Progress bar for in-progress state */}
      {inProgress && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700 rounded-b-lg overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-b-lg animate-pulse"
            style={{
              animation: 'progress 2s ease-in-out infinite alternate',
              background: 'linear-gradient(90deg, #10B981, #059669, #10B981)',
              backgroundSize: '200% 100%',
            }}
          />
          <style dangerouslySetInnerHTML={{
            __html: `
              @keyframes progress {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
              }
            `
          }} />
        </div>
      )}
    </div>
  );
};