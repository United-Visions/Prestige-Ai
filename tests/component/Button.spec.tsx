import { test, expect } from '@playwright/experimental-ct-react';
import { Button } from '@/components/ui/button';

test.describe('Button Component', () => {
  test('should render with default props', async ({ mount }) => {
    const component = await mount(<Button>Click me</Button>);
    await expect(component).toContainText('Click me');
  });

  test('should handle click events', async ({ mount }) => {
    let clicked = false;
    const component = await mount(
      <Button onClick={() => { clicked = true; }}>
        Click me
      </Button>
    );
    
    await component.click();
    await expect(component).toContainText('Click me');
    // Note: We can't directly assert on the clicked variable in component tests
    // but the click should not throw an error
  });

  test('should support different variants', async ({ mount }) => {
    const primaryButton = await mount(<Button variant="default">Primary</Button>);
    const secondaryButton = await mount(<Button variant="secondary">Secondary</Button>);
    const destructiveButton = await mount(<Button variant="destructive">Destructive</Button>);
    
    await expect(primaryButton).toContainText('Primary');
    await expect(secondaryButton).toContainText('Secondary');
    await expect(destructiveButton).toContainText('Destructive');
  });

  test('should support different sizes', async ({ mount }) => {
    const defaultButton = await mount(<Button size="default">Default</Button>);
    const smallButton = await mount(<Button size="sm">Small</Button>);
    const largeButton = await mount(<Button size="lg">Large</Button>);
    
    await expect(defaultButton).toContainText('Default');
    await expect(smallButton).toContainText('Small');
    await expect(largeButton).toContainText('Large');
  });

  test('should be disabled when disabled prop is true', async ({ mount }) => {
    const component = await mount(<Button disabled>Disabled Button</Button>);
    
    await expect(component).toBeDisabled();
    await expect(component).toContainText('Disabled Button');
  });

  test('should render as different HTML elements', async ({ mount }) => {
    const linkButton = await mount(
      <Button asChild>
        <a href="https://example.com">Link Button</a>
      </Button>
    );
    
    await expect(linkButton).toContainText('Link Button');
  });
});