import React, { useState, useEffect } from "react";
import { Package, ChevronDown, ChevronUp, Loader, CheckCircle, Download } from "lucide-react";
import { PrestigeBlockProps, PrestigeBlockState } from "./PrestigeBlockTypes";

interface PrestigeAddDependencyBlockProps extends PrestigeBlockProps {
  children?: React.ReactNode;
  packages?: string;
}

export const PrestigeAddDependencyBlock: React.FC<PrestigeAddDependencyBlockProps> = ({
  children,
  node,
  packages: propPackages
}) => {
  const state = node?.properties?.state as PrestigeBlockState;
  const packages = propPackages || node?.properties?.packages || "";
  const inProgress = state === "pending";
  const [isExpanded, setIsExpanded] = useState(inProgress);

  // Parse package list
  const packageList = packages
    .split(/[\s,]+/)
    .filter(pkg => pkg.trim().length > 0)
    .map(pkg => pkg.trim());

  // Auto-collapse when transitioning from in-progress to not-in-progress
  useEffect(() => {
    if (!inProgress && isExpanded) {
      setIsExpanded(false);
    }
  }, [inProgress]);

  const renderStatusIcon = () => {
    if (inProgress) {
      return <Loader size={14} className="text-blue-500 animate-spin" />;
    }
    if (state === "finished") {
      return <CheckCircle size={14} className="text-blue-500" />;
    }
    return <Download size={14} className="text-blue-500" />;
  };

  const getStatusText = () => {
    if (inProgress) return "Installing...";
    if (state === "finished") return "Installed";
    if (state === "aborted") return "Cancelled";
    return "Install Dependencies";
  };

  const renderPackageList = () => {
    return (
      <div className="space-y-2">
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Installing {packageList.length} package{packageList.length !== 1 ? 's' : ''}:
        </div>
        <div className="grid grid-cols-1 gap-2">
          {packageList.map((pkg, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-md px-3 py-2"
            >
              <Package size={14} className="text-blue-500 flex-shrink-0" />
              <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
                {pkg}
              </span>
              {inProgress && (
                <div className="ml-auto">
                  <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
                </div>
              )}
              {state === "finished" && (
                <CheckCircle size={14} className="text-green-500 ml-auto" />
              )}
            </div>
          ))}
        </div>
        {children && (
          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            {children}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`relative bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 rounded-lg px-4 py-3 border my-3 cursor-pointer transition-all duration-200 ${
        inProgress
          ? "border-blue-400 shadow-md shadow-blue-200 dark:shadow-blue-900/50"
          : state === "finished"
          ? "border-blue-300"
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
        className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold text-blue-600 bg-white dark:bg-gray-800 shadow-sm"
        style={{ zIndex: 1 }}
      >
        {renderStatusIcon()}
        <span>{getStatusText()}</span>
      </div>

      {/* Package count */}
      {packageList.length > 0 && (
        <div className="absolute top-2 left-36 flex items-center">
          <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-800 text-xs rounded text-blue-600 dark:text-blue-300">
            {packageList.length} package{packageList.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

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
        {renderPackageList()}
      </div>

      {/* Progress bar for in-progress state */}
      {inProgress && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700 rounded-b-lg overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-b-lg animate-pulse"
            style={{
              animation: 'progress 2s ease-in-out infinite alternate',
              background: 'linear-gradient(90deg, #3B82F6, #1D4ED8, #3B82F6)',
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