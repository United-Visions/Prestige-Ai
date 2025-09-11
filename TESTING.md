# Testing Guide for Prestige-AI

This document outlines the comprehensive testing setup for Prestige-AI, including unit tests, component tests, integration tests, and end-to-end tests using Playwright and GitHub Actions.

## Testing Architecture

### 1. Test Types

- **Unit Tests**: Testing individual functions, utilities, and isolated logic
- **Component Tests**: Testing React components in isolation with Playwright
- **Integration Tests**: Testing feature workflows and component interactions
- **End-to-End Tests**: Testing complete user journeys through the application

### 2. Testing Tools

- **Vitest**: Unit testing framework with built-in TypeScript support
- **Playwright**: Modern E2E and component testing framework
- **React Testing Library**: Component testing utilities (for unit tests)
- **GitHub Actions**: Continuous Integration and automated testing

## Running Tests

### Quick Commands

```bash
# Run all tests
npm test

# Run specific test types
npm run test:unit          # Unit tests with Vitest
npm run test:component     # Component tests with Playwright
npm run test:e2e          # End-to-end tests with Playwright
npm run test:integration  # Integration tests

# Watch modes for development
npm run test:unit:watch
npm run test:component:watch
npm run test:e2e:watch

# Generate coverage reports
npm run test:unit:coverage
```

### Prerequisites

Before running tests, install Playwright browsers:

```bash
npm run test:install       # Install Playwright browsers
npm run test:install:deps  # Install system dependencies
```

## Test Structure

```
tests/
├── setup.ts                 # Test setup and global mocks
├── unit/                    # Unit tests
│   ├── utils.test.ts
│   └── ChatInterface.test.tsx
├── component/               # Component tests
│   ├── Button.spec.tsx
│   └── snapshots/          # Visual regression snapshots
├── integration/             # Integration tests
│   └── app-management.spec.ts
└── e2e/                     # End-to-end tests
    ├── app-basic.spec.ts
    └── chat-functionality.spec.ts
```

## Test Configuration

### Vitest Configuration (`vitest.config.ts`)
- Environment: jsdom
- Coverage: v8 provider with thresholds
- Path aliases: `@/` mapped to `./src/`

### Playwright Configuration (`playwright.config.ts`)
- Browsers: Chromium, Firefox, Safari
- Base URL: http://localhost:5173
- Automatic dev server startup
- Visual regression testing

### Component Testing (`playwright-ct.config.ts`)
- React component testing
- Isolated component mounting
- Cross-browser component testing

## Writing Tests

### Unit Tests Example

```typescript
import { describe, it, expect } from 'vitest';
import { generateId } from '@/lib/utils';

describe('Utils', () => {
  it('generates unique IDs', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });
});
```

### Component Tests Example

```typescript
import { test, expect } from '@playwright/experimental-ct-react';
import { Button } from '@/components/ui/button';

test('renders button correctly', async ({ mount }) => {
  const component = await mount(<Button>Click me</Button>);
  await expect(component).toContainText('Click me');
});
```

### E2E Tests Example

```typescript
import { test, expect } from '@playwright/test';

test('user can create an app', async ({ page }) => {
  await page.goto('/');
  await page.click('button:has-text("Create")');
  await expect(page.locator('input[placeholder*="name"]')).toBeVisible();
});
```

## GitHub Actions Integration

The CI pipeline includes:

1. **Lint**: Code linting with ESLint
2. **Unit Tests**: Run with coverage reporting
3. **Component Tests**: Cross-browser component testing
4. **E2E Tests**: Multi-browser end-to-end testing
5. **Integration Tests**: Feature workflow testing
6. **Build Tests**: Cross-platform build verification

### Workflow Features

- **Parallel Execution**: Tests run in parallel for faster feedback
- **Cross-Platform**: Tests run on Ubuntu, Windows, and macOS
- **Cross-Browser**: Tests run on Chromium, Firefox, and Safari
- **Artifact Collection**: Test results, screenshots, and videos
- **Coverage Reporting**: Automated coverage reports

## Best Practices

### 1. Test Organization
- Group related tests using `describe` blocks
- Use descriptive test names
- Follow the AAA pattern (Arrange, Act, Assert)

### 2. Mocking
- Mock external dependencies and APIs
- Use consistent mock patterns across tests
- Keep mocks simple and focused

### 3. E2E Testing
- Use data-testid attributes for reliable selectors
- Test critical user paths
- Keep tests independent and isolated

### 4. Component Testing
- Test components in isolation
- Focus on user interactions and visual states
- Use Playwright's component testing for complex interactions

## Troubleshooting

### Common Issues

1. **Playwright Browser Installation**
   ```bash
   npx playwright install --with-deps
   ```

2. **Port Conflicts**
   - Ensure ports 5173 and 3100 are available
   - Check `playwright.config.ts` and `playwright-ct.config.ts`

3. **SQLite3 Build Issues**
   - Run `npm run rebuild` if database tests fail
   - Use `--legacy-peer-deps` flag for npm install

4. **Mock Setup**
   - Check `tests/setup.ts` for global mocks
   - Ensure Electron API mocks match your usage

### Debugging Tests

```bash
# Debug with UI mode
npm run test:e2e:watch
npm run test:component:watch

# Generate test reports
npm run test:unit:coverage
```

## Coverage Goals

- **Lines**: 70% minimum
- **Functions**: 70% minimum
- **Branches**: 70% minimum
- **Statements**: 70% minimum

Coverage reports are generated in the `coverage/` directory and uploaded to Codecov in CI.

## Contributing

When adding new features:

1. Write unit tests for utilities and logic
2. Add component tests for UI components
3. Include integration tests for new workflows
4. Add E2E tests for user-facing features
5. Ensure all tests pass before submitting PRs

For questions or issues with testing, please check the GitHub Actions logs or create an issue in the repository.