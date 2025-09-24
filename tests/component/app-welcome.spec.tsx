import { test, expect } from '@playwright/experimental-ct-react';
import React from 'react';

// Minimal component smoke test (no app imports to avoid env coupling)
test('component smoke renders', async ({ mount }) => {
  const component = await mount(<div data-testid="smoke">CT Smoke</div>);
  await expect(component.getByTestId('smoke')).toContainText('CT Smoke');
});
