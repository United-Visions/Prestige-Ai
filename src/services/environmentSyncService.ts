import { vercelService } from './vercelService';
import { showInfo, showSuccess, showError } from '@/utils/toast';

const { fs, path } = window.electronAPI;

export interface EnvironmentVariable {
  key: string;
  value: string;
  target: ('production' | 'preview' | 'development')[];
  type?: 'plain' | 'secret';
}

export class EnvironmentSyncService {
  private static instance: EnvironmentSyncService;

  public static getInstance(): EnvironmentSyncService {
    if (!EnvironmentSyncService.instance) {
      EnvironmentSyncService.instance = new EnvironmentSyncService();
    }
    return EnvironmentSyncService.instance;
  }

  /**
   * Detect environment variables from common files in the app
   */
  async detectEnvironmentVariables(appPath: string): Promise<EnvironmentVariable[]> {
    const envVars: EnvironmentVariable[] = [];
    const commonEnvFiles = ['.env', '.env.local', '.env.example', '.env.template'];

    for (const envFile of commonEnvFiles) {
      try {
        const envFilePath = await path.join(appPath, envFile);
        const exists = await fs.pathExists(envFilePath);
        
        if (exists) {
          const content = await fs.readFile(envFilePath);
          const parsedVars = this.parseEnvFile(content);
          
          // Filter out variables with actual values vs examples
          const isExampleFile = envFile.includes('example') || envFile.includes('template');
          
          for (const envVar of parsedVars) {
            // Skip if it's an example file and has a placeholder value
            if (isExampleFile && this.isPlaceholderValue(envVar.value)) {
              continue;
            }

            // Determine if this should be a secret based on the key name
            const isSecret = this.isSecretVariable(envVar.key);
            
            envVars.push({
              key: envVar.key,
              value: envVar.value,
              target: this.getTargetEnvironments(envVar.key, envFile),
              type: isSecret ? 'secret' : 'plain'
            });
          }
        }
      } catch (error) {
        console.warn(`Failed to read ${envFile}:`, error);
      }
    }

    return this.deduplicateEnvVars(envVars);
  }

  /**
   * Parse environment file content
   */
  private parseEnvFile(content: string): Array<{ key: string; value: string }> {
    const envVars: Array<{ key: string; value: string }> = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip comments and empty lines
      if (trimmedLine.startsWith('#') || trimmedLine.startsWith('//') || !trimmedLine) {
        continue;
      }

      // Parse KEY=VALUE format
      const match = trimmedLine.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (match) {
        const [, key, value] = match;
        
        // Remove quotes if present
        let cleanValue = value.trim();
        if ((cleanValue.startsWith('"') && cleanValue.endsWith('"')) ||
            (cleanValue.startsWith("'") && cleanValue.endsWith("'"))) {
          cleanValue = cleanValue.slice(1, -1);
        }

        envVars.push({ key: key.trim(), value: cleanValue });
      }
    }

    return envVars;
  }

  /**
   * Check if a value looks like a placeholder
   */
  private isPlaceholderValue(value: string): boolean {
    const placeholderPatterns = [
      /^your_.*$/i,
      /^<.*>$/,
      /^\[.*\]$/,
      /^(change_me|replace_me|todo|tbd|xxx)$/i,
      /^(example|placeholder|dummy).*$/i,
      /^.*_(key|secret|token|password)_here$/i
    ];

    return placeholderPatterns.some(pattern => pattern.test(value));
  }

  /**
   * Determine if a variable should be treated as secret
   */
  private isSecretVariable(key: string): boolean {
    const secretPatterns = [
      /secret/i,
      /password/i,
      /token/i,
      /key$/i,
      /api_key/i,
      /private/i,
      /auth/i,
      /client_secret/i,
      /webhook_secret/i,
      /signing_secret/i
    ];

    return secretPatterns.some(pattern => pattern.test(key));
  }

  /**
   * Determine target environments based on variable name and file
   */
  private getTargetEnvironments(key: string, filename: string): ('production' | 'preview' | 'development')[] {
    // Development-only variables
    if (key.includes('DEBUG') || key.includes('DEV') || filename.includes('.local')) {
      return ['development'];
    }

    // Production-only variables
    if (key.includes('PROD') || key.includes('PRODUCTION')) {
      return ['production'];
    }

    // Default: all environments except development for secrets, all for non-secrets
    if (this.isSecretVariable(key)) {
      return ['production', 'preview'];
    }

    return ['production', 'preview', 'development'];
  }

  /**
   * Remove duplicate environment variables, preferring non-example files
   */
  private deduplicateEnvVars(envVars: EnvironmentVariable[]): EnvironmentVariable[] {
    const keyMap = new Map<string, EnvironmentVariable>();

    for (const envVar of envVars) {
      const existing = keyMap.get(envVar.key);
      
      if (!existing) {
        keyMap.set(envVar.key, envVar);
      } else {
        // Prefer non-placeholder values
        if (!this.isPlaceholderValue(envVar.value) && this.isPlaceholderValue(existing.value)) {
          keyMap.set(envVar.key, envVar);
        }
      }
    }

    return Array.from(keyMap.values());
  }

  /**
   * Sync environment variables to Vercel project
   */
  async syncToVercel(appPath: string, projectId: string, teamId?: string): Promise<void> {
    try {
      if (!vercelService.isAuthenticated()) {
        throw new Error('Vercel not authenticated');
      }

      showInfo('🔍 Detecting environment variables...');
      
      const envVars = await this.detectEnvironmentVariables(appPath);
      
      if (envVars.length === 0) {
        showInfo('No environment variables found to sync');
        return;
      }

      showInfo(`📝 Found ${envVars.length} environment variables. Syncing to Vercel...`);

      await vercelService.setEnvironmentVariables({
        projectId,
        teamId,
        environmentVariables: envVars
      });

      showSuccess(`✅ Successfully synced ${envVars.length} environment variables to Vercel!`);
      
      // Log summary of what was synced
      const secrets = envVars.filter(v => v.type === 'secret').length;
      const plainVars = envVars.filter(v => v.type === 'plain').length;
      
      if (secrets > 0) {
        showInfo(`🔒 ${secrets} secret(s) and ${plainVars} plain variable(s) synced`);
      }

    } catch (error) {
      console.error('Environment sync failed:', error);
      showError(`Failed to sync environment variables: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Auto-sync environment variables when setting up Vercel deployment
   */
  async autoSyncForDeployment(appPath: string, projectId: string, teamId?: string): Promise<boolean> {
    try {
      const envVars = await this.detectEnvironmentVariables(appPath);
      
      if (envVars.length === 0) {
        return true; // No env vars to sync, consider it successful
      }

      // Only auto-sync if there are a reasonable number of variables
      // to avoid overwhelming the user
      if (envVars.length > 20) {
        showInfo(`⚠️ Found ${envVars.length} environment variables. Consider syncing manually.`);
        return true;
      }

      await this.syncToVercel(appPath, projectId, teamId);
      return true;

    } catch (error) {
      console.warn('Auto-sync failed, continuing deployment:', error);
      return false; // Don't fail deployment due to env sync issues
    }
  }

  /**
   * Create a template .env.example file
   */
  async createEnvExample(appPath: string, envVars: EnvironmentVariable[]): Promise<void> {
    try {
      const examplePath = await path.join(appPath, '.env.example');
      
      let content = '# Environment Variables Template\n';
      content += '# Copy this file to .env and fill in your actual values\n\n';

      for (const envVar of envVars) {
        const placeholder = this.generatePlaceholder(envVar.key, envVar.type);
        content += `${envVar.key}=${placeholder}\n`;
      }

      await fs.writeFile(examplePath, content);
      showSuccess('📋 Created .env.example template');

    } catch (error) {
      console.error('Failed to create .env.example:', error);
      showError('Failed to create environment template file');
    }
  }

  /**
   * Generate appropriate placeholder for environment variable
   */
  private generatePlaceholder(key: string, type?: string): string {
    if (type === 'secret') {
      return 'your_secret_here';
    }

    if (key.includes('URL') || key.includes('ENDPOINT')) {
      return 'https://your-api-endpoint.com';
    }

    if (key.includes('PORT')) {
      return '3000';
    }

    if (key.includes('EMAIL')) {
      return 'your-email@example.com';
    }

    if (key.includes('DATABASE') && key.includes('URL')) {
      return 'postgresql://user:password@localhost:5432/dbname';
    }

    return 'your_value_here';
  }

  /**
   * Read environment variables from the current app's .env file
   */
  async readAppEnvironmentVariables(appPath: string): Promise<EnvironmentVariable[]> {
    try {
      const envFilePath = await path.join(appPath, '.env');
      const exists = await fs.pathExists(envFilePath);
      
      if (!exists) {
        return [];
      }
      
      const content = await fs.readFile(envFilePath);
      const parsedVars = this.parseEnvFile(content);
      
      return parsedVars.map(envVar => {
        const isSecret = this.isSecretVariable(envVar.key);
        return {
          key: envVar.key,
          value: envVar.value,
          target: ['production', 'preview', 'development'] as ('production' | 'preview' | 'development')[],
          type: isSecret ? 'secret' : 'plain'
        };
      });
    } catch (error) {
      console.error('Failed to read app environment variables:', error);
      return [];
    }
  }

  /**
   * Update a specific environment variable in the app's .env file
   */
  async updateEnvironmentVariable(appPath: string, key: string, newValue: string): Promise<void> {
    try {
      const envFilePath = await path.join(appPath, '.env');
      
      let content = '';
      let exists = false;
      
      try {
        content = await fs.readFile(envFilePath);
        exists = true;
      } catch (error) {
        // File doesn't exist, create new content
        content = '# Environment Variables\n# Generated by Prestige AI\n\n';
      }
      
      const lines = content.split('\n');
      let keyFound = false;
      
      // Update existing key or add new one
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith(`${key}=`)) {
          lines[i] = `${key}=${newValue}`;
          keyFound = true;
          break;
        }
      }
      
      if (!keyFound) {
        // Add new environment variable
        lines.push(`${key}=${newValue}`);
      }
      
      const updatedContent = lines.join('\n');
      await fs.writeFile(envFilePath, updatedContent);
      
      showSuccess(`Updated ${key} in environment variables`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showError(`Failed to update environment variable: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Get the app's .env file path
   */
  async getEnvFilePath(appPath: string): Promise<string> {
    return await path.join(appPath, '.env');
  }
}

export const environmentSyncService = EnvironmentSyncService.getInstance();