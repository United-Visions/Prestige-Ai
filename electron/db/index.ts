import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

// Helper to get the appropriate database path
function getDatabasePath(): string {
  // Get desktop path and create prestige-ai folder
  const desktopPath = app.getPath('desktop');
  const prestigeAIPath = path.join(desktopPath, 'prestige-ai');
  
  // Ensure prestige-ai directory exists
  if (!fs.existsSync(prestigeAIPath)) {
    fs.mkdirSync(prestigeAIPath, { recursive: true });
  }
  
  return path.join(prestigeAIPath, 'prestige-ai.db');
}

// Database instance
let database: Database.Database | null = null;
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function initializeDatabase(): ReturnType<typeof drizzle<typeof schema>> {
  if (db) {
    return db;
  }

  const dbPath = getDatabasePath();
  
  // Ensure directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  database = new Database(dbPath);
  db = drizzle(database, { schema });

  // Enable foreign keys
  database.pragma('foreign_keys = ON');

// Define a constant for the migrations folder
const MIGRATIONS_FOLDER = 'electron/db/drizzle';

// ... (rest of the code)

// Run migrations if needed
try {
  // Construct the absolute path to the migrations folder
  const migrationsPath = path.join(process.cwd(), MIGRATIONS_FOLDER);
  
  // Check if the migrations folder exists
  if (fs.existsSync(migrationsPath)) {
    migrate(db, { migrationsFolder: migrationsPath });
    console.log('Migrations applied successfully.');
  } else {
    console.warn(`Migrations folder not found at: ${migrationsPath}`);
  }
} catch (error) {
  console.error('Migration failed:', error);
}  return db;
}

export function getDatabase() {
  if (!db) {
    return initializeDatabase();
  }
  return db;
}

export function closeDatabase() {
  if (database) {
    database.close();
    database = null;
    db = null;
  }
}

export { schema };
export default getDatabase;