import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import useCodeViewerStore from '@/stores/codeViewerStore';
import useAppStore from '@/stores/appStore';
import { X, Copy, Download, ChevronDown, ChevronUp, Code2, Play, RotateCcw, Square, RefreshCw, Terminal, Hammer, AlertTriangle, Send } from 'lucide-react';
import { showToast } from '@/utils/toast';
import { PreviewIframe } from '@/components/preview/PreviewIframe';
import { AppError, AppOutput } from '@/types/appTypes';
import { AdvancedAppManagementService } from '@/services/advancedAppManagementService';
import { ErrorDetectionService, type ErrorReport } from '@/services/errorDetectionService';

interface CodeViewerPanelProps {
  className?: string;
}

export function CodeViewerPanel({ className = '' }: CodeViewerPanelProps) {
  const { 
    isVisible, 
    selectedFile, 
    hideCodeViewer,
    activeTab: storeActiveTab,
    setActiveTab
  } = useCodeViewerStore();

  const { currentApp, selectedModel } = useAppStore();

  const [isExpanded, setIsExpanded] = useState(false);
  const activeTab = storeActiveTab;
  
  // Preview state
  const [appUrl, setAppUrl] = useState<string | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [outputs, setOutputs] = useState<AppOutput[]>([]);
  const [errors, setErrors] = useState<AppError[]>([]);
  const [showLogs, setShowLogs] = useState(true); // Start with logs visible by default
  const [iframeKey, setIframeKey] = useState(0);
  const [errorReport, setErrorReport] = useState<ErrorReport | null>(null);
  const [isFixingErrors, setIsFixingErrors] = useState(false);

  const appService = AdvancedAppManagementService.getInstance();
  const errorService = ErrorDetectionService.getInstance();

  useEffect(() => {
    // Reset expansion state when a new file is selected
    if (selectedFile) {
      setIsExpanded(false);
    }
  }, [selectedFile]);

  useEffect(() => {
    // Clear preview state immediately when switching apps
    setAppUrl(null);
    setOriginalUrl(null);
    setOutputs([]);
    setErrors([]);
    setIsRunning(false);
    
    if (currentApp?.id) {
      // Check if the new app is actually running
      appService.isAppRunning(currentApp.id).then(running => {
        setIsRunning(running);
        
        // If the app is running, it will set appUrl through the output handler
        // No need to do anything special here
      });
    }
  }, [currentApp, appService]);

  const handleOutput = (output: AppOutput) => {
    // Use functional update to avoid potential performance issues
    setOutputs(prev => {
      // Limit output history to prevent memory issues (keep last 1000 entries)
      const newOutputs = [...prev, output];
      const limitedOutputs = newOutputs.length > 1000 ? newOutputs.slice(-1000) : newOutputs;
      
      // Update error report when outputs change (debounced)
      if (currentApp?.id && output.type === 'stderr') {
        setTimeout(() => {
          const report = errorService.createErrorReport(limitedOutputs, errors);
          setErrorReport(report);
        }, 1000); // Debounce error detection for outputs
      }
      
      return limitedOutputs;
    });
    
    // Check for proxy server start message
    const proxyMatch = output.message.match(/\[prestige-proxy-server\]started=\[(.*?)\]/);
    if (proxyMatch && proxyMatch[1]) {
      const proxyUrl = proxyMatch[1];
      const originalMatch = output.message.match(/original=\[(.*?)\]/);
      const originalUrl = originalMatch ? originalMatch[1] : null;
      
      setAppUrl(proxyUrl);
      setOriginalUrl(originalUrl);
      setIframeKey(prev => prev + 1); // Force iframe refresh
    }
  };

  const handleError = (error: AppError) => {
    setErrors(prev => {
      // Limit error history to prevent memory issues (keep last 100 entries)
      const newErrors = [...prev, error];
      const limitedErrors = newErrors.length > 100 ? newErrors.slice(-100) : newErrors;
      
      // Update error report when errors change
      if (currentApp?.id) {
        setTimeout(() => {
          const report = errorService.createErrorReport(outputs, limitedErrors);
          setErrorReport(report);
        }, 500); // Debounce error detection
      }
      
      return limitedErrors;
    });
  };

  const startApp = async () => {
    if (!currentApp?.id) return;
    
    // Set loading state immediately to provide instant feedback
    setIsStarting(true);
    setShowLogs(true);
    
    // Use setTimeout to defer heavy operations and avoid blocking the UI
    setTimeout(async () => {
      setOutputs([]);
      setErrors([]);
      
      // Add starting message to logs
      setOutputs([{
        type: 'stdout',
        message: `Starting app: ${currentApp.name || `App ${currentApp.id}`}...`,
        timestamp: Date.now(),
        appId: currentApp.id
      }]);
      
      // Add debug message to test logs display
      setTimeout(() => {
        setOutputs(prev => [...prev, {
          type: 'stdout',
          message: `Debug: Calling appService.runApp(${currentApp.id})...`,
          timestamp: Date.now(),
          appId: currentApp.id
        }]);
      }, 500);
      
      try {
        await appService.runApp(currentApp.id, handleOutput, handleError);
        setIsRunning(true);
      } catch (error) {
        console.error('Failed to start app:', error);
        handleError({
          type: 'build-error-report',
          payload: {
            message: `Failed to start app: ${error}`,
            stack: error instanceof Error ? error.stack : undefined
          },
          timestamp: Date.now(),
          appId: currentApp.id
        });
      } finally {
        setIsStarting(false);
      }
    }, 0);
  };

  const stopApp = async () => {
    if (!currentApp?.id) return;
    
    try {
      // Clear URLs first to prevent iframe errors
      setAppUrl(null);
      setOriginalUrl(null);
      setIframeKey(prev => prev + 1);
      
      // Then stop the app
      await appService.stopApp(currentApp.id);
      setIsRunning(false);
      
      // Add stopping message
      setOutputs(prev => [...prev, {
        type: 'stdout',
        message: `Stopped app: ${currentApp.name || `App ${currentApp.id}`}`,
        timestamp: Date.now(),
        appId: currentApp.id
      }]);
    } catch (error) {
      console.error('Failed to stop app:', error);
      handleError({
        type: 'build-error-report',
        payload: {
          message: `Failed to stop app: ${error}`,
          stack: error instanceof Error ? error.stack : undefined
        },
        timestamp: Date.now(),
        appId: currentApp.id
      });
    }
  };

  const restartApp = async (removeNodeModules: boolean = false) => {
    if (!currentApp?.id) return;
    
    // Set loading state immediately to provide instant feedback
    setIsStarting(true);
    setShowLogs(true);
    
    // Use setTimeout to defer heavy operations and avoid blocking the UI
    setTimeout(async () => {
      setOutputs([]);
      setErrors([]);
      
      // Add restarting message to logs
      setOutputs([{
        type: 'stdout',
        message: `Restarting app: ${currentApp.name || `App ${currentApp.id}`}${removeNodeModules ? ' (clearing node_modules)' : ''}...`,
        timestamp: Date.now(),
        appId: currentApp.id
      }]);
      
      try {
        await appService.restartApp(currentApp.id, handleOutput, handleError, removeNodeModules);
        setIsRunning(true);
      } catch (error) {
        console.error('Failed to restart app:', error);
        handleError({
          type: 'build-error-report',
          payload: {
            message: `Failed to restart app: ${error}`,
            stack: error instanceof Error ? error.stack : undefined
          },
          timestamp: Date.now(),
          appId: currentApp.id
        });
      } finally {
        setIsStarting(false);
      }
    }, 0);
  };

  const refreshIframe = () => {
    setIframeKey(prev => prev + 1);
  };

  const rebuildApp = async () => {
    if (!currentApp?.id) return;
    
    // Set loading state immediately to provide instant feedback
    setIsStarting(true);
    setShowLogs(true);
    
    // Use setTimeout to defer heavy operations and avoid blocking the UI
    setTimeout(async () => {
      setOutputs([]);
      setErrors([]);
      
      // Add rebuilding message to logs
      setOutputs([{
        type: 'stdout',
        message: `Rebuilding app: ${currentApp.name || `App ${currentApp.id}`} (clearing node_modules and reinstalling from updated package.json)...`,
        timestamp: Date.now(),
        appId: currentApp.id
      }]);
      
      try {
        await appService.rebuildApp(currentApp.id, handleOutput, handleError);
        setIsRunning(true);
      } catch (error) {
        console.error('Failed to rebuild app:', error);
        handleError({
          type: 'build-error-report',
          payload: {
            message: `Failed to rebuild app: ${error}`,
            stack: error instanceof Error ? error.stack : undefined
          },
          timestamp: Date.now(),
          appId: currentApp.id
        });
      } finally {
        setIsStarting(false);
      }
    }, 0);
  };

  const autoFixErrors = async () => {
    if (!currentApp?.id || !errorReport?.hasErrors) return;
    
    setIsFixingErrors(true);
    
    try {
      // Use the currently selected model instead of hardcoding Claude Code
      if (selectedModel.provider === 'claude-code' || (selectedModel.provider === 'auto' && selectedModel.name === 'Claude Code')) {
        // Only use ClaudeCodeService if Claude Code is specifically selected
        const { ClaudeCodeService } = await import('@/services/claudeCodeService');
        const claudeService = ClaudeCodeService.getInstance();
        
        // Get the current conversation for this app
        const conversations = await appService.getAppConversations(currentApp.id);
        const activeConversation = conversations[0]; // Get the most recent conversation
        
        if (activeConversation) {
          const fixPrompt = errorService.generateErrorFixPrompt(errorReport);
          console.log('Auto-fix prompt (Claude Code):', fixPrompt);
          
          // Send the fix prompt using Claude Code service
          const response = await claudeService.continueConversation(activeConversation.id, fixPrompt, 'build');
          
          // Process the response to apply file changes
          const { processAgentResponse } = await import('@/services/agentResponseProcessor');
          await processAgentResponse(response);
          
          // Clear error report after successful fix attempt
          setErrorReport(null);
          showToast('Attempted to fix errors using Claude Code. Check the logs for results.', 'info');
        } else {
          showToast('No active conversation found for this app', 'error');
        }
      } else {
        // Use the standard AI model service for other models
        const { aiModelService } = await import('@/services/aiModelService');
        const { constructSystemPrompt, readAiRules } = await import('@/prompts/system_prompt');
        
        // Get the current conversation for this app
        const conversations = await appService.getAppConversations(currentApp.id);
        const activeConversation = conversations[0]; // Get the most recent conversation
        
        if (activeConversation) {
          // Build the system prompt with current app context
          const aiRules = await readAiRules(currentApp.path);
          let fileStructure = '';
          if (currentApp.files && currentApp.files.length > 0) {
            fileStructure = currentApp.files
              .map(file => file.type === 'directory' ? `${file.path}/` : file.path)
              .sort()
              .join('\n');
          }
          const systemPrompt = constructSystemPrompt({ aiRules, fileStructure });
          
          const fixPrompt = errorService.generateErrorFixPrompt(errorReport);
          console.log('Auto-fix prompt (Other models):', fixPrompt);
          
          // Get conversation messages for context
          const fullConversation = await appService.getConversation(activeConversation.id);
          const messages = fullConversation?.messages || [];
          
          // Add the fix prompt as a user message
          const conversationMessages = [...messages, {
            id: Date.now(),
            content: fixPrompt,
            role: 'user' as const,
            createdAt: new Date(),
            conversationId: activeConversation.id
          }];
          
          // Generate response using the selected model
          const response = await aiModelService.generateResponse(
            selectedModel,
            systemPrompt,
            conversationMessages
          );
          
          // Process the response to apply file changes
          const { processAgentResponse } = await import('@/services/agentResponseProcessor');
          const agentResult = await processAgentResponse(response);
          
          // Add the fix prompt and response to the conversation
          await appService.addMessageToConversation(activeConversation.id, 'user', fixPrompt);
          const responseContent = agentResult?.chatContent || response;
          await appService.addMessageToConversation(activeConversation.id, 'assistant', responseContent);
          
          // Clear error report after successful fix attempt
          setErrorReport(null);
          showToast(`Attempted to fix errors using ${selectedModel.name}. Check the logs for results.`, 'info');
        } else {
          showToast('No active conversation found for this app', 'error');
        }
      }
    } catch (error) {
      console.error('Failed to auto-fix errors:', error);
      showToast('Failed to auto-fix errors: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
    } finally {
      setIsFixingErrors(false);
    }
  };

  const sendErrorsToTerminal = () => {
    if (!errorReport?.hasErrors) {
      showToast('No errors to send', 'info');
      return;
    }

    const errorPrompt = errorService.generateErrorFixPrompt(errorReport);
    
    // Store error prompt globally so terminal can access it
    window.prestigeErrorPrompt = errorPrompt;
    
    // Notify user
    showToast(`Prepared error summary for terminal. Switch to terminal mode and type "fix-errors".`, 'success');
  };

  if (!isVisible || !selectedFile) {
    return null;
  }

  const handleCopy = async () => {
    if (selectedFile?.content) {
      try {
        await navigator.clipboard.writeText(selectedFile.content);
        showToast('Code copied to clipboard', 'success');
      } catch (error) {
        showToast('Failed to copy code', 'error');
      }
    }
  };

  const handleDownload = () => {
    if (selectedFile?.content) {
      const blob = new Blob([selectedFile.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedFile.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Downloaded ${selectedFile.name}`, 'success');
    }
  };

  const getLanguageFromExtension = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'rb': 'ruby',
      'php': 'php',
      'java': 'java',
      'c': 'c',
      'cpp': 'cpp',
      'cs': 'csharp',
      'go': 'go',
      'rs': 'rust',
      'swift': 'swift',
      'kt': 'kotlin',
      'scala': 'scala',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'html': 'html',
      'xml': 'xml',
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'sql': 'sql',
      'sh': 'bash',
      'bash': 'bash',
      'zsh': 'bash',
      'fish': 'bash',
    };
    return langMap[ext || ''] || 'text';
  };

  const formatFileSize = (content: string): string => {
    const bytes = new TextEncoder().encode(content).length;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getLineCount = (content: string): number => {
    return content.split('\n').length;
  };

  return (
    <div 
      className={`fixed top-0 left-0 right-0 bottom-0 z-50 transition-all duration-300 ease-in-out ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      } ${className}`}
    >
      <Card className="h-full rounded-t-lg rounded-b-none border-t shadow-lg bg-background">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold">{selectedFile.name}</h3>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{selectedFile.path}</span>
                <span>•</span>
                <span>{getLineCount(selectedFile.content || '')} lines</span>
                <span>•</span>
                <span>{formatFileSize(selectedFile.content || '')}</span>
                <span>•</span>
                <span className="capitalize">{getLanguageFromExtension(selectedFile.name)}</span>
              </div>
            </div>
            
            {/* Tabs */}
            <div className="ml-4">
              <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
                <button
                  onClick={() => setActiveTab('code')}
                  className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 gap-1 ${
                    activeTab === 'code'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'hover:bg-muted/80'
                  }`}
                >
                  <Code2 className="w-4 h-4" />
                  Code
                </button>
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 gap-1 ${
                    activeTab === 'preview'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'hover:bg-muted/80'
                  }`}
                >
                  <Play className="w-4 h-4" />
                  Preview
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {activeTab === 'code' && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-8 w-8 p-0"
                  title="Copy to clipboard"
                >
                  <Copy className="w-4 h-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownload}
                  className="h-8 w-8 p-0"
                  title="Download file"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </>
            )}
            
            {activeTab === 'preview' && (
              <>
                {!isRunning ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={startApp}
                    disabled={isStarting || !currentApp}
                    className="h-8 px-3"
                    title="Start App"
                  >
                    <Play className="w-4 h-4 mr-1" />
                    {isStarting ? 'Starting...' : 'Start'}
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={stopApp}
                    className="h-8 px-3"
                    title="Stop App"
                  >
                    <Square className="w-4 h-4 mr-1" />
                    Stop
                  </Button>
                )}
                
                {isRunning && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => restartApp(false)}
                      disabled={isStarting}
                      className="h-8 px-3"
                      title="Restart App"
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Restart
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={rebuildApp}
                      disabled={isStarting}
                      className="h-8 px-3"
                      title="Rebuild App (clean node_modules & reinstall from updated package.json)"
                    >
                      <Hammer className="w-4 h-4 mr-1" />
                      Rebuild
                    </Button>
                  </>
                )}
                
                {errorReport?.hasErrors && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={autoFixErrors}
                      disabled={isFixingErrors}
                      className="h-8 px-3 text-orange-600 hover:text-orange-700"
                      title={`Fix ${errorReport.buildErrors.length + errorReport.runtimeErrors.length} error(s) automatically`}
                    >
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      {isFixingErrors ? 'Fixing...' : `Fix (${errorReport.buildErrors.length + errorReport.runtimeErrors.length})`}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={sendErrorsToTerminal}
                      className="h-8 px-3 text-blue-600 hover:text-blue-700"
                      title="Send error summary to terminal for Claude Code CLI"
                    >
                      <Send className="w-4 h-4 mr-1" />
                      Send to Terminal
                    </Button>
                  </>
                )}
                
                {appUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={refreshIframe}
                    className="h-8 px-3"
                    title="Refresh Preview"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Refresh
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLogs(!showLogs)}
                  className={`h-8 px-3 ${showLogs ? 'bg-blue-100 text-blue-700' : ''}`}
                  title="Toggle Logs"
                >
                  <Terminal className="w-4 h-4 mr-1" />
                  Logs
                </Button>
              </>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0"
              title={isExpanded ? "Minimize" : "Maximize"}
            >
              {isExpanded ? 
                <ChevronDown className="w-4 h-4" /> : 
                <ChevronUp className="w-4 h-4" />
              }
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={hideCodeViewer}
              className="h-8 w-8 p-0"
              title="Close"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-0 h-full overflow-hidden">
          <div className="h-full flex flex-col">
            {/* Code Tab Content */}
            {activeTab === 'code' && (
              <div className="flex-1 h-full overflow-auto">
                <pre className="p-4 text-sm font-mono leading-relaxed overflow-auto h-full">
                  <code className={`language-${getLanguageFromExtension(selectedFile.name)}`}>
                    {selectedFile.content}
                  </code>
                </pre>
              </div>
            )}
            
            {/* Preview Tab Content */}
            {activeTab === 'preview' && (
              <div className="h-full flex">
                {/* Preview Area */}
                <div className="flex-1 flex flex-col">
                  {!currentApp ? (
                    <div className="h-full flex items-center justify-center bg-gray-50 text-gray-500">
                      <div className="text-center">
                        <div className="text-lg font-medium">No App Selected</div>
                        <div className="text-sm mt-2">Select an app to see its preview</div>
                      </div>
                    </div>
                  ) : !isRunning ? (
                    <div className="h-full flex items-center justify-center bg-gray-50 text-gray-500">
                      <div className="text-center">
                        <Play className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        <div className="text-lg font-medium">App Not Running</div>
                        <div className="text-sm mt-2">Click Start to run your app</div>
                      </div>
                    </div>
                  ) : (
                    <div key={iframeKey} className="h-full flex-1">
                      <PreviewIframe
                        appUrl={appUrl}
                        appId={currentApp.id}
                        onError={handleError}
                        iframeKey={iframeKey}
                      />
                    </div>
                  )}
                </div>

                {/* Logs Sidebar - Show when logs are enabled */}
                {showLogs && (
                  <div className="w-1/3 border-l bg-gray-50 flex flex-col">
                    <div className="p-3 border-b bg-white">
                      <h3 className="font-medium">Logs & Errors</h3>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => setOutputs([])}
                          className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
                        >
                          Clear Logs
                        </button>
                        <button
                          onClick={() => setErrors([])}
                          className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
                        >
                          Clear Errors
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-auto p-3 space-y-2">
                      {/* Errors */}
                      {errors.map((error, index) => (
                        <div key={`error-${index}`} className="p-2 bg-red-50 border border-red-200 rounded">
                          <div className="font-medium text-red-800 text-sm">{error.type}</div>
                          <div className="text-red-700 text-xs mt-1">{error.payload.message}</div>
                          {error.payload.file && (
                            <div className="text-red-600 text-xs mt-1">File: {error.payload.file}</div>
                          )}
                          {error.payload.stack && (
                            <pre className="text-red-600 text-xs mt-1 whitespace-pre-wrap overflow-auto max-h-20">
                              {error.payload.stack}
                            </pre>
                          )}
                        </div>
                      ))}
                      
                      {/* Outputs */}
                      {outputs.map((output, index) => (
                        <div key={`output-${index}`} className={`p-2 rounded text-xs font-mono ${
                          output.type === 'stderr' ? 'bg-yellow-50 text-yellow-800' : 'bg-gray-50 text-gray-700'
                        }`}>
                          <div className="text-xs text-gray-500 mb-1">
                            {new Date(output.timestamp).toLocaleTimeString()}
                          </div>
                          <pre className="whitespace-pre-wrap">{output.message}</pre>
                        </div>
                      ))}
                      
                      {outputs.length === 0 && errors.length === 0 && (
                        <div className="text-gray-500 text-sm text-center mt-8">
                          <div>No logs or errors yet</div>
                          <div className="text-xs mt-2">
                            App ID: {currentApp?.id} | Running: {isRunning ? 'Yes' : 'No'} | Starting: {isStarting ? 'Yes' : 'No'}
                          </div>
                          <div className="text-xs mt-1">
                            ShowLogs: {showLogs ? 'Yes' : 'No'} | ActiveTab: {activeTab}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Status Footer */}
                    <div className="border-t bg-white p-3">
                      <div className="space-y-2 text-xs text-gray-600">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                          <span className="font-medium">{isRunning ? 'Running' : 'Stopped'}</span>
                        </div>
                        
                        {originalUrl && (
                          <div className="truncate">
                            <span className="font-medium">Dev Server:</span> {originalUrl}
                          </div>
                        )}
                        
                        {appUrl && (
                          <div className="truncate">
                            <span className="font-medium">Proxy:</span> {appUrl}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between pt-1 border-t">
                          <div>
                            <span className="font-medium">Logs:</span> {outputs.length}
                          </div>
                          <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${errors.length > 0 ? 'bg-red-500' : 'bg-gray-400'}`}></div>
                            <span><span className="font-medium">Errors:</span> {errors.length}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}