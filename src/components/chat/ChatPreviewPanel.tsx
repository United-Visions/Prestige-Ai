import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import useAppStore from '@/stores/appStore';
import useCodeViewerStore from '@/stores/codeViewerStore';
import { X, Play, RotateCcw, Square, RefreshCw, Terminal, Hammer, AlertTriangle } from 'lucide-react';
import { showToast } from '@/utils/toast';
import { PreviewIframe } from '@/components/preview/PreviewIframe';
import { AppError, AppOutput } from '@/types/appTypes';
import { AdvancedAppManagementService } from '@/services/advancedAppManagementService';
import { ErrorDetectionService, type ErrorReport } from '@/services/errorDetectionService';

export function ChatPreviewPanel() {
  const { currentApp } = useAppStore();
  const { showPreviewInChat, setShowPreviewInChat } = useCodeViewerStore();

  // Preview state
  const [appUrl, setAppUrl] = useState<string | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [outputs, setOutputs] = useState<AppOutput[]>([]);
  const [errors, setErrors] = useState<AppError[]>([]);
  const [iframeKey, setIframeKey] = useState(0);
  const [errorReport, setErrorReport] = useState<ErrorReport | null>(null);

  const appService = AdvancedAppManagementService.getInstance();
  const errorService = ErrorDetectionService.getInstance();

  useEffect(() => {
    // Clear preview state immediately when switching apps
    setAppUrl(null);
    setOriginalUrl(null);
    setOutputs([]);
    setErrors([]);
    setIsRunning(false);

    if (currentApp?.id && showPreviewInChat) {
      // Check if the new app is actually running
      appService.isAppRunning(currentApp.id).then(async (running) => {
        setIsRunning(running);

        // Auto-start the app if not running
        if (!running) {
          console.log(`Auto-starting app in chat preview: ${currentApp.name} (ID: ${currentApp.id})`);
          await startApp();
        }
      });
    }
  }, [currentApp, appService, showPreviewInChat]);

  const handleOutput = (output: AppOutput) => {
    setOutputs(prev => {
      const newOutputs = [...prev, output];
      const limitedOutputs = newOutputs.length > 1000 ? newOutputs.slice(-1000) : newOutputs;

      // Update error report when outputs change
      if (currentApp?.id && output.type === 'stderr') {
        setTimeout(() => {
          const report = errorService.createErrorReport(limitedOutputs, errors);
          setErrorReport(report);
        }, 1000);
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
      setIframeKey(prev => prev + 1);
    }
  };

  const handleError = (error: AppError) => {
    setErrors(prev => {
      const newErrors = [...prev, error];
      const limitedErrors = newErrors.length > 100 ? newErrors.slice(-100) : newErrors;

      // Update error report when errors change
      if (currentApp?.id) {
        setTimeout(() => {
          const report = errorService.createErrorReport(outputs, limitedErrors);
          setErrorReport(report);
        }, 500);
      }

      return limitedErrors;
    });
  };

  const startApp = async () => {
    if (!currentApp?.id) return;

    setIsStarting(true);
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

  const restartApp = async () => {
    if (!currentApp?.id) return;

    setIsStarting(true);
    setOutputs([]);
    setErrors([]);

    // Add restarting message to logs
    setOutputs([{
      type: 'stdout',
      message: `Restarting app: ${currentApp.name || `App ${currentApp.id}`}...`,
      timestamp: Date.now(),
      appId: currentApp.id
    }]);

    try {
      await appService.restartApp(currentApp.id, handleOutput, handleError, false);
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
  };

  const refreshIframe = () => {
    setIframeKey(prev => prev + 1);
  };

  if (!showPreviewInChat || !currentApp) {
    return null;
  }

  return (
    <Card className="flex-1 flex flex-col mb-4 border border-border/50 shadow-lg bg-gradient-to-br from-background via-background to-background/95 backdrop-blur-sm">
      {/* Preview Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/30 bg-gradient-to-r from-prestige-primary/5 via-prestige-secondary/5 to-prestige-accent/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-prestige-primary to-prestige-secondary flex items-center justify-center">
            <Play className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-lg font-semibold bg-gradient-to-r from-prestige-primary via-prestige-secondary to-prestige-accent bg-clip-text text-transparent">
              Live Preview - {currentApp.name}
            </h3>
            {appUrl && (
              <div className="text-xs text-muted-foreground">
                {originalUrl || appUrl}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isRunning && (
            <>
              <Button
                variant="premium"
                size="sm"
                onClick={restartApp}
                disabled={isStarting}
                className="h-8 px-3 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white"
                title="Restart App"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Restart
              </Button>

              {appUrl && (
                <Button
                  variant="premium"
                  size="sm"
                  onClick={refreshIframe}
                  className="h-8 px-3 rounded-lg bg-white/20 backdrop-blur-sm hover:bg-white/30"
                  title="Refresh Preview"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Refresh
                </Button>
              )}

              <Button
                variant="premium"
                size="sm"
                onClick={stopApp}
                className="h-8 px-3 rounded-lg bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white"
                title="Stop App"
              >
                <Square className="w-3 h-3 mr-1" />
                Stop
              </Button>
            </>
          )}

          {!isRunning && (
            <Button
              variant="premium"
              size="sm"
              onClick={startApp}
              disabled={isStarting}
              className="h-8 px-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
              title="Start App"
            >
              <Play className="w-3 h-3 mr-1" />
              {isStarting ? 'Starting...' : 'Start'}
            </Button>
          )}

          <Button
            variant="premium"
            size="sm"
            onClick={() => setShowPreviewInChat(false)}
            className="h-8 w-8 p-0 rounded-lg bg-red-500/20 backdrop-blur-sm hover:bg-red-500/30 text-red-400 hover:text-red-300"
            title="Back to Chat"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Preview Content */}
      <CardContent className="p-0 flex-1 min-h-96 overflow-hidden">
        {!isRunning ? (
          <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-white text-gray-500">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                <Play className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-lg font-semibold text-gray-700 mb-2">
                {isStarting ? 'Starting App...' : 'App Stopped'}
              </div>
              <div className="text-sm text-gray-500">
                {isStarting ? 'Please wait while the app starts' : 'Click start to run the app'}
              </div>
              {isStarting && (
                <div className="mt-4 flex items-center justify-center gap-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div key={iframeKey} className="h-full relative">
            <div className="absolute inset-0 bg-white rounded-b-lg border border-gray-200 shadow-lg overflow-hidden">
              <PreviewIframe
                appUrl={appUrl}
                appId={currentApp.id}
                onError={handleError}
                onFixErrors={() => {}}
                iframeKey={iframeKey}
                hasErrors={errorReport?.hasErrors}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}