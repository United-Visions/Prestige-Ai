import { useState, useCallback, useEffect } from "react";
import { AppError } from "@/types/appTypes";

interface UseAppPreviewOptions {
  appId: number | null;
  appUrl: string | null;
}

export function useAppPreview({ appUrl }: UseAppPreviewOptions) {
  const [previewKey, setPreviewKey] = useState(0);
  const [previewErrors, setPreviewErrors] = useState<AppError[]>([]);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);

  // Update current URL when appUrl changes
  useEffect(() => {
    if (appUrl) {
      setCurrentUrl(appUrl);
      setNavigationHistory([appUrl]);
      setIsLoading(true);
    } else {
      setCurrentUrl(null);
      setNavigationHistory([]);
      setIsLoading(false);
    }
  }, [appUrl]);

  const handlePreviewError = useCallback((error: AppError) => {
    setPreviewErrors((prev) => [...prev, error]);
    console.error('Preview error:', error);
  }, []);

  const handleNavigationChange = useCallback((url: string) => {
    setCurrentUrl(url);
    setNavigationHistory((prev) => {
      if (prev[prev.length - 1] !== url) {
        return [...prev, url];
      }
      return prev;
    });
  }, []);

  const refreshPreview = useCallback(() => {
    setPreviewKey((prev) => prev + 1);
    setPreviewErrors([]);
    setIsLoading(true);
  }, []);

  const clearPreviewErrors = useCallback(() => {
    setPreviewErrors([]);
  }, []);

  const goBack = useCallback(() => {
    if (navigationHistory.length > 1) {
      const newHistory = navigationHistory.slice(0, -1);
      const previousUrl = newHistory[newHistory.length - 1];
      setNavigationHistory(newHistory);
      setCurrentUrl(previousUrl);
    }
  }, [navigationHistory]);

  const goForward = useCallback(() => {
    // This would require maintaining a separate forward history
    // For now, just refresh
    refreshPreview();
  }, [refreshPreview]);

  const onIframeLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const hasErrors = previewErrors.length > 0;
  const latestError = previewErrors[previewErrors.length - 1];

  return {
    previewKey,
    previewErrors,
    currentUrl,
    isLoading,
    navigationHistory,
    hasErrors,
    latestError,
    handlePreviewError,
    handleNavigationChange,
    refreshPreview,
    clearPreviewErrors,
    goBack,
    goForward,
    onIframeLoad,
  };
}

export interface ComponentSelection {
  tagName: string;
  className: string;
  id: string;
  textContent: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export function useComponentSelector() {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedComponents, setSelectedComponents] = useState<ComponentSelection[]>([]);

  const startSelection = useCallback(() => {
    setIsSelecting(true);
  }, []);

  const stopSelection = useCallback(() => {
    setIsSelecting(false);
  }, []);

  const handleComponentSelected = useCallback((component: ComponentSelection) => {
    setSelectedComponents((prev) => [...prev, component]);
    setIsSelecting(false);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedComponents([]);
  }, []);

  return {
    isSelecting,
    selectedComponents,
    startSelection,
    stopSelection,
    handleComponentSelected,
    clearSelection,
  };
}