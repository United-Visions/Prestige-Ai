import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MOCK_DATA, createMockElectronAPI } from '../test-utils';

// Mock a simple service that might exist in the app
class MockAppService {
  private electronAPI: any;

  constructor(electronAPI: any) {
    this.electronAPI = electronAPI;
  }

  async createApp(name: string, template: string = 'react') {
    if (!name || name.trim().length === 0) {
      throw new Error('App name is required');
    }

    const appId = `app-${Date.now()}`;
    
    // Simulate creating the app via Electron API
    await this.electronAPI.app.createApp(name, template);
    
    return {
      id: appId,
      name: name.trim(),
      template,
      path: `/test/apps/${appId}`,
      createdAt: new Date(),
    };
  }

  async getApps() {
    return this.electronAPI.app.getApps();
  }

  async deleteApp(appId: string) {
    if (!appId) {
      throw new Error('App ID is required');
    }

    return this.electronAPI.app.deleteApp(appId);
  }

  validateAppName(name: string): boolean {
    return name && 
           name.trim().length > 0 && 
           name.length <= 50 &&
           /^[a-zA-Z0-9\s\-_]+$/.test(name);
  }
}

describe('MockAppService', () => {
  let mockElectronAPI: any;
  let appService: MockAppService;

  beforeEach(() => {
    mockElectronAPI = createMockElectronAPI();
    appService = new MockAppService(mockElectronAPI);
  });

  describe('createApp', () => {
    it('creates an app with valid parameters', async () => {
      const appName = 'Test App';
      const app = await appService.createApp(appName);

      expect(app).toMatchObject({
        name: appName,
        template: 'react',
        path: expect.stringContaining('/test/apps/'),
      });
      expect(app.id).toMatch(/^app-\d+$/);
      expect(app.createdAt).toBeInstanceOf(Date);
      expect(mockElectronAPI.app.createApp).toHaveBeenCalledWith(appName, 'react');
    });

    it('creates an app with custom template', async () => {
      const appName = 'Vue App';
      const template = 'vue';
      const app = await appService.createApp(appName, template);

      expect(app.template).toBe(template);
      expect(mockElectronAPI.app.createApp).toHaveBeenCalledWith(appName, template);
    });

    it('trims whitespace from app name', async () => {
      const appName = '  Whitespace App  ';
      const app = await appService.createApp(appName);

      expect(app.name).toBe('Whitespace App');
    });

    it('throws error for empty app name', async () => {
      await expect(appService.createApp('')).rejects.toThrow('App name is required');
      await expect(appService.createApp('   ')).rejects.toThrow('App name is required');
    });

    it('throws error for null or undefined app name', async () => {
      await expect(appService.createApp(null as any)).rejects.toThrow('App name is required');
      await expect(appService.createApp(undefined as any)).rejects.toThrow('App name is required');
    });
  });

  describe('getApps', () => {
    it('returns apps from Electron API', async () => {
      const mockApps = [MOCK_DATA.APP];
      mockElectronAPI.app.getApps.mockResolvedValue(mockApps);

      const apps = await appService.getApps();

      expect(apps).toEqual(mockApps);
      expect(mockElectronAPI.app.getApps).toHaveBeenCalledOnce();
    });

    it('handles empty app list', async () => {
      mockElectronAPI.app.getApps.mockResolvedValue([]);

      const apps = await appService.getApps();

      expect(apps).toEqual([]);
    });
  });

  describe('deleteApp', () => {
    it('deletes an app with valid ID', async () => {
      const appId = 'test-app-123';
      await appService.deleteApp(appId);

      expect(mockElectronAPI.app.deleteApp).toHaveBeenCalledWith(appId);
    });

    it('throws error for empty app ID', async () => {
      await expect(appService.deleteApp('')).rejects.toThrow('App ID is required');
      await expect(appService.deleteApp(null as any)).rejects.toThrow('App ID is required');
      await expect(appService.deleteApp(undefined as any)).rejects.toThrow('App ID is required');
    });
  });

  describe('validateAppName', () => {
    it('validates correct app names', () => {
      expect(appService.validateAppName('Valid App')).toBe(true);
      expect(appService.validateAppName('test-app_123')).toBe(true);
      expect(appService.validateAppName('MyApp')).toBe(true);
    });

    it('rejects invalid app names', () => {
      expect(appService.validateAppName('')).toBeFalsy();
      expect(appService.validateAppName('   ')).toBeFalsy();
      expect(appService.validateAppName('app@invalid')).toBeFalsy();
      expect(appService.validateAppName('app<script>')).toBeFalsy();
      expect(appService.validateAppName('a'.repeat(51))).toBeFalsy(); // Too long
    });

    it('handles null and undefined', () => {
      expect(appService.validateAppName(null as any)).toBeFalsy();
      expect(appService.validateAppName(undefined as any)).toBeFalsy();
    });
  });
});