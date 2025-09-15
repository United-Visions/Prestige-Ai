import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { PrestigeBlockState } from './PrestigeBlockTypes';

interface PrestigeDeleteBlockProps {
  node: {
    properties: {
      path?: string;
      state: PrestigeBlockState;
    };
  };
}

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
          <span className="text-xs font-medium">Deleting...</span>
        </div>
      );
    case 'finished':
      return (
        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-xs font-medium">Deleted</span>
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

export const PrestigeDeleteBlock: React.FC<PrestigeDeleteBlockProps> = ({ node }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { path = '', state } = node.properties;

  return (
    <div className={`border rounded-lg p-4 mb-4 ${getStateColor(state)}`}>
      {/* Header */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <Trash2 className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-gray-100">
                Delete File
              </span>
              {getStateIndicator(state)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 font-mono">
              {path}
            </div>
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
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                File Deletion Operation
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This operation permanently removes a file from the project. The file will be deleted
                from both the file system and the virtual file system.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Target Path
              </h4>
              <div className="text-sm">
                <div className="font-mono text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded p-2 text-xs">
                  {path}
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Effects
              </h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• File permanently removed from project</li>
                <li>• Virtual file system updated</li>
                <li>• Import references may need manual cleanup</li>
                <li>• File tree refreshed automatically</li>
              </ul>
            </div>

            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded p-3">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Trash2 className="w-4 h-4 text-orange-500" />
                </div>
                <div className="ml-2">
                  <h4 className="text-sm font-medium text-orange-800 dark:text-orange-200">
                    Warning
                  </h4>
                  <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                    This operation cannot be undone. Make sure you have backups if needed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};