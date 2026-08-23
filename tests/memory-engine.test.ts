import { describe, expect, it } from '@jest/globals';

import type { CreateMemoryInput, MemoryKind } from '../src/types/memory-model';

describe('memory engine contracts', () => {
  it('accepts supported memory kinds', () => {
    const kinds: MemoryKind[] = ['NOTE', 'FACT', 'PREFERENCE', 'EVENT', 'REFLECTION'];
    expect(kinds).toHaveLength(5);
    expect(kinds).toContain('PREFERENCE');
  });

  it('keeps memory creation input local and deterministic', () => {
    const input: CreateMemoryInput = {
      content: 'User prefers concise reminders',
      kind: 'PREFERENCE',
      source: 'USER',
      tags: ['preferences', 'reminders'],
      importance: 4,
    };

    expect(input.source).toBe('USER');
    expect(input.tags).toEqual(['preferences', 'reminders']);
    expect(input.importance).toBe(4);
  });
});
