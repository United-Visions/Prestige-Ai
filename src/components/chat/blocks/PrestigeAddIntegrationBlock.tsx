import React, { useState, useEffect } from "react";
import { Puzzle, ChevronDown, ChevronUp, Loader, CheckCircle, Github, Database, Zap } from "lucide-react";
import { PrestigeBlockProps, PrestigeBlockState } from "./PrestigeBlockTypes";

interface PrestigeAddIntegrationBlockProps extends PrestigeBlockProps {
  children?: React.ReactNode;
  provider?: string;
}

export const PrestigeAddIntegrationBlock: React.FC<PrestigeAddIntegrationBlockProps> = ({
  children,
  node,
  provider: propProvider
}) => {
  const state = node?.properties?.state as PrestigeBlockState;
  const provider = propProvider || node?.properties?.provider || "";
  const inProgress = state === "pending";
  const [isExpanded, setIsExpanded] = useState(inProgress);

  // Auto-collapse when transitioning from in-progress to not-in-progress
  useEffect(() => {
    if (!inProgress && isExpanded) {
      setIsExpanded(false);
    }
  }, [inProgress]);

  const getProviderIcon = () => {
    switch (provider.toLowerCase()) {
      case 'github': return Github;
      case 'supabase': return Database;
      case 'vercel': return Zap;
      default: return Puzzle;
    }
  };

  const getProviderColor = () => {
    switch (provider.toLowerCase()) {
      case 'github': return 'gray';
      case 'supabase': return 'green';
      case 'vercel': return 'black';
      default: return 'indigo';
    }
  };

  const getProviderName = () => {
    switch (provider.toLowerCase()) {
      case 'github': return 'GitHub';
      case 'supabase': return 'Supabase';
      case 'vercel': return 'Vercel';
      default: return provider || 'Integration';
    }
  };

  const getIntegrationDescription = () => {
    switch (provider.toLowerCase()) {
      case 'github': return 'Setting up GitHub repository integration for version control and deployment';
      case 'supabase': return 'Configuring Supabase database and authentication services';
      case 'vercel': return 'Setting up Vercel deployment and hosting integration';
      default: return `Setting up ${provider} integration`;
    }
  };

  const renderStatusIcon = () => {
    const IconComponent = getProviderIcon();
    if (inProgress) {
      return <Loader size={14} className="text-indigo-500 animate-spin" />;
    }
    if (state === "finished") {
      return <CheckCircle size={14} className="text-indigo-500" />;
    }
    return <IconComponent size={14} className="text-indigo-500" />;
  };

  const getStatusText = () => {
    if (inProgress) return "Setting up...";
    if (state === "finished") return "Integrated";
    if (state === "aborted") return "Cancelled";
    return "Add Integration";
  };

  const renderIntegrationDetails = () => {
    return (
      <div className="space-y-4">
        {/* Provider info */}
        <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
            {React.createElement(getProviderIcon(), {
              size: 20,
              className: "text-white"
            })}
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {getProviderName()}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {getIntegrationDescription()}
            </div>
          </div>
        </div>

        {/* Setup steps */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Integration Setup:
          </div>

          <div className="space-y-2">
            {getSetupSteps().map((step, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                {inProgress && index === 0 ? (
                  <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin flex-shrink-0" />
                ) : state === "finished" || (!inProgress && index === 0) ? (
                  <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                ) : (
                  <div className="w-4 h-4 border-2 border-gray-300 rounded-full flex-shrink-0" />
                )}
                <span className={`${
                  (state === "finished" || (!inProgress && index === 0))
                    ? 'text-gray-900 dark:text-gray-100'
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>

        {children && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {children}
            </div>
          </div>
        )}
      </div>
    );
  };

  const getSetupSteps = () => {
    switch (provider.toLowerCase()) {
      case 'github':
        return [
          'Configuring GitHub repository settings',
          'Setting up deployment workflows',
          'Enabling GitHub Pages integration'
        ];
      case 'supabase':
        return [
          'Connecting to Supabase project',
          'Setting up database schema',
          'Configuring authentication'
        ];
      case 'vercel':
        return [
          'Creating Vercel deployment',
          'Configuring build settings',
          'Setting up domain integration'
        ];
      default:
        return [
          `Configuring ${provider} integration`,
          'Installing required dependencies',
          'Setting up configuration files'
        ];
    }
  };

  return (
    <div
      className={`relative bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 hover:from-indigo-100 hover:to-purple-100 dark:hover:from-indigo-900/30 dark:hover:to-purple-900/30 rounded-lg px-4 py-3 border my-3 cursor-pointer transition-all duration-200 ${
        inProgress
          ? "border-indigo-400 shadow-md shadow-indigo-200 dark:shadow-indigo-900/50"
          : state === "finished"
          ? "border-indigo-300"
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
        className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold text-indigo-600 bg-white dark:bg-gray-800 shadow-sm"
        style={{ zIndex: 1 }}
      >
        {renderStatusIcon()}
        <span>{getStatusText()}</span>
      </div>

      {/* Provider display */}
      <div className="absolute top-2 left-36 flex items-center">
        <span className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-800 text-xs rounded text-indigo-600 dark:text-indigo-300">
          {getProviderName()}
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
          maxHeight: isExpanded ? "600px" : "0px",
          opacity: isExpanded ? 1 : 0,
        }}
      >
        {renderIntegrationDetails()}
      </div>

      {/* Progress bar for in-progress state */}
      {inProgress && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700 rounded-b-lg overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-b-lg animate-pulse"
            style={{
              animation: 'progress 2s ease-in-out infinite alternate',
              background: 'linear-gradient(90deg, #6366F1, #4F46E5, #6366F1)',
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