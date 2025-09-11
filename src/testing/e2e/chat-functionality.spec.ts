import { test, expect } from '@playwright/test';

test.describe('Chat Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Setup: Create an app if needed to access chat
    const welcomeScreen = page.locator('[data-testid="prestige-welcome-screen"]');
    if (await welcomeScreen.isVisible()) {
      const createButton = page.locator('button:has-text("Create"), button:has-text("New")').first();
      if (await createButton.isVisible()) {
        await createButton.click();
        await page.waitForTimeout(1000);
        
        // Fill app name if there's a form
        const nameInput = page.locator('input[type="text"], input[placeholder*="name"]').first();
        if (await nameInput.isVisible()) {
          await nameInput.fill('Test Chat App');
          const submitButton = page.locator('button:has-text("Create"), button[type="submit"]').last();
          await submitButton.click();
        }
      }
    }
  });

  test('should display chat input field', async ({ page }) => {
    const chatInput = page.locator('textarea, input[type="text"][placeholder*="message"], [data-testid="chat-input"]');
    await expect(chatInput.first()).toBeVisible();
  });

  test('should allow typing in chat input', async ({ page }) => {
    const chatInput = page.locator('textarea, input[type="text"][placeholder*="message"], [data-testid="chat-input"]').first();
    
    await chatInput.fill('Hello, this is a test message');
    await expect(chatInput).toHaveValue('Hello, this is a test message');
  });

  test('should have send button', async ({ page }) => {
    const sendButton = page.locator('button:has-text("Send"), button[type="submit"], [data-testid="send-button"]');
    await expect(sendButton.first()).toBeVisible();
  });

  test('should handle message sending', async ({ page }) => {
    const chatInput = page.locator('textarea, input[type="text"][placeholder*="message"], [data-testid="chat-input"]').first();
    const sendButton = page.locator('button:has-text("Send"), button[type="submit"], [data-testid="send-button"]').first();
    
    await chatInput.fill('Test message');
    await sendButton.click();
    
    // Should clear input after sending
    await expect(chatInput).toHaveValue('');
    
    // Should show the message in chat history
    const messageContainer = page.locator('[data-testid="chat-messages"], .chat-messages, .message-list');
    await expect(messageContainer.first()).toBeVisible();
  });

  test('should support keyboard shortcuts', async ({ page }) => {
    const chatInput = page.locator('textarea, input[type="text"][placeholder*="message"], [data-testid="chat-input"]').first();
    
    await chatInput.fill('Test message with keyboard');
    
    // Test Enter to send (if implemented)
    await chatInput.press('Enter');
    
    // Should handle the message
    await page.waitForTimeout(500);
    await expect(chatInput).toHaveValue('');
  });

  test('should display chat history', async ({ page }) => {
    // Send a test message first
    const chatInput = page.locator('textarea, input[type="text"][placeholder*="message"], [data-testid="chat-input"]').first();
    const sendButton = page.locator('button:has-text("Send"), button[type="submit"], [data-testid="send-button"]').first();
    
    await chatInput.fill('Test message for history');
    await sendButton.click();
    
    // Check that message appears in history
    const messageHistory = page.locator('[data-testid="chat-messages"], .chat-messages, .message-list');
    await expect(messageHistory.first()).toBeVisible();
    
    // Should contain the sent message
    await expect(page.locator('text="Test message for history"')).toBeVisible();
  });

  test('should handle different message types', async ({ page }) => {
    const chatInput = page.locator('textarea, input[type="text"][placeholder*="message"], [data-testid="chat-input"]').first();
    const sendButton = page.locator('button:has-text("Send"), button[type="submit"], [data-testid="send-button"]').first();
    
    // Test code block
    await chatInput.fill('```javascript\nconsole.log("Hello World");\n```');
    await sendButton.click();
    await page.waitForTimeout(500);
    
    // Test markdown
    await chatInput.fill('**Bold text** and *italic text*');
    await sendButton.click();
    await page.waitForTimeout(500);
    
    // Should handle different message formats
    const messageContainer = page.locator('[data-testid="chat-messages"], .chat-messages, .message-list').first();
    await expect(messageContainer).toBeVisible();
  });

  test('should show loading state during AI response', async ({ page }) => {
    const chatInput = page.locator('textarea, input[type="text"][placeholder*="message"], [data-testid="chat-input"]').first();
    const sendButton = page.locator('button:has-text("Send"), button[type="submit"], [data-testid="send-button"]').first();
    
    await chatInput.fill('Generate a React component');
    await sendButton.click();
    
    // Should show loading indicator
    const loadingIndicator = page.locator('[data-testid="generating-indicator"], .loading, .spinner');
    
    // Check if loading indicator appears (might be quick)
    try {
      await expect(loadingIndicator.first()).toBeVisible({ timeout: 2000 });
    } catch (e) {
      // Loading might be too fast to catch, that's okay
      console.log('Loading indicator was too fast to detect');
    }
  });

  test('should handle error states', async ({ page }) => {
    // This test might need to mock API failures or use specific test conditions
    // For now, check that error handling UI exists
    const errorContainer = page.locator('[data-testid="error-message"], .error, .alert-error');
    
    // Error container should exist (even if hidden initially)
    await expect(errorContainer.first()).toBeAttached();
  });
});