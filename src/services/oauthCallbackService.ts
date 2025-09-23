/**
 * OAuth Callback Service
 * Handles OAuth callbacks for GitHub, Supabase, and Vercel integrations
 */

import { tokenStorageService } from './tokenStorageService';

export interface OAuthCallbackResult {
  success: boolean;
  provider: 'github' | 'supabase' | 'vercel';
  user?: any;
  error?: string;
}

class OAuthCallbackService {
  private static instance: OAuthCallbackService;
  private callbackServer: any = null;
  private pendingCallbacks = new Map<string, (result: OAuthCallbackResult) => void>();

  private constructor() {}

  public static getInstance(): OAuthCallbackService {
    if (!OAuthCallbackService.instance) {
      OAuthCallbackService.instance = new OAuthCallbackService();
    }
    return OAuthCallbackService.instance;
  }

  /**
   * Start a local callback server to handle OAuth redirects
   */
  async startCallbackServer(port: number = 8080): Promise<void> {
    // This would typically use Node.js http server in an Electron environment
    // For web environment, we'll use a different approach
    
    if (typeof window !== 'undefined') {
      // In browser environment, listen for postMessage from popup
      this.setupBrowserCallbackListener();
    } else {
      // In Electron/Node environment, start actual HTTP server
      await this.setupNodeCallbackServer(port);
    }
  }

  /**
   * Setup browser-based callback handling using postMessage
   */
  private setupBrowserCallbackListener(): void {
    window.addEventListener('message', (event) => {
      // Verify origin for security
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data.type === 'OAUTH_CALLBACK') {
        const { provider, code, state, error } = event.data;
        this.handleCallback(provider, { code, state, error });
      }
    });
  }

  /**
   * Setup Node.js HTTP server for OAuth callbacks (Electron)
   */
  private async setupNodeCallbackServer(port: number): Promise<void> {
    // This would be implemented in an Electron main process
    // For now, we'll just log the setup
    console.log(`OAuth callback server would be started on port ${port}`);
    
    // Example implementation:
    // const http = require('http');
    // const url = require('url');
    // 
    // this.callbackServer = http.createServer((req, res) => {
    //   const parsedUrl = url.parse(req.url, true);
    //   const query = parsedUrl.query;
    //   
    //   if (parsedUrl.pathname === '/auth/github/callback') {
    //     this.handleGitHubCallback(query, res);
    //   } else if (parsedUrl.pathname === '/auth/supabase/callback') {
    //     this.handleSupabaseCallback(query, res);
    //   } else if (parsedUrl.pathname === '/auth/vercel/callback') {
    //     this.handleVercelCallback(query, res);
    //   }
    // });
    // 
    // this.callbackServer.listen(port);
  }

  /**
   * Stop the callback server
   */
  stopCallbackServer(): void {
    if (this.callbackServer) {
      this.callbackServer.close();
      this.callbackServer = null;
    }
  }

  /**
   * Handle OAuth callback
   */
  private async handleCallback(
    provider: 'github' | 'supabase' | 'vercel',
    params: { code?: string; state?: string; error?: string }
  ): Promise<void> {
    try {
      if (params.error) {
        throw new Error(`OAuth error: ${params.error}`);
      }

      if (!params.code) {
        throw new Error('No authorization code received');
      }

      // Check for errors first
      if (params.error) {
        throw new Error(params.error);
      }

      // Validate required code parameter
      if (!params.code) {
        throw new Error('Authorization code is required');
      }

      let result: OAuthCallbackResult;

      switch (provider) {
        case 'github':
          result = await this.handleGitHubCallback({ code: params.code, state: params.state });
          break;
        case 'supabase':
          result = await this.handleSupabaseCallback({ code: params.code, state: params.state });
          break;
        case 'vercel':
          result = await this.handleVercelCallback({ code: params.code, state: params.state });
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      // Notify waiting callbacks
      const callbackId = `${provider}-${params.state}`;
      const pendingCallback = this.pendingCallbacks.get(callbackId);
      if (pendingCallback) {
        pendingCallback(result);
        this.pendingCallbacks.delete(callbackId);
      }

    } catch (error) {
      const errorResult: OAuthCallbackResult = {
        success: false,
        provider,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      const callbackId = `${provider}-${params.state}`;
      const pendingCallback = this.pendingCallbacks.get(callbackId);
      if (pendingCallback) {
        pendingCallback(errorResult);
        this.pendingCallbacks.delete(callbackId);
      }
    }
  }

  /**
   * Handle GitHub OAuth callback
   */
  private async handleGitHubCallback(params: { code: string; state?: string }): Promise<OAuthCallbackResult> {
    try {
      const clientId = process.env.GITHUB_CLIENT_ID || "Ov23liWV2HdC0RBLecWx";
      const clientSecret = process.env.GITHUB_CLIENT_SECRET;

      if (!clientSecret) {
        throw new Error('GitHub client secret not configured');
      }

      // Exchange code for access token
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code: params.code,
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error(`Token exchange failed: ${tokenResponse.statusText}`);
      }

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        throw new Error(`GitHub OAuth error: ${tokenData.error_description || tokenData.error}`);
      }

      // Get user information
      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!userResponse.ok) {
        throw new Error(`Failed to get user info: ${userResponse.statusText}`);
      }

      const user = await userResponse.json();

      // Get user email
      const emailResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      let primaryEmail = user.email;
      if (emailResponse.ok) {
        const emails = await emailResponse.json();
        const primaryEmailObj = emails.find((email: any) => email.primary);
        if (primaryEmailObj) {
          primaryEmail = primaryEmailObj.email;
        }
      }

      const userData = {
        email: primaryEmail || '',
        username: user.login,
        name: user.name,
        avatar: user.avatar_url,
      };

      // Store tokens
      await tokenStorageService.storeTokens('github', {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: tokenData.expires_in ? Date.now() + (tokenData.expires_in * 1000) : undefined,
        metadata: { user: userData }
      });

      return {
        success: true,
        provider: 'github',
        user: userData
      };

    } catch (error) {
      return {
        success: false,
        provider: 'github',
        error: error instanceof Error ? error.message : 'GitHub authentication failed'
      };
    }
  }

  /**
   * Handle Supabase OAuth callback
   */
  private async handleSupabaseCallback(params: { code: string; state?: string }): Promise<OAuthCallbackResult> {
    try {
      const clientId = process.env.SUPABASE_CLIENT_ID;
      const clientSecret = process.env.SUPABASE_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        throw new Error('Supabase OAuth credentials not configured');
      }

      // For Supabase, we need to handle PKCE flow differently
      // This is a simplified version - in production you'd need the code_verifier
      const tokenResponse = await fetch('https://supabase.com/dashboard/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: clientId,
          client_secret: clientSecret,
          code: params.code,
          redirect_uri: 'http://localhost:8080/auth/supabase/callback',
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error(`Supabase token exchange failed: ${tokenResponse.statusText}`);
      }

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        throw new Error(`Supabase OAuth error: ${tokenData.error_description || tokenData.error}`);
      }

      // Get projects
      const projectsResponse = await fetch('https://api.supabase.com/v1/projects', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
      });

      let projects = [];
      if (projectsResponse.ok) {
        projects = await projectsResponse.json();
      }

      // Store tokens
      await tokenStorageService.storeTokens('supabase', {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: tokenData.expires_in ? Date.now() + (tokenData.expires_in * 1000) : undefined,
        metadata: { projects }
      });

      return {
        success: true,
        provider: 'supabase',
        user: { projects }
      };

    } catch (error) {
      return {
        success: false,
        provider: 'supabase',
        error: error instanceof Error ? error.message : 'Supabase authentication failed'
      };
    }
  }

  /**
   * Handle Vercel OAuth callback
   */
  private async handleVercelCallback(params: { code: string; state?: string }): Promise<OAuthCallbackResult> {
    try {
      // Exchange code for access token
      const tokenResponse = await fetch('https://api.vercel.com/v2/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.VERCEL_CLIENT_ID || 'your_vercel_client_id',
          client_secret: process.env.VERCEL_CLIENT_SECRET || 'your_vercel_client_secret',
          code: params.code,
          redirect_uri: process.env.VERCEL_REDIRECT_URI || 'http://localhost:8080/auth/vercel/callback',
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to exchange code for token');
      }

      const tokenData = await tokenResponse.json();
      
      if (tokenData.error) {
        throw new Error(tokenData.error_description || tokenData.error);
      }

      // Store the access token securely
      const tokenStorage = (await import('./tokenStorageService')).tokenStorageService;
      await tokenStorage.storeTokens('vercel', {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: tokenData.expires_in ? Date.now() + (tokenData.expires_in * 1000) : undefined
      });

      // Set token in Vercel service
      const vercelService = (await import('./vercelService')).vercelService;
      vercelService.setAccessToken(tokenData.access_token);

      // Get user info to confirm authentication
      const user = await vercelService.getUser();

      return {
        success: true,
        provider: 'vercel',
        user: user ? {
          id: user.id,
          email: user.email,
          name: user.name
        } : undefined
      };

    } catch (error) {
      return {
        success: false,
        provider: 'vercel',
        error: error instanceof Error ? error.message : 'Vercel authentication failed'
      };
    }
  }

  /**
   * Wait for OAuth callback
   */
  waitForCallback(provider: 'github' | 'supabase' | 'vercel', state: string): Promise<OAuthCallbackResult> {
    return new Promise((resolve) => {
      const callbackId = `${provider}-${state}`;
      this.pendingCallbacks.set(callbackId, resolve);

      // Set timeout to prevent hanging
      setTimeout(() => {
        if (this.pendingCallbacks.has(callbackId)) {
          this.pendingCallbacks.delete(callbackId);
          resolve({
            success: false,
            provider,
            error: 'Authentication timeout'
          });
        }
      }, 300000); // 5 minutes timeout
    });
  }

  /**
   * Open OAuth popup window
   */
  openAuthPopup(url: string, provider: string): Window | null {
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      url,
      `${provider}-oauth`,
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    // Monitor popup for URL changes (simplified version)
    if (popup) {
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          // Handle popup closed without completion
        }
      }, 1000);
    }

    return popup;
  }

  /**
   * Generate a secure random state parameter
   */
  generateState(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
}

export const oauthCallbackService = OAuthCallbackService.getInstance();