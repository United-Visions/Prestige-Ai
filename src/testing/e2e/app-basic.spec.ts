import { test, expect } from '@playwright/test';

test.describe('Prestige-AI Application', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('should display the main interface', async ({ page }) => {
    // Check if the main application interface loads
    await expect(page.locator('body')).toBeVisible();
    
    // Should have the app title or header
    await expect(page.locator('h1, [data-testid="app-title"]')).toBeVisible();
  });

  test('should show welcome screen initially', async ({ page }) => {
    // Check for welcome screen elements
    const welcomeScreen = page.locator('[data-testid="prestige-welcome-screen"]');
    await expect(welcomeScreen).toBeVisible();
    
    // Should have create app button or similar
    const createButton = page.locator('button:has-text("Create"), button:has-text("New")').first();
    await expect(createButton).toBeVisible();
  });

  test('should handle app creation flow', async ({ page }) => {
    // Click on create app button
    const createButton = page.locator('button:has-text("Create"), button:has-text("New")').first();
    await createButton.click();
    
    // Should show app creation form or dialog
    await expect(page.locator('input[type="text"], [role="dialog"]')).toBeVisible();
  });

  test('should display model selector', async ({ page }) => {
    // Look for model selection UI
    const modelSelector = page.locator('[data-testid="model-selector"], select, [role="combobox"]');
    await expect(modelSelector.first()).toBeVisible();
  });

  test('should show chat interface when app is active', async ({ page }) => {
    // If there's an existing app or after creating one, should show chat
    const chatInput = page.locator('textarea, input[type="text"][placeholder*="message"], [data-testid="chat-input"]');
    
    // Try to create an app first if needed
    const welcomeScreen = page.locator('[data-testid="prestige-welcome-screen"]');
    if (await welcomeScreen.isVisible()) {
      const createButton = page.locator('button:has-text("Create"), button:has-text("New")').first();
      if (await createButton.isVisible()) {
        await createButton.click();
        // Wait for potential form and fill it
        await page.waitForTimeout(1000);
        const submitButton = page.locator('button:has-text("Create"), button[type="submit"]').last();
        if (await submitButton.isVisible()) {
          await submitButton.click();
        }
      }
    }
    
    // Now check for chat interface
    await expect(chatInput.first()).toBeVisible();
  });

  test('should handle responsive design', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('body')).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('body')).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle keyboard navigation', async ({ page }) => {
    // Test tab navigation
    await page.keyboard.press('Tab');
    
    // Should have at least one focusable element
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});