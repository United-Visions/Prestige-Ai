import { test, expect } from '@playwright/test';

test.describe('App Management Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should create and manage apps end-to-end', async ({ page }) => {
    // Step 1: Start with welcome screen
    const welcomeScreen = page.locator('[data-testid="prestige-welcome-screen"]');
    await expect(welcomeScreen).toBeVisible();

    // Step 2: Create a new app
    const createButton = page.locator('button:has-text("Create"), button:has-text("New")').first();
    await createButton.click();

    // Step 3: Fill out app creation form
    const nameInput = page.locator('input[type="text"], input[placeholder*="name"]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill('Integration Test App');
      
      // Select template if available
      const templateSelector = page.locator('select, [role="combobox"]');
      if (await templateSelector.first().isVisible()) {
        await templateSelector.first().click();
        const reactOption = page.locator('option:has-text("React"), [role="option"]:has-text("React")').first();
        if (await reactOption.isVisible()) {
          await reactOption.click();
        }
      }

      const submitButton = page.locator('button:has-text("Create"), button[type="submit"]').last();
      await submitButton.click();
    }

    // Step 4: Verify app is created and chat interface is available
    await page.waitForTimeout(2000); // Wait for app creation
    const chatInput = page.locator('textarea, input[type="text"][placeholder*="message"], [data-testid="chat-input"]').first();
    await expect(chatInput).toBeVisible();

    // Step 5: Send a message in the new app
    await chatInput.fill('Create a simple React component for me');
    const sendButton = page.locator('button:has-text("Send"), button[type="submit"], [data-testid="send-button"]').first();
    await sendButton.click();

    // Step 6: Verify message is sent and appears in chat
    await expect(chatInput).toHaveValue('');
    const messageContainer = page.locator('[data-testid="chat-messages"], .chat-messages, .message-list').first();
    await expect(messageContainer).toBeVisible();

    // Step 7: Check for app in sidebar/app list
    const appSidebar = page.locator('[data-testid="app-sidebar"], .app-sidebar, .sidebar');
    if (await appSidebar.first().isVisible()) {
      await expect(appSidebar.first()).toContainText('Integration Test App');
    }
  });

  test('should switch between multiple apps', async ({ page }) => {
    // Create first app
    await page.goto('/');
    const welcomeScreen = page.locator('[data-testid="prestige-welcome-screen"]');
    if (await welcomeScreen.isVisible()) {
      const createButton = page.locator('button:has-text("Create"), button:has-text("New")').first();
      await createButton.click();
      
      const nameInput = page.locator('input[type="text"], input[placeholder*="name"]').first();
      if (await nameInput.isVisible()) {
        await nameInput.fill('First App');
        const submitButton = page.locator('button:has-text("Create"), button[type="submit"]').last();
        await submitButton.click();
      }
    }

    // Wait for first app to be created
    await page.waitForTimeout(2000);

    // Create second app
    const newAppButton = page.locator('button:has-text("New App"), button:has-text("Create"), [data-testid="create-app"]');
    if (await newAppButton.first().isVisible()) {
      await newAppButton.first().click();
      
      const nameInput = page.locator('input[type="text"], input[placeholder*="name"]').first();
      if (await nameInput.isVisible()) {
        await nameInput.fill('Second App');
        const submitButton = page.locator('button:has-text("Create"), button[type="submit"]').last();
        await submitButton.click();
      }
    }

    // Verify we can switch between apps
    const appSidebar = page.locator('[data-testid="app-sidebar"], .app-sidebar, .sidebar');
    if (await appSidebar.first().isVisible()) {
      const firstAppLink = page.locator('text="First App", [data-testid="app-First App"]').first();
      if (await firstAppLink.isVisible()) {
        await firstAppLink.click();
        await page.waitForTimeout(1000);
        
        // Verify we're in the first app context
        const chatInput = page.locator('textarea, input[type="text"][placeholder*="message"]').first();
        await expect(chatInput).toBeVisible();
      }
    }
  });

  test('should handle conversation history', async ({ page }) => {
    // Setup: Create an app
    await page.goto('/');
    const welcomeScreen = page.locator('[data-testid="prestige-welcome-screen"]');
    if (await welcomeScreen.isVisible()) {
      const createButton = page.locator('button:has-text("Create")').first();
      await createButton.click();
      
      const nameInput = page.locator('input[type="text"]').first();
      if (await nameInput.isVisible()) {
        await nameInput.fill('History Test App');
        const submitButton = page.locator('button:has-text("Create")').last();
        await submitButton.click();
      }
    }

    await page.waitForTimeout(2000);

    // Send multiple messages
    const chatInput = page.locator('textarea, input[type="text"][placeholder*="message"]').first();
    const sendButton = page.locator('button:has-text("Send"), button[type="submit"]').first();

    await chatInput.fill('First message');
    await sendButton.click();
    await page.waitForTimeout(500);

    await chatInput.fill('Second message');
    await sendButton.click();
    await page.waitForTimeout(500);

    await chatInput.fill('Third message');
    await sendButton.click();
    await page.waitForTimeout(500);

    // Verify all messages are visible in history
    const messageContainer = page.locator('[data-testid="chat-messages"], .chat-messages, .message-list').first();
    await expect(messageContainer).toBeVisible();
    
    await expect(page.locator('text="First message"')).toBeVisible();
    await expect(page.locator('text="Second message"')).toBeVisible();
    await expect(page.locator('text="Third message"')).toBeVisible();
  });

  test('should persist data across page reloads', async ({ page }) => {
    // Create an app and send a message
    await page.goto('/');
    const welcomeScreen = page.locator('[data-testid="prestige-welcome-screen"]');
    if (await welcomeScreen.isVisible()) {
      const createButton = page.locator('button:has-text("Create")').first();
      await createButton.click();
      
      const nameInput = page.locator('input[type="text"]').first();
      if (await nameInput.isVisible()) {
        await nameInput.fill('Persistence Test App');
        const submitButton = page.locator('button:has-text("Create")').last();
        await submitButton.click();
      }
    }

    await page.waitForTimeout(2000);

    const chatInput = page.locator('textarea, input[type="text"][placeholder*="message"]').first();
    const sendButton = page.locator('button:has-text("Send"), button[type="submit"]').first();

    await chatInput.fill('Message before reload');
    await sendButton.click();
    await page.waitForTimeout(1000);

    // Reload the page
    await page.reload();
    await page.waitForTimeout(2000);

    // Verify the app and message are still there
    const appSidebar = page.locator('[data-testid="app-sidebar"], .app-sidebar, .sidebar');
    if (await appSidebar.first().isVisible()) {
      await expect(appSidebar.first()).toContainText('Persistence Test App');
    }

    // Check if the message is still visible (depending on implementation)
    await expect(page.locator('text="Message before reload"')).toBeVisible({ timeout: 5000 });
  });
});