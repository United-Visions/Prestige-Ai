/**
 * Test utilities for Prestige-AI testing
 */

// Test ID constants for consistent element selection
export const TEST_IDS = {
  // Main interface
  WELCOME_SCREEN: 'prestige-welcome-screen',
  CHAT_AREA: 'prestige-chat-area',
  CHAT_INPUT: 'chat-input',
  SEND_BUTTON: 'send-button',
  CHAT_MESSAGES: 'chat-messages',
  
  // App management
  APP_SIDEBAR: 'app-sidebar',
  CREATE_APP_BUTTON: 'create-app-button',
  APP_NAME_INPUT: 'app-name-input',
  
  // UI elements
  MODEL_SELECTOR: 'model-selector',
  GENERATING_INDICATOR: 'generating-indicator',
  ERROR_MESSAGE: 'error-message',
  
  // Settings and dialogs
  API_KEY_DIALOG: 'api-key-dialog',
  SETTINGS_BUTTON: 'settings-button',
} as const;

// Mock data for tests
export const MOCK_DATA = {
  APP: {
    id: 'test-app-123',
    name: 'Test App',
    path: '/test/path',
    template: 'react',
    createdAt: new Date('2023-12-25'),
  },
  CONVERSATION: {
    id: 'conv-123',
    appId: 'test-app-123',
    messages: [
      {
        id: 'msg-1',
        role: 'user' as const,
        content: 'Hello, create a React component',
        timestamp: new Date('2023-12-25T10:00:00'),
      },
      {
        id: 'msg-2',
        role: 'assistant' as const,
        content: 'I\'ll create a React component for you.',
        timestamp: new Date('2023-12-25T10:00:30'),
      },
    ],
  },
  MESSAGE: {
    USER: {
      id: 'user-msg',
      role: 'user' as const,
      content: 'Test user message',
      timestamp: new Date(),
    },
    ASSISTANT: {
      id: 'assistant-msg',
      role: 'assistant' as const,
      content: 'Test assistant response',
      timestamp: new Date(),
    },
  },
} as const;

// Test helpers
export const testHelpers = {
  // Wait for element with timeout
  waitForElement: (selector: string, timeout: number = 5000) => {
    return new Promise<Element>((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }, timeout);
    });
  },

  // Create a delay
  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Generate test ID selector
  testId: (id: string) => `[data-testid="${id}"]`,
};

// Mock Electron API for tests
export const createMockElectronAPI = (overrides: Record<string, any> = {}) => ({
  app: {
    initializePrestigeFolder: vi.fn().mockResolvedValue(undefined),
    getDesktopPath: vi.fn().mockResolvedValue('/Users/test/Desktop'),
    createApp: vi.fn().mockResolvedValue('test-app-123'),
    openApp: vi.fn().mockResolvedValue(undefined),
    getApps: vi.fn().mockResolvedValue([MOCK_DATA.APP]),
    deleteApp: vi.fn().mockResolvedValue(undefined),
    ...overrides.app,
  },
  path: {
    join: vi.fn().mockImplementation((...paths: string[]) => 
      Promise.resolve(paths.join('/').replace(/\/+/g, '/'))
    ),
    ...overrides.path,
  },
  fs: {
    readFile: vi.fn().mockRejectedValue(new Error('File not found')),
    writeFile: vi.fn().mockResolvedValue(undefined),
    exists: vi.fn().mockResolvedValue(false),
    ...overrides.fs,
  },
  claudeApi: {
    sendMessage: vi.fn().mockResolvedValue({
      content: 'Test AI response',
      role: 'assistant',
    }),
    ...overrides.claudeApi,
  },
  conversation: {
    save: vi.fn().mockResolvedValue(undefined),
    load: vi.fn().mockResolvedValue(MOCK_DATA.CONVERSATION.messages),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides.conversation,
  },
  // Add missing methods that might be used
  getEnvVar: vi.fn().mockReturnValue('mock-api-key'),
  setEnvVar: vi.fn().mockResolvedValue(undefined),
  getConfig: vi.fn().mockResolvedValue({}),
  setConfig: vi.fn().mockResolvedValue(undefined),
});

// Export vi for convenience
import { vi } from 'vitest';
export { vi };