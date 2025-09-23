import mongoose from 'mongoose';

interface MongoDBConnection {
  isConnected: boolean;
  connection: typeof mongoose | null;
  uri: string | null;
}

class DatabaseManager {
  private static instance: DatabaseManager;
  private connection: MongoDBConnection = {
    isConnected: false,
    connection: null,
    uri: null
  };

  private constructor() {}

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  async connect(uri?: string): Promise<typeof mongoose> {
    try {
      // If already connected, return existing connection
      if (this.connection.isConnected && this.connection.connection) {
        return this.connection.connection;
      }

      let connectionUri = uri;

      // If no URI provided, try to get from environment or start local MongoDB
      if (!connectionUri) {
        connectionUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
        
        if (!connectionUri) {
          // Start local in-memory MongoDB for development
          connectionUri = await this.startLocalMongoDB();
        }
      }

      console.log('Connecting to MongoDB...');
      const connection = await mongoose.connect(connectionUri);

      this.connection = {
        isConnected: true,
        connection,
        uri: connectionUri
      };

      console.log('✅ MongoDB connected successfully');
      return connection;

    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      throw new Error(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async startLocalMongoDB(): Promise<string> {
    try {
      // Check if we're in a browser environment
      if (typeof window !== 'undefined') {
        throw new Error('Cannot start MongoDB in browser environment');
      }

      // Dynamic import to avoid bundling issues
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      
      console.log('Starting in-memory MongoDB server...');
      const mongod = await MongoMemoryServer.create({
        instance: {
          port: 27017, // Try to use standard port if available
          dbName: 'prestige_dev'
        }
      });

      const uri = mongod.getUri();
      console.log('✅ In-memory MongoDB started:', uri);
      
      return uri;
    } catch (error) {
      console.error('Failed to start local MongoDB:', error);
      // Fallback to a basic connection string that might work
      return 'mongodb://localhost:27017/prestige_fallback';
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.connection.isConnected && this.connection.connection) {
        await this.connection.connection.disconnect();
        this.connection = {
          isConnected: false,
          connection: null,
          uri: null
        };
        console.log('MongoDB disconnected');
      }
    } catch (error) {
      console.error('Error disconnecting from MongoDB:', error);
    }
  }

  isConnected(): boolean {
    return this.connection.isConnected;
  }

  getConnection(): typeof mongoose | null {
    return this.connection.connection;
  }

  getUri(): string | null {
    return this.connection.uri;
  }
}

// Export singleton instance
export const dbManager = DatabaseManager.getInstance();

// Convenience functions
export const connectDB = (uri?: string) => dbManager.connect(uri);
export const disconnectDB = () => dbManager.disconnect();
export const isDBConnected = () => dbManager.isConnected();

// Auto-connect when module is imported (for development convenience)
if (typeof window === 'undefined') {
  // Only auto-connect in Node.js environment (not browser)
  connectDB().catch(console.error);
}