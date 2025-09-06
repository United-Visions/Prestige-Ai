import { z } from 'zod';

// Supabase schemas
export const SupabaseProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  organization: z.object({
    id: z.string(),
    name: z.string(),
  }),
  database: z.object({
    host: z.string(),
    version: z.string(),
  }),
  status: z.string(),
  inserted_at: z.string(),
});
export type SupabaseProject = z.infer<typeof SupabaseProjectSchema>;

export const SupabaseOrganizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  billing_email: z.string(),
  tier: z.string(),
});
export type SupabaseOrganization = z.infer<typeof SupabaseOrganizationSchema>;

// Supabase OAuth constants
const SUPABASE_CLIENT_ID = process.env.SUPABASE_CLIENT_ID || "your-supabase-client-id";
const SUPABASE_OAUTH_URL = "https://supabase.com/dashboard/oauth/authorize";
const SUPABASE_TOKEN_URL = "https://supabase.com/dashboard/oauth/token";
const SUPABASE_API_BASE = "https://api.supabase.com/v1";

// Device flow state for Supabase
interface SupabaseAuthState {
  state: string;
  codeVerifier: string;
  isPolling: boolean;
  timeoutId: NodeJS.Timeout | null;
}

let currentAuthState: SupabaseAuthState | null = null;

export class SupabaseService {
  private static instance: SupabaseService;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private expiresAt: number | null = null;

  static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  setTokens(accessToken: string, refreshToken: string, expiresIn: number) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.expiresAt = Date.now() + (expiresIn * 1000);
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  isAuthenticated(): boolean {
    return !!this.accessToken && (this.expiresAt ? Date.now() < this.expiresAt : true);
  }

  /**
   * Generate a random string for state parameter
   */
  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate code verifier for PKCE
   */
  private generateCodeVerifier(): string {
    return this.generateRandomString(128);
  }

  /**
   * Generate code challenge from verifier
   */
  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Start Supabase OAuth flow
   */
  async startOAuthFlow(): Promise<{
    authUrl: string;
    state: string;
  }> {
    try {
      const state = this.generateRandomString(32);
      const codeVerifier = this.generateCodeVerifier();
      const codeChallenge = await this.generateCodeChallenge(codeVerifier);

      currentAuthState = {
        state,
        codeVerifier,
        isPolling: false,
        timeoutId: null,
      };

      const params = new URLSearchParams({
        client_id: SUPABASE_CLIENT_ID,
        redirect_uri: 'http://localhost:3000/supabase-callback', // You'll need to set up local server
        response_type: 'code',
        scope: 'all',
        state: state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      });

      const authUrl = `${SUPABASE_OAUTH_URL}?${params.toString()}`;

      return {
        authUrl,
        state,
      };
    } catch (error) {
      console.error("Failed to start Supabase OAuth flow:", error);
      throw error;
    }
  }

  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback(code: string, state: string): Promise<void> {
    if (!currentAuthState || currentAuthState.state !== state) {
      throw new Error("Invalid state parameter");
    }

    try {
      const response = await fetch(SUPABASE_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: SUPABASE_CLIENT_ID,
          code: code,
          redirect_uri: 'http://localhost:3000/supabase-callback',
          code_verifier: currentAuthState.codeVerifier,
        }),
      });

      if (!response.ok) {
        throw new Error(`Supabase OAuth token exchange failed: ${response.statusText}`);
      }

      const data = await response.json();

      this.setTokens(data.access_token, data.refresh_token, data.expires_in);
      
      // Clear auth state
      currentAuthState = null;
    } catch (error) {
      console.error("Failed to handle Supabase OAuth callback:", error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error("No refresh token available");
    }

    try {
      const response = await fetch(SUPABASE_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: SUPABASE_CLIENT_ID,
          refresh_token: this.refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to refresh token: ${response.statusText}`);
      }

      const data = await response.json();
      this.setTokens(data.access_token, data.refresh_token, data.expires_in);
    } catch (error) {
      console.error("Failed to refresh Supabase token:", error);
      throw error;
    }
  }

  /**
   * Ensure token is valid (refresh if necessary)
   */
  private async ensureValidToken(): Promise<void> {
    if (!this.isAuthenticated() && this.refreshToken) {
      await this.refreshAccessToken();
    }
  }

  /**
   * Get organizations
   */
  async getOrganizations(): Promise<SupabaseOrganization[]> {
    await this.ensureValidToken();
    
    if (!this.isAuthenticated()) {
      throw new Error("Not authenticated");
    }

    try {
      const response = await fetch(`${SUPABASE_API_BASE}/organizations`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get organizations: ${response.statusText}`);
      }

      const organizations = await response.json();
      return organizations;
    } catch (error) {
      console.error("Failed to get Supabase organizations:", error);
      throw error;
    }
  }

  /**
   * Get projects
   */
  async getProjects(): Promise<SupabaseProject[]> {
    await this.ensureValidToken();
    
    if (!this.isAuthenticated()) {
      throw new Error("Not authenticated");
    }

    try {
      const response = await fetch(`${SUPABASE_API_BASE}/projects`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get projects: ${response.statusText}`);
      }

      const projects = await response.json();
      return projects;
    } catch (error) {
      console.error("Failed to get Supabase projects:", error);
      throw error;
    }
  }

  /**
   * Create a new project
   */
  async createProject(options: {
    name: string;
    organizationId: string;
    plan?: string;
    region?: string;
    dbPass?: string;
  }): Promise<SupabaseProject> {
    await this.ensureValidToken();
    
    if (!this.isAuthenticated()) {
      throw new Error("Not authenticated");
    }

    try {
      const response = await fetch(`${SUPABASE_API_BASE}/projects`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: options.name,
          organization_id: options.organizationId,
          plan: options.plan || 'free',
          region: options.region || 'us-east-1',
          db_pass: options.dbPass || this.generateRandomString(16),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to create project: ${error.message || response.statusText}`);
      }

      const project = await response.json();
      return project;
    } catch (error) {
      console.error("Failed to create Supabase project:", error);
      throw error;
    }
  }

  /**
   * Delete a project
   */
  async deleteProject(projectId: string): Promise<void> {
    await this.ensureValidToken();
    
    if (!this.isAuthenticated()) {
      throw new Error("Not authenticated");
    }

    try {
      const response = await fetch(`${SUPABASE_API_BASE}/projects/${projectId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete project: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Failed to delete Supabase project:", error);
      throw error;
    }
  }

  /**
   * Get project details
   */
  async getProject(projectId: string): Promise<SupabaseProject> {
    await this.ensureValidToken();
    
    if (!this.isAuthenticated()) {
      throw new Error("Not authenticated");
    }

    try {
      const response = await fetch(`${SUPABASE_API_BASE}/projects/${projectId}`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get project: ${response.statusText}`);
      }

      const project = await response.json();
      return project;
    } catch (error) {
      console.error("Failed to get Supabase project:", error);
      throw error;
    }
  }

  /**
   * Get project API keys
   */
  async getProjectApiKeys(projectId: string): Promise<{
    anon_key: string;
    service_role_key: string;
  }> {
    await this.ensureValidToken();
    
    if (!this.isAuthenticated()) {
      throw new Error("Not authenticated");
    }

    try {
      const response = await fetch(`${SUPABASE_API_BASE}/projects/${projectId}/api-keys`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get project API keys: ${response.statusText}`);
      }

      const keys = await response.json();
      return keys;
    } catch (error) {
      console.error("Failed to get Supabase project API keys:", error);
      throw error;
    }
  }

  /**
   * Logout and clear tokens
   */
  logout() {
    this.accessToken = null;
    this.refreshToken = null;
    this.expiresAt = null;
    
    if (currentAuthState) {
      if (currentAuthState.timeoutId) {
        clearTimeout(currentAuthState.timeoutId);
      }
      currentAuthState = null;
    }
  }
}

export const supabaseService = SupabaseService.getInstance();