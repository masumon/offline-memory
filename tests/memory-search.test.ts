import type { SQLiteDatabase } from 'expo-sqlite';
import { searchMemories } from '../src/services/memory-repository';

function dbWithRows(rows: Record<string, unknown>[]): SQLiteDatabase {
  return {
    getAllAsync: jest.fn().mockResolvedValue(rows),
  } as unknown as SQLiteDatabase;
}

const row = (id: string, title: string, content: string, tags = '[]', importance = 3) => ({
  id, title, content, kind: 'NOTE', source: 'USER', tags_json: tags, importance, archived: 0,
  created_at: '2026-08-24T00:00:00.000Z', updated_at: '2026-08-24T00:00:00.000Z', last_accessed_at: null,
});

describe('ranked local memory search', () => {
  it('returns title matches before weaker content matches', async () => {
    const db = dbWithRows([
      row('content', 'Other', 'Remember the supplier phone number'),
      row('title', 'Supplier', 'A general note'),
    ]);

    const results = await searchMemories(db, 'supplier');
    expect(results.map((memory) => memory.id)).toEqual(['title', 'content']);
  });

  it('supports tag matches and case normalization', async () => {
    const db = dbWithRows([row('tagged', 'Work', 'General note', '["Project Alpha"]')]);

    const results = await searchMemories(db, 'project alpha');
    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe('tagged');
  });

  it('supports match-all as a stricter retrieval mode', async () => {
    const db = dbWithRows([row('one', 'One', 'alpha beta'), row('two', 'Two', 'alpha only')]);

    const results = await searchMemories(db, 'alpha beta', true);
    expect(results.map((memory) => memory.id)).toEqual(['one']);
  });

  it('does not return archived rows', async () => {
    const db = dbWithRows([row('archived', 'Alpha', 'alpha')]);
    await searchMemories(db, 'alpha');
    expect(db.getAllAsync).toHaveBeenCalledWith(expect.stringContaining('archived = 0'), '%alpha%', '%alpha%', '%alpha%');
  });
});
