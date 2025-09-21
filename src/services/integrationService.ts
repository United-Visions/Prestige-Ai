import { GitHubService } from './githubService';
import { SupabaseService } from './supabaseService';
import { MongoDBService } from './mongodbService';
import { VercelService } from './vercelService';

export type SupportedDatabase = 'supabase' | 'mongodb';

class IntegrationService {
  private static instance: IntegrationService;

  private constructor() {}

  public static getInstance(): IntegrationService {
    if (!IntegrationService.instance) {
      IntegrationService.instance = new IntegrationService();
    }
    return IntegrationService.instance;
  }

  public async getConnectedDatabase(): Promise<SupportedDatabase | null> {
    // Prefer MongoDB as the default database if available
    const mongodb = MongoDBService.getInstance();
    if (mongodb.isAuthenticated()) {
      return 'mongodb';
    }

    const supabase = SupabaseService.getInstance();
    if (supabase.isAuthenticated()) {
      return 'supabase';
    }

    return null;
  }

  public async isGitHubConnected(): Promise<boolean> {
    return GitHubService.getInstance().isAuthenticated();
  }

  public async isVercelConnected(): Promise<boolean> {
    return VercelService.getInstance().isAuthenticated();
  }
}

export const integrationService = IntegrationService.getInstance();
