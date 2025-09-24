import { test, expect } from '@playwright/test';

// Minimal E2E smoke test that ensures the app boots and title renders

test('app loads and shows title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Prestige-AI/i);
  // Basic content presence: root div mounts and some text appears
  await expect(page.locator('#root')).toBeVisible();
});
