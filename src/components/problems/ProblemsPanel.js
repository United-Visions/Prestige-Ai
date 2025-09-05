import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useProblemsStore } from '../../stores/problemsStore';
import { ProblemScannerService } from '../../services/problemScannerService';
import { AlertTriangle, XCircle, AlertCircle, Info, RefreshCw, Settings, Play, FileText, Clock } from 'lucide-react';
const ProblemItem = ({ problem, onClick }) => {
    const getIcon = () => {
        switch (problem.severity) {
            case 'error':
                return _jsx(XCircle, { className: "h-4 w-4 text-red-500" });
            case 'warning':
                return _jsx(AlertTriangle, { className: "h-4 w-4 text-yellow-500" });
            case 'info':
                return _jsx(Info, { className: "h-4 w-4 text-blue-500" });
            default:
                return _jsx(AlertCircle, { className: "h-4 w-4 text-gray-500" });
        }
    };
    return (_jsxs("div", { className: "flex items-start gap-3 p-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors", onClick: onClick, children: [_jsx("div", { className: "flex-shrink-0 mt-0.5", children: getIcon() }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx(FileText, { className: "h-3 w-3 text-gray-400" }), _jsx("span", { className: "text-sm font-medium text-gray-700 truncate", children: problem.file }), _jsxs("span", { className: "text-xs text-gray-500", children: [problem.line, ":", problem.column] })] }), _jsx("p", { className: "text-sm text-gray-600 leading-relaxed", children: problem.message }), problem.code && (_jsx("span", { className: "inline-block mt-1 px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded", children: problem.code }))] })] }));
};
const ProblemsSummary = ({ totalErrors, totalWarnings, isScanning, onRefresh, onToggleAutoFix, onFixAll, autoFixEnabled }) => {
    return (_jsxs("div", { className: "flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200", children: [_jsx("div", { className: "flex items-center gap-4", children: _jsxs("div", { className: "flex items-center gap-2", children: [totalErrors > 0 && (_jsxs("div", { className: "flex items-center gap-1", children: [_jsx(XCircle, { className: "h-4 w-4 text-red-500" }), _jsxs("span", { className: "text-sm font-medium text-red-600", children: [totalErrors, " error", totalErrors !== 1 ? 's' : ''] })] })), totalWarnings > 0 && (_jsxs("div", { className: "flex items-center gap-1", children: [_jsx(AlertTriangle, { className: "h-4 w-4 text-yellow-500" }), _jsxs("span", { className: "text-sm font-medium text-yellow-600", children: [totalWarnings, " warning", totalWarnings !== 1 ? 's' : ''] })] })), totalErrors === 0 && totalWarnings === 0 && !isScanning && (_jsxs("div", { className: "flex items-center gap-1", children: [_jsx("div", { className: "h-2 w-2 bg-green-500 rounded-full" }), _jsx("span", { className: "text-sm text-green-600", children: "No problems" })] }))] }) }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("button", { onClick: onRefresh, disabled: isScanning, className: "flex items-center gap-1 px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50", children: [_jsx(RefreshCw, { className: `h-3 w-3 ${isScanning ? 'animate-spin' : ''}` }), isScanning ? 'Scanning...' : 'Refresh'] }), _jsxs("button", { onClick: onToggleAutoFix, className: `flex items-center gap-1 px-3 py-1 text-xs border rounded ${autoFixEnabled
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`, children: [_jsx(Settings, { className: "h-3 w-3" }), "Auto-fix ", autoFixEnabled ? 'ON' : 'OFF'] }), (totalErrors > 0 || totalWarnings > 0) && (_jsxs("button", { onClick: onFixAll, className: "flex items-center gap-1 px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600", children: [_jsx(Play, { className: "h-3 w-3" }), "Fix All"] }))] })] }));
};
export const ProblemsPanel = () => {
    const { currentReport, isScanning, autoFixEnabled, setIsScanning, setCurrentReport, setAutoFixEnabled } = useProblemsStore();
    const [, setSelectedProblem] = useState(null);
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
        }
        catch (error) {
            console.error('Failed to refresh problems:', error);
        }
        finally {
            setIsScanning(false);
        }
    };
    const handleToggleAutoFix = () => {
        setAutoFixEnabled(!autoFixEnabled);
    };
    const handleFixAll = () => {
        if (!currentReport || currentReport.problems.length === 0)
            return;
        const fixPrompt = problemScanner.createAutoFixPrompt(currentReport.problems);
        console.log('Auto-fix prompt:', fixPrompt);
        // In a real implementation, this would send the prompt to the AI system
        // For now, just log it
        alert(`Auto-fix prompt generated:\n\n${fixPrompt}`);
    };
    const handleProblemClick = (problem) => {
        setSelectedProblem(problem);
        // In a real implementation, this would navigate to the file/line
        console.log('Navigate to:', problem.file, problem.line, problem.column);
    };
    if (!currentReport && !isScanning) {
        return (_jsxs("div", { className: "flex flex-col items-center justify-center h-full p-8 text-center", children: [_jsx(AlertTriangle, { className: "h-16 w-16 text-gray-400 mb-4" }), _jsx("h3", { className: "text-lg font-medium text-gray-700 mb-2", children: "No Problem Report" }), _jsx("p", { className: "text-sm text-gray-500 mb-4", children: "Scan your project to detect code issues and errors." }), _jsxs("button", { onClick: handleRefresh, className: "flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600", children: [_jsx(RefreshCw, { className: "h-4 w-4" }), "Scan Project"] })] }));
    }
    return (_jsxs("div", { className: "flex flex-col h-full bg-white", children: [_jsx(ProblemsSummary, { totalErrors: currentReport?.totalErrors || 0, totalWarnings: currentReport?.totalWarnings || 0, isScanning: isScanning, onRefresh: handleRefresh, onToggleAutoFix: handleToggleAutoFix, onFixAll: handleFixAll, autoFixEnabled: autoFixEnabled }), _jsxs("div", { className: "flex-1 overflow-y-auto", children: [isScanning && (_jsx("div", { className: "flex items-center justify-center py-8", children: _jsxs("div", { className: "flex items-center gap-2 text-gray-500", children: [_jsx(RefreshCw, { className: "h-4 w-4 animate-spin" }), _jsx("span", { className: "text-sm", children: "Scanning for problems..." })] }) })), currentReport && currentReport.problems.length === 0 && !isScanning && (_jsxs("div", { className: "flex flex-col items-center justify-center py-12 text-center", children: [_jsx("div", { className: "h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mb-4", children: _jsx("div", { className: "h-6 w-6 bg-green-500 rounded-full" }) }), _jsx("h3", { className: "text-lg font-medium text-gray-700 mb-2", children: "No Problems Found" }), _jsx("p", { className: "text-sm text-gray-500", children: "Your code looks good! No errors or warnings detected." })] })), currentReport && currentReport.problems.length > 0 && (_jsx("div", { children: currentReport.problems.map((problem, index) => (_jsx(ProblemItem, { problem: problem, onClick: () => handleProblemClick(problem) }, `${problem.file}-${problem.line}-${problem.column}-${index}`))) }))] }), currentReport && (_jsxs("div", { className: "flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500", children: [_jsxs("div", { className: "flex items-center gap-1", children: [_jsx(Clock, { className: "h-3 w-3" }), _jsxs("span", { children: ["Last scan: ", new Date(currentReport.timestamp).toLocaleTimeString()] })] }), autoFixEnabled && (_jsx("span", { className: "text-blue-500", children: "Auto-fix enabled" }))] }))] }));
};
