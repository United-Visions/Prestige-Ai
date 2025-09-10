import { z } from 'zod';

// GitHub schemas
export const GitHubUserSchema = z.object({
  email: z.string(),
  username: z.string().optional(),
  name: z.string().optional(),
});
export type GitHubUser = z.infer<typeof GitHubUserSchema>;

export const GitHubRepoSchema = z.object({
  name: z.string(),
  fullName: z.string(),
  description: z.string().nullable(),
  private: z.boolean(),
  htmlUrl: z.string(),
  cloneUrl: z.string(),
  sshUrl: z.string(),
});
export type GitHubRepo = z.infer<typeof GitHubRepoSchema>;

// GitHub Device Flow Constants
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || "Ov23liWV2HdC0RBLecWx";
const GITHUB_DEVICE_CODE_URL = "https://github.com/login/device/code";
const GITHUB_ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_API_BASE = "https://api.github.com";
const GITHUB_SCOPES = "repo,user,workflow";

// Device flow state
interface DeviceFlowState {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  interval: number;
  isPolling: boolean;
  timeoutId: NodeJS.Timeout | null;
}

let currentFlowState: DeviceFlowState | null = null;

export class GitHubService {
  private static instance: GitHubService;
  private accessToken: string | null = null;

  static getInstance(): GitHubService {
    if (!GitHubService.instance) {
      GitHubService.instance = new GitHubService();
    }
    return GitHubService.instance;
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
   * Start GitHub Device Flow authentication
   */
  async startDeviceFlow(): Promise<{
    userCode: string;
    verificationUri: string;
    interval: number;
  }> {
    try {
      const response = await fetch(GITHUB_DEVICE_CODE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          scope: GITHUB_SCOPES,
        }),
      });

      if (!response.ok) {
        throw new Error(`GitHub device flow failed: ${response.statusText}`);
      }

      const data = await response.json();

      currentFlowState = {
        deviceCode: data.device_code,
        userCode: data.user_code,
        verificationUri: data.verification_uri,
        interval: data.interval,
        isPolling: false,
        timeoutId: null,
      };

      return {
        userCode: data.user_code,
        verificationUri: data.verification_uri,
        interval: data.interval,
      };
    } catch (error) {
      console.error("Failed to start GitHub device flow:", error);
      throw error;
    }
  }

  /**
   * Start polling for access token
   */
  async startPolling(): Promise<string> {
    if (!currentFlowState) {
      throw new Error("No active device flow");
    }

    return new Promise((resolve, reject) => {
      currentFlowState!.isPolling = true;

      const pollForToken = async () => {
        if (!currentFlowState || !currentFlowState.isPolling) {
          reject(new Error("Polling stopped"));
          return;
        }

        try {
          const response = await fetch(GITHUB_ACCESS_TOKEN_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              client_id: GITHUB_CLIENT_ID,
              device_code: currentFlowState.deviceCode,
              grant_type: "urn:ietf:params:oauth:grant-type:device_code",
            }),
          });

          const data = await response.json();

          if (response.ok && data.access_token) {
            this.setAccessToken(data.access_token);
            this.stopPolling();
            resolve(data.access_token);
            return;
          }

          if (data.error) {
            switch (data.error) {
              case "authorization_pending":
                // Continue polling
                currentFlowState.timeoutId = setTimeout(
                  pollForToken,
                  currentFlowState.interval * 1000
                );
                break;
              case "slow_down":
                currentFlowState.interval += 5;
                currentFlowState.timeoutId = setTimeout(
                  pollForToken,
                  currentFlowState.interval * 1000
                );
                break;
              case "expired_token":
              case "access_denied":
                this.stopPolling();
                reject(new Error(`GitHub OAuth error: ${data.error}`));
                break;
              default:
                this.stopPolling();
                reject(new Error(`GitHub OAuth error: ${data.error}`));
            }
          }
        } catch (error) {
          this.stopPolling();
          reject(error);
        }
      };

      // Start polling immediately
      pollForToken();
    });
  }

  /**
   * Stop polling for access token
   */
  stopPolling() {
    if (currentFlowState) {
      currentFlowState.isPolling = false;
      if (currentFlowState.timeoutId) {
        clearTimeout(currentFlowState.timeoutId);
        currentFlowState.timeoutId = null;
      }
    }
  }

  /**
   * Get authenticated user information
   */
  async getUser(): Promise<GitHubUser | null> {
    if (!this.isAuthenticated()) {
      return null;
    }

    try {
      const response = await fetch(`${GITHUB_API_BASE}/user`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get user: ${response.statusText}`);
      }

      const userData = await response.json();

      // Get primary email
      const emailResponse = await fetch(`${GITHUB_API_BASE}/user/emails`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      let primaryEmail = userData.email;
      if (emailResponse.ok) {
        const emails = await emailResponse.json();
        const primaryEmailObj = emails.find((email: any) => email.primary);
        if (primaryEmailObj) {
          primaryEmail = primaryEmailObj.email;
        }
      }

      return {
        email: primaryEmail || '',
        username: userData.login,
        name: userData.name,
      };
    } catch (error) {
      console.error("Failed to get GitHub user:", error);
      return null;
    }
  }

  /**
   * Get user repositories
   */
  async getRepositories(): Promise<GitHubRepo[]> {
    if (!this.isAuthenticated()) {
      throw new Error("Not authenticated");
    }

    try {
      const response = await fetch(`${GITHUB_API_BASE}/user/repos?sort=updated&per_page=100`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get repositories: ${response.statusText}`);
      }

      const repos = await response.json();

      return repos.map((repo: any) => ({
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        private: repo.private,
        htmlUrl: repo.html_url,
        cloneUrl: repo.clone_url,
        sshUrl: repo.ssh_url,
      }));
    } catch (error) {
      console.error("Failed to get repositories:", error);
      throw error;
    }
  }

  /**
   * Create a new repository
   */
  async createRepository(name: string, options: {
    description?: string;
    private?: boolean;
    autoInit?: boolean;
  } = {}): Promise<GitHubRepo> {
    if (!this.isAuthenticated()) {
      throw new Error("Not authenticated");
    }

    try {
      const response = await fetch(`${GITHUB_API_BASE}/user/repos`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description: options.description || '',
          private: options.private || false,
          auto_init: options.autoInit || true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to create repository: ${error.message || response.statusText}`);
      }

      const repo = await response.json();

      return {
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        private: repo.private,
        htmlUrl: repo.html_url,
        cloneUrl: repo.clone_url,
        sshUrl: repo.ssh_url,
      };
    } catch (error) {
      console.error("Failed to create repository:", error);
      throw error;
    }
  }

  /**
   * Delete repository
   */
  async deleteRepository(owner: string, repo: string): Promise<void> {
    if (!this.isAuthenticated()) {
      throw new Error("Not authenticated");
    }

    try {
      const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete repository: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Failed to delete repository:", error);
      throw error;
    }
  }

  /**
   * Get current user (alias for getUser)
   */
  async getCurrentUser(): Promise<GitHubUser | null> {
    return this.getUser();
  }

  /**
   * Authenticate with device flow (alias for startDeviceFlow)
   */
  async authenticateWithDeviceFlow(): Promise<string> {
    const deviceFlow = await this.startDeviceFlow();
    return this.startPolling();
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
  logout() {
    this.accessToken = null;
    this.stopPolling();
  }
}

export const githubService = GitHubService.getInstance();