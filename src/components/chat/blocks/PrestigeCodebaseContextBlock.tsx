import React, { useState } from 'react';
import { Database, Search, FileText, Filter, ChevronDown, ChevronRight } from 'lucide-react';
import { PrestigeBlockState } from './PrestigeBlockTypes';

interface PrestigeCodebaseContextBlockProps {
  node: {
    properties: {
      contextType?: string;
      templateId?: string;
      files?: string;
      patterns?: string;
      query?: string;
      keep?: string;
      state: PrestigeBlockState;
    };
  };
  children?: React.ReactNode;
}

const getContextTypeIcon = (type: string) => {
  switch (type) {
    case 'full-analysis':
      return <Database className="w-4 h-4" />;
    case 'template':
      return <FileText className="w-4 h-4" />;
    case 'targeted':
      return <Search className="w-4 h-4" />;
    case 'clear-and-replace':
      return <Filter className="w-4 h-4" />;
    default:
      return <Database className="w-4 h-4" />;
  }
};

const getContextTypeLabel = (type: string) => {
  switch (type) {
    case 'full-analysis':
      return 'Full Codebase Analysis';
    case 'template':
      return 'Template Context';
    case 'targeted':
      return 'Targeted Context';
    case 'clear-and-replace':
      return 'Context Cleanup';
    default:
      return 'Codebase Context';
  }
};

const getStateColor = (state: PrestigeBlockState) => {
  switch (state) {
    case 'pending':
      return 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-700';
    case 'finished':
      return 'border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-700';
    case 'aborted':
      return 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700';
    default:
      return 'border-gray-300 bg-gray-50 dark:bg-gray-800/50 dark:border-gray-600';
  }
};

const getStateIndicator = (state: PrestigeBlockState) => {
  switch (state) {
    case 'pending':
      return (
        <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
          <span className="text-xs font-medium">Analyzing...</span>
        </div>
      );
    case 'finished':
      return (
        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-xs font-medium">Context Loaded</span>
        </div>
      );
    case 'aborted':
      return (
        <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <span className="text-xs font-medium">Failed</span>
        </div>
      );
    default:
      return null;
  }
};

export const PrestigeCodebaseContextBlock: React.FC<PrestigeCodebaseContextBlockProps> = ({
  node,
  children
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { contextType = 'full-analysis', templateId, files, patterns, query, keep, state } = node.properties;

  const contextDetails = [];
  if (templateId) contextDetails.push(`Template: ${templateId}`);
  if (files) contextDetails.push(`Files: ${files}`);
  if (patterns) contextDetails.push(`Patterns: ${patterns}`);
  if (query) contextDetails.push(`Query: ${query}`);
  if (keep) contextDetails.push(`Keep: ${keep}`);

  return (
    <div className={`border rounded-lg p-4 mb-4 ${getStateColor(state)}`}>
      {/* Header */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          {getContextTypeIcon(contextType)}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {getContextTypeLabel(contextType)}
              </span>
              {getStateIndicator(state)}
            </div>
            {contextDetails.length > 0 && (
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {contextDetails.join(' • ')}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-500" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="space-y-3">
            {/* Context Type Description */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Context Operation
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {contextType === 'full-analysis' &&
                  'Analyzing the entire codebase to understand architecture, patterns, and conventions for intelligent editing.'}
                {contextType === 'template' &&
                  'Loading template structure and patterns to guide new application creation.'}
                {contextType === 'targeted' &&
                  'Focusing on specific files and patterns relevant to the current task.'}
                {contextType === 'clear-and-replace' &&
                  'Clearing previous context and keeping only essential files for memory efficiency.'}
              </p>
            </div>

            {/* Parameters */}
            {contextDetails.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Parameters
                </h4>
                <div className="space-y-1">
                  {templateId && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">Template ID:</span>
                      <span className="ml-2 font-mono text-gray-600 dark:text-gray-400">{templateId}</span>
                    </div>
                  )}
                  {files && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">Files:</span>
                      <div className="ml-2 font-mono text-gray-600 dark:text-gray-400 text-xs">
                        {files.split(',').map(file => file.trim()).join(', ')}
                      </div>
                    </div>
                  )}
                  {patterns && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">Patterns:</span>
                      <span className="ml-2 font-mono text-gray-600 dark:text-gray-400">{patterns}</span>
                    </div>
                  )}
                  {query && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">Query:</span>
                      <span className="ml-2 font-mono text-gray-600 dark:text-gray-400">{query}</span>
                    </div>
                  )}
                  {keep && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">Keep:</span>
                      <div className="ml-2 font-mono text-gray-600 dark:text-gray-400 text-xs">
                        {keep.split(',').map(file => file.trim()).join(', ')}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Additional Content */}
            {children && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Details
                </h4>
                <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded p-3 font-mono">
                  {children}
                </div>
              </div>
            )}

            {/* Context Benefits */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Benefits
              </h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                {contextType === 'full-analysis' && (
                  <>
                    <li>• Understands existing architecture and patterns</li>
                    <li>• Enables context-aware code suggestions</li>
                    <li>• Reduces inconsistent implementations</li>
                  </>
                )}
                {contextType === 'template' && (
                  <>
                    <li>• Ensures new apps follow template conventions</li>
                    <li>• Maintains consistent project structure</li>
                    <li>• Accelerates development with proven patterns</li>
                  </>
                )}
                {contextType === 'targeted' && (
                  <>
                    <li>• Focuses AI attention on relevant code</li>
                    <li>• Improves accuracy of specific changes</li>
                    <li>• Reduces unnecessary context noise</li>
                  </>
                )}
                {contextType === 'clear-and-replace' && (
                  <>
                    <li>• Optimizes memory usage for large codebases</li>
                    <li>• Maintains focus on current task</li>
                    <li>• Prevents context overflow</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};