import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { ProblemsPanel } from '../problems/ProblemsPanel';
import { ProblemScannerService } from '../../services/problemScannerService';
import { useProblemsStore } from '../../stores/problemsStore';
import { logger } from '../../services/loggingService';
/**
 * Demo component showing the Problem Panel in action
 * This demonstrates the AI-powered real-time problem detection
 */
export const ProblemPanelDemo = () => {
    const [sampleCode, setSampleCode] = useState(`
import React, { useState } from 'react';

function BuggyComponent() {
  const [count, setCount] = useState(0);
  const [data, setData] = useState(null);
  
  // Missing useEffect import
  useEffect(() => {
    fetchData().then(setData);
  }, []);

  const fetchData = async () => {
    // Missing await keyword
    const response = fetch('/api/data');
    return response.json();
  };

  const handleClick = () => {
    // Type error - should be number
    setCount(count + "1");
    
    // Unused variable
    const unusedVar = "this will be flagged";
    
    // Console statement
    console.log('Debug info');
  };

  // Missing return type annotation
  const calculateTotal = (items) => {
    return items.reduce((acc, item) => acc + item.price, 0);
  };

  return (
    <div>
      <h1>Sample Component</h1>
      <p>Count: {count}</p>
      <button onClick={handleClick}>Increment</button>
      {data && (
        <div>
          <p>Data loaded: {data.message}</p>
          <p>Total: {calculateTotal(data.items)}</p>
        </div>
      )}
    </div>
  );
}

export default BuggyComponent;
`);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const problemScanner = ProblemScannerService.getInstance();
    const { setCurrentReport } = useProblemsStore();
    // Simulate real-time analysis when code changes
    useEffect(() => {
        const analyzeCode = async () => {
            setIsAnalyzing(true);
            logger.info('Starting code analysis', { codeLength: sampleCode.length });
            try {
                const problems = await problemScanner.detectProblemsInRealTime(sampleCode, 'demo.tsx');
                const report = {
                    problems,
                    timestamp: Date.now(),
                    totalErrors: problems.filter(p => p.severity === 'error').length,
                    totalWarnings: problems.filter(p => p.severity === 'warning').length,
                };
                setCurrentReport(report);
                logger.info('Code analysis completed', {
                    problemsFound: problems.length,
                    errors: report.totalErrors,
                    warnings: report.totalWarnings
                });
            }
            catch (error) {
                logger.error('Code analysis failed', { error: error instanceof Error ? error.message : String(error) });
            }
            finally {
                setIsAnalyzing(false);
            }
        };
        const debounceTimer = setTimeout(analyzeCode, 500);
        return () => clearTimeout(debounceTimer);
    }, [sampleCode, problemScanner, setCurrentReport]);
    return (_jsxs("div", { className: "h-screen flex", children: [_jsxs("div", { className: "flex-1 p-4 bg-gray-50", children: [_jsxs("div", { className: "mb-4", children: [_jsx("h2", { className: "text-xl font-bold mb-2", children: "Sample Code for Analysis" }), _jsx("p", { className: "text-sm text-gray-600 mb-4", children: "Edit the code below to see real-time AI-powered problem detection in action. The AI model (Claude-3-Haiku) analyzes the code and identifies errors, warnings, and suggestions." }), isAnalyzing && (_jsx("div", { className: "mb-2 text-sm text-blue-600", children: "\uD83E\uDD16 AI analyzing code..." }))] }), _jsx("textarea", { value: sampleCode, onChange: (e) => setSampleCode(e.target.value), className: "w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm bg-white", placeholder: "Enter your code here..." }), _jsxs("div", { className: "mt-4 p-3 bg-blue-50 border border-blue-200 rounded", children: [_jsx("h3", { className: "font-medium text-blue-800 mb-2", children: "AI Model Information:" }), _jsxs("ul", { className: "text-sm text-blue-700 space-y-1", children: [_jsxs("li", { children: ["\u2022 ", _jsx("strong", { children: "Model:" }), " Claude-3-Haiku (Anthropic)"] }), _jsxs("li", { children: ["\u2022 ", _jsx("strong", { children: "Purpose:" }), " Fast, real-time code analysis"] }), _jsxs("li", { children: ["\u2022 ", _jsx("strong", { children: "Capabilities:" }), " Syntax errors, type issues, best practices"] }), _jsxs("li", { children: ["\u2022 ", _jsx("strong", { children: "Fallback:" }), " Rule-based detection when AI is unavailable"] })] })] }), _jsxs("div", { className: "mt-4 p-3 bg-green-50 border border-green-200 rounded", children: [_jsx("h3", { className: "font-medium text-green-800 mb-2", children: "Features Demonstrated:" }), _jsxs("ul", { className: "text-sm text-green-700 space-y-1", children: [_jsx("li", { children: "\u2022 Real-time problem detection as you type" }), _jsx("li", { children: "\u2022 AI-powered intelligent analysis" }), _jsx("li", { children: "\u2022 Problem severity classification" }), _jsx("li", { children: "\u2022 Auto-fix suggestions" }), _jsx("li", { children: "\u2022 Comprehensive error logging" })] })] })] }), _jsxs("div", { className: "w-96 border-l border-gray-200 bg-white", children: [_jsx("div", { className: "h-8 bg-gray-100 border-b border-gray-200 px-3 py-2", children: _jsx("h3", { className: "text-sm font-medium text-gray-700", children: "Problems Panel" }) }), _jsx("div", { className: "h-full", children: _jsx(ProblemsPanel, {}) })] })] }));
};
