import { describe, it, expect, vi } from 'vitest';
import { cn, generateId, formatTimestamp, sanitizeFilename, createTempFileName } from '@/lib/utils';

describe('Utils', () => {
  describe('cn (className utility)', () => {
    it('merges class names correctly', () => {
      const result = cn('class1', 'class2');
      expect(result).toContain('class1');
      expect(result).toContain('class2');
    });

    it('handles conditional classes', () => {
      const result = cn('base', { active: true, inactive: false });
      expect(result).toContain('base');
      expect(result).toContain('active');
      expect(result).not.toContain('inactive');
    });

    it('resolves tailwind conflicts', () => {
      const result = cn('px-4', 'px-8');
      expect(result).toBe('px-8'); // Later class should override
    });
  });

  describe('generateId', () => {
    it('generates a unique string', () => {
      const id1 = generateId();
      const id2 = generateId();
      
      expect(typeof id1).toBe('string');
      expect(typeof id2).toBe('string');
      expect(id1).not.toBe(id2);
      expect(id1.length).toBeGreaterThan(0);
    });

    it('generates IDs that are URL-safe', () => {
      const id = generateId();
      expect(id).toMatch(/^[a-z0-9]+$/);
    });
  });

  describe('formatTimestamp', () => {
    it('formats a date correctly', () => {
      const date = new Date('2023-12-25T14:30:00');
      const formatted = formatTimestamp(date);
      
      expect(formatted).toMatch(/\d{1,2}:\d{2}/); // Should match HH:MM format
    });

    it('returns current time when date is undefined', () => {
      const formatted = formatTimestamp(undefined);
      expect(formatted).toMatch(/\d{1,2}:\d{2}/);
    });

    it('uses 24-hour or 12-hour format based on locale', () => {
      const date = new Date('2023-12-25T14:30:00');
      const formatted = formatTimestamp(date);
      
      // Should be either 14:30 (24h) or 2:30 (12h)
      expect(formatted).toMatch(/(\d{1,2}:\d{2})/);
    });
  });

  describe('sanitizeFilename', () => {
    it('replaces invalid characters with underscores', () => {
      const filename = 'my file/with\\invalid*chars.txt';
      const sanitized = sanitizeFilename(filename);
      
      expect(sanitized).toBe('my_file_with_invalid_chars.txt');
    });

    it('preserves valid characters', () => {
      const filename = 'valid-filename_123.txt';
      const sanitized = sanitizeFilename(filename);
      
      expect(sanitized).toBe(filename); // Should remain unchanged
    });

    it('handles special characters', () => {
      const filename = 'test@#$%^&*()file.txt';
      const sanitized = sanitizeFilename(filename);
      
      expect(sanitized).not.toMatch(/[@#$%^&*()]/);
      expect(sanitized).toMatch(/^[a-z0-9._-]+$/i);
    });

    it('handles empty string', () => {
      const sanitized = sanitizeFilename('');
      expect(sanitized).toBe('');
    });
  });

  describe('createTempFileName', () => {
    beforeEach(() => {
      // Mock Date.now for consistent testing
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2023-12-25T10:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('creates a temporary filename with default extension', () => {
      const filename = createTempFileName();
      
      expect(filename).toMatch(/^prestige-ai-\d+-[a-z0-9]+\.txt$/);
    });

    it('uses custom extension', () => {
      const filename = createTempFileName('.json');
      
      expect(filename).toMatch(/^prestige-ai-\d+-[a-z0-9]+\.json$/);
    });

    it('includes timestamp in filename', () => {
      const filename = createTempFileName();
      const timestamp = Date.now().toString();
      
      expect(filename).toContain(timestamp);
    });

    it('generates unique filenames', () => {
      const file1 = createTempFileName();
      const file2 = createTempFileName();
      
      expect(file1).not.toBe(file2);
    });

    it('creates valid filename format', () => {
      const filename = createTempFileName('.md');
      
      expect(filename).toMatch(/^[a-z0-9-_.]+$/i);
      expect(filename.startsWith('prestige-ai-')).toBe(true);
      expect(filename.endsWith('.md')).toBe(true);
    });
  });
});