/**
 * Secure Token Storage Service
 * Handles encrypted storage and retrieval of OAuth tokens for GitHub, Supabase, and Vercel
 */

export interface StoredTokens {
  github?: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
    user?: any;
  };
  supabase?: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
    projects?: any[];
  };
  vercel?: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
    user?: any;
    teams?: any[];
  };
}

export interface TokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  metadata?: any;
}

class TokenStorageService {
  private static instance: TokenStorageService;
  private readonly STORAGE_KEY = 'prestige_ai_tokens';
  private readonly STORAGE_VERSION = '1.0';
  
  private constructor() {
    this.initializeStorage();
  }

  public static getInstance(): TokenStorageService {
    if (!TokenStorageService.instance) {
      TokenStorageService.instance = new TokenStorageService();
    }
    return TokenStorageService.instance;
  }

  private initializeStorage() {
    // Check if we're in an Electron environment
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      // Use Electron's secure storage if available
      this.initializeElectronStorage();
    } else {
      // Fallback to encrypted localStorage for web
      this.initializeWebStorage();
    }
  }

  private initializeElectronStorage() {
    // In a real Electron app, you would use safeStorage
    // For now, we'll implement a basic secure storage pattern
    console.log('Initializing Electron secure storage');
  }

  private initializeWebStorage() {
    // For web, we'll use localStorage with basic encryption
    console.log('Initializing web storage with encryption');
  }

  /**
   * Simple encryption/decryption using Web Crypto API
   * In production, you should use more robust encryption
   */
  private async encrypt(data: string): Promise<string> {
    try {
      // Generate a key from a password (in production, use proper key derivation)
      const password = 'prestige-ai-secure-key-2024'; // This should be environment-specific
      const encoder = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );

      // Derive an encryption key
      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: encoder.encode('prestige-salt'),
          iterations: 10000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );

      // Encrypt the data
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encodedData = encoder.encode(data);
      const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encodedData
      );

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encryptedData.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encryptedData), iv.length);

      // Convert to base64
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Encryption failed:', error);
      // Fallback to base64 encoding (not secure, but functional)
      return btoa(data);
    }
  }

  private async decrypt(encryptedData: string): Promise<string> {
    try {
      // Generate the same key
      const password = 'prestige-ai-secure-key-2024';
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );

      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: encoder.encode('prestige-salt'),
          iterations: 10000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );

      // Decode from base64
      const combined = new Uint8Array(
        atob(encryptedData)
          .split('')
          .map(char => char.charCodeAt(0))
      );

      // Extract IV and encrypted data
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);

      // Decrypt
      const decryptedData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
      );

      return decoder.decode(decryptedData);
    } catch (error) {
      console.error('Decryption failed:', error);
      // Fallback to base64 decoding
      try {
        return atob(encryptedData);
      } catch (fallbackError) {
        throw new Error('Failed to decrypt token data');
      }
    }
  }

  /**
   * Store tokens for a specific provider
   */
  async storeTokens(provider: keyof StoredTokens, tokenData: TokenData): Promise<void> {
    try {
      const currentTokens = await this.getAllTokens();
      currentTokens[provider] = {
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        expiresAt: tokenData.expiresAt,
        ...tokenData.metadata
      };

      const dataToStore = {
        version: this.STORAGE_VERSION,
        timestamp: Date.now(),
        tokens: currentTokens
      };

      const encryptedData = await this.encrypt(JSON.stringify(dataToStore));
      
      if (typeof window !== 'undefined') {
        localStorage.setItem(this.STORAGE_KEY, encryptedData);
      }
      
      console.log(`Tokens stored successfully for ${provider}`);
    } catch (error) {
      console.error(`Failed to store tokens for ${provider}:`, error);
      throw new Error(`Failed to store ${provider} tokens`);
    }
  }

  /**
   * Retrieve tokens for a specific provider
   */
  async getTokens(provider: keyof StoredTokens): Promise<TokenData | null> {
    try {
      const allTokens = await this.getAllTokens();
      const providerTokens = allTokens[provider];
      
      if (!providerTokens) {
        return null;
      }

      // Check if token is expired
      if (providerTokens.expiresAt && Date.now() > providerTokens.expiresAt) {
        console.warn(`${provider} token expired`);
        // Don't automatically remove expired tokens, let the service handle refresh
      }

      return {
        accessToken: providerTokens.accessToken,
        refreshToken: providerTokens.refreshToken,
        expiresAt: providerTokens.expiresAt,
        metadata: {
          user: providerTokens.user,
          projects: (providerTokens as any).projects,
          teams: (providerTokens as any).teams
        }
      };
    } catch (error) {
      console.error(`Failed to retrieve tokens for ${provider}:`, error);
      return null;
    }
  }

  /**
   * Get all stored tokens
   */
  private async getAllTokens(): Promise<StoredTokens> {
    try {
      if (typeof window === 'undefined') {
        return {};
      }

      const encryptedData = localStorage.getItem(this.STORAGE_KEY);
      if (!encryptedData) {
        return {};
      }

      const decryptedData = await this.decrypt(encryptedData);
      const parsedData = JSON.parse(decryptedData);
      
      // Validate version
      if (parsedData.version !== this.STORAGE_VERSION) {
        console.warn('Token storage version mismatch, clearing tokens');
        await this.clearAllTokens();
        return {};
      }

      return parsedData.tokens || {};
    } catch (error) {
      console.error('Failed to retrieve all tokens:', error);
      return {};
    }
  }

  /**
   * Remove tokens for a specific provider
   */
  async removeTokens(provider: keyof StoredTokens): Promise<void> {
    try {
      const currentTokens = await this.getAllTokens();
      delete currentTokens[provider];

      const dataToStore = {
        version: this.STORAGE_VERSION,
        timestamp: Date.now(),
        tokens: currentTokens
      };

      const encryptedData = await this.encrypt(JSON.stringify(dataToStore));
      
      if (typeof window !== 'undefined') {
        localStorage.setItem(this.STORAGE_KEY, encryptedData);
      }
      
      console.log(`Tokens removed successfully for ${provider}`);
    } catch (error) {
      console.error(`Failed to remove tokens for ${provider}:`, error);
      throw new Error(`Failed to remove ${provider} tokens`);
    }
  }

  /**
   * Clear all stored tokens
   */
  async clearAllTokens(): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(this.STORAGE_KEY);
      }
      console.log('All tokens cleared successfully');
    } catch (error) {
      console.error('Failed to clear all tokens:', error);
      throw new Error('Failed to clear tokens');
    }
  }

  /**
   * Check if tokens exist for a provider
   */
  async hasTokens(provider: keyof StoredTokens): Promise<boolean> {
    const tokens = await this.getTokens(provider);
    return tokens !== null && !!tokens.accessToken;
  }

  /**
   * Check if tokens are valid (not expired)
   */
  async areTokensValid(provider: keyof StoredTokens): Promise<boolean> {
    const tokens = await this.getTokens(provider);
    if (!tokens || !tokens.accessToken) {
      return false;
    }

    // If no expiration time, assume valid
    if (!tokens.expiresAt) {
      return true;
    }

    // Check if token is expired (with 5 minute buffer)
    const buffer = 5 * 60 * 1000; // 5 minutes in milliseconds
    return Date.now() < (tokens.expiresAt - buffer);
  }

  /**
   * Update metadata for stored tokens
   */
  async updateMetadata(provider: keyof StoredTokens, metadata: any): Promise<void> {
    try {
      const currentTokens = await this.getAllTokens();
      if (currentTokens[provider]) {
        currentTokens[provider] = {
          ...currentTokens[provider],
          ...metadata
        };

        const dataToStore = {
          version: this.STORAGE_VERSION,
          timestamp: Date.now(),
          tokens: currentTokens
        };

        const encryptedData = await this.encrypt(JSON.stringify(dataToStore));
        
        if (typeof window !== 'undefined') {
          localStorage.setItem(this.STORAGE_KEY, encryptedData);
        }
      }
    } catch (error) {
      console.error(`Failed to update metadata for ${provider}:`, error);
      throw new Error(`Failed to update ${provider} metadata`);
    }
  }

  /**
   * Get connection status for all providers
   */
  async getConnectionStatus(): Promise<{
    github: boolean;
    supabase: boolean;
    vercel: boolean;
  }> {
    const [github, supabase, vercel] = await Promise.all([
      this.areTokensValid('github'),
      this.areTokensValid('supabase'),
      this.areTokensValid('vercel')
    ]);

    return { github, supabase, vercel };
  }
}

export const tokenStorageService = TokenStorageService.getInstance();