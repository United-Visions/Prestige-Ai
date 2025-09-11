import { useState, useCallback, useEffect } from "react";
import { AdvancedAppManagementService } from "@/services/advancedAppManagementService";
import { AppOutput, AppError } from "@/types/appTypes";

interface UseRunAppOptions {
  appId: number | null;
}

export function useRunApp({ appId }: UseRunAppOptions) {
  const [loading, setLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [appOutput, setAppOutput] = useState<AppOutput[]>([]);
  const [appErrors, setAppErrors] = useState<AppError[]>([]);
  const [appUrl, setAppUrl] = useState<string | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [previewErrorMessage, setPreviewErrorMessage] = useState<string | undefined>();

  const appService = AdvancedAppManagementService.getInstance();

  // Check if app is running on mount/appId change
  useEffect(() => {
    if (appId) {
      appService.isAppRunning(appId).then(running => {
        setIsRunning(running);
      });
    } else {
      setIsRunning(false);
      setAppUrl(null);
      setOriginalUrl(null);
      setAppOutput([]);
      setAppErrors([]);
    }
  }, [appId, appService]);

  const processProxyServerOutput = useCallback((output: AppOutput) => {
    const matchesProxyServerStart = output.message.includes(
      "[prestige-proxy-server]started=["
    );
    
    if (matchesProxyServerStart) {
      // Extract both proxy URL and original URL using regex
      const proxyUrlMatch = output.message.match(
        /\[prestige-proxy-server\]started=\[(.*?)\]/
      );
      const originalUrlMatch = output.message.match(/original=\[(.*?)\]/);

      if (proxyUrlMatch && proxyUrlMatch[1]) {
        const proxyUrl = proxyUrlMatch[1];
        const originalUrl = originalUrlMatch && originalUrlMatch[1];
        setAppUrl(proxyUrl);
        setOriginalUrl(originalUrl || null);
      }
    }
  }, []);

  const handleOutput = useCallback((output: AppOutput) => {
    setAppOutput((prev) => [...prev, output]);
    processProxyServerOutput(output);
  }, [processProxyServerOutput]);

  const handleError = useCallback((error: AppError) => {
    setAppErrors((prev) => [...prev, error]);
    setPreviewErrorMessage(error.payload.message);
  }, []);

  const runApp = useCallback(async (targetAppId?: number) => {
    const targetId = targetAppId || appId;
    if (!targetId) return;

    setLoading(true);
    setPreviewErrorMessage(undefined);
    
    try {
      // Clear previous state
      setAppOutput([]);
      setAppErrors([]);
      setAppUrl(null);
      setOriginalUrl(null);
      
      // Add starting message
      setAppOutput([{
        message: "Starting app...",
        type: "stdout",
        appId: targetId,
        timestamp: Date.now(),
      }]);

      await appService.runApp(targetId, handleOutput, handleError);
      setIsRunning(true);
    } catch (error) {
      console.error(`Error running app ${targetId}:`, error);
      setPreviewErrorMessage(
        error instanceof Error ? error.message : error?.toString()
      );
      
      // Add error to output
      handleError({
        type: 'build-error-report',
        payload: {
          message: `Failed to start app: ${error instanceof Error ? error.message : String(error)}`,
          stack: error instanceof Error ? error.stack : undefined
        },
        timestamp: Date.now(),
        appId: targetId
      });
    } finally {
      setLoading(false);
    }
  }, [appId, handleOutput, handleError]);

  const stopApp = useCallback(async (targetAppId?: number) => {
    const targetId = targetAppId || appId;
    if (!targetId) return;

    setLoading(true);
    try {
      await appService.stopApp(targetId);
      setIsRunning(false);
      setAppUrl(null);
      setOriginalUrl(null);
      setPreviewErrorMessage(undefined);
    } catch (error) {
      console.error(`Error stopping app ${targetId}:`, error);
      setPreviewErrorMessage(
        error instanceof Error ? error.message : error?.toString()
      );
    } finally {
      setLoading(false);
    }
  }, [appId]);

  const restartApp = useCallback(async (options: { removeNodeModules?: boolean } = {}) => {
    if (!appId) return;

    setLoading(true);
    setPreviewErrorMessage(undefined);
    
    try {
      // Clear previous state
      setAppOutput([]);
      setAppErrors([]);
      setAppUrl(null);
      setOriginalUrl(null);
      
      // Add restarting message
      setAppOutput([{
        message: options.removeNodeModules 
          ? "Restarting app with clean node_modules..." 
          : "Restarting app...",
        type: "stdout",
        appId,
        timestamp: Date.now(),
      }]);

      await appService.restartApp(
        appId,
        handleOutput,
        handleError,
        options.removeNodeModules
      );
      setIsRunning(true);
    } catch (error) {
      console.error(`Error restarting app ${appId}:`, error);
      setPreviewErrorMessage(
        error instanceof Error ? error.message : error?.toString()
      );
      
      // Add error to output
      handleError({
        type: 'build-error-report',
        payload: {
          message: `Failed to restart app: ${error instanceof Error ? error.message : String(error)}`,
          stack: error instanceof Error ? error.stack : undefined
        },
        timestamp: Date.now(),
        appId
      });
    } finally {
      setLoading(false);
    }
  }, [appId, handleOutput, handleError]);

  const clearOutput = useCallback(() => {
    setAppOutput([]);
  }, []);

  const clearErrors = useCallback(() => {
    setAppErrors([]);
    setPreviewErrorMessage(undefined);
  }, []);

  const refreshAppIframe = useCallback(() => {
    // Force iframe refresh by updating a key or similar mechanism
    // This would be handled by the parent component
  }, []);

  return {
    loading,
    isRunning,
    runApp,
    stopApp,
    restartApp,
    refreshAppIframe,
    appOutput,
    appErrors,
    appUrl,
    originalUrl,
    previewErrorMessage,
    clearOutput,
    clearErrors,
  };
}