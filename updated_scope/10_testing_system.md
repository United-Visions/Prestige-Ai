# Testing System & E2E Automation

## Overview
CCDyad implements a comprehensive testing strategy using Playwright for end-to-end testing, Vitest for unit testing, and custom testing utilities for AI agent validation and integration testing.

## E2E Testing Framework

### 1. Playwright Configuration (`/playwright.config.ts`)

**Playwright Test Setup:**
```typescript
import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e-tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

### 2. Test Structure

**E2E Test Directory Structure:**
```
/e2e-tests/
├── fixtures/           # Test data and fixtures
├── utils/             # Test utilities and helpers
├── main.spec.ts       # Main application flow tests
├── app_lifecycle.spec.ts   # App creation and management
├── chat_mode.spec.ts      # Chat functionality tests
├── preview_system.spec.ts # Preview panel tests
├── github.spec.ts         # GitHub integration tests
├── providers.spec.ts      # AI provider tests
├── supabase.spec.ts       # Supabase integration tests
└── ...                    # Feature-specific test files
```

## Core E2E Test Cases

### 1. Main Application Flow (`/e2e-tests/main.spec.ts`)

**Application Startup and Navigation:**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Main Application', () => {
  test('should load the application successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check that the app loads
    await expect(page.locator('h1')).toContainText('CCDyad');
    
    // Verify sidebar is present
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
    
    // Check navigation items
    await expect(page.locator('[data-testid="nav-home"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-settings"]')).toBeVisible();
  });

  test('should navigate between pages', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to settings
    await page.click('[data-testid="nav-settings"]');
    await expect(page.locator('h2')).toContainText('Settings');
    
    // Navigate back to home
    await page.click('[data-testid="nav-home"]');
    await expect(page.locator('[data-testid="apps-list"]')).toBeVisible();
  });

  test('should handle sidebar toggle', async ({ page }) => {
    await page.goto('/');
    
    const sidebar = page.locator('[data-testid="sidebar"]');
    const toggleButton = page.locator('[data-testid="sidebar-toggle"]');
    
    // Initially expanded
    await expect(sidebar).toHaveClass(/w-64/);
    
    // Toggle to collapsed
    await toggleButton.click();
    await expect(sidebar).toHaveClass(/w-16/);
    
    // Toggle back to expanded
    await toggleButton.click();
    await expect(sidebar).toHaveClass(/w-64/);
  });
});
```

### 2. App Creation and Management (`/e2e-tests/app_lifecycle.spec.ts`)

**App CRUD Operations:**
```typescript
import { test, expect } from '@playwright/test';

test.describe('App Lifecycle', () => {
  test('should create a new app', async ({ page }) => {
    await page.goto('/');
    
    // Click create app button
    await page.click('[data-testid="create-app-button"]');
    
    // Fill app creation form
    await page.fill('[data-testid="app-name-input"]', 'Test App');
    await page.fill('[data-testid="app-description-input"]', 'A test application');
    await page.selectOption('[data-testid="framework-select"]', 'react');
    await page.selectOption('[data-testid="language-select"]', 'typescript');
    
    // Submit form
    await page.click('[data-testid="create-app-submit"]');
    
    // Wait for app to be created
    await expect(page.locator('[data-testid="app-card"]')).toContainText('Test App');
    
    // Verify app appears in sidebar
    await expect(page.locator('[data-testid="sidebar"]')).toContainText('Test App');
  });

  test('should run app development server', async ({ page }) => {
    await page.goto('/');
    
    // Assume app exists from previous test
    const appCard = page.locator('[data-testid="app-card"]').first();
    const runButton = appCard.locator('[data-testid="run-app-button"]');
    
    await runButton.click();
    
    // Wait for app to start
    await expect(appCard.locator('[data-testid="app-status"]')).toContainText('running');
    
    // Verify run button changed to stop button
    await expect(runButton).toContainText('Stop');
  });

  test('should open app in chat interface', async ({ page }) => {
    await page.goto('/');
    
    // Click on app to open it
    await page.click('[data-testid="app-card"]');
    
    // Should navigate to app page
    await expect(page.url()).toMatch(/\/app\/\d+/);
    
    // Verify chat interface is loaded
    await expect(page.locator('[data-testid="chat-container"]')).toBeVisible();
    await expect(page.locator('[data-testid="preview-panel"]')).toBeVisible();
  });

  test('should delete app', async ({ page }) => {
    await page.goto('/');
    
    const appCard = page.locator('[data-testid="app-card"]').first();
    const deleteButton = appCard.locator('[data-testid="delete-app-button"]');
    
    await deleteButton.click();
    
    // Confirm deletion in modal
    await page.click('[data-testid="confirm-delete"]');
    
    // Wait for app to be removed
    await expect(page.locator('[data-testid="apps-list"]')).not.toContainText('Test App');
  });
});
```

### 3. Chat Functionality (`/e2e-tests/chat_mode.spec.ts`)

**Chat Interface Testing:**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Chat Interface', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Assume we have an app created and navigate to it
    await page.click('[data-testid="app-card"]');
  });

  test('should send a message and receive response', async ({ page }) => {
    const messageInput = page.locator('[data-testid="message-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');
    const messagesList = page.locator('[data-testid="messages-list"]');
    
    // Type and send message
    await messageInput.fill('Create a simple button component');
    await sendButton.click();
    
    // Verify user message appears
    await expect(messagesList).toContainText('Create a simple button component');
    
    // Wait for AI response
    await expect(messagesList.locator('[data-testid="message-user"]')).toBeVisible();
    await expect(messagesList.locator('[data-testid="message-assistant"]')).toBeVisible({ timeout: 30000 });
    
    // Verify response contains code
    const aiMessage = messagesList.locator('[data-testid="message-assistant"]').first();
    await expect(aiMessage).toContainText('Button');
  });

  test('should handle file attachments', async ({ page }) => {
    const fileInput = page.locator('[data-testid="file-input"]');
    const messageInput = page.locator('[data-testid="message-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');
    
    // Create a test file
    const testFile = Buffer.from('Test file content');
    
    // Upload file
    await fileInput.setInputFiles({
      name: 'test.txt',
      mimeType: 'text/plain',
      buffer: testFile,
    });
    
    // Send message with attachment
    await messageInput.fill('Process this file');
    await sendButton.click();
    
    // Verify attachment appears in message
    const userMessage = page.locator('[data-testid="message-user"]').last();
    await expect(userMessage).toContainText('test.txt');
  });

  test('should switch between chat modes', async ({ page }) => {
    const modeSelector = page.locator('[data-testid="chat-mode-selector"]');
    
    // Test Build mode (default)
    await expect(modeSelector).toHaveValue('build');
    
    // Switch to Ask mode
    await modeSelector.selectOption('ask');
    await expect(page.locator('[data-testid="chat-header"]')).toContainText('Ask Mode');
    
    // Switch to Fix mode
    await modeSelector.selectOption('fix');
    await expect(page.locator('[data-testid="chat-header"]')).toContainText('Fix Mode');
  });

  test('should create new chat session', async ({ page }) => {
    const newChatButton = page.locator('[data-testid="new-chat-button"]');
    const chatsList = page.locator('[data-testid="chats-list"]');
    
    // Create new chat
    await newChatButton.click();
    
    // Fill new chat form
    await page.fill('[data-testid="chat-title-input"]', 'New Feature Chat');
    await page.selectOption('[data-testid="chat-provider-select"]', 'claude');
    await page.click('[data-testid="create-chat-submit"]');
    
    // Verify new chat is active
    await expect(page.locator('[data-testid="active-chat-title"]')).toContainText('New Feature Chat');
    await expect(chatsList).toContainText('New Feature Chat');
  });
});
```

### 4. Preview System Testing (`/e2e-tests/preview_system.spec.ts`)

**Live Preview Functionality:**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Preview System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="app-card"]');
    
    // Start the app if not running
    const runButton = page.locator('[data-testid="run-app-button"]');
    if (await runButton.isVisible()) {
      await runButton.click();
      await page.waitForTimeout(5000); // Wait for dev server to start
    }
  });

  test('should load app preview in iframe', async ({ page }) => {
    const previewIframe = page.locator('[data-testid="preview-iframe"]');
    
    // Wait for iframe to load
    await expect(previewIframe).toBeVisible();
    
    // Check iframe src points to dev server
    const iframeSrc = await previewIframe.getAttribute('src');
    expect(iframeSrc).toMatch(/localhost:\d+/);
  });

  test('should refresh preview', async ({ page }) => {
    const refreshButton = page.locator('[data-testid="preview-refresh"]');
    const previewIframe = page.locator('[data-testid="preview-iframe"]');
    
    await refreshButton.click();
    
    // Verify iframe reloads
    await expect(previewIframe).toBeVisible();
  });

  test('should switch device views', async ({ page }) => {
    const deviceSelector = page.locator('[data-testid="device-selector"]');
    const previewContainer = page.locator('[data-testid="preview-container"]');
    
    // Test desktop view (default)
    await expect(deviceSelector).toHaveValue('desktop');
    
    // Switch to mobile view
    await deviceSelector.selectOption('mobile');
    await expect(previewContainer).toHaveClass(/mobile-frame/);
    
    // Switch to tablet view
    await deviceSelector.selectOption('tablet');
    await expect(previewContainer).toHaveClass(/tablet-frame/);
  });

  test('should detect and highlight components', async ({ page }) => {
    const componentSelector = page.locator('[data-testid="component-selector"]');
    
    // Wait for components to be detected
    await expect(componentSelector).toBeVisible({ timeout: 10000 });
    
    // Verify components are listed
    const options = componentSelector.locator('option');
    const optionCount = await options.count();
    expect(optionCount).toBeGreaterThan(0);
    
    // Select a component
    await componentSelector.selectOption({ index: 1 });
    
    // Verify component is highlighted in preview
    // Note: This would require custom logic to verify iframe content
  });
});
```

### 5. AI Provider Testing (`/e2e-tests/providers.spec.ts`)

**Provider Configuration and Testing:**
```typescript
import { test, expect } from '@playwright/test';

test.describe('AI Providers', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
  });

  test('should add new AI provider', async ({ page }) => {
    const addProviderButton = page.locator('[data-testid="add-provider-button"]');
    
    await addProviderButton.click();
    
    // Fill provider form
    await page.fill('[data-testid="provider-name-input"]', 'Test OpenAI');
    await page.selectOption('[data-testid="provider-type-select"]', 'openai');
    await page.fill('[data-testid="provider-api-key-input"]', 'test-api-key');
    await page.fill('[data-testid="provider-base-url-input"]', 'https://api.openai.com/v1');
    
    // Submit form
    await page.click('[data-testid="add-provider-submit"]');
    
    // Verify provider appears in list
    await expect(page.locator('[data-testid="providers-list"]')).toContainText('Test OpenAI');
  });

  test('should test provider connection', async ({ page }) => {
    // Assume provider exists
    const providerCard = page.locator('[data-testid="provider-card"]').first();
    const testButton = providerCard.locator('[data-testid="test-connection-button"]');
    
    await testButton.click();
    
    // Wait for test result
    const statusBadge = providerCard.locator('[data-testid="provider-status"]');
    await expect(statusBadge).toBeVisible({ timeout: 10000 });
    
    // Should show either success or error status
    const statusText = await statusBadge.textContent();
    expect(['connected', 'error']).toContain(statusText?.toLowerCase());
  });

  test('should configure provider models', async ({ page }) => {
    const providerCard = page.locator('[data-testid="provider-card"]').first();
    const configButton = providerCard.locator('[data-testid="configure-button"]');
    
    await configButton.click();
    
    // Models should be loaded
    const modelsSelect = page.locator('[data-testid="models-select"]');
    await expect(modelsSelect).toBeVisible();
    
    // Select default model
    await modelsSelect.selectOption('gpt-4');
    
    // Save configuration
    await page.click('[data-testid="save-config-button"]');
    
    // Verify configuration saved
    await expect(providerCard).toContainText('gpt-4');
  });

  test('should delete provider', async ({ page }) => {
    const providerCard = page.locator('[data-testid="provider-card"]').first();
    const deleteButton = providerCard.locator('[data-testid="delete-provider-button"]');
    
    await deleteButton.click();
    
    // Confirm deletion
    await page.click('[data-testid="confirm-delete"]');
    
    // Verify provider removed
    await expect(page.locator('[data-testid="providers-list"]')).not.toContainText('Test OpenAI');
  });
});
```

## Integration Testing

### 1. Supabase Integration (`/e2e-tests/supabase.spec.ts`)

**Database Integration Testing:**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Supabase Integration', () => {
  test('should connect to Supabase project', async ({ page }) => {
    await page.goto('/settings');
    
    // Navigate to integrations tab
    await page.click('[data-testid="integrations-tab"]');
    
    // Configure Supabase
    await page.fill('[data-testid="supabase-url-input"]', 'https://test.supabase.co');
    await page.fill('[data-testid="supabase-anon-key-input"]', 'test-anon-key');
    
    // Test connection
    await page.click('[data-testid="test-supabase-connection"]');
    
    // Verify connection status
    const statusIndicator = page.locator('[data-testid="supabase-status"]');
    await expect(statusIndicator).toBeVisible({ timeout: 10000 });
  });

  test('should generate Supabase configuration in app', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="app-card"]');
    
    // Send message to add Supabase
    const messageInput = page.locator('[data-testid="message-input"]');
    await messageInput.fill('Add Supabase authentication to this app');
    await page.click('[data-testid="send-button"]');
    
    // Wait for AI response with Supabase code
    const aiMessage = page.locator('[data-testid="message-assistant"]').last();
    await expect(aiMessage).toContainText('supabase', { timeout: 30000 });
    await expect(aiMessage).toContainText('createClient');
  });
});
```

### 2. GitHub Integration (`/e2e-tests/github.spec.ts`)

**Version Control Integration:**
```typescript
import { test, expect } from '@playwright/test';

test.describe('GitHub Integration', () => {
  test('should connect GitHub account', async ({ page }) => {
    await page.goto('/settings');
    
    // Configure GitHub token
    await page.fill('[data-testid="github-token-input"]', process.env.GITHUB_TOKEN || 'test-token');
    
    // Test connection
    await page.click('[data-testid="test-github-connection"]');
    
    // Verify connection
    const statusIndicator = page.locator('[data-testid="github-status"]');
    await expect(statusIndicator).toContainText('connected', { timeout: 10000 });
  });

  test('should push app to GitHub', async ({ page }) => {
    await page.goto('/');
    
    const appCard = page.locator('[data-testid="app-card"]').first();
    const githubButton = appCard.locator('[data-testid="github-deploy-button"]');
    
    await githubButton.click();
    
    // Fill repository details
    await page.fill('[data-testid="repo-name-input"]', 'test-ccdyad-app');
    await page.fill('[data-testid="repo-description-input"]', 'Test app from CCDyad');
    
    // Create and push
    await page.click('[data-testid="create-repo-submit"]');
    
    // Wait for deployment to complete
    const deployStatus = page.locator('[data-testid="deploy-status"]');
    await expect(deployStatus).toContainText('success', { timeout: 60000 });
  });
});
```

## Unit Testing

### 1. Vitest Configuration (`/vitest.config.ts`)

**Unit Test Setup:**
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### 2. Test Utilities (`/src/test/utils.tsx`)

**React Testing Utilities:**
```typescript
import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create wrapper component for providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// Custom render function
const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
```

### 3. Component Tests

**Example Component Test:**
```typescript
// /src/components/app/AppCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/utils';
import { AppCard } from './AppCard';

const mockApp = {
  id: 1,
  name: 'Test App',
  description: 'A test application',
  framework: 'react',
  language: 'typescript',
  status: 'created' as const,
  path: '/test/path',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('AppCard', () => {
  it('renders app information correctly', () => {
    render(<AppCard app={mockApp} />);
    
    expect(screen.getByText('Test App')).toBeInTheDocument();
    expect(screen.getByText('A test application')).toBeInTheDocument();
    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('typescript')).toBeInTheDocument();
  });

  it('handles run button click', async () => {
    const onRun = vi.fn();
    render(<AppCard app={mockApp} onRun={onRun} />);
    
    const runButton = screen.getByRole('button', { name: /run/i });
    fireEvent.click(runButton);
    
    expect(onRun).toHaveBeenCalledWith(mockApp.id);
  });

  it('shows correct status badge', () => {
    render(<AppCard app={{ ...mockApp, status: 'running' }} />);
    
    const statusBadge = screen.getByText('running');
    expect(statusBadge).toHaveClass('bg-green-500');
  });
});
```

## Test Data and Fixtures

### 1. Test Fixtures (`/e2e-tests/fixtures/`)

**Mock Data:**
```typescript
// /e2e-tests/fixtures/apps.ts
export const testApps = [
  {
    id: 1,
    name: 'React Todo App',
    description: 'A simple todo application',
    framework: 'react',
    language: 'typescript',
    status: 'created',
    path: '/apps/react-todo',
  },
  {
    id: 2,
    name: 'Vue Dashboard',
    description: 'Analytics dashboard',
    framework: 'vue',
    language: 'javascript',
    status: 'running',
    path: '/apps/vue-dashboard',
  },
];

// /e2e-tests/fixtures/providers.ts
export const testProviders = [
  {
    id: 1,
    name: 'OpenAI GPT-4',
    type: 'openai',
    apiKey: 'test-key',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4', 'gpt-3.5-turbo'],
    defaultModel: 'gpt-4',
    isActive: true,
  },
  {
    id: 2,
    name: 'Claude 3',
    type: 'anthropic',
    apiKey: 'test-claude-key',
    models: ['claude-3-opus', 'claude-3-sonnet'],
    defaultModel: 'claude-3-sonnet',
    isActive: true,
  },
];
```

### 2. Database Seeding

**Test Database Setup:**
```typescript
// /e2e-tests/utils/db-setup.ts
import { db } from '@/db/db';
import { apps, providers, chats } from '@/db/schema';
import { testApps, testProviders } from '../fixtures';

export async function seedTestData() {
  // Clear existing data
  await db.delete(chats);
  await db.delete(apps);
  await db.delete(providers);

  // Insert test data
  await db.insert(apps).values(testApps);
  await db.insert(providers).values(testProviders);
}

export async function cleanupTestData() {
  await db.delete(chats);
  await db.delete(apps);
  await db.delete(providers);
}
```

## Continuous Integration

### 1. GitHub Actions (`/.github/workflows/test.yml`)

**CI/CD Pipeline:**
```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:coverage

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## Performance Testing

### 1. Load Testing

**Performance Test Example:**
```typescript
// /e2e-tests/performance/chat-load.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Chat Performance', () => {
  test('should handle multiple rapid messages', async ({ page }) => {
    await page.goto('/app/1');
    
    const messageInput = page.locator('[data-testid="message-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');
    
    // Send multiple messages rapidly
    for (let i = 0; i < 10; i++) {
      await messageInput.fill(`Message ${i + 1}`);
      await sendButton.click();
      
      // Small delay to simulate typing
      await page.waitForTimeout(100);
    }
    
    // Verify all messages appear
    const messagesList = page.locator('[data-testid="messages-list"]');
    
    for (let i = 0; i < 10; i++) {
      await expect(messagesList).toContainText(`Message ${i + 1}`);
    }
  });
});
```

## Related Files

- **Playwright Config**: `/playwright.config.ts`
- **Vitest Config**: `/vitest.config.ts`
- **E2E Tests**: `/e2e-tests/`
- **Test Utilities**: `/src/test/`
- **Test Fixtures**: `/e2e-tests/fixtures/`
- **CI Configuration**: `/.github/workflows/test.yml`