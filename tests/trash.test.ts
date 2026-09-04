import type { SQLiteDatabase } from 'expo-sqlite';
import {
  deleteTask,
  restoreTask,
  purgeTask,
  purgeExpiredTasks,
  listTrashedTasks,
} from '../src/services/task-repository';
import {
  deleteMemory,
  restoreMemory,
  purgeMemory,
  purgeExpiredMemories,
} from '../src/services/memory-repository';

// The trash feature turns delete into a reversible soft-delete: rows gain a
// `deleted_at` timestamp instead of leaving the table, and only `purge*` issues a
// real DELETE. These contract tests pin that behaviour at the repository seam so a
// future refactor can't silently make delete destructive again.

type Call = { sql: string; args: unknown[] };

function mockDb(overrides: { rows?: unknown[]; first?: unknown } = {}) {
  const run: Call[] = [];
  const all: Call[] = [];
  const get: Call[] = [];
  const db = {
    runAsync: jest.fn(async (sql: string, ...args: unknown[]) => {
      run.push({ sql, args });
      return { changes: 1, lastInsertRowId: 0 };
    }),
    getAllAsync: jest.fn(async (sql: string, ...args: unknown[]) => {
      all.push({ sql, args });
      return overrides.rows ?? [];
    }),
    getFirstAsync: jest.fn(async (sql: string, ...args: unknown[]) => {
      get.push({ sql, args });
      return overrides.first ?? null;
    }),
    withTransactionAsync: jest.fn(async (cb: () => Promise<void>) => cb()),
  } as unknown as SQLiteDatabase;
  const sqlOf = (list: Call[]) => list.map((c) => c.sql).join('\n');
  const argsOf = (list: Call[]) => list.flatMap((c) => c.args);
  return { db, run, all, get, sqlOf, argsOf };
}

describe('trash — tasks', () => {
  it('deleteTask soft-deletes (UPDATE ... SET deleted_at), never DELETE', async () => {
    const m = mockDb();
    const ok = await deleteTask(m.db, 't1');
    expect(ok).toBe(true);
    expect(m.run).toHaveLength(1);
    expect(m.sqlOf(m.run)).toMatch(/UPDATE tasks SET deleted_at = \?/i);
    expect(m.sqlOf(m.run)).toContain('WHERE id = ? AND deleted_at IS NULL');
    expect(m.sqlOf(m.run)).not.toMatch(/DELETE FROM tasks/i);
  });

  it('deleteTask reports false when the row was already trashed (0 changes)', async () => {
    const m = mockDb();
    (m.db.runAsync as jest.Mock).mockResolvedValueOnce({ changes: 0, lastInsertRowId: 0 });
    expect(await deleteTask(m.db, 'gone')).toBe(false);
  });

  it('restoreTask clears deleted_at only for a trashed row', async () => {
    const m = mockDb();
    const ok = await restoreTask(m.db, 't1');
    expect(ok).toBe(true);
    expect(m.sqlOf(m.run)).toMatch(/UPDATE tasks SET deleted_at = NULL/i);
    expect(m.sqlOf(m.run)).toContain('AND deleted_at IS NOT NULL');
  });

  it('purgeTask issues the real DELETE and cleans attachments + relations', async () => {
    const m = mockDb({ first: { id: 't1' } });
    const ok = await purgeTask(m.db, 't1');
    expect(ok).toBe(true);
    expect(m.sqlOf(m.run)).toMatch(/DELETE FROM tasks WHERE id=\?/i);
    expect(m.sqlOf(m.run)).toMatch(/DELETE FROM attachments/i);
    expect(m.sqlOf(m.run)).toMatch(/DELETE FROM relations/i);
  });

  it('purgeTask is a no-op when the row does not exist', async () => {
    const m = mockDb({ first: null });
    expect(await purgeTask(m.db, 'nope')).toBe(false);
    expect(m.run).toHaveLength(0);
  });

  it('purgeExpiredTasks only selects rows past the cutoff', async () => {
    const m = mockDb({ rows: [] });
    const cutoff = '2026-08-01T00:00:00.000Z';
    const n = await purgeExpiredTasks(m.db, cutoff);
    expect(n).toBe(0);
    expect(m.sqlOf(m.all)).toContain('deleted_at IS NOT NULL AND deleted_at < ?');
    expect(m.argsOf(m.all)).toEqual([cutoff]);
  });

  it('listTrashedTasks reads only trashed rows, newest first, with deletedAt', async () => {
    const row = {
      id: 't1', title: 'Old', notes: null, status: 'PLANNED', priority: 'MEDIUM',
      due_at: null, planned_date: null, completed_at: null, recurrence: null,
      created_at: '2026-07-01T00:00:00.000Z', updated_at: '2026-07-01T00:00:00.000Z',
      deleted_at: '2026-08-15T00:00:00.000Z',
    };
    const m = mockDb({ rows: [row] });
    const trashed = await listTrashedTasks(m.db);
    expect(m.sqlOf(m.all)).toContain('WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC');
    expect(trashed[0]).toMatchObject({ id: 't1', deletedAt: '2026-08-15T00:00:00.000Z' });
  });
});

describe('trash — memories', () => {
  it('deleteMemory soft-deletes (UPDATE ... SET deleted_at), never DELETE', async () => {
    const m = mockDb();
    const ok = await deleteMemory(m.db, 'm1');
    expect(ok).toBe(true);
    expect(m.sqlOf(m.run)).toMatch(/UPDATE memories SET deleted_at = \?/i);
    expect(m.sqlOf(m.run)).toContain('WHERE id = ? AND deleted_at IS NULL');
    expect(m.sqlOf(m.run)).not.toMatch(/DELETE FROM memories/i);
  });

  it('restoreMemory clears deleted_at only for a trashed row', async () => {
    const m = mockDb();
    await restoreMemory(m.db, 'm1');
    expect(m.sqlOf(m.run)).toMatch(/UPDATE memories SET deleted_at = NULL/i);
    expect(m.sqlOf(m.run)).toContain('AND deleted_at IS NOT NULL');
  });

  it('purgeMemory issues the real DELETE and cleans attachments + relations', async () => {
    const m = mockDb({ first: { id: 'm1' } });
    const ok = await purgeMemory(m.db, 'm1');
    expect(ok).toBe(true);
    expect(m.sqlOf(m.run)).toMatch(/DELETE FROM memories WHERE id=\?/i);
    expect(m.sqlOf(m.run)).toMatch(/DELETE FROM attachments/i);
    expect(m.sqlOf(m.run)).toMatch(/DELETE FROM relations/i);
  });

  it('purgeExpiredMemories only selects rows past the cutoff', async () => {
    const m = mockDb({ rows: [] });
    const cutoff = '2026-08-01T00:00:00.000Z';
    await purgeExpiredMemories(m.db, cutoff);
    expect(m.sqlOf(m.all)).toContain('deleted_at IS NOT NULL AND deleted_at < ?');
    expect(m.argsOf(m.all)).toEqual([cutoff]);
  });
});
