import type { SQLiteDatabase } from 'expo-sqlite';
import { searchRankedMemories } from '../src/services/memory-search-service';

function mockDb(): SQLiteDatabase {
  return {} as SQLiteDatabase;
}

describe('ranked local memory search', () => {
  it('returns no results for blank input without touching persistence', async () => {
    await expect(searchRankedMemories(mockDb(), '   ')).resolves.toEqual([]);
  });
});
