import type { SQLiteDatabase } from 'expo-sqlite';
import { searchRankedMemories } from '../src/services/memory-search-service';
import * as repository from '../src/services/memory-repository';

jest.mock('../src/services/memory-repository');

function mockDb(): SQLiteDatabase { return {} as SQLiteDatabase; }

const memory = (id: string, title: string, content: string, tags: string[], importance = 3) => ({
  id, title, content, kind: 'NOTE', source: 'USER', tags, importance, archived: false,
  createdAt: '2026-08-20', updatedAt: '2026-08-21', lastAccessedAt: null,
});

describe('ranked memory search', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns no results for blank queries without hitting persistence', async () => {
    await expect(searchRankedMemories(mockDb(), '   ')).resolves.toEqual([]);
    expect(repository.searchMemories).not.toHaveBeenCalled();
  });

  it('uses OR candidate retrieval so partial multi-word matches can be ranked', async () => {
    jest.mocked(repository.searchMemories).mockResolvedValue([]);
    await searchRankedMemories(mockDb(), 'supplier phone');
    expect(repository.searchMemories).toHaveBeenCalledWith(expect.anything(), 'supplier phone', false);
  });

  it('ranks an exact phrase above a partial match', async () => {
    jest.mocked(repository.searchMemories).mockResolvedValue([
      memory('1', 'Supplier phone', 'Call supplier tomorrow', ['supplier'], 3),
      memory('2', 'Supplier', 'Supplier details', ['work'], 5),
    ] as never);
    const result = await searchRankedMemories(mockDb(), 'supplier phone');
    expect(result[0]?.id).toBe('1');
    expect(result[0]?.relevance).toBeGreaterThan(result[1]?.relevance ?? 0);
  });

  it('normalizes Unicode text before ranking', async () => {
    jest.mocked(repository.searchMemories).mockResolvedValue([
      memory('bn', 'দোকান', 'দোকানের হিসাব এখানে আছে', ['ব্যবসা']),
    ] as never);
    const result = await searchRankedMemories(mockDb(), ' দোকান ');
    expect(result[0]?.id).toBe('bn');
  });
});
