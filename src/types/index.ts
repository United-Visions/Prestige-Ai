import type { 
  App as DbApp,
  Conversation as DbConversation,
  Message as DbMessage,
} from '@/db/schema';

// Core application types

export interface FileChange {
  path: string;
  content: string;
  action: 'create' | 'update' | 'delete';
}

export type App = Omit<DbApp, 'description' | 'chatContext' | 'createdAt' | 'updatedAt'> & {
  description?: string;
  files?: FileNode[];
  chatContext?: any;
  createdAt: Date;
  updatedAt: Date;
};

export type Conversation = Omit<DbConversation, 'title' | 'createdAt' | 'updatedAt'> & {
  title?: string;
  messages?: Message[];
  createdAt: Date;
  updatedAt: Date;
};

export type Message = Omit<DbMessage, 'fileChanges' | 'approvalState' | 'commitHash' | 'createdAt'> & {
  fileChanges?: FileChange[];
  approvalState?: 'approved' | 'rejected' | 'pending';
  commitHash?: string;
  createdAt: Date;
};

export interface Project {
  id: number;
  name: string;
  description: string;
  files: FileNode[];
  createdAt: Date;
  updatedAt: Date;
}

export interface FileNode {
  name: string;
  type: 'file' | 'directory';
  content?: string;
  children?: FileNode[];
  path: string;
}

export interface ModelProvider {
  id: string;
  name: string;
  description: string;
  type: 'api' | 'cli' | 'local';
  isAvailable: boolean;
}

export interface ExecuteOptions {
  cwd?: string;
  timeout?: number;
  env?: Record<string, string>;
  context?: string;
}

export interface ProcessedResponse {
  explanation: string;
  fileChanges: FileChange[];
  hasChanges: boolean;
  rawResponse: string;
}

export interface GeneratedProject {
  name: string;
  description: string;
  files: FileNode[];
  dependencies: string[];
  scripts: Record<string, string>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FileOperation {
  path: string;
  content: string;
  action: 'create' | 'update' | 'delete';
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
}