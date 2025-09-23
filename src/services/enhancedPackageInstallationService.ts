import { AdvancedAppManagementService } from './advancedAppManagementService';
import { resolveAppPaths } from '@/utils/appPathResolver';
import { showSuccess, showError } from '@/utils/toast';

interface PackageInstallOptions {
  appId: number;
  packages: string[];
  onProgress?: (message: string) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

interface PackageInstallResult {
  success: boolean;
  installedPackages: string[];
  errors: string[];
  output: string;
}

export class EnhancedPackageInstallationService {
  private static instance: EnhancedPackageInstallationService;
  private appManagementService: AdvancedAppManagementService;
  private activeInstallations: Map<number, AbortController> = new Map();

  private constructor() {
    this.appManagementService = AdvancedAppManagementService.getInstance();
  }

  public static getInstance(): EnhancedPackageInstallationService {
    if (!EnhancedPackageInstallationService.instance) {
      EnhancedPackageInstallationService.instance = new EnhancedPackageInstallationService();
    }
    return EnhancedPackageInstallationService.instance;
  }

  /**
   * Install packages for an app with error detection integration
   */
  async installPackagesForApp(options: PackageInstallOptions): Promise<PackageInstallResult> {
    const { appId, packages, onProgress, onComplete, onError } = options;

    // Cancel any existing installation for this app
    this.cancelInstallation(appId);

    const controller = new AbortController();
    this.activeInstallations.set(appId, controller);

    try {
      onProgress?.('Preparing package installation...');

      // Get app path
      const app = await this.appManagementService.getApp(appId);
      if (!app) {
        throw new Error(`App ${appId} not found`);
      }

      const { filesPath: appPath } = await resolveAppPaths(app);

      onProgress?.(`Installing packages: ${packages.join(', ')}...`);

      const result = await this.installPackages(packages, appPath, controller.signal);

      if (result.success) {
        onProgress?.('Packages installed successfully. Restarting app...');
        
        // Restart the app after successful installation
        await this.restartAppAfterInstallation(appId);
        
        onComplete?.();
        showSuccess(`📦 Installed: ${packages.join(', ')}`);
      } else {
        throw new Error(`Installation failed: ${result.errors.join(', ')}`);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      onError?.(error as Error);
      showError(`❌ Failed to install packages: ${errorMessage}`);
      
      return {
        success: false,
        installedPackages: [],
        errors: [errorMessage],
        output: ''
      };
    } finally {
      this.activeInstallations.delete(appId);
    }
  }

  /**
   * Install packages with automatic error detection and smart package resolution
   */
  private async installPackages(
    packages: string[], 
    appPath: string, 
    signal?: AbortSignal
  ): Promise<PackageInstallResult> {
    const result: PackageInstallResult = {
      success: false,
      installedPackages: [],
      errors: [],
      output: ''
    };

    try {
      // Smart package resolution - handle common cases
      const resolvedPackages = this.resolvePackageNames(packages);
      
      console.log(`📦 Installing packages in ${appPath}:`, resolvedPackages);

      // Use IPC to install packages in main process
      const installResult = await window.electronAPI.package.install(resolvedPackages, appPath);
      
      if (installResult.success) {
        result.output = installResult.output;
        result.success = true;
        result.installedPackages = installResult.installedPackages;
        console.log(`✅ Successfully installed packages:`, resolvedPackages);
      } else {
        result.errors.push(installResult.error);
        console.error(`❌ Package installation failed:`, installResult.error);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMessage);
      console.error(`❌ Package installation failed:`, errorMessage);
    }

    return result;
  }

  /**
   * Smart package name resolution for common cases
   */
  private resolvePackageNames(packages: string[]): string[] {
    return packages.map(pkg => {
      // Handle common shadcn/ui component dependencies
      const commonMappings: Record<string, string> = {
        '@radix-ui/react-label': '@radix-ui/react-label',
        '@radix-ui/react-slot': '@radix-ui/react-slot',
        '@radix-ui/react-dialog': '@radix-ui/react-dialog',
        '@radix-ui/react-toast': '@radix-ui/react-toast',
        '@radix-ui/react-dropdown-menu': '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-select': '@radix-ui/react-select',
        '@radix-ui/react-checkbox': '@radix-ui/react-checkbox',
        '@radix-ui/react-radio-group': '@radix-ui/react-radio-group',
        '@radix-ui/react-tabs': '@radix-ui/react-tabs',
        '@radix-ui/react-accordion': '@radix-ui/react-accordion',
        '@radix-ui/react-alert-dialog': '@radix-ui/react-alert-dialog',
        '@radix-ui/react-aspect-ratio': '@radix-ui/react-aspect-ratio',
        '@radix-ui/react-avatar': '@radix-ui/react-avatar',
        '@radix-ui/react-collapsible': '@radix-ui/react-collapsible',
        '@radix-ui/react-context-menu': '@radix-ui/react-context-menu',
        '@radix-ui/react-hover-card': '@radix-ui/react-hover-card',
        '@radix-ui/react-menubar': '@radix-ui/react-menubar',
        '@radix-ui/react-navigation-menu': '@radix-ui/react-navigation-menu',
        '@radix-ui/react-popover': '@radix-ui/react-popover',
        '@radix-ui/react-progress': '@radix-ui/react-progress',
        '@radix-ui/react-scroll-area': '@radix-ui/react-scroll-area',
        '@radix-ui/react-separator': '@radix-ui/react-separator',
        '@radix-ui/react-sheet': '@radix-ui/react-sheet',
        '@radix-ui/react-slider': '@radix-ui/react-slider',
        '@radix-ui/react-switch': '@radix-ui/react-switch',
        '@radix-ui/react-table': '@radix-ui/react-table',
        '@radix-ui/react-toggle': '@radix-ui/react-toggle',
        '@radix-ui/react-toggle-group': '@radix-ui/react-toggle-group',
        '@radix-ui/react-tooltip': '@radix-ui/react-tooltip',
        'lucide-react': 'lucide-react',
        'class-variance-authority': 'class-variance-authority',
        'clsx': 'clsx',
        'tailwind-merge': 'tailwind-merge'
      };

      return commonMappings[pkg] || pkg;
    });
  }

  /**
   * Restart app after package installation
   */
  private async restartAppAfterInstallation(appId: number): Promise<void> {
    try {
      const isRunning = await this.appManagementService.isAppRunning(appId);
      if (isRunning) {
        await this.appManagementService.stopApp(appId);
        // Give it a moment to stop
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Start the app again
      await this.appManagementService.runApp(appId, () => {}, () => {});
    } catch (error) {
      console.error(`Failed to restart app ${appId} after package installation:`, error);
      throw new Error(`Package installation succeeded but app restart failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Cancel active installation for an app
   */
  cancelInstallation(appId: number): void {
    const controller = this.activeInstallations.get(appId);
    if (controller) {
      controller.abort();
      this.activeInstallations.delete(appId);
      console.log(`🛑 Cancelled package installation for app ${appId}`);
    }
  }

  /**
   * Check if installation is active for an app
   */
  isInstalling(appId: number): boolean {
    return this.activeInstallations.has(appId);
  }

  /**
   * Get prestige tag for package installation
   */
  static generatePrestigeTag(packages: string[]): string {
    return `<prestige-add-dependency packages="${packages.join(' ')}"></prestige-add-dependency>`;
  }

  /**
   * Generate AI prompt for package installation
   */
  static generateInstallPrompt(packages: string[], context?: string): string {
    const packageList = packages.join(', ');
    const tag = EnhancedPackageInstallationService.generatePrestigeTag(packages);
    
    return `I need to install the following packages to resolve import errors: ${packageList}

${context ? `Context: ${context}` : ''}

${tag}

Please install these packages to fix the missing import errors. The app will restart automatically after installation.`;
  }
}

export const enhancedPackageInstallationService = EnhancedPackageInstallationService.getInstance();