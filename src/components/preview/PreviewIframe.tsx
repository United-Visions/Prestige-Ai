import React, { useEffect, useRef, useState } from 'react';
import { AppError } from '@/types/appTypes';

interface PreviewIframeProps {
  appUrl: string | null;
  appId: number | null;
  onError?: (error: AppError) => void;
  onNavigationChange?: (url: string) => void;
  iframeKey?: string | number;
  className?: string;
}

export const PreviewIframe: React.FC<PreviewIframeProps> = ({
  appUrl,
  appId,
  onError,
  onNavigationChange,
  iframeKey,
  className = "w-full h-full border-0"
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
      </div>
    </div>
  );
};