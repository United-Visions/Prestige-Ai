import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { X, Play, RotateCcw, Square, RefreshCw, ExternalLink, Maximize2, Minimize2, AlertTriangle, Terminal, ChevronDown, ChevronUp, Hammer } from 'lucide-react';
import { AppError, AppOutput } from '@/types/appTypes';
import { AdvancedAppManagementService } from '@/services/advancedAppManagementService';
import { ErrorDetectionService, type ErrorReport } from '@/services/errorDetectionService';
import { ErrorFixDialog } from '@/components/ErrorFixDialog';
import { useApiKeyStore, getModelAvailability } from '@/lib/apiKeys';
import { useModelPreferencesStore } from '@/stores/modelPreferencesStore';
import { showToast } from '@/utils/toast';

interface PreviewSlidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentApp?: any;
  selectedModel?: any;
  currentConversation?: any;
  className?: string;
}

export function PreviewSlidePanel({
  isOpen,
  onClose,
  currentApp,
  selectedModel,
  currentConversation,
  className = ''
}: PreviewSlidePanelProps) {
  const [iframeKey, setIframeKey] = useState(0);
  const [isMaximized, setIsMaximized] = useState(false);

  // Preview state (restored from original)
  const [appUrl, setAppUrl] = useState<string | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [outputs, setOutputs] = useState<AppOutput[]>([]);
  const [errors, setErrors] = useState<AppError[]>([]);
  const [showLogs, setShowLogs] = useState(true);
  const [errorReport, setErrorReport] = useState<ErrorReport | null>(null);
  const [isFixingErrors, setIsFixingErrors] = useState(false);
  const [autoFixTimeout, setAutoFixTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);

  // Services (restored from original)
  const appService = AdvancedAppManagementService.getInstance();
  const errorService = ErrorDetectionService.getInstance();
  const { getRecommendedModel, getAvailableProviders } = useApiKeyStore();
  const { getModelForContext } = useModelPreferencesStore();

  // API key check cache (restored from original)
  const [apiKeyCache, setApiKeyCache] = useState<{
    timestamp: number;
    modelKey: string;
    result: boolean;
  } | null>(null);

  // Animation and scroll refs
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const [recentLogIds, setRecentLogIds] = useState<Set<number>>(new Set());
  const [veryRecentLogIds, setVeryRecentLogIds] = useState<Set<number>>(new Set());

  // useEffect hooks (restored from original)
  useEffect(() => {
    // Clear preview state immediately when switching apps
    setAppUrl(null);
    setOriginalUrl(null);
    setOutputs([]);
    setErrors([]);
    setIsRunning(false);

    if (currentApp?.id) {
      // Check if the new app is actually running
      appService.isAppRunning(currentApp.id).then(async (running) => {
        setIsRunning(running);

        // Auto-start the app if not running - like original behavior
        if (!running) {
          console.log(`Auto-starting app on navigation: ${currentApp.name} (ID: ${currentApp.id})`);
          await startApp();
        } else {
          console.log(`App already running: ${currentApp.name} (ID: ${currentApp.id})`);
        }
      });
    }
  }, [currentApp, appService]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoFixTimeout) {
        clearTimeout(autoFixTimeout);
      }
    };
  }, [autoFixTimeout]);

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    if (logsContainerRef.current && outputs.length > 0) {
      const container = logsContainerRef.current;
      // Smooth scroll to bottom
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [outputs.length]);

  // Manage animation classes for new log entries
  useEffect(() => {
    if (outputs.length > 0) {
      const latestOutput = outputs[outputs.length - 1];
      const logId = latestOutput.timestamp;

      // Mark as very recent (for typing effect)
      setVeryRecentLogIds(prev => new Set([...prev, logId]));

      // Mark as recent (for fade-in effect)
      setRecentLogIds(prev => new Set([...prev, logId]));

      // Remove very recent after typing animation
      setTimeout(() => {
        setVeryRecentLogIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(logId);
          return newSet;
        });
      }, 500);

      // Remove recent class after fade-in animation
      setTimeout(() => {
        setRecentLogIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(logId);
          return newSet;
        });
      }, 800);
    }
  }, [outputs.length]);

  if (!isOpen) {
    return null;
  }

  // Check if we have valid API keys for the current selected model (restored from original)
  const hasValidApiKey = () => {
    if (!selectedModel) return false;

    const currentModelKey = `${selectedModel.name}-${selectedModel.provider}`;
    const now = Date.now();
    const TEN_MINUTES = 10 * 60 * 1000; // 10 minutes in milliseconds

    // Return cached result if it's less than 10 minutes old and for the same model
    if (apiKeyCache &&
        apiKeyCache.modelKey === currentModelKey &&
        (now - apiKeyCache.timestamp) < TEN_MINUTES) {
      return apiKeyCache.result;
    }

    // Use the same logic as Enhanced Model Picker
    const availability = getModelAvailability(selectedModel.name, selectedModel.provider);
    const result = availability.status === 'ready';

    // Update cache
    setApiKeyCache({
      timestamp: now,
      modelKey: currentModelKey,
      result
    });

    return result;
  };

  const refreshIframe = () => {
    setIframeKey(prev => prev + 1);
  };

  const openInNewTab = () => {
    if (appUrl) {
      window.open(appUrl, '_blank');
    }
  };

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  // Restored from original CodeViewerPanel
  const sendErrorsToChat = async () => {
    if (!errorReport?.hasErrors) return;

    const errorPrompt = errorService.generateErrorFixPrompt(errorReport);
    console.log('📨 Sending errors to chat:', errorPrompt);

    // Add the error fix prompt directly to the current conversation
    if (currentApp?.id && currentConversation?.id) {
      try {
        await appService.addMessageToConversation(currentConversation.id, 'user', errorPrompt);
        console.log('✅ Error prompt added to conversation');

        // Trigger the chat interface to show the new message
        const event = new CustomEvent('newMessageAdded', { detail: { conversationId: currentConversation.id } });
        window.dispatchEvent(event);
      } catch (error) {
        console.error('❌ Error adding message to conversation:', error);
      }
    }

    setShowErrorDialog(false);
  };

  const openApiKeyDialog = () => {
    // This will be connected to the parent component's API key dialog
    const event = new CustomEvent('openApiKeyDialog');
    window.dispatchEvent(event);
    setShowErrorDialog(false);
  };

  function handleOutput(output: AppOutput) {
    // Use functional update to avoid potential performance issues
    setOutputs(prev => {
      // Limit output history to prevent memory issues (keep last 1000 entries)
      const newOutputs = [...prev, output];
      const limitedOutputs = newOutputs.length > 1000 ? newOutputs.slice(-1000) : newOutputs;

      // Update error report when outputs change (debounced)
      if (currentApp?.id && output.type === 'stderr') {
        setTimeout(() => {
          const report = errorService.createErrorReport(limitedOutputs, errors);
          console.log('📊 Error report created:', report, 'from outputs:', limitedOutputs.length, 'and errors:', errors.length);
          setErrorReport(report);

          // Show error dialog when errors are detected
          if (report.hasErrors && !isFixingErrors && !showErrorDialog) {
            console.log('🔥 Error detected, showing dialog:', report);
            setShowErrorDialog(true);
          }
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
  }

  function handleError(error: AppError) {
    setErrors(prev => {
      // Limit error history to prevent memory issues (keep last 100 entries)
      const newErrors = [...prev, error];
      const limitedErrors = newErrors.length > 100 ? newErrors.slice(-100) : newErrors;

      // Update error report when errors change
      if (currentApp?.id) {
        setTimeout(() => {
          const report = errorService.createErrorReport(outputs, limitedErrors);
          console.log('📊 Error report created from runtime errors:', report, 'from outputs:', outputs.length, 'and runtime errors:', limitedErrors.length);
          setErrorReport(report);

          // Show error dialog when errors are detected
          if (report.hasErrors && !isFixingErrors && !showErrorDialog) {
            console.log('🔥 Error detected, showing dialog:', report);
            setShowErrorDialog(true);
          }
        }, 500); // Debounce error detection
      }

      return limitedErrors;
    });
  }

  async function startApp() {
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
  }

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
      // Use the standard AI model service for other models
      const { aiModelServiceV2: aiModelService } = await import('@/services/aiModelService');
      const { constructSystemPromptAsync, readAiRules } = await import('@/prompts/system_prompt');

      // Get the current conversation for this app
      const conversations = await appService.getAppConversations(currentApp.id);
      const activeConversation = conversations[0]; // Get the most recent conversation

      if (activeConversation) {
        // Build the system prompt with current app context
        const aiRules = await readAiRules(currentApp.path);
        let fileStructure = '';
        if (currentApp.files && currentApp.files.length > 0) {
          fileStructure = currentApp.files
            .map((file: any) => file.type === 'directory' ? `${file.path}/` : file.path)
            .sort()
            .join('\n');
        }
        const systemPrompt = await constructSystemPromptAsync({ aiRules, fileStructure });

        const fixPrompt = errorService.generateErrorFixPrompt(errorReport);
        console.log('Auto-fix prompt:', fixPrompt);

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

        // Use the preferred fix model or fall back to selected model
        const preferredFixModel = getModelForContext('fix');
        const modelToUse = preferredFixModel || selectedModel;

        // Generate response using the fix model
        const response = await aiModelService.generateResponse(
          modelToUse,
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
        showToast(`Attempted to fix errors using ${modelToUse.name}. Check the logs for results.`, 'info');
      } else {
        showToast('No active conversation found for this app', 'error');
      }
    } catch (error) {
      console.error('Failed to auto-fix errors:', error);
      showToast('Failed to auto-fix errors: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
    } finally {
      setIsFixingErrors(false);
    }
  };

  return (
    <div className={`fixed top-0 right-0 bottom-0 z-50 transform transition-transform duration-300 ease-in-out ${
      isOpen ? 'translate-x-0' : 'translate-x-full'
    } ${isMaximized ? 'w-full' : 'w-[60%]'} ${className}`}>
      <Card className="h-full rounded-none shadow-2xl bg-gradient-to-br from-background via-background to-background/95 backdrop-blur-sm border-l border-border/50 flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b border-border/30 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Play className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-xl font-semibold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                App Preview
              </h3>
              <div className="text-sm text-muted-foreground">
                {currentApp?.name || 'App'} • {isRunning ? 'Running' : 'Stopped'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* App Control Buttons */}
            {!isRunning && (
              <Button
                variant="premium"
                size="sm"
                onClick={startApp}
                disabled={isStarting}
                className="h-9 px-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg"
                title="Start App"
              >
                <Play className="w-4 h-4 mr-2" />
                {isStarting ? 'Starting...' : 'Start'}
              </Button>
            )}

            {isRunning && (
              <>
                <Button
                  variant="premium"
                  size="sm"
                  onClick={stopApp}
                  className="h-9 px-4 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg"
                  title="Stop App"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Stop
                </Button>

                <Button
                  variant="premium"
                  size="sm"
                  onClick={() => restartApp()}
                  className="h-9 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-lg"
                  title="Restart App"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restart
                </Button>

                <Button
                  variant="premium"
                  size="sm"
                  onClick={rebuildApp}
                  className="h-9 px-4 rounded-xl bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white shadow-lg"
                  title="Rebuild App"
                >
                  <Hammer className="w-4 h-4 mr-2" />
                  Rebuild
                </Button>

                {appUrl && (
                  <>
                    <Button
                      variant="premium"
                      size="sm"
                      onClick={refreshIframe}
                      className="h-9 w-9 p-0 rounded-xl bg-white/20 backdrop-blur-sm hover:bg-white/30"
                      title="Refresh Preview"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="premium"
                      size="sm"
                      onClick={openInNewTab}
                      className="h-9 w-9 p-0 rounded-xl bg-white/20 backdrop-blur-sm hover:bg-white/30"
                      title="Open in New Tab"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </>
            )}

            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-white/20">
              <Button
                variant="premium"
                size="sm"
                onClick={toggleMaximize}
                className="h-9 w-9 p-0 rounded-xl bg-white/10 backdrop-blur-sm hover:bg-white/20 border border-white/20"
                title={isMaximized ? "Minimize" : "Maximize"}
              >
                {isMaximized ?
                  <Minimize2 className="w-4 h-4" /> :
                  <Maximize2 className="w-4 h-4" />
                }
              </Button>

              <Button
                variant="premium"
                size="sm"
                onClick={onClose}
                className="h-9 w-9 p-0 rounded-xl bg-red-500/20 backdrop-blur-sm hover:bg-red-500/30 text-red-400 hover:text-red-300 border border-red-500/30"
                title="Close"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 flex-1 overflow-hidden bg-gradient-to-br from-gray-50/50 via-white to-gray-50/80">
          <div className="h-full flex">
            {/* Preview area - takes main space */}
            <div className="flex-1 flex flex-col min-w-0 h-full">
              {!isRunning ? (
                <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-white text-gray-500">
                  <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <Play className="w-12 h-12 text-blue-500" />
                    </div>
                    <div className="text-xl font-semibold text-gray-700 mb-2">App Not Running</div>
                    <div className="text-sm text-gray-500 mb-4">Start your app to see the preview</div>
                    <Button
                      onClick={startApp}
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Start {currentApp?.name || 'App'}
                    </Button>
                  </div>
                </div>
              ) : !appUrl ? (
                <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-white text-gray-500">
                  <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
                      <RefreshCw className="w-12 h-12 text-yellow-500 animate-spin" />
                    </div>
                    <div className="text-xl font-semibold text-gray-700 mb-2">Starting Up...</div>
                    <div className="text-sm text-gray-500">Waiting for app to be available</div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 relative min-h-0">
                  <iframe
                    key={iframeKey}
                    src={appUrl}
                    className="w-full h-full border-none"
                    title={`${currentApp?.name || 'App'} Preview`}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                  />
                  {/* URL Display Bar */}
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-gray-800/90 to-gray-900/90 backdrop-blur-sm text-white text-xs p-2 flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                    <div className="flex-1 bg-black/20 rounded px-3 py-1 font-mono">
                      {appUrl}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Logs sidebar - restored from original CodeViewerPanel */}
            {showLogs && (
              <div className="w-1/3 border-l border-gray-200/50 flex flex-col shrink-0 h-full">
                <div className="border-b border-gray-200/50 p-4 bg-gradient-to-r from-gray-50/80 via-white to-gray-50/60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                        <Terminal className="w-3 h-3 text-white" />
                      </div>
                      <h3 className="font-semibold text-gray-800">Output & Logs</h3>
                      <div className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-md font-medium">
                        {outputs.length} lines
                      </div>
                    </div>
                    <Button
                      variant="premium"
                      size="sm"
                      onClick={() => setShowLogs(false)}
                      className="h-7 w-7 p-0 rounded-lg bg-white/20 backdrop-blur-sm hover:bg-white/30"
                      title="Hide Logs"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-auto p-4 bg-gradient-to-br from-gray-50/30 to-white/50">
                  <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden h-full">
                    <div className="flex items-center justify-between p-3 bg-gray-800 border-b border-gray-700">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        </div>
                        <span className="text-xs font-mono text-gray-400">
                          {currentApp?.name || 'App'} Output
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {outputs.length} lines
                      </div>
                    </div>
                    <div
                      ref={logsContainerRef}
                      className="h-full overflow-auto log-container"
                    >
                      {outputs.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-gray-500 p-8">
                          <div className="text-center">
                            <Terminal className="w-8 h-8 mx-auto mb-3 text-gray-600" />
                            <div className="text-sm font-medium text-gray-400 mb-1">No output yet</div>
                            <div className="text-xs text-gray-500">Start your app to see logs</div>
                          </div>
                        </div>
                      ) : (
                        outputs.map((output, index) => {
                          const logId = output.timestamp;
                          const isVeryRecent = veryRecentLogIds.has(logId);
                          const isRecent = recentLogIds.has(logId);

                          // Determine animation class
                          let animationClass = 'log-entry';
                          if (isVeryRecent && output.type === 'stdout') {
                            animationClass = 'log-entry-typing';
                          } else if (isRecent) {
                            animationClass = 'log-entry-new';
                          }

                          return (
                            <div
                              key={`${logId}-${index}`}
                              className={`flex items-start gap-3 p-2 hover:bg-gray-800/50 transition-colors ${animationClass}`}
                            >
                              <div className="text-xs text-gray-500 font-mono w-16 text-right flex-shrink-0">
                                {new Date(output.timestamp).toLocaleTimeString()}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <div className={`w-1 h-1 rounded-full ${
                                  output.type === 'stderr' ? 'bg-red-400' :
                                  output.type === 'stdout' ? 'bg-green-400' : 'bg-gray-400'
                                } ${isRecent ? 'animate-pulse' : ''}`}></div>
                                <span className={`text-xs font-medium uppercase ${
                                  output.type === 'stderr' ? 'text-red-400' :
                                  output.type === 'stdout' ? 'text-green-400' : 'text-gray-400'
                                }`}>
                                  {output.type}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <pre className={`text-xs font-mono text-gray-100 whitespace-pre-wrap break-words ${
                                  isVeryRecent && output.type === 'stdout' ? '' : ''
                                }`}>
                                  {output.message}
                                </pre>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Show logs button when hidden */}
            {!showLogs && outputs.length > 0 && (
              <div className="absolute bottom-4 right-4">
                <Button
                  variant="premium"
                  size="sm"
                  onClick={() => setShowLogs(true)}
                  className="h-10 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg"
                  title="Show Logs"
                >
                  <ChevronDown className="w-4 h-4 mr-2" />
                  Show Logs ({outputs.length})
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Fix Dialog - restored from original */}
      <ErrorFixDialog
        isOpen={showErrorDialog}
        onClose={() => setShowErrorDialog(false)}
        errorReport={errorReport}
        onSendToChat={sendErrorsToChat}
        onAutoFix={() => {
          setShowErrorDialog(false);
          autoFixErrors();
        }}
        onOpenApiKeys={openApiKeyDialog}
        hasValidApiKey={hasValidApiKey()}
        isFixing={isFixingErrors}
        currentAppName={currentApp?.name}
      />
    </div>
  );
}