import type { SQLiteDatabase } from 'expo-sqlite';
import { searchRankedMemories } from '../src/services/memory-search-service';
import * as repository from '../src/services/memory-repository';

jest.mock('../src/services/memory-repository');

function mockDb(): SQLiteDatabase {
  return {} as SQLiteDatabase;
}

describe('ranked memory search', () => {
  it('returns no results for blank queries without hitting persistence', async () => {
    await expect(searchRankedMemories(mockDb(), '   ')).resolves.toEqual([]);
    expect(repository.searchMemories).not.toHaveBeenCalled();
  });

  it('ranks an exact phrase above a partial match and factors importance', async () => {
    jest.mocked(repository.searchMemories).mockResolvedValue([
      {
        id: '1', title: 'Supplier phone', content: 'Call supplier tomorrow', kind: 'NOTE', source: 'USER',
        tags: ['supplier'], importance: 3, archived: false, createdAt: '2026-08-20', updatedAt: '2026-08-21', lastAccessedAt: null,
      },
      {
        id: '2', title: 'Supplier', content: 'Supplier details', kind: 'FACT', source: 'USER',
        tags: ['work'], importance: 5, archived: false, createdAt: '2026-08-20', updatedAt: '2026-08-22', lastAccessedAt: null,
      },
    ]);

    const result = await searchRankedMemories(mockDb(), 'supplier phone');
    expect(result[0]?.id).toBe('1');
    expect(result[0]?.relevance).toBeGreaterThan(result[1]?.relevance ?? 0);
  });
});
