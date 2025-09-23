import { z } from 'zod';

// Vercel schemas
export const VercelUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  username: z.string(),
  avatar: z.string().nullable(),
});
export type VercelUser = z.infer<typeof VercelUserSchema>;

export const VercelTeamSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  avatar: z.string().nullable(),
  membership: z.object({
    role: z.string(),
    confirmed: z.boolean(),
  }).optional(),
});
export type VercelTeam = z.infer<typeof VercelTeamSchema>;

export const VercelProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  accountId: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  targets: z.object({
    production: z.object({
      alias: z.array(z.string()),
      domain: z.string(),
    }).optional(),
  }).optional(),
  framework: z.string().nullable(),
  devCommand: z.string().nullable(),
  buildCommand: z.string().nullable(),
  outputDirectory: z.string().nullable(),
});
export type VercelProject = z.infer<typeof VercelProjectSchema>;

export const VercelDeploymentSchema = z.object({
  uid: z.string(),
  name: z.string(),
  url: z.string(),
  created: z.number(),
  state: z.enum(['BUILDING', 'ERROR', 'INITIALIZING', 'QUEUED', 'READY', 'CANCELED']),
  type: z.enum(['LAMBDAS']),
  target: z.enum(['staging', 'production']).nullable(),
  projectId: z.string(),
  inspectorUrl: z.string().nullable(),
});
export type VercelDeployment = z.infer<typeof VercelDeploymentSchema>;

// Vercel API constants
const VERCEL_API_BASE = "https://api.vercel.com";

export class VercelService {
  private static instance: VercelService;
  private accessToken: string | null = null;
  private tokenStorageService: any = null;

  static getInstance(): VercelService {
    if (!VercelService.instance) {
      VercelService.instance = new VercelService();
      // Auto-load token on service creation
      VercelService.instance.loadStoredToken();
    }
    return VercelService.instance;
  }

  private async loadStoredToken(): Promise<void> {
    try {
      if (!this.tokenStorageService) {
        const { tokenStorageService } = await import('./tokenStorageService');
        this.tokenStorageService = tokenStorageService;
      }
      
      const tokens = await this.tokenStorageService.getTokens('vercel');
      if (tokens?.accessToken) {
        this.accessToken = tokens.accessToken;
        console.log('✅ Vercel token loaded from storage');
      }
    } catch (error) {
      console.warn('Failed to load stored Vercel token:', error);
    }
  }

  /**
   * Public method to reload token from storage
   */
  async reloadStoredToken(): Promise<void> {
    await this.loadStoredToken();
  }

  private async storeToken(token: string): Promise<void> {
    try {
      if (!this.tokenStorageService) {
        const { tokenStorageService } = await import('./tokenStorageService');
        this.tokenStorageService = tokenStorageService;
      }
      
      await this.tokenStorageService.storeTokens('vercel', {
        accessToken: token,
        expiresAt: undefined // Vercel tokens don't expire
      });
      console.log('✅ Vercel token stored securely');
    } catch (error) {
      console.error('Failed to store Vercel token:', error);
    }
  }

  setAccessToken(token: string) {
    this.accessToken = token;
    // Store token persistently
    this.storeToken(token);
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  /**
   * Validate access token
   */
  async validateToken(): Promise<boolean> {
    if (!this.isAuthenticated()) {
      return false;
    }

    try {
      const { electronAPI } = window as any;
      const response = await electronAPI.vercel.apiRequest('/v2/user', { method: 'GET' }, this.accessToken!);
      return response.ok;
    } catch (error) {
      console.error("Failed to validate Vercel token:", error);
      return false;
    }
  }

  /**
   * Get authenticated user information
   */
  async getUser(): Promise<VercelUser | null> {
    if (!this.isAuthenticated()) {
      return null;
    }

    try {
      const { electronAPI } = window as any;
      const response = await electronAPI.vercel.apiRequest('/v2/user', { method: 'GET' }, this.accessToken!);
      
      if (!response.ok) {
        throw new Error(`Failed to get user: ${response.statusText}`);
      }

      return VercelUserSchema.parse(response.data.user);
    } catch (error) {
      console.error("Failed to get Vercel user:", error);
      throw error;
    }
  }

  /**
   * Get user teams
   */
  async getTeams(): Promise<VercelTeam[]> {
    if (!this.isAuthenticated()) {
      throw new Error("Not authenticated");
    }

    try {
      const response = await fetch(`${VERCEL_API_BASE}/v2/teams`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get teams: ${response.statusText}`);
      }

      const data = await response.json();
      return data.teams;
    } catch (error) {
      console.error("Failed to get Vercel teams:", error);
      throw error;
    }
  }

  /**
   * Get default team ID (first team or personal account)
   */
  async getDefaultTeamId(): Promise<string> {
    try {
      const response = await fetch(`${VERCEL_API_BASE}/v2/teams?limit=1`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch teams: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.teams && data.teams.length > 0) {
        return data.teams[0].id;
      }

      throw new Error("No teams found for this user");
    } catch (error) {
      console.error("Error getting default team ID:", error);
      throw error;
    }
  }

  /**
   * Get projects
   */
  async getProjects(teamId?: string): Promise<VercelProject[]> {
    if (!this.isAuthenticated()) {
      throw new Error("Not authenticated");
    }

    try {
      let url = `${VERCEL_API_BASE}/v9/projects`;
      if (teamId) {
        url += `?teamId=${teamId}`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get projects: ${response.statusText}`);
      }

      const data = await response.json();
      return data.projects;
    } catch (error) {
      console.error("Failed to get Vercel projects:", error);
      throw error;
    }
  }

  /**
   * Check if project name is available
   */
  async isProjectNameAvailable(name: string, teamId?: string): Promise<boolean> {
    if (!this.isAuthenticated()) {
      throw new Error("Not authenticated");
    }

    try {
      let url = `${VERCEL_API_BASE}/v1/projects/ensure-project?name=${encodeURIComponent(name)}`;
      if (teamId) {
        url += `&teamId=${teamId}`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.available;
    } catch (error) {
      console.error("Failed to check project availability:", error);
      return false;
    }
  }

  /**
   * Create a new project
   */
  async createProject(options: {
    name: string;
    teamId?: string;
    framework?: string;
    gitRepository?: {
      type: string;
      repo: string;
    };
    buildCommand?: string;
    devCommand?: string;
    outputDirectory?: string;
    rootDirectory?: string;
    environmentVariables?: Array<{
      key: string;
      value: string;
      target: string[];
    }>;
  }): Promise<VercelProject> {
    if (!this.isAuthenticated()) {
      throw new Error("Not authenticated");
    }

    try {
      const { electronAPI } = window;
      const response = await electronAPI.vercel.createProject(options, this.accessToken!);
      
      if (!response.ok) {
        throw new Error(`Failed to create project: ${response.data?.error?.message || response.statusText}`);
      }

      return response.data;
    } catch (error) {
      console.error("Failed to create Vercel project:", error);
      throw error;
    }
  }

  /**
   * Delete a project
   */
  async deleteProject(projectId: string, teamId?: string): Promise<void> {
    if (!this.isAuthenticated()) {
      throw new Error("Not authenticated");
    }

    try {
      let url = `${VERCEL_API_BASE}/v1/projects/${projectId}`;
      if (teamId) {
        url += `?teamId=${teamId}`;
      }

      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete project: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Failed to delete Vercel project:", error);
      throw error;
    }
  }

  /**
   * Get project deployments
   */
  async getProjectDeployments(projectId: string, teamId?: string): Promise<VercelDeployment[]> {
    if (!this.isAuthenticated()) {
      throw new Error("Not authenticated");
    }

    try {
      let url = `${VERCEL_API_BASE}/v6/deployments?projectId=${projectId}&limit=20`;
      if (teamId) {
        url += `&teamId=${teamId}`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get deployments: ${response.statusText}`);
      }

      const data = await response.json();
      return data.deployments;
    } catch (error) {
      console.error("Failed to get Vercel deployments:", error);
      throw error;
    }
  }

  /**
   * Get environment variables
   */
  async getEnvironmentVariables(projectId: string, teamId?: string): Promise<Array<{
    id: string;
    key: string;
    value: string;
    target: string[];
    type: string;
  }>> {
    if (!this.isAuthenticated()) {
      throw new Error("Not authenticated");
    }

    try {
      let url = `${VERCEL_API_BASE}/v9/projects/${projectId}/env`;
      if (teamId) {
        url += `?teamId=${teamId}`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get environment variables: ${response.statusText}`);
      }

      const data = await response.json();
      return data.envs;
    } catch (error) {
      console.error("Failed to get Vercel environment variables:", error);
      throw error;
    }
  }

  /**
   * Set access token
   */
  setToken(token: string) {
    this.accessToken = token;
  }

  /**
   * Get current user (alias for getUser)
   */
  async getCurrentUser(): Promise<VercelUser | null> {
    return this.getUser();
  }

  /**
   * Clear authentication
   */
  clearAuth() {
    this.logout();
  }

  /**
   * Logout and clear access token
   */
  async logout() {
    this.accessToken = null;
    
    // Clear stored token
    try {
      if (!this.tokenStorageService) {
        const { tokenStorageService } = await import('./tokenStorageService');
        this.tokenStorageService = tokenStorageService;
      }
      await this.tokenStorageService.clearTokens('vercel');
      console.log('✅ Vercel token cleared from storage');
    } catch (error) {
      console.warn('Failed to clear stored Vercel token:', error);
    }
  }

  /**
   * Connect a GitHub repository to Vercel and create a project
   */
  async connectGitHubRepo(appId: number, repoUrl: string, projectName?: string): Promise<{
    success: boolean;
    project?: VercelProject;
    deploymentUrl?: string;
    deploymentId?: string;
    error?: string;
  }> {
    if (!this.isAuthenticated()) {
      throw new Error("Not authenticated");
    }

    try {
      const { electronAPI } = window as any;
      const result = await electronAPI.vercel.connectGitHubRepo(appId, repoUrl, projectName, this.accessToken!);
      
      if (result.success && result.project) {
        // Start tracking the initial deployment
        const { deploymentStatusService } = await import('./deploymentStatusService');
        
        // Auto-sync environment variables if we can detect them
        try {
          const { environmentSyncService } = await import('./environmentSyncService');
          const { resolveAppPaths } = await import('@/utils/appPathResolver');
          const { currentApp } = (await import('@/stores/appStore')).default.getState();
          
          if (currentApp) {
            const { filesPath } = await resolveAppPaths(currentApp);
            await environmentSyncService.autoSyncForDeployment(filesPath, result.project.id);
          }
        } catch (envError) {
          console.warn('Environment sync failed, continuing:', envError);
        }

        // Trigger initial deployment by making a small commit
        try {
          await this.triggerInitialDeployment(appId, repoUrl);
        } catch (deployError) {
          console.warn('Failed to trigger initial deployment, user can push manually:', deployError);
        }
      }
      
      return result;
    } catch (error) {
      console.error("Failed to connect GitHub repo to Vercel:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Deploy from Git repository
   */
  async deployFromGit(options: {
    projectId: string;
    teamId?: string;
    gitSource: {
      type: 'github' | 'gitlab' | 'bitbucket';
      repo: string;
      ref?: string;
    };
    target?: 'production' | 'staging';
  }): Promise<VercelDeployment> {
    if (!this.isAuthenticated()) {
      throw new Error("Not authenticated");
    }

    try {
      const { electronAPI } = window as any;
      const response = await electronAPI.vercel.deployFromGit(options, this.accessToken!);
      
      if (!response.ok) {
        throw new Error(`Failed to create deployment: ${response.data?.error?.message || response.statusText}`);
      }

      return response.data;
    } catch (error) {
      console.error("Failed to deploy to Vercel:", error);
      throw error;
    }
  }

  /**
   * Set environment variables
   */
  async setEnvironmentVariables(options: {
    projectId: string;
    teamId?: string;
    environmentVariables: Array<{
      key: string;
      value: string;
      target: ('production' | 'preview' | 'development')[];
      type?: 'plain' | 'secret';
    }>;
  }): Promise<void> {
    if (!this.isAuthenticated()) {
      throw new Error("Not authenticated");
    }

    try {
      const { electronAPI } = window as any;
      const result = await electronAPI.vercel.setEnvironmentVariables(
        options.projectId, 
        options.teamId, 
        options.environmentVariables, 
        this.accessToken!
      );
      
      if (!result.success) {
        throw new Error('Failed to set environment variables');
      }
    } catch (error) {
      console.error("Failed to set Vercel environment variables:", error);
      throw error;
    }
  }

  /**
   * Trigger initial deployment by making a small commit to the repository
   */
  private async triggerInitialDeployment(appId: number, repoUrl: string): Promise<void> {
    try {
      const { showInfo } = await import('@/utils/toast');
      const { resolveAppPaths } = await import('@/utils/appPathResolver');
      const { default: useAppStore } = await import('@/stores/appStore');
      
      showInfo('🔄 Triggering initial deployment...');
      
      const { currentApp } = useAppStore.getState();
      if (!currentApp) {
        throw new Error('No current app available');
      }

      const { filesPath } = await resolveAppPaths(currentApp);
      const { fs, path } = window.electronAPI as any;
      
      // Check if README exists, if not create one
      const readmePath = await path.join(filesPath, 'README.md');
      let readmeExists = false;
      
      try {
        await fs.readFile(readmePath);
        readmeExists = true;
      } catch {
        // README doesn't exist, create a basic one
        const defaultReadme = `# ${currentApp.name}

This project was created with Prestige AI.

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## Deployment

This project is automatically deployed to Vercel when changes are pushed to the main branch.
`;
        await fs.writeFile(readmePath, defaultReadme);
        showInfo('📝 Created README.md file');
      }
      
      // If README exists, make a small change to trigger deployment
      if (readmeExists) {
        const content = await fs.readFile(readmePath);
        const lines = content.split('\n');
        
        // Add deployment timestamp to end of file (or update existing one)
        const deploymentLine = `\n<!-- Deployment triggered: ${new Date().toISOString()} -->`;
        const existingDeploymentIndex = lines.findIndex(line => line.includes('<!-- Deployment triggered:'));
        
        if (existingDeploymentIndex >= 0) {
          lines[existingDeploymentIndex] = deploymentLine.trim();
        } else {
          lines.push(deploymentLine.trim());
        }
        
        await fs.writeFile(readmePath, lines.join('\n'));
        showInfo('📝 Updated README.md to trigger deployment');
      }
      
      // Git operations to commit and push
      const { electronAPI } = window as any;
      
      // Add the README file
      await electronAPI.git.add(filesPath, ['README.md']);
      
      // Commit the change
      const commitMessage = readmeExists 
        ? 'chore: trigger initial Vercel deployment'
        : 'docs: add README.md and trigger initial deployment';
        
      await electronAPI.git.commit(filesPath, commitMessage);
      
      // Push to trigger deployment
      await electronAPI.git.push(filesPath);
      
      showInfo('🚀 Initial deployment triggered! Check Vercel dashboard for progress.');
      
    } catch (error) {
      console.error('Failed to trigger initial deployment:', error);
      throw error;
    }
  }
}

export const vercelService = VercelService.getInstance();