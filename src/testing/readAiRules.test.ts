import { describe, it, expect, beforeEach } from 'vitest';
import { readAiRules } from '@/prompts/system_prompt';

// Mock electronAPI for normalization logic
const mockJoin = (...parts: string[]) => parts.join('/').replace(/\/+/g, '/');

beforeEach(() => {
  (global as any).window = {
    electronAPI: {
      app: {
        getDesktopPath: () => Promise.resolve('/Users/test/Desktop')
      },
      path: {
        join: (...p: string[]) => Promise.resolve(mockJoin(...p))
      },
      fs: {
        readFile: (p: string) => {
          if (p.endsWith('AI_RULES.md')) {
            return Promise.resolve('# AI RULES\nTest content');
          }
          return Promise.reject(new Error('File not found'));
        }
      }
    }
  };
});

describe('readAiRules path normalization', () => {
  it('resolves when given just app name', async () => {
    const content = await readAiRules('my-app-1234');
    expect(content).toContain('Test content');
  });

  it('resolves when given absolute app root without files suffix', async () => {
    const content = await readAiRules('/Users/test/Desktop/prestige-ai/my-app-1234');
    expect(content).toContain('Test content');
  });

  it('resolves when given files directory already', async () => {
    const content = await readAiRules('/Users/test/Desktop/prestige-ai/my-app-1234/files');
    expect(content).toContain('Test content');
  });
});
