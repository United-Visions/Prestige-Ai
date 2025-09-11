import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './electron/db/schema.ts',
  out: './electron/db/drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: './prestige-ai.db',
  },
});