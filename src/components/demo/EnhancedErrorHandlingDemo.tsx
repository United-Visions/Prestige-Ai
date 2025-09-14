import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Play,
  Pause,
  RotateCcw,
  Zap,
  AlertTriangle,
  CheckCircle,
  Loader,
  Bug,
  Package,
  FileText
} from 'lucide-react';
import { useEnhancedStreaming } from '@/services/enhancedStreamingService';
import { prestigeAutoFixService } from '@/services/prestigeAutoFixService';
import { PrestigeBlockRenderer } from '@/components/chat/blocks/PrestigeBlockRenderer';

/**
 * Demo component to showcase the enhanced error handling system
 * Shows dyad-inspired auto-fix with 2-retry system and aggressive dependency management
 */
export const EnhancedErrorHandlingDemo: React.FC = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [problemReport, setProblemReport] = useState<any>(null);
  const [autoFixResults, setAutoFixResults] = useState<any>(null);
  const [streamingLogs, setStreamingLogs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('streaming');

  const { startEnhancedStream, cancelStream, getActiveStreams, isAutoFixRunning } = useEnhancedStreaming();

  const addLog = (message: string) => {
    setStreamingLogs(prev => [...prev.slice(-20), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const startErrorHandlingDemo = async () => {
    setIsStreaming(true);
    setCurrentResponse('');
    setProblemReport(null);
    setAutoFixResults(null);
    setStreamingLogs([]);

    addLog('🚀 Starting enhanced streaming with error handling...');

    // Mock problematic code that will need auto-fixing
    const problemPrompt = `Create a React component that uses uuid and moment libraries, but don't install them initially to demonstrate auto-fix`;

    try {
      await startEnhancedStream(problemPrompt, {
        onChunk: (chunk, fullResponse) => {
          setCurrentResponse(fullResponse);
          addLog(`📝 Received chunk: ${chunk.slice(0, 50)}...`);
        },
        onComplete: (response) => {
          setIsStreaming(false);
          addLog('✅ Streaming completed successfully');
        },
        onError: (error) => {
          setIsStreaming(false);
          addLog(`❌ Streaming error: ${error.message}`);
        },
        onAutoFixNeeded: (fixPrompt) => {
          addLog(`🔧 Auto-fix triggered: ${fixPrompt.slice(0, 100)}...`);
        },
        enableAutoFix: true,
        enableAggressiveFixes: true,
        aiRequestFunction: async (prompt: string) => {
          // Mock AI response for auto-fix
          addLog('🤖 AI generating fix response...');

          // Simulate AI delay
          await new Promise(resolve => setTimeout(resolve, 1000));

          return `I'll fix the missing dependencies and any other issues.

<prestige-add-dependency packages="uuid @types/uuid moment"></prestige-add-dependency>

<prestige-write path="src/components/EnhancedComponent.tsx" description="Fixed component with proper imports">
import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';

export const EnhancedComponent: React.FC = () => {
  const id = uuidv4();
  const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');

  return (
    <div>
      <h2>Enhanced Component</h2>
      <p>ID: {id}</p>
      <p>Created: {timestamp}</p>
    </div>
  );
};
</prestige-write>

<prestige-chat-summary>Fixed missing dependencies and component imports</prestige-chat-summary>`;
        }
      });
    } catch (error) {
      setIsStreaming(false);
      addLog(`❌ Demo failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const runProblemDetection = async () => {
    addLog('🔍 Running problem detection...');
    try {
      // Mock app path for demo
      const mockAppPath = '/mock/app/path';
      // In a real implementation, this would actually run TypeScript/build checks

      const mockReport = {
        problems: [
          {
            file: 'src/components/TestComponent.tsx',
            line: 5,
            column: 29,
            message: 'Failed to resolve import "uuid". Package may not be installed.',
            code: 'MODULE_NOT_FOUND',
            severity: 'error' as const
          },
          {
            file: 'src/components/TestComponent.tsx',
            line: 6,
            column: 20,
            message: 'Failed to resolve import "moment". Package may not be installed.',
            code: 'MODULE_NOT_FOUND',
            severity: 'error' as const
          },
          {
            file: 'src/utils/helpers.ts',
            line: 12,
            column: 5,
            message: 'Variable \'unused\' is declared but never used.',
            code: '@typescript-eslint/no-unused-vars',
            severity: 'warning' as const
          }
        ],
        totalErrors: 2,
        totalWarnings: 1,
        totalInfos: 0,
        appPath: mockAppPath,
        timestamp: Date.now()
      };

      setProblemReport(mockReport);
      addLog(`✅ Found ${mockReport.totalErrors} errors, ${mockReport.totalWarnings} warnings`);
    } catch (error) {
      addLog(`❌ Problem detection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const runAutoFix = async () => {
    if (!problemReport) {
      addLog('❌ No problem report available. Run problem detection first.');
      return;
    }

    addLog('🔧 Starting auto-fix process...');

    const mockAutoFixResult = {
      success: true,
      fixedProblems: problemReport.problems.filter((p: any) => p.severity === 'error'),
      remainingProblems: problemReport.problems.filter((p: any) => p.severity === 'warning'),
      attempts: 2,
      changes: [
        {
          type: 'add-dependency',
          packages: ['uuid', '@types/uuid', 'moment']
        },
        {
          type: 'write',
          path: 'src/components/TestComponent.tsx',
          content: '// Fixed component content...'
        }
      ]
    };

    setAutoFixResults(mockAutoFixResult);
    addLog(`✅ Auto-fix completed: ${mockAutoFixResult.fixedProblems.length} problems fixed in ${mockAutoFixResult.attempts} attempts`);
  };

  const resetDemo = () => {
    setIsStreaming(false);
    setCurrentResponse('');
    setProblemReport(null);
    setAutoFixResults(null);
    setStreamingLogs([]);
    cancelStream('all'); // This would cancel all active streams
    addLog('🔄 Demo reset');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Zap className="text-orange-500" size={24} />
              Enhanced Error Handling Demo
              <Badge variant="outline" className="text-xs">Dyad-Inspired</Badge>
            </span>
            <div className="flex items-center gap-2">
              {isStreaming && (
                <Badge variant="outline" className="text-xs bg-green-50 border-green-200">
                  <Loader size={12} className="animate-spin mr-1" />
                  Streaming
                </Badge>
              )}
              {problemReport && (
                <Badge variant="outline" className={`text-xs ${
                  problemReport.totalErrors > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                }`}>
                  <AlertTriangle size={12} className="mr-1" />
                  {problemReport.totalErrors} errors, {problemReport.totalWarnings} warnings
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 mb-6">
            <Button
              onClick={startErrorHandlingDemo}
              disabled={isStreaming}
              className="flex items-center gap-2"
            >
              <Play size={16} />
              Start Enhanced Stream
            </Button>
            <Button
              onClick={runProblemDetection}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Bug size={16} />
              Detect Problems
            </Button>
            <Button
              onClick={runAutoFix}
              variant="outline"
              disabled={!problemReport}
              className="flex items-center gap-2"
            >
              <CheckCircle size={16} />
              Run Auto-Fix
            </Button>
            <Button
              onClick={resetDemo}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RotateCcw size={16} />
              Reset
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="streaming">Streaming Response</TabsTrigger>
              <TabsTrigger value="problems">Problem Report</TabsTrigger>
              <TabsTrigger value="autofix">Auto-Fix Results</TabsTrigger>
              <TabsTrigger value="logs">System Logs</TabsTrigger>
            </TabsList>

            <TabsContent value="streaming" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">AI Response with Blocks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg p-4 min-h-96 bg-gray-50 dark:bg-gray-900">
                    {currentResponse ? (
                      <PrestigeBlockRenderer content={currentResponse} isStreaming={isStreaming} />
                    ) : (
                      <div className="flex items-center justify-center h-64 text-gray-500">
                        <div className="text-center">
                          <Zap className="mx-auto mb-4 text-gray-400" size={48} />
                          <div className="text-lg font-medium mb-2">Enhanced Streaming Demo</div>
                          <div className="text-sm">Click "Start Enhanced Stream" to see error handling in action</div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="problems" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Problem Detection Report</CardTitle>
                </CardHeader>
                <CardContent>
                  {problemReport ? (
                    <div className="space-y-4">
                      <div className="flex gap-4">
                        <Badge variant={problemReport.totalErrors > 0 ? "destructive" : "secondary"}>
                          {problemReport.totalErrors} Errors
                        </Badge>
                        <Badge variant="outline">
                          {problemReport.totalWarnings} Warnings
                        </Badge>
                        <Badge variant="outline">
                          {problemReport.totalInfos} Info
                        </Badge>
                      </div>
                      <div className="space-y-3">
                        {problemReport.problems.map((problem: any, index: number) => (
                          <Alert key={index} variant={problem.severity === 'error' ? 'destructive' : 'default'}>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              <div className="font-medium">{problem.file}:{problem.line}:{problem.column}</div>
                              <div className="text-sm mt-1">{problem.message}</div>
                              <div className="text-xs mt-1 opacity-70">Code: {problem.code}</div>
                            </AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Bug className="mx-auto mb-4 text-gray-400" size={48} />
                      <div className="text-gray-500">No problem report available</div>
                      <div className="text-sm text-gray-400 mt-1">Click "Detect Problems" to generate a report</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="autofix" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Auto-Fix Results</CardTitle>
                </CardHeader>
                <CardContent>
                  {autoFixResults ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className={`${autoFixResults.success ? 'text-green-500' : 'text-yellow-500'}`} size={20} />
                        <span className="font-medium">
                          {autoFixResults.success ? 'Auto-fix completed successfully' : 'Auto-fix completed with issues'}
                        </span>
                        <Badge variant="outline">{autoFixResults.attempts} attempts</Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-green-600">Fixed Problems</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold text-green-600 mb-2">
                              {autoFixResults.fixedProblems.length}
                            </div>
                            {autoFixResults.fixedProblems.map((problem: any, index: number) => (
                              <div key={index} className="text-xs text-gray-600 mb-1">
                                {problem.file}:{problem.line} - {problem.message.slice(0, 40)}...
                              </div>
                            ))}
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-yellow-600">Remaining Issues</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold text-yellow-600 mb-2">
                              {autoFixResults.remainingProblems.length}
                            </div>
                            {autoFixResults.remainingProblems.map((problem: any, index: number) => (
                              <div key={index} className="text-xs text-gray-600 mb-1">
                                {problem.file}:{problem.line} - {problem.message.slice(0, 40)}...
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      </div>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Changes Made</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {autoFixResults.changes.map((change: any, index: number) => (
                              <div key={index} className="flex items-center gap-2 text-sm">
                                {change.type === 'add-dependency' ? (
                                  <Package size={16} className="text-blue-500" />
                                ) : (
                                  <FileText size={16} className="text-green-500" />
                                )}
                                <span className="font-medium">{change.type}:</span>
                                <span className="text-gray-600">
                                  {change.packages?.join(', ') || change.path || 'Unknown'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <CheckCircle className="mx-auto mb-4 text-gray-400" size={48} />
                      <div className="text-gray-500">No auto-fix results available</div>
                      <div className="text-sm text-gray-400 mt-1">Run auto-fix after detecting problems</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="logs" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">System Logs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-black rounded-lg p-4 font-mono text-sm max-h-96 overflow-y-auto">
                    {streamingLogs.length > 0 ? (
                      streamingLogs.map((log, index) => (
                        <div key={index} className="text-green-400 mb-1">
                          {log}
                        </div>
                      ))
                    ) : (
                      <div className="text-gray-500">No logs available</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Key Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="font-medium">2-Retry Auto-Fix</span>
              </div>
              <div className="text-sm text-gray-600">
                Like dyad's system, attempts up to 2 auto-fix cycles for maximum problem resolution
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="font-medium">Aggressive Dependencies</span>
              </div>
              <div className="text-sm text-gray-600">
                Automatically installs missing packages with pnpm/npm fallback
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-medium">Real-time Detection</span>
              </div>
              <div className="text-sm text-gray-600">
                TypeScript, build, and ESLint error detection during streaming
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedErrorHandlingDemo;