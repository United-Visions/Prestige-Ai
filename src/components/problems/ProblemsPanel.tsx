import React, { useEffect, useState } from 'react';
import { Problem, useProblemsStore } from '../../stores/problemsStore';
import { ProblemScannerService } from '../../services/problemScannerService';
import { 
  AlertTriangle, 
  XCircle, 
  AlertCircle, 
  Info, 
  RefreshCw, 
  Settings, 
  Play,
  FileText,
  Clock
} from 'lucide-react';

interface ProblemItemProps {
  problem: Problem;
  onClick?: () => void;
}

const ProblemItem: React.FC<ProblemItemProps> = ({ problem, onClick }) => {
  const getIcon = () => {
    switch (problem.severity) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div 
      className="flex items-start gap-3 p-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="flex-shrink-0 mt-0.5">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="h-3 w-3 text-gray-400" />
          <span className="text-sm font-medium text-gray-700 truncate">
            {problem.file}
          </span>
          <span className="text-xs text-gray-500">
            {problem.line}:{problem.column}
          </span>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">
          {problem.message}
        </p>
        {problem.code && (
          <span className="inline-block mt-1 px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded">
            {problem.code}
          </span>
        )}
      </div>
    </div>
  );
};

interface ProblemsSummaryProps {
  totalErrors: number;
  totalWarnings: number;
  isScanning: boolean;
  onRefresh: () => void;
  onToggleAutoFix: () => void;
  onFixAll: () => void;
  autoFixEnabled: boolean;
}

const ProblemsSummary: React.FC<ProblemsSummaryProps> = ({
  totalErrors,
  totalWarnings,
  isScanning,
  onRefresh,
  onToggleAutoFix,
  onFixAll,
  autoFixEnabled
}) => {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {totalErrors > 0 && (
            <div className="flex items-center gap-1">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-red-600">
                {totalErrors} error{totalErrors !== 1 ? 's' : ''}
              </span>
            </div>
          )}
          {totalWarnings > 0 && (
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium text-yellow-600">
                {totalWarnings} warning{totalWarnings !== 1 ? 's' : ''}
              </span>
            </div>
          )}
          {totalErrors === 0 && totalWarnings === 0 && !isScanning && (
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 bg-green-500 rounded-full" />
              <span className="text-sm text-green-600">No problems</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={onRefresh}
          disabled={isScanning}
          className="flex items-center gap-1 px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${isScanning ? 'animate-spin' : ''}`} />
          {isScanning ? 'Scanning...' : 'Refresh'}
        </button>
        
        <button
          onClick={onToggleAutoFix}
          className={`flex items-center gap-1 px-3 py-1 text-xs border rounded ${
            autoFixEnabled 
              ? 'bg-blue-500 text-white border-blue-500' 
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          <Settings className="h-3 w-3" />
          Auto-fix {autoFixEnabled ? 'ON' : 'OFF'}
        </button>
        
        {(totalErrors > 0 || totalWarnings > 0) && (
          <button
            onClick={onFixAll}
            className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            <Play className="h-3 w-3" />
            Fix All
          </button>
        )}
      </div>
    </div>
  );
};

export const ProblemsPanel: React.FC = () => {
  const {
    currentReport,
    isScanning,
    autoFixEnabled,
    setIsScanning,
    setCurrentReport,
    setAutoFixEnabled
  } = useProblemsStore();

  const [, setSelectedProblem] = useState<Problem | null>(null);
  const problemScanner = ProblemScannerService.getInstance();

  // Auto-scan on mount
  useEffect(() => {
    handleRefresh();
  }, []);

  const handleRefresh = async () => {
    setIsScanning(true);
    try {
      // In a real implementation, this would scan the current project files
      const mockFilePaths = ['src/App.tsx', 'src/main.tsx', 'src/components/'];
      const report = await problemScanner.scanMultipleFiles(mockFilePaths);
      setCurrentReport(report);
    } catch (error) {
      console.error('Failed to refresh problems:', error);
    } finally {
      setIsScanning(false);
    }
  };

  const handleToggleAutoFix = () => {
    setAutoFixEnabled(!autoFixEnabled);
  };

  const handleFixAll = () => {
    if (!currentReport || currentReport.problems.length === 0) return;
    
    const fixPrompt = problemScanner.createAutoFixPrompt(currentReport.problems);
    console.log('Auto-fix prompt:', fixPrompt);
    
    // In a real implementation, this would send the prompt to the AI system
    // For now, just log it
    alert(`Auto-fix prompt generated:\n\n${fixPrompt}`);
  };

  const handleProblemClick = (problem: Problem) => {
    setSelectedProblem(problem);
    // In a real implementation, this would navigate to the file/line
    console.log('Navigate to:', problem.file, problem.line, problem.column);
  };

  if (!currentReport && !isScanning) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <AlertTriangle className="h-16 w-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-700 mb-2">
          No Problem Report
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Scan your project to detect code issues and errors.
        </p>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          <RefreshCw className="h-4 w-4" />
          Scan Project
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <ProblemsSummary
        totalErrors={currentReport?.totalErrors || 0}
        totalWarnings={currentReport?.totalWarnings || 0}
        isScanning={isScanning}
        onRefresh={handleRefresh}
        onToggleAutoFix={handleToggleAutoFix}
        onFixAll={handleFixAll}
        autoFixEnabled={autoFixEnabled}
      />
      
      <div className="flex-1 overflow-y-auto">
        {isScanning && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-gray-500">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="text-sm">Scanning for problems...</span>
            </div>
          </div>
        )}
        
        {currentReport && currentReport.problems.length === 0 && !isScanning && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <div className="h-6 w-6 bg-green-500 rounded-full" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              No Problems Found
            </h3>
            <p className="text-sm text-gray-500">
              Your code looks good! No errors or warnings detected.
            </p>
          </div>
        )}
        
        {currentReport && currentReport.problems.length > 0 && (
          <div>
            {currentReport.problems.map((problem, index) => (
              <ProblemItem
                key={`${problem.file}-${problem.line}-${problem.column}-${index}`}
                problem={problem}
                onClick={() => handleProblemClick(problem)}
              />
            ))}
          </div>
        )}
      </div>
      
      {currentReport && (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>
              Last scan: {new Date(currentReport.timestamp).toLocaleTimeString()}
            </span>
          </div>
          {autoFixEnabled && (
            <span className="text-blue-500">Auto-fix enabled</span>
          )}
        </div>
      )}
    </div>
  );
};