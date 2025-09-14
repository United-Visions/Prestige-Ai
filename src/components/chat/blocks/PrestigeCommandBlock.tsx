import React, { useState, useEffect } from "react";
import { Terminal, ChevronDown, ChevronUp, Loader, CheckCircle, RotateCcw, RefreshCw, Play } from "lucide-react";
import { PrestigeBlockProps, PrestigeBlockState } from "./PrestigeBlockTypes";

interface PrestigeCommandBlockProps extends PrestigeBlockProps {
  children?: React.ReactNode;
  commandType?: string;
}

export const PrestigeCommandBlock: React.FC<PrestigeCommandBlockProps> = ({
  children,
  node,
  commandType: propCommandType
}) => {
  const state = node?.properties?.state as PrestigeBlockState;
  const commandType = propCommandType || node?.properties?.commandType || node?.properties?.type || "";
  const inProgress = state === "pending";
  const [isExpanded, setIsExpanded] = useState(inProgress);

  // Auto-collapse when transitioning from in-progress to not-in-progress
  useEffect(() => {
    if (!inProgress && isExpanded) {
      setIsExpanded(false);
    }
  }, [inProgress]);

  const getCommandIcon = () => {
    switch (commandType) {
      case 'rebuild': return RotateCcw;
      case 'restart': return RefreshCw;
      case 'refresh': return RefreshCw;
      default: return Play;
    }
  };

  const getCommandLabel = () => {
    switch (commandType) {
      case 'rebuild': return 'Rebuild App';
      case 'restart': return 'Restart App';
      case 'refresh': return 'Refresh App';
      default: return 'Execute Command';
    }
  };

  const getCommandDescription = () => {
    switch (commandType) {
      case 'rebuild': return 'Rebuilding the application with latest changes';
      case 'restart': return 'Restarting the development server';
      case 'refresh': return 'Refreshing the application preview';
      default: return 'Executing application command';
    }
  };

  const renderStatusIcon = () => {
    const IconComponent = getCommandIcon();
    if (inProgress) {
      return <Loader size={14} className="text-orange-500 animate-spin" />;
    }
    if (state === "finished") {
      return <CheckCircle size={14} className="text-orange-500" />;
    }
    return <IconComponent size={14} className="text-orange-500" />;
  };

  const getStatusText = () => {
    if (inProgress) return "Executing...";
    if (state === "finished") return "Completed";
    if (state === "aborted") return "Cancelled";
    return getCommandLabel();
  };

  const renderCommandOutput = () => {
    return (
      <div className="space-y-3">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {getCommandDescription()}
        </div>

        {/* Command output area */}
        <div className="bg-gray-900 dark:bg-black rounded-md p-3 font-mono text-sm">
          <div className="flex items-center gap-2 text-green-400 mb-2">
            <Terminal size={12} />
            <span className="text-xs">prestige-ai</span>
          </div>

          {inProgress ? (
            <div className="space-y-1">
              <div className="text-gray-300">$ {getCommandLabel().toLowerCase().replace(' ', '-')}</div>
              <div className="text-yellow-400 flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                {getCommandDescription()}...
              </div>
            </div>
          ) : state === "finished" ? (
            <div className="space-y-1">
              <div className="text-gray-300">$ {getCommandLabel().toLowerCase().replace(' ', '-')}</div>
              <div className="text-green-400">✓ Command completed successfully</div>
            </div>
          ) : (
            <div className="text-gray-400">
              Command ready to execute: {commandType}
            </div>
          )}

          {children && (
            <div className="mt-2 text-gray-300 whitespace-pre-wrap">
              {children}
            </div>
          )}

          {/* Blinking cursor for in-progress */}
          {inProgress && (
            <span className="inline-block w-2 h-4 bg-white animate-pulse ml-1 align-middle" />
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`relative bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 hover:from-orange-100 hover:to-amber-100 dark:hover:from-orange-900/30 dark:hover:to-amber-900/30 rounded-lg px-4 py-3 border my-3 cursor-pointer transition-all duration-200 ${
        inProgress
          ? "border-orange-400 shadow-md shadow-orange-200 dark:shadow-orange-900/50"
          : state === "finished"
          ? "border-orange-300"
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
        className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold text-orange-600 bg-white dark:bg-gray-800 shadow-sm"
        style={{ zIndex: 1 }}
      >
        {renderStatusIcon()}
        <span>{getStatusText()}</span>
      </div>

      {/* Command type display */}
      <div className="absolute top-2 left-36 flex items-center">
        <span className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-800 text-xs rounded font-mono text-orange-600 dark:text-orange-300">
          {commandType}
        </span>
      </div>

      {/* Indicator icon */}
      <div className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>

      {/* Main content with smooth transition */}
      <div
        className="pt-7 overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: isExpanded ? "400px" : "0px",
          opacity: isExpanded ? 1 : 0,
        }}
      >
        {renderCommandOutput()}
      </div>

      {/* Progress bar for in-progress state */}
      {inProgress && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700 rounded-b-lg overflow-hidden">
          <div
            className="h-full bg-orange-500 rounded-b-lg animate-pulse"
            style={{
              animation: 'progress 2s ease-in-out infinite alternate',
              background: 'linear-gradient(90deg, #F97316, #EA580C, #F97316)',
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