import React, { useEffect, useRef, useState } from 'react';
import { AppError } from '@/types/appTypes';

interface PreviewIframeProps {
  appUrl: string | null;
  appId: number | null;
  onError?: (error: AppError) => void;
  onNavigationChange?: (url: string) => void;
  onFixErrors?: () => void;
  iframeKey?: string | number;
  className?: string;
  hasErrors?: boolean;
}

export const PreviewIframe: React.FC<PreviewIframeProps> = ({
  appUrl,
  appId,
  onError,
  onNavigationChange,
  onFixErrors,
  iframeKey,
  className = "w-full h-full border-0",
  hasErrors = false
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);

  useEffect(() => {
    if (appUrl) {
      setIsLoading(true);
      setCurrentUrl(appUrl);
    }
  }, [appUrl]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      setIsLoading(false);
    };

    const handleError = () => {
      setIsLoading(false);
      if (onError && appId) {
        onError({
          type: 'iframe-sourcemapped-error',
          payload: {
            message: 'Failed to load iframe',
            stack: 'Iframe failed to load the application'
          },
          timestamp: Date.now(),
          appId
        });
      }
    };

    // Throttled message handler to prevent performance issues
    let messageTimeout: NodeJS.Timeout;
    const handleMessage = (event: MessageEvent) => {
      if (!appId) return;

      const { data } = event;
      if (!data || typeof data !== 'object') return;

      // Clear previous timeout to throttle rapid messages
      clearTimeout(messageTimeout);
      messageTimeout = setTimeout(() => {
        // Handle different types of messages from prestige-shim.js
        switch (data.type) {
          case 'window-error':
          case 'unhandled-rejection':
          case 'build-error-report':
          case 'navigation-error':
          case 'iframe-sourcemapped-error':
            if (onError) {
              onError({
                type: data.type,
                payload: data.payload || {},
                timestamp: Date.now(),
                appId
              });
            }
            break;

          case 'pushState':
          case 'replaceState':
            if (data.payload?.newUrl && onNavigationChange) {
              onNavigationChange(data.payload.newUrl);
            }
            break;

          case 'component-selected':
            // Handle component selection
            console.log('Component selected:', data.payload);
            break;

          case 'component-selector-ready':
            console.log('Component selector ready in iframe');
            break;

          default:
            // Log unknown message types for debugging (throttled)
            console.debug('Unknown iframe message:', data.type, data);
        }
      }, 10); // 10ms throttle
    };

    iframe.addEventListener('load', handleLoad);
    iframe.addEventListener('error', handleError);
    window.addEventListener('message', handleMessage);

    return () => {
      clearTimeout(messageTimeout);
      iframe.removeEventListener('load', handleLoad);
      iframe.removeEventListener('error', handleError);
      window.removeEventListener('message', handleMessage);
    };
  }, [appId, onError, onNavigationChange]);

  // Navigation controls
  const navigateIframe = (direction: 'forward' | 'backward') => {
    const iframe = iframeRef.current;
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage(
        {
          type: 'navigate',
          payload: { direction }
        },
        '*'
      );
    }
  };

  const refreshIframe = () => {
    const iframe = iframeRef.current;
    if (iframe && currentUrl) {
      setIsLoading(true);
      iframe.src = currentUrl + '?t=' + Date.now(); // Cache bust
    }
  };

  const startComponentSelect = () => {
    const iframe = iframeRef.current;
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage(
        {
          type: 'start-component-select'
        },
        '*'
      );
    }
  };


  if (!appUrl) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 text-gray-500">
        <div className="text-center">
          <div className="text-lg font-medium">No Preview Available</div>
          <div className="text-sm mt-2">Start the app to see a live preview</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Navigation Controls */}
      <div className="flex items-center gap-2 p-2 border-b bg-gray-50">
        <button
          onClick={() => navigateIframe('backward')}
          className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-50"
          title="Go Back"
        >
          ←
        </button>
        <button
          onClick={() => navigateIframe('forward')}
          className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-50"
          title="Go Forward"
        >
          →
        </button>
        <button
          onClick={refreshIframe}
          className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-50"
          title="Refresh"
        >
          ↻
        </button>
        <div className="flex-1 px-3 py-1 text-sm bg-white border rounded text-gray-600 overflow-hidden">
          {currentUrl}
        </div>
        <button
          onClick={startComponentSelect}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          title="Select Component"
        >
          Select
        </button>
      </div>

      {/* Iframe */}
      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <div className="mt-2 text-sm text-gray-600">Loading preview...</div>
            </div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={currentUrl || undefined}
          className={className}
          title="App Preview"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          key={iframeKey}
        />
        
        {/* Error Fix Button Overlay */}
        {hasErrors && onFixErrors && (
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={onFixErrors}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-lg transition-all duration-200 border border-red-400 hover:border-red-500 animate-pulse hover:animate-none"
              title="Fix errors automatically"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Fix Errors</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};