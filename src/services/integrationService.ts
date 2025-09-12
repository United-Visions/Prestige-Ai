// Integration service for detecting and managing app integrations
// Similar to dyad's approach but adapted for Prestige AI

import { 
  GITHUB_AVAILABLE_SYSTEM_PROMPT,
  GITHUB_NOT_AVAILABLE_SYSTEM_PROMPT,
  SUPABASE_AVAILABLE_SYSTEM_PROMPT, 
  SUPABASE_NOT_AVAILABLE_SYSTEM_PROMPT,
  VERCEL_AVAILABLE_SYSTEM_PROMPT,
  VERCEL_NOT_AVAILABLE_SYSTEM_PROMPT,
} from '@/prompts/integration_prompts';

export interface AppIntegrationStatus {
  github?: {
    enabled: boolean;
    repositoryUrl?: string;
    accessToken?: string;
  };
  supabase?: {
    enabled: boolean;
    projectId?: string;
    accessToken?: string;
  };
  vercel?: {
    enabled: boolean;
    projectId?: string;
    accessToken?: string;
  };
}

export interface IntegrationPrompts {
  github: string;
  supabase: string;
  vercel: string;
}

class IntegrationService {
  private static instance: IntegrationService;

  private constructor() {}

  public static getInstance(): IntegrationService {
    if (!IntegrationService.instance) {
      IntegrationService.instance = new IntegrationService();
    }
    return IntegrationService.instance;
  }

  /**
   * Detect which integrations are available for the current app
   * This checks for integration configuration/setup files and user settings
   */
  public async detectIntegrationStatus(appPath: string): Promise<AppIntegrationStatus> {
    const status: AppIntegrationStatus = {};

    try {
      // Check for GitHub integration
      status.github = await this.checkGitHubIntegration(appPath);
      
      // Check for Supabase integration
      status.supabase = await this.checkSupabaseIntegration(appPath);
      
      // Check for Vercel integration
      status.vercel = await this.checkVercelIntegration(appPath);
    } catch (error) {
      console.warn('Error detecting integration status:', error);
    }

    return status;
  }

  /**
   * Generate integration system prompts based on app's integration status
   * Similar to dyad's logic in chat_stream_handlers.ts lines 510-526
   */
  public generateIntegrationPrompts(integrationStatus: AppIntegrationStatus): IntegrationPrompts {
    const prompts: IntegrationPrompts = {
      github: '',
      supabase: '',
      vercel: ''
    };

    // GitHub integration prompts
    if (integrationStatus.github?.enabled) {
      prompts.github = GITHUB_AVAILABLE_SYSTEM_PROMPT;
    } else {
      prompts.github = GITHUB_NOT_AVAILABLE_SYSTEM_PROMPT;
    }

    // Supabase integration prompts
    if (integrationStatus.supabase?.enabled) {
      prompts.supabase = SUPABASE_AVAILABLE_SYSTEM_PROMPT;
    } else {
      prompts.supabase = SUPABASE_NOT_AVAILABLE_SYSTEM_PROMPT;
    }

    // Vercel integration prompts
    if (integrationStatus.vercel?.enabled) {
      prompts.vercel = VERCEL_AVAILABLE_SYSTEM_PROMPT;
    } else {
      prompts.vercel = VERCEL_NOT_AVAILABLE_SYSTEM_PROMPT;
    }

    return prompts;
  }

  /**
   * Check if GitHub integration is available and configured
   */
  private async checkGitHubIntegration(appPath: string): Promise<{ enabled: boolean; repositoryUrl?: string; accessToken?: string; }> {
    try {
      // Check for .git directory
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        const gitPath = await (window as any).electronAPI.path.join(appPath, '.git');
        
        // Check if .git directory exists
        const hasGit = await (window as any).electronAPI.fs.pathExists(gitPath);
        
        // Check for GitHub configuration in user settings or environment
        const userSettings = await this.getUserIntegrationSettings();
        const hasGitHubConfig = userSettings.github?.accessToken;

        return {
          enabled: hasGit && !!hasGitHubConfig,
          accessToken: userSettings.github?.accessToken,
        };
      }
    } catch (error) {
      console.warn('Error checking GitHub integration:', error);
    }
    
    return { enabled: false };
  }

  /**
   * Check if Supabase integration is available and configured
   */
  private async checkSupabaseIntegration(appPath: string): Promise<{ enabled: boolean; projectId?: string; accessToken?: string; }> {
    try {
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        // Check for Supabase client file
        const supabaseClientPath = await (window as any).electronAPI.path.join(appPath, 'src', 'integrations', 'supabase', 'client.ts');
        
        // Check if Supabase client file exists
        const hasSupabaseClient = await (window as any).electronAPI.fs.pathExists(supabaseClientPath);
        
        // Check for Supabase configuration in user settings
        const userSettings = await this.getUserIntegrationSettings();
        const hasSupabaseConfig = userSettings.supabase?.projectId && userSettings.supabase?.accessToken;

        return {
          enabled: hasSupabaseClient && !!hasSupabaseConfig,
          projectId: userSettings.supabase?.projectId,
          accessToken: userSettings.supabase?.accessToken,
        };
      }
    } catch (error) {
      console.warn('Error checking Supabase integration:', error);
    }
    
    return { enabled: false };
  }

  /**
   * Check if Vercel integration is available and configured
   */
  private async checkVercelIntegration(appPath: string): Promise<{ enabled: boolean; projectId?: string; accessToken?: string; }> {
    try {
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        // Check for vercel.json or .vercel directory
        const vercelJsonPath = await (window as any).electronAPI.path.join(appPath, 'vercel.json');
        const vercelDirPath = await (window as any).electronAPI.path.join(appPath, '.vercel');
        
        // Check if Vercel configuration files exist
        const hasVercelJson = await (window as any).electronAPI.fs.pathExists(vercelJsonPath);
        const hasVercelDir = await (window as any).electronAPI.fs.pathExists(vercelDirPath);
        
        // Check for Vercel configuration in user settings
        const userSettings = await this.getUserIntegrationSettings();
        const hasVercelConfig = userSettings.vercel?.accessToken;

        return {
          enabled: (hasVercelJson || hasVercelDir) && !!hasVercelConfig,
          accessToken: userSettings.vercel?.accessToken,
        };
      }
    } catch (error) {
      console.warn('Error checking Vercel integration:', error);
    }
    
    return { enabled: false };
  }

  /**
   * Get user's integration settings from storage or environment
   * This would typically read from user settings, environment variables, or secure storage
   */
  private async getUserIntegrationSettings(): Promise<{
    github?: { accessToken?: string; };
    supabase?: { projectId?: string; accessToken?: string; };
    vercel?: { accessToken?: string; };
  }> {
    try {
      // In a real implementation, this would read from:
      // - Electron secure storage
      // - Environment variables 
      // - User settings file
      // - Keychain/credential manager
      
      // For testing purposes, we can check if there are environment variables set
      const settings: any = {};
      
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        try {
          // Try to get environment variables if available
          // Note: electronAPI might not have getEnvVar method, so we wrap in try-catch
          const electronAPI = (window as any).electronAPI;
          
          let githubToken, supabaseUrl, supabaseKey, vercelToken;
          
          if (electronAPI.getEnvVar) {
            githubToken = await electronAPI.getEnvVar('GITHUB_TOKEN');
            supabaseUrl = await electronAPI.getEnvVar('SUPABASE_URL');
            supabaseKey = await electronAPI.getEnvVar('SUPABASE_ANON_KEY');
            vercelToken = await electronAPI.getEnvVar('VERCEL_TOKEN');
          } else {
            // Fallback: environment variables not available through electronAPI
            console.log('electronAPI.getEnvVar not available, skipping env var check');
          }

          if (githubToken) {
            settings.github = { accessToken: githubToken };
          }
          if (supabaseUrl && supabaseKey) {
            settings.supabase = { 
              projectId: supabaseUrl.replace('https://', '').replace('.supabase.co', ''),
              accessToken: supabaseKey 
            };
          }
          if (vercelToken) {
            settings.vercel = { accessToken: vercelToken };
          }
        } catch (envError) {
          console.warn('Could not access environment variables:', envError);
        }
      }
      
      // For now, return settings (might be empty if no env vars found)
      // This ensures the system works even without configured integrations
      return settings;
    } catch (error) {
      console.warn('Error getting user integration settings:', error);
      return {};
    }
  }

  /**
   * Save user integration settings
   */
  public async saveIntegrationSettings(provider: 'github' | 'supabase' | 'vercel', settings: any): Promise<void> {
    try {
      // In a real implementation, this would save to secure storage
      console.log(`Saving integration settings for ${provider}:`, settings);
      
      // TODO: Implement secure storage for integration credentials
      // This should use Electron's safeStorage or similar secure storage
    } catch (error) {
      console.error('Error saving integration settings:', error);
      throw new Error(`Failed to save ${provider} integration settings`);
    }
  }
}

export const integrationService = IntegrationService.getInstance();