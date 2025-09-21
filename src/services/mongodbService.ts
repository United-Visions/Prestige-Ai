import { z } from 'zod';

// Placeholder for MongoDB connection details
export const MongoDbConnectionSchema = z.object({
  connectionString: z.string().optional(),
});

export type MongoDbConnection = z.infer<typeof MongoDbConnectionSchema>;

export class MongoDBService {
  private static instance: MongoDBService;
  private connection: MongoDbConnection | null = null;
  private memServer: any | null = null;

  private constructor() {
    // In a real implementation, we would load the connection details from a secure store.
  }

  public static getInstance(): MongoDBService {
    if (!MongoDBService.instance) {
      MongoDBService.instance = new MongoDBService();
    }
    return MongoDBService.instance;
  }

  public async setConnection(connection: MongoDbConnection): Promise<void> {
    this.connection = connection;
    // In a real implementation, we would save the connection details to a secure store.
  }

  public isAuthenticated(): boolean {
    return this.connection !== null && this.connection.connectionString !== undefined;
  }

  public getConnection(): MongoDbConnection | null {
    return this.connection;
  }

  public logout(): void {
    this.connection = null;
    // In a real implementation, we would clear the connection details from the secure store.
  }

  /**
   * Ensure a local ephemeral MongoDB is available using mongodb-memory-server.
   * If successful, sets the connection string on this service and returns it.
   * If mongodb-memory-server isn't installed or startup fails, returns null.
   */
  public async ensureLocalEphemeral(): Promise<string | null> {
    if (this.isAuthenticated() && this.connection?.connectionString) {
      return this.connection.connectionString;
    }

    try {
      const res = await (window as any).electronAPI.mongo.startEphemeral();
      if (res?.ok && res?.uri) {
        await this.setConnection({ connectionString: res.uri });
        return res.uri;
      }
      throw new Error(res?.error || 'Failed to start ephemeral MongoDB');
    } catch (err) {
      // Package might be missing or startup failed; fail soft
      console.warn('mongodb-memory-server unavailable or failed to start:', err);
      return null;
    }
  }

  /**
   * Stop the local ephemeral MongoDB instance if running.
   */
  public async stopLocalEphemeral(): Promise<void> {
    try {
      await (window as any).electronAPI.mongo.stopEphemeral();
    } catch (err) {
      console.warn('Failed to stop mongodb-memory-server:', err);
    } finally {
      this.memServer = null;
    }
  }
}
