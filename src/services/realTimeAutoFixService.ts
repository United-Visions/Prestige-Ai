import { prestigeAutoFixService } from './prestigeAutoFixService';
import { aiModelServiceV2 as aiModelService } from './aiModelService';
import useAppStore from '@/stores/appStore';
import { showInfo, showSuccess, showError } from '@/utils/toast';
import { resolveAppPaths } from '@/utils/appPathResolver';

export interface AutoFixTrigger {
  appId: number;
  errorMessage: string;
  errorType: string;
  timestamp: number;
}

/**
 * Real-time auto-fix service that listens to app errors and triggers fixes
 */
class RealTimeAutoFixService {
  private static instance: RealTimeAutoFixService;
  private isProcessing: Set<number> = new Set();
  private errorDebounce: Map<number, NodeJS.Timeout> = new Map();

  public static getInstance(): RealTimeAutoFixService {
    if (!RealTimeAutoFixService.instance) {
      RealTimeAutoFixService.instance = new RealTimeAutoFixService();
    }
    return RealTimeAutoFixService.instance;
  }

  /**
   * Initialize the service and set up IPC listeners
   */
  public initialize(): void {
    if (typeof window !== 'undefined' && window.electronAPI?.ipcRenderer) {
      window.electronAPI.ipcRenderer.on('auto-fix:trigger', (event, trigger: AutoFixTrigger) => {
        console.log('🔧 Auto-fix trigger received:', trigger);
        this.handleAutoFixTrigger(trigger);
      });
      console.log('✅ Real-time auto-fix service initialized');
    }
  }

  /**
   * Handle auto-fix trigger from main process
   */
  private async handleAutoFixTrigger(trigger: AutoFixTrigger): Promise<void> {
    const { appId, errorMessage, errorType } = trigger;

    // Prevent duplicate processing
    if (this.isProcessing.has(appId)) {
      console.log(`⏳ Auto-fix already processing for app ${appId}, skipping`);
      return;
    }

    // Debounce rapid error messages from the same app
    const existingTimeout = this.errorDebounce.get(appId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    this.errorDebounce.set(appId, setTimeout(async () => {
      await this.processAutoFix(appId, errorMessage, errorType);
      this.errorDebounce.delete(appId);
    }, 2000)); // Wait 2 seconds to group similar errors
  }

  /**
   * Process the actual auto-fix
   */
  private async processAutoFix(appId: number, errorMessage: string, errorType: string): Promise<void> {
    this.isProcessing.add(appId);

    try {
      console.log(`🔧 Processing auto-fix for app ${appId}, type: ${errorType}`);
      showInfo(`🔧 Auto-fixing ${errorType} error for app ${appId}...`);

      // Get current app and resolve paths
      const { apps } = useAppStore.getState();
      const currentApp = apps.find(app => app.id === appId);

      if (!currentApp) {
        console.error(`❌ Could not find app ${appId} for auto-fix`);
        return;
      }

      const { filesPath: appPath } = await resolveAppPaths(currentApp);

      // Create AI request function for auto-fix
      const aiRequestFunction = async (prompt: string) => {
        // Get the current selected model from store
        const { selectedModel } = useAppStore.getState();

        // Enhanced prompt for auto-fix with context
        const enhancedPrompt = `You are fixing an error in a ${currentApp.template || 'React'} application.

Error Details:
- Type: ${errorType}
- Message: ${errorMessage}
- App Path: ${appPath}

${prompt}

IMPORTANT: Only provide the specific fixes needed. Use prestige tags:
- <prestige-add-dependency packages="package-name @types/package-name"> for missing dependencies
- <prestige-write path="..."> for file fixes
- Keep changes minimal and targeted

Focus on resolving the specific error mentioned above.`;

        try {
          return await aiModelService.generateResponse(
            selectedModel,
            enhancedPrompt,
            []
          );
        } catch (error) {
          console.error('AI request failed:', error);
          throw error;
        }
      };

      // Use our enhanced auto-fix service
      const result = await prestigeAutoFixService.attemptAutoFix(
        errorMessage,
        appPath,
        aiRequestFunction,
        (attempt, problems) => {
          console.log(`🔧 Auto-fix attempt ${attempt} for app ${appId}: ${problems.length} problem(s)`);
          showInfo(`🔧 Auto-fix attempt ${attempt} for app ${appId}: Working on ${problems.length} problem(s)...`);
        }
      );

      if (result.success) {
        showSuccess(`✅ Auto-fix completed for app ${appId}! Fixed ${result.fixedProblems.length} problem(s) in ${result.attempts} attempt(s)`);
        console.log(`✅ Auto-fix successful for app ${appId}:`, result);
      } else {
        const remainingErrors = result.remainingProblems.filter(p => p.severity === 'error').length;
        if (remainingErrors > 0) {
          showError(`⚠️ Auto-fix partially successful for app ${appId}: ${remainingErrors} error(s) remaining after ${result.attempts} attempt(s)`);
        } else {
          showSuccess(`✅ Auto-fix resolved all critical errors for app ${appId} after ${result.attempts} attempt(s)`);
        }
        console.log(`⚠️ Auto-fix completed with remaining issues for app ${appId}:`, result);
      }

    } catch (error) {
      console.error(`❌ Auto-fix failed for app ${appId}:`, error);
      showError(`❌ Auto-fix failed for app ${appId}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.isProcessing.delete(appId);
    }
  }

  /**
   * Check if auto-fix is currently processing for an app
   */
  public isProcessingApp(appId: number): boolean {
    return this.isProcessing.has(appId);
  }

  /**
   * Get list of apps currently being processed
   */
  public getProcessingApps(): number[] {
    return Array.from(this.isProcessing);
  }
}

// Export singleton instance
export const realTimeAutoFixService = RealTimeAutoFixService.getInstance();

// Auto-initialize when service is imported
if (typeof window !== 'undefined') {
  realTimeAutoFixService.initialize();
}

export default realTimeAutoFixService;