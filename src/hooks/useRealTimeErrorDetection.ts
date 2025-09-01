import { useCallback } from 'react';
import { useProblemsStore } from '../stores/problemsStore';
import { ProblemScannerService } from '../services/problemScannerService';

interface UseRealTimeErrorDetectionOptions {
  enabled?: boolean;
  onErrorDetected?: (errors: any[]) => void;
  onAutoFix?: (fixPrompt: string) => void;
}

/**
 * Hook for real-time error detection during AI streaming and code generation
 * Similar to CCdyad's auto-fix system but enhanced for Prestige-AI
 */
export const useRealTimeErrorDetection = (
  options: UseRealTimeErrorDetectionOptions = {}
) => {
  const { 
    enabled = true, 
    onErrorDetected, 
    onAutoFix 
  } = options;

  const {
    autoFixEnabled,
    setCurrentReport,
    addProblems,
    currentReport
  } = useProblemsStore();

  const problemScanner = ProblemScannerService.getInstance();

  /**
   * Monitor streaming response and detect problems in real-time
   */
  const monitorStreamingResponse = useCallback(async (
    partialCode: string,
    filePath?: string
  ) => {
    if (!enabled || !autoFixEnabled) return;

    try {
      const detectedProblems = await problemScanner.detectProblemsInRealTime(
        partialCode, 
        filePath
      );

      if (detectedProblems.length > 0) {
        addProblems(detectedProblems);
        onErrorDetected?.(detectedProblems);

        // Auto-trigger fix if enabled
        if (autoFixEnabled && detectedProblems.some(p => p.severity === 'error')) {
          const fixPrompt = problemScanner.createAutoFixPrompt(detectedProblems);
          onAutoFix?.(fixPrompt);
        }
      }
    } catch (error) {
      console.error('Real-time error detection failed:', error);
    }
  }, [enabled, autoFixEnabled, addProblems, onErrorDetected, onAutoFix, problemScanner]);

  /**
   * Process completed streaming response for comprehensive error checking
   */
  const processCompletedResponse = useCallback(async (
    _fullCode: string,
    affectedFiles: string[] = []
  ) => {
    if (!enabled) return;

    try {
      const report = await problemScanner.scanMultipleFiles(affectedFiles);
      setCurrentReport(report);

      if (report.problems.length > 0) {
        onErrorDetected?.(report.problems);
        
        // Generate auto-fix if there are errors
        if (autoFixEnabled && report.totalErrors > 0) {
          const fixPrompt = problemScanner.createAutoFixPrompt(
            report.problems.filter(p => p.severity === 'error')
          );
          onAutoFix?.(fixPrompt);
        }
      }
    } catch (error) {
      console.error('Completed response error detection failed:', error);
    }
  }, [enabled, autoFixEnabled, setCurrentReport, onErrorDetected, onAutoFix, problemScanner]);

  /**
   * Monitor file changes and update problem status
   */
  const handleFileChange = useCallback((filePath: string) => {
    if (!enabled) return;

    // Remove problems for the changed file and schedule re-scan
    const { updateProblemStatus } = useProblemsStore.getState();
    updateProblemStatus(filePath);

    // Schedule a delayed re-scan to allow file changes to settle
    setTimeout(async () => {
      try {
        const problems = await problemScanner.scanForProblems(filePath);
        if (problems.length > 0) {
          addProblems(problems);
        }
      } catch (error) {
        console.error('File change error detection failed:', error);
      }
    }, 1000);
  }, [enabled, addProblems, problemScanner]);

  /**
   * Generate fix suggestions for current problems
   */
  const generateFixSuggestions = useCallback(() => {
    if (!currentReport || currentReport.problems.length === 0) {
      return [];
    }

    return problemScanner.generateFixSuggestions(currentReport.problems);
  }, [currentReport, problemScanner]);

  /**
   * Create auto-fix prompt for AI system
   */
  const createAutoFixPrompt = useCallback((
    prioritizeErrors = true
  ) => {
    if (!currentReport || currentReport.problems.length === 0) {
      return 'No problems to fix.';
    }

    const problemsToFix = prioritizeErrors 
      ? currentReport.problems.filter(p => p.severity === 'error')
      : currentReport.problems;

    return problemScanner.createAutoFixPrompt(problemsToFix);
  }, [currentReport, problemScanner]);

  /**
   * Check if auto-fix should be triggered
   */
  const shouldTriggerAutoFix = useCallback(() => {
    return autoFixEnabled && 
           currentReport && 
           currentReport.totalErrors > 0;
  }, [autoFixEnabled, currentReport]);

  return {
    monitorStreamingResponse,
    processCompletedResponse,
    handleFileChange,
    generateFixSuggestions,
    createAutoFixPrompt,
    shouldTriggerAutoFix,
    hasErrors: currentReport?.totalErrors || 0 > 0,
    hasWarnings: currentReport?.totalWarnings || 0 > 0,
    totalProblems: currentReport?.problems.length || 0
  };
};

/**
 * Enhanced hook specifically for AI chat streaming with error detection
 */
export const useStreamingErrorDetection = (
  onAutoFixNeeded?: (fixPrompt: string) => void
) => {
  const {
    monitorStreamingResponse,
    processCompletedResponse,
    shouldTriggerAutoFix,
    createAutoFixPrompt
  } = useRealTimeErrorDetection({
    enabled: true,
    onAutoFix: onAutoFixNeeded
  });

  const { autoFixEnabled } = useProblemsStore();

  /**
   * Process streaming chunk and detect errors
   */
  const processStreamChunk = useCallback(async (
    chunk: string,
    fullResponse: string,
    filePath?: string
  ) => {
    // Monitor for real-time problems in the chunk
    await monitorStreamingResponse(chunk, filePath);

    // If we have a substantial response, do a more thorough check
    if (fullResponse.length > 1000) {
      await monitorStreamingResponse(fullResponse, filePath);
    }
  }, [monitorStreamingResponse]);

  /**
   * Process final streaming response
   */
  const processStreamEnd = useCallback(async (
    finalResponse: string,
    affectedFiles: string[] = []
  ) => {
    await processCompletedResponse(finalResponse, affectedFiles);

    // If auto-fix is enabled and we have errors, trigger fix
    if (shouldTriggerAutoFix()) {
      const fixPrompt = createAutoFixPrompt(true); // Prioritize errors
      onAutoFixNeeded?.(fixPrompt);
    }
  }, [
    processCompletedResponse, 
    shouldTriggerAutoFix, 
    createAutoFixPrompt, 
    onAutoFixNeeded
  ]);

  return {
    processStreamChunk,
    processStreamEnd,
    isAutoFixEnabled: autoFixEnabled
  };
};