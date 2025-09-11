# Database Schema & Data Management

## Overview
CCDyad uses Drizzle ORM with SQLite for local data persistence, managing apps, chats, messages, providers, and user settings in a structured, type-safe manner.

## Database Configuration

### 1. Drizzle Configuration (`/drizzle.config.ts`)

**Database Setup:**
```typescript
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./migrations",
  driver: "better-sqlite3",
  dbCredentials: {
    url: "./ccdyad.db",
  },
  verbose: true,
  strict: true,
} satisfies Config;
```

### 2. Database Connection (`/src/db/db.ts`)

**Database Instance:**
```typescript
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

// Create SQLite database instance
const sqlite = new Database("ccdyad.db");

// Create Drizzle database with schema
export const db = drizzle(sqlite, { schema });

// Run migrations on startup
export function initializeDatabase() {
  try {
    migrate(db, { migrationsFolder: "./migrations" });
    console.log("Database migrations completed successfully");
  } catch (error) {
    console.error("Database migration failed:", error);
    throw error;
  }
}
```

## Core Schema Definitions

### 1. Apps Table (`/src/db/schema.ts`)

**Apps Schema:**
```typescript
import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const apps = sqliteTable("apps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  path: text("path").notNull().unique(),
  description: text("description"),
  framework: text("framework").default("react"),
  language: text("language").default("typescript"),
  githubUrl: text("github_url"),
  vercelUrl: text("vercel_url"),
  status: text("status").default("created"), // created, running, stopped, error
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export type App = typeof apps.$inferSelect;
export type NewApp = typeof apps.$inferInsert;
```

### 2. Chats Table

**Chat Sessions Schema:**
```typescript
export const chats = sqliteTable("chats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  appId: integer("app_id")
    .references(() => apps.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title").notNull(),
  mode: text("mode").default("build"), // build, ask, fix
  provider: text("provider").notNull(), // claude, openai, ollama, etc.
  model: text("model").notNull(),
  systemPrompt: text("system_prompt"),
  isActive: integer("is_active", { mode: "boolean" }).default(false),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export type Chat = typeof chats.$inferSelect;
export type NewChat = typeof chats.$inferInsert;
```

### 3. Messages Table

**Chat Messages Schema:**
```typescript
export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  chatId: integer("chat_id")
    .references(() => chats.id, { onDelete: "cascade" })
    .notNull(),
  role: text("role").notNull(), // user, assistant, system
  content: text("content").notNull(),
  metadata: text("metadata"), // JSON string for additional data
  tokens: integer("tokens"),
  cost: text("cost"), // Decimal as string for precision
  attachments: text("attachments"), // JSON array of file paths
  dyadTags: text("dyad_tags"), // JSON array of extracted dyad tags
  processingStatus: text("processing_status").default("pending"), // pending, processed, error
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
```

### 4. Providers Table

**AI Provider Configuration:**
```typescript
export const providers = sqliteTable("providers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  type: text("type").notNull(), // openai, anthropic, ollama, lm_studio
  baseUrl: text("base_url"),
  apiKey: text("api_key"),
  models: text("models"), // JSON array of available models
  defaultModel: text("default_model"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  config: text("config"), // JSON object for provider-specific settings
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export type Provider = typeof providers.$inferSelect;
export type NewProvider = typeof providers.$inferInsert;
```

### 5. Settings Table

**User Settings Storage:**
```typescript
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  type: text("type").default("string"), // string, number, boolean, json
  description: text("description"),
  category: text("category").default("general"),
  isReadonly: integer("is_readonly", { mode: "boolean" }).default(false),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;
```

## Database Operations

### 1. App Management

**App CRUD Operations:**
```typescript
// Create new app
export async function createApp(appData: NewApp): Promise<App> {
  const [app] = await db
    .insert(apps)
    .values({
      ...appData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .returning();
  
  return app;
}

// Get app by ID
export async function getApp(id: number): Promise<App | undefined> {
  return await db.query.apps.findFirst({
    where: eq(apps.id, id),
  });
}

// Update app
export async function updateApp(id: number, updates: Partial<App>): Promise<App> {
  const [app] = await db
    .update(apps)
    .set({
      ...updates,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(apps.id, id))
    .returning();
  
  return app;
}

// Delete app and cascading data
export async function deleteApp(id: number): Promise<void> {
  await db.delete(apps).where(eq(apps.id, id));
}

// List all apps with pagination
export async function listApps(
  offset: number = 0,
  limit: number = 50
): Promise<App[]> {
  return await db.query.apps.findMany({
    offset,
    limit,
    orderBy: [desc(apps.updatedAt)],
  });
}
```

### 2. Chat Management

**Chat Operations:**
```typescript
// Create new chat session
export async function createChat(chatData: NewChat): Promise<Chat> {
  // First, deactivate other chats for the app
  await db
    .update(chats)
    .set({ isActive: false })
    .where(eq(chats.appId, chatData.appId));

  // Create new active chat
  const [chat] = await db
    .insert(chats)
    .values({
      ...chatData,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .returning();
  
  return chat;
}

// Get active chat for app
export async function getActiveChat(appId: number): Promise<Chat | undefined> {
  return await db.query.chats.findFirst({
    where: and(
      eq(chats.appId, appId),
      eq(chats.isActive, true)
    ),
  });
}

// Get chat with messages
export async function getChatWithMessages(chatId: number) {
  const chat = await db.query.chats.findFirst({
    where: eq(chats.id, chatId),
    with: {
      messages: {
        orderBy: [asc(messages.createdAt)],
      },
    },
  });

  return chat;
}
```

### 3. Message Management

**Message Operations:**
```typescript
// Add message to chat
export async function addMessage(messageData: NewMessage): Promise<Message> {
  const [message] = await db
    .insert(messages)
    .values({
      ...messageData,
      createdAt: new Date().toISOString(),
    })
    .returning();
  
  // Update chat timestamp
  await db
    .update(chats)
    .set({ updatedAt: new Date().toISOString() })
    .where(eq(chats.id, messageData.chatId));
  
  return message;
}

// Update message processing status
export async function updateMessageStatus(
  messageId: number,
  status: string,
  metadata?: any
): Promise<void> {
  await db
    .update(messages)
    .set({
      processingStatus: status,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    })
    .where(eq(messages.id, messageId));
}

// Get recent messages for context
export async function getRecentMessages(
  chatId: number,
  limit: number = 20
): Promise<Message[]> {
  return await db.query.messages.findMany({
    where: eq(messages.chatId, chatId),
    limit,
    orderBy: [desc(messages.createdAt)],
  });
}
```

### 4. Provider Management

**Provider Operations:**
```typescript
// Add new provider
export async function addProvider(providerData: NewProvider): Promise<Provider> {
  const [provider] = await db
    .insert(providers)
    .values({
      ...providerData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .returning();
  
  return provider;
}

// Get active providers
export async function getActiveProviders(): Promise<Provider[]> {
  return await db.query.providers.findMany({
    where: eq(providers.isActive, true),
    orderBy: [asc(providers.name)],
  });
}

// Update provider configuration
export async function updateProvider(
  id: number,
  updates: Partial<Provider>
): Promise<Provider> {
  const [provider] = await db
    .update(providers)
    .set({
      ...updates,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(providers.id, id))
    .returning();
  
  return provider;
}
```

## Relationships and Queries

### 1. Schema Relations

**Relational Queries:**
```typescript
// Define relations in schema
export const appsRelations = relations(apps, ({ many }) => ({
  chats: many(chats),
}));

export const chatsRelations = relations(chats, ({ one, many }) => ({
  app: one(apps, {
    fields: [chats.appId],
    references: [apps.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  chat: one(chats, {
    fields: [messages.chatId],
    references: [chats.id],
  }),
}));
```

### 2. Complex Queries

**Advanced Database Operations:**
```typescript
// Get app with latest chat and message count
export async function getAppSummary(appId: number) {
  const result = await db
    .select({
      app: apps,
      latestChat: {
        id: chats.id,
        title: chats.title,
        updatedAt: chats.updatedAt,
      },
      messageCount: sql<number>`count(${messages.id})`,
    })
    .from(apps)
    .leftJoin(chats, eq(chats.appId, apps.id))
    .leftJoin(messages, eq(messages.chatId, chats.id))
    .where(eq(apps.id, appId))
    .groupBy(apps.id, chats.id)
    .orderBy(desc(chats.updatedAt))
    .limit(1);

  return result[0];
}

// Get chat statistics
export async function getChatStats(chatId: number) {
  const stats = await db
    .select({
      messageCount: sql<number>`count(*)`,
      totalTokens: sql<number>`sum(${messages.tokens})`,
      totalCost: sql<number>`sum(cast(${messages.cost} as decimal))`,
      userMessages: sql<number>`sum(case when ${messages.role} = 'user' then 1 else 0 end)`,
      assistantMessages: sql<number>`sum(case when ${messages.role} = 'assistant' then 1 else 0 end)`,
    })
    .from(messages)
    .where(eq(messages.chatId, chatId));

  return stats[0];
}
```

## Data Validation and Types

### 1. Zod Validation

**Schema Validation:**
```typescript
import { z } from "zod";

// App validation schema
export const AppSchema = z.object({
  name: z.string().min(1).max(100),
  path: z.string().min(1),
  description: z.string().optional(),
  framework: z.enum(["react", "vue", "svelte", "vanilla"]).default("react"),
  language: z.enum(["typescript", "javascript"]).default("typescript"),
  githubUrl: z.string().url().optional(),
  vercelUrl: z.string().url().optional(),
});

// Message validation schema
export const MessageSchema = z.object({
  chatId: z.number().positive(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1),
  metadata: z.string().optional(),
  tokens: z.number().non-negative().optional(),
  cost: z.string().optional(),
  attachments: z.string().optional(),
});

// Provider validation schema
export const ProviderSchema = z.object({
  name: z.string().min(1).max(50),
  type: z.enum(["openai", "anthropic", "ollama", "lm_studio"]),
  baseUrl: z.string().url().optional(),
  apiKey: z.string().optional(),
  models: z.string().optional(),
  defaultModel: z.string().optional(),
  config: z.string().optional(),
});
```

### 2. Type Guards

**Runtime Type Checking:**
```typescript
export function isValidApp(data: any): data is App {
  try {
    AppSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}

export function isValidMessage(data: any): data is Message {
  try {
    MessageSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}
```

## Database Utilities

### 1. Migration Helpers

**Database Migration Support:**
```typescript
// Migration utilities
export async function backupDatabase(): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `./backups/ccdyad-backup-${timestamp}.db`;
  
  // Copy current database
  await fs.copyFile('./ccdyad.db', backupPath);
  
  return backupPath;
}

export async function restoreDatabase(backupPath: string): Promise<void> {
  // Validate backup file exists
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file not found: ${backupPath}`);
  }
  
  // Create backup of current database
  await backupDatabase();
  
  // Replace current database with backup
  await fs.copyFile(backupPath, './ccdyad.db');
  
  // Reinitialize database connection
  initializeDatabase();
}
```

### 2. Data Export/Import

**Data Management:**
```typescript
// Export data to JSON
export async function exportData(): Promise<{
  apps: App[];
  chats: Chat[];
  messages: Message[];
  providers: Provider[];
  settings: Setting[];
}> {
  const [appsList, chatsList, messagesList, providersList, settingsList] = await Promise.all([
    db.query.apps.findMany(),
    db.query.chats.findMany(),
    db.query.messages.findMany(),
    db.query.providers.findMany(),
    db.query.settings.findMany(),
  ]);

  return {
    apps: appsList,
    chats: chatsList,
    messages: messagesList,
    providers: providersList,
    settings: settingsList,
  };
}

// Import data from JSON
export async function importData(data: {
  apps: App[];
  chats: Chat[];
  messages: Message[];
  providers: Provider[];
  settings: Setting[];
}): Promise<void> {
  // Use transaction for data integrity
  await db.transaction(async (tx) => {
    // Clear existing data
    await tx.delete(messages);
    await tx.delete(chats);
    await tx.delete(apps);
    await tx.delete(providers);
    await tx.delete(settings);

    // Insert imported data
    if (data.apps.length > 0) await tx.insert(apps).values(data.apps);
    if (data.chats.length > 0) await tx.insert(chats).values(data.chats);
    if (data.messages.length > 0) await tx.insert(messages).values(data.messages);
    if (data.providers.length > 0) await tx.insert(providers).values(data.providers);
    if (data.settings.length > 0) await tx.insert(settings).values(data.settings);
  });
}
```

## Performance Optimization

### 1. Indexing Strategy

**Database Indexes:**
```sql
-- Indexes for performance optimization
CREATE INDEX idx_apps_path ON apps(path);
CREATE INDEX idx_apps_status ON apps(status);
CREATE INDEX idx_apps_created_at ON apps(created_at);

CREATE INDEX idx_chats_app_id ON chats(app_id);
CREATE INDEX idx_chats_is_active ON chats(is_active);
CREATE INDEX idx_chats_updated_at ON chats(updated_at);

CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_role ON messages(role);
CREATE INDEX idx_messages_created_at ON messages(created_at);

CREATE INDEX idx_providers_type ON providers(type);
CREATE INDEX idx_providers_is_active ON providers(is_active);

CREATE INDEX idx_settings_key ON settings(key);
CREATE INDEX idx_settings_category ON settings(category);
```

### 2. Query Optimization

**Efficient Queries:**
```typescript
// Use prepared statements for repeated queries
const getAppById = db
  .select()
  .from(apps)
  .where(eq(apps.id, placeholder("id")))
  .prepare();

const getMessagesByChat = db
  .select()
  .from(messages)
  .where(eq(messages.chatId, placeholder("chatId")))
  .orderBy(asc(messages.createdAt))
  .prepare();

// Use these prepared statements
export async function getAppFast(id: number): Promise<App | undefined> {
  const result = await getAppById.execute({ id });
  return result[0];
}

export async function getMessagesFast(chatId: number): Promise<Message[]> {
  return await getMessagesByChat.execute({ chatId });
}
```

## Related Files

- **Schema Definition**: `/src/db/schema.ts`
- **Database Instance**: `/src/db/db.ts`
- **Drizzle Config**: `/drizzle.config.ts`
- **Migration Files**: `/migrations/`
- **Database Handlers**: `/src/ipc/handlers/db_handlers.ts`
- **Type Definitions**: `/src/types/database.ts`