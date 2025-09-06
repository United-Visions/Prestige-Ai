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

  static getInstance(): VercelService {
    if (!VercelService.instance) {
      VercelService.instance = new VercelService();
    }
    return VercelService.instance;
  }

  setAccessToken(token: string) {
    this.accessToken = token;
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
      const response = await fetch(`${VERCEL_API_BASE}/v2/user`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

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
      const response = await fetch(`${VERCEL_API_BASE}/v2/user`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get user: ${response.statusText}`);
      }

      const userData = await response.json();
      return userData.user;
    } catch (error) {
      console.error("Failed to get Vercel user:", error);
      return null;
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
      let url = `${VERCEL_API_BASE}/v10/projects`;
      if (options.teamId) {
        url += `?teamId=${options.teamId}`;
      }

      const projectData: any = {
        name: options.name,
      };

      if (options.framework) {
        projectData.framework = options.framework;
      }

      if (options.gitRepository) {
        projectData.gitRepository = options.gitRepository;
      }

      if (options.buildCommand) {
        projectData.buildCommand = options.buildCommand;
      }

      if (options.devCommand) {
        projectData.devCommand = options.devCommand;
      }

      if (options.outputDirectory) {
        projectData.outputDirectory = options.outputDirectory;
      }

      if (options.rootDirectory) {
        projectData.rootDirectory = options.rootDirectory;
      }

      if (options.environmentVariables) {
        projectData.environmentVariables = options.environmentVariables;
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(projectData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to create project: ${error.error?.message || response.statusText}`);
      }

      const project = await response.json();
      return project;
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
      let url = `${VERCEL_API_BASE}/v13/deployments`;
      if (options.teamId) {
        url += `?teamId=${options.teamId}`;
      }

      const deploymentData: any = {
        name: options.projectId,
        project: options.projectId,
        gitSource: options.gitSource,
        target: options.target || 'staging',
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(deploymentData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to create deployment: ${error.error?.message || response.statusText}`);
      }

      const deployment = await response.json();
      return deployment;
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
      let url = `${VERCEL_API_BASE}/v10/projects/${options.projectId}/env`;
      if (options.teamId) {
        url += `?teamId=${options.teamId}`;
      }

      // Create environment variables one by one
      for (const envVar of options.environmentVariables) {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            key: envVar.key,
            value: envVar.value,
            target: envVar.target,
            type: envVar.type || 'plain',
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(`Failed to set environment variable ${envVar.key}: ${error.error?.message || response.statusText}`);
        }
      }
    } catch (error) {
      console.error("Failed to set Vercel environment variables:", error);
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
   * Logout and clear access token
   */
  logout() {
    this.accessToken = null;
  }
}

export const vercelService = VercelService.getInstance();