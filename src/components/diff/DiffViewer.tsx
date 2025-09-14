import React from 'react';
import { AlertTriangle, Plus, Minus } from 'lucide-react';

interface DiffViewerProps {
  diff: string;
  filePath: string;
  className?: string;
}

interface DiffLine {
  type: 'context' | 'added' | 'removed' | 'header';
  content: string;
  lineNumber?: number;
  oldLineNumber?: number;
  newLineNumber?: number;
}

function parseDiff(diff: string): DiffLine[] {
  const lines = diff.split('\n');
  const result: DiffLine[] = [];
  let oldLineNum = 0;
  let newLineNum = 0;

  for (const line of lines) {
    if (line.startsWith('@@')) {
      // Hunk header
      const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
      if (match) {
        oldLineNum = parseInt(match[1]) - 1;
        newLineNum = parseInt(match[2]) - 1;
      }
      result.push({
        type: 'header',
        content: line,
      });
    } else if (line.startsWith('+')) {
      newLineNum++;
      result.push({
        type: 'added',
        content: line.substring(1),
        newLineNumber: newLineNum,
      });
    } else if (line.startsWith('-')) {
      oldLineNum++;
      result.push({
        type: 'removed',
        content: line.substring(1),
        oldLineNumber: oldLineNum,
      });
    } else if (line.startsWith(' ')) {
      oldLineNum++;
      newLineNum++;
      result.push({
        type: 'context',
        content: line.substring(1),
        oldLineNumber: oldLineNum,
        newLineNumber: newLineNum,
      });
    } else if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('diff') || line.startsWith('index')) {
      result.push({
        type: 'header',
        content: line,
      });
    }
  }

  return result;
}

export function DiffViewer({ diff, filePath, className = '' }: DiffViewerProps) {
  if (!diff.trim()) {
    return (
      <div className={`p-8 text-center text-gray-500 ${className}`}>
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-yellow-500/10 to-orange-500/10 flex items-center justify-center border border-gray-200">
          <AlertTriangle className="w-8 h-8 text-yellow-500" />
        </div>
        <div className="font-medium mb-2">No Diff Available</div>
        <div className="text-xs text-gray-400">Unable to generate diff for this file</div>
      </div>
    );
  }

  const diffLines = parseDiff(diff);

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">File Changes</h3>
            <p className="text-xs text-gray-600 font-mono">{filePath}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1 text-green-600">
            <Plus className="w-3 h-3" />
            <span>{diffLines.filter(l => l.type === 'added').length} additions</span>
          </div>
          <div className="flex items-center gap-1 text-red-600">
            <Minus className="w-3 h-3" />
            <span>{diffLines.filter(l => l.type === 'removed').length} deletions</span>
          </div>
        </div>
      </div>

      {/* Diff Content */}
      <div className="flex-1 overflow-auto bg-gray-900 text-gray-100 font-mono text-sm">
        <div className="min-h-full">
          {diffLines.map((line, index) => (
            <div
              key={index}
              className={`flex items-start ${
                line.type === 'added'
                  ? 'bg-green-900/30 border-l-2 border-green-500'
                  : line.type === 'removed'
                  ? 'bg-red-900/30 border-l-2 border-red-500'
                  : line.type === 'header'
                  ? 'bg-blue-900/30 border-l-2 border-blue-500'
                  : 'bg-transparent'
              }`}
            >
              {/* Line Numbers */}
              <div className="flex shrink-0 bg-gray-800 border-r border-gray-700">
                <div className="w-12 px-2 py-1 text-right text-gray-500 text-xs">
                  {line.type === 'removed' || line.type === 'context' ? line.oldLineNumber || '' : ''}
                </div>
                <div className="w-12 px-2 py-1 text-right text-gray-500 text-xs border-l border-gray-700">
                  {line.type === 'added' || line.type === 'context' ? line.newLineNumber || '' : ''}
                </div>
              </div>

              {/* Change Indicator */}
              <div className="w-6 px-2 py-1 text-center shrink-0">
                {line.type === 'added' ? (
                  <Plus className="w-3 h-3 text-green-400" />
                ) : line.type === 'removed' ? (
                  <Minus className="w-3 h-3 text-red-400" />
                ) : (
                  ''
                )}
              </div>

              {/* Line Content */}
              <div
                className={`flex-1 px-2 py-1 whitespace-pre overflow-x-auto ${
                  line.type === 'added'
                    ? 'text-green-100'
                    : line.type === 'removed'
                    ? 'text-red-100'
                    : line.type === 'header'
                    ? 'text-blue-200 font-semibold'
                    : 'text-gray-200'
                }`}
              >
                {line.content}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}