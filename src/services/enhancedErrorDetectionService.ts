import { AppError, AppOutput } from '@/types/appTypes';
import { ErrorDetectionService, type ErrorReport } from './errorDetectionService';
import { autoModeService } from './autoModeService';

interface AppStartupState {
  appId: number;
  isStarting: boolean;
  isWaitingForErrors: boolean;
  startTime: number;
  hasDetectedUrl: boolean;
  timeoutId?: NodeJS.Timeout;
}

interface ErrorDetectionConfig {
  startupWaitTime: number; // How long to wait for app to start before checking errors
  errorCheckInterval: number; // How often to check for errors during startup
  maxStartupTime: number; // Maximum time to wait for app startup
}

type ErrorResolutionHandler = (errorReport: ErrorReport, appId: number) => Promise<void>;

export class EnhancedErrorDetectionService {
  private static instance: EnhancedErrorDetectionService;
  private errorDetectionService: ErrorDetectionService;
  private startupStates: Map<number, AppStartupState> = new Map();
  private config: ErrorDetectionConfig = {
    startupWaitTime: 3000, // Wait 3 seconds after app start
    errorCheckInterval: 1000, // Check every second
    maxStartupTime: 30000, // Max 30 seconds for startup
  };
  private errorResolutionHandler?: ErrorResolutionHandler;
  private isPausedForErrors: Map<number, boolean> = new Map();

  private constructor() {
    this.errorDetectionService = ErrorDetectionService.getInstance();
  }

  public static getInstance(): EnhancedErrorDetectionService {
    if (!EnhancedErrorDetectionService.instance) {
      EnhancedErrorDetectionService.instance = new EnhancedErrorDetectionService();
    }
    return EnhancedErrorDetectionService.instance;
  }

  /**
   * Register a handler for error resolution
   */
  setErrorResolutionHandler(handler: ErrorResolutionHandler) {
    this.errorResolutionHandler = handler;
  }

  /**
   * Start monitoring an app startup
   */
  startAppMonitoring(appId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      // Clear any existing monitoring for this app
      this.stopAppMonitoring(appId);

      const startupState: AppStartupState = {
        appId,
        isStarting: true,
        isWaitingForErrors: false,
        startTime: Date.now(),
        hasDetectedUrl: false,
      };

      this.startupStates.set(appId, startupState);

      console.log(`🔍 Enhanced error detection started for app ${appId}`);

      // Set maximum startup timeout
      const maxTimeoutId = setTimeout(() => {
        this.handleStartupTimeout(appId);
        reject(new Error(`App ${appId} startup timed out after ${this.config.maxStartupTime}ms`));
      }, this.config.maxStartupTime);

      startupState.timeoutId = maxTimeoutId;
      resolve();
    });
  }

  /**
   * Stop monitoring an app
   */
  stopAppMonitoring(appId: number) {
    const state = this.startupStates.get(appId);
    if (state?.timeoutId) {
      clearTimeout(state.timeoutId);
    }
    this.startupStates.delete(appId);
    this.isPausedForErrors.delete(appId);
    console.log(`🛑 Enhanced error detection stopped for app ${appId}`);
  }

  /**
   * Handle app output during startup monitoring
   */
  onAppOutput(appId: number, output: AppOutput) {
    const state = this.startupStates.get(appId);
    if (!state) return;

    // Check if this is a proxy server start message indicating app is ready
    const proxyMatch = output.message.match(/\[prestige-proxy-server\]started=\[(.*?)\]/);
    if (proxyMatch && !state.hasDetectedUrl) {
      state.hasDetectedUrl = true;
      console.log(`✅ App ${appId} detected startup URL, beginning error check phase`);
      this.beginErrorCheckPhase(appId);
    }
  }

  /**
   * Handle app errors during monitoring
   */
  onAppError(appId: number, error: AppError) {
    const state = this.startupStates.get(appId);
    if (!state) return;

    console.log(`❌ Error detected during app ${appId} monitoring:`, error);
    
    // If we're in startup phase, immediately trigger error resolution
    if (state.isStarting || state.isWaitingForErrors) {
      this.handleErrorDuringStartup(appId, error);
    }
  }

  /**
   * Begin the error checking phase after app startup is detected
   */
  private beginErrorCheckPhase(appId: number) {
    const state = this.startupStates.get(appId);
    if (!state) return;

    state.isWaitingForErrors = true;
    state.isStarting = false;

    console.log(`⏱️ App ${appId} waiting for errors (${this.config.startupWaitTime}ms)`);

    // Clear existing timeout and set error check timeout
    if (state.timeoutId) {
      clearTimeout(state.timeoutId);
    }

    state.timeoutId = setTimeout(() => {
      this.completeStartupMonitoring(appId);
    }, this.config.startupWaitTime);
  }

  /**
   * Complete startup monitoring (no errors detected)
   */
  private completeStartupMonitoring(appId: number) {
    const state = this.startupStates.get(appId);
    if (!state) return;

    console.log(`✅ App ${appId} startup completed successfully (no errors detected)`);
    this.stopAppMonitoring(appId);
  }

  /**
   * Handle startup timeout
   */
  private handleStartupTimeout(appId: number) {
    console.log(`⏰ App ${appId} startup timed out`);
    this.stopAppMonitoring(appId);
  }

  /**
   * Handle error detected during startup
   */
  private async handleErrorDuringStartup(appId: number, error: AppError) {
    const state = this.startupStates.get(appId);
    if (!state) return;

    console.log(`🚨 Error detected during app ${appId} startup, pausing Auto Mode`);
    
    // Pause Auto Mode for this app
    this.isPausedForErrors.set(appId, true);

    // Create error report
    const errorReport = this.errorDetectionService.createErrorReport([], [error]);
    
    // Trigger error resolution handler
    if (this.errorResolutionHandler) {
      try {
        await this.errorResolutionHandler(errorReport, appId);
      } catch (resolutionError) {
        console.error(`Error in resolution handler for app ${appId}:`, resolutionError);
      }
    }

    // Stop monitoring this app
    this.stopAppMonitoring(appId);
  }

  /**
   * Check if an app is paused due to errors
   */
  isAppPausedForErrors(appId: number): boolean {
    return this.isPausedForErrors.get(appId) || false;
  }

  /**
   * Resume an app after errors are resolved
   */
  resumeAppAfterErrorResolution(appId: number) {
    this.isPausedForErrors.set(appId, false);
    console.log(`▶️ App ${appId} resumed after error resolution`);
  }

  /**
   * Get current startup state for an app
   */
  getAppStartupState(appId: number): AppStartupState | undefined {
    return this.startupStates.get(appId);
  }

  /**
   * Check if app is currently being monitored
   */
  isMonitoring(appId: number): boolean {
    return this.startupStates.has(appId);
  }

  /**
   * Get human-readable status for an app
   */
  getAppStatus(appId: number): string {
    const state = this.startupStates.get(appId);
    if (!state) {
      return this.isPausedForErrors.get(appId) ? 'Paused (Errors)' : 'Ready';
    }

    if (state.isStarting) {
      return 'Starting...';
    }

    if (state.isWaitingForErrors) {
      return 'Waiting for app to fully start...';
    }

    return 'Monitoring';
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ErrorDetectionConfig>) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ErrorDetectionConfig {
    return { ...this.config };
  }
}

export const enhancedErrorDetectionService = EnhancedErrorDetectionService.getInstance();