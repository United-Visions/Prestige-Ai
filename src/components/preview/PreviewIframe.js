import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
export const PreviewIframe = ({ appUrl, appId, onError, onNavigationChange, iframeKey, className = "w-full h-full border-0" }) => {
    const iframeRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentUrl, setCurrentUrl] = useState(null);
    useEffect(() => {
        if (appUrl) {
            setIsLoading(true);
            setCurrentUrl(appUrl);
        }
    }, [appUrl]);
    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe)
            return;
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
        let messageTimeout;
        const handleMessage = (event) => {
            if (!appId)
                return;
            const { data } = event;
            if (!data || typeof data !== 'object')
                return;
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
    const navigateIframe = (direction) => {
        const iframe = iframeRef.current;
        if (iframe?.contentWindow) {
            iframe.contentWindow.postMessage({
                type: 'navigate',
                payload: { direction }
            }, '*');
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
            iframe.contentWindow.postMessage({
                type: 'start-component-select'
            }, '*');
        }
    };
    if (!appUrl) {
        return (_jsx("div", { className: "flex items-center justify-center h-full bg-gray-50 text-gray-500", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-lg font-medium", children: "No Preview Available" }), _jsx("div", { className: "text-sm mt-2", children: "Start the app to see a live preview" })] }) }));
    }
    return (_jsxs("div", { className: "flex flex-col h-full", children: [_jsxs("div", { className: "flex items-center gap-2 p-2 border-b bg-gray-50", children: [_jsx("button", { onClick: () => navigateIframe('backward'), className: "px-3 py-1 text-sm bg-white border rounded hover:bg-gray-50", title: "Go Back", children: "\u2190" }), _jsx("button", { onClick: () => navigateIframe('forward'), className: "px-3 py-1 text-sm bg-white border rounded hover:bg-gray-50", title: "Go Forward", children: "\u2192" }), _jsx("button", { onClick: refreshIframe, className: "px-3 py-1 text-sm bg-white border rounded hover:bg-gray-50", title: "Refresh", children: "\u21BB" }), _jsx("div", { className: "flex-1 px-3 py-1 text-sm bg-white border rounded text-gray-600 overflow-hidden", children: currentUrl }), _jsx("button", { onClick: startComponentSelect, className: "px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600", title: "Select Component", children: "Select" })] }), _jsxs("div", { className: "flex-1 relative", children: [isLoading && (_jsx("div", { className: "absolute inset-0 flex items-center justify-center bg-white z-10", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" }), _jsx("div", { className: "mt-2 text-sm text-gray-600", children: "Loading preview..." })] }) })), _jsx("iframe", { ref: iframeRef, src: currentUrl || undefined, className: className, title: "App Preview", sandbox: "allow-scripts allow-same-origin allow-forms allow-popups allow-modals" }, iframeKey)] })] }));
};
