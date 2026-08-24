import type { SQLiteDatabase } from 'expo-sqlite';
import { listMemories, updateMemory } from '../src/services/memory-repository';
import { filterMemories, restoreStoredMemory } from '../src/services/memory-service';

jest.mock('../src/services/memory-repository', () => ({
  archiveMemory: jest.fn(), createMemory: jest.fn(), deleteMemory: jest.fn(), getMemory: jest.fn(),
  listMemories: jest.fn(), searchMemories: jest.fn(), touchMemory: jest.fn(), updateMemory: jest.fn(),
}));

const memory = (id: string, kind: 'NOTE' | 'FACT', tags: string[], archived = false) => ({
  id, title: id, content: id, kind, source: 'USER', tags, importance: 3, archived,
  createdAt: '2026-08-24T00:00:00.000Z', updatedAt: '2026-08-24T00:00:00.000Z', lastAccessedAt: null,
});

describe('memory service controls', () => {
  beforeEach(() => jest.clearAllMocks());

  it('filters active memories by kind and exact tag', async () => {
    jest.mocked(listMemories).mockResolvedValue([memory('a', 'NOTE', ['Work']), memory('b', 'FACT', ['Work'])] as never);
    const result = await filterMemories({} as SQLiteDatabase, { kind: 'NOTE', tag: 'work' });
    expect(result.map((item) => item.id)).toEqual(['a']);
    expect(listMemories).toHaveBeenCalledWith(expect.anything(), false);
  });

  it('restores an archived memory through the repository boundary', async () => {
    jest.mocked(updateMemory).mockResolvedValue(memory('a', 'NOTE', [], false) as never);
    await restoreStoredMemory({} as SQLiteDatabase, 'a');
    expect(updateMemory).toHaveBeenCalledWith(expect.anything(), 'a', { archived: false });
  });
});
