import { describe, it, expect } from 'vitest';
import {
  generateId,
  generateToken,
  hashString,
  formatBytes,
  formatDuration,
  formatCost,
  truncate,
  slugify,
  clamp,
  unique,
  groupBy,
  pick,
  omit,
} from './index.js';

describe('generateId', () => {
  it('returns a 32-character hex string', () => {
    const id = generateId();
    expect(id).toMatch(/^[0-9a-f]{32}$/);
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});

describe('generateToken', () => {
  it('returns a 64-character hex string', () => {
    const token = generateToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('hashString', () => {
  it('returns a SHA-256 hash', () => {
    const hash = hashString('hello');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns consistent hashes for same input', () => {
    expect(hashString('test')).toBe(hashString('test'));
  });

  it('returns different hashes for different inputs', () => {
    expect(hashString('abc')).not.toBe(hashString('xyz'));
  });
});

describe('formatBytes', () => {
  it('formats 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('formats bytes', () => {
    expect(formatBytes(500)).toBe('500 B');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(2048)).toBe('2 KB');
  });

  it('formats megabytes', () => {
    expect(formatBytes(5 * 1024 * 1024)).toBe('5 MB');
  });

  it('formats gigabytes', () => {
    expect(formatBytes(3 * 1024 * 1024 * 1024)).toBe('3 GB');
  });
});

describe('formatDuration', () => {
  it('formats milliseconds', () => {
    expect(formatDuration(500)).toBe('500ms');
  });

  it('formats seconds', () => {
    expect(formatDuration(2500)).toBe('2.5s');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(125000)).toBe('2m 5s');
  });

  it('formats hours and minutes', () => {
    expect(formatDuration(7500000)).toBe('2h 5m');
  });
});

describe('formatCost', () => {
  it('formats cents to dollars', () => {
    expect(formatCost(250)).toBe('$2.50');
  });

  it('handles sub-cent costs', () => {
    expect(formatCost(0.5)).toBe('<$0.01');
  });

  it('handles zero', () => {
    expect(formatCost(0)).toBe('$0.00');
  });
});

describe('truncate', () => {
  it('returns string unchanged if within max length', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('truncates with ellipsis', () => {
    expect(truncate('hello world', 8)).toBe('hello...');
  });

  it('handles exact length match', () => {
    expect(truncate('abc', 3)).toBe('abc');
  });
});

describe('slugify', () => {
  it('converts to lowercase slug', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('removes special characters', () => {
    expect(slugify('Hello! @World #2024')).toBe('hello-world-2024');
  });

  it('removes leading/trailing hyphens', () => {
    expect(slugify('--hello--')).toBe('hello');
  });

  it('collapses multiple hyphens', () => {
    expect(slugify('a  b   c')).toBe('a-b-c');
  });
});

describe('clamp', () => {
  it('returns value within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('clamps below minimum', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('clamps above maximum', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe('unique', () => {
  it('removes duplicates', () => {
    expect(unique([1, 2, 2, 3, 1, 3])).toEqual([1, 2, 3]);
  });

  it('handles empty array', () => {
    expect(unique([])).toEqual([]);
  });

  it('handles strings', () => {
    expect(unique(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
  });
});

describe('groupBy', () => {
  it('groups objects by key', () => {
    const items = [
      { type: 'a', name: 'foo' },
      { type: 'b', name: 'bar' },
      { type: 'a', name: 'baz' },
    ];
    const grouped = groupBy(items, 'type');
    expect(grouped['a']).toHaveLength(2);
    expect(grouped['b']).toHaveLength(1);
    expect(grouped['a'][0].name).toBe('foo');
  });

  it('handles empty array', () => {
    expect(groupBy([], 'type' as any)).toEqual({});
  });
});

describe('pick', () => {
  it('picks specified keys', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(pick(obj, ['a', 'c'])).toEqual({ a: 1, c: 3 });
  });

  it('handles missing keys', () => {
    const obj = { a: 1 };
    expect(pick(obj, ['a', 'b'] as any)).toEqual({ a: 1 });
  });
});

describe('omit', () => {
  it('omits specified keys', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(omit(obj, ['b'])).toEqual({ a: 1, c: 3 });
  });

  it('handles empty omit list', () => {
    const obj = { a: 1, b: 2 };
    expect(omit(obj, [])).toEqual({ a: 1, b: 2 });
  });
});
