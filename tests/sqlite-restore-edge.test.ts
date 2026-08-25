import type { SQLiteDatabase } from 'expo-sqlite';
import { DATABASE_VERSION } from '../src/database';
import { restoreSQLiteBackupData } from '../src/backup/sqlite-restore';

function mockDb(): SQLiteDatabase {
  return { withTransactionAsync: jest.fn() } as unknown as SQLiteDatabase;
}

const task = { id: 'task-1', title: 'Test', notes: null, status: 'INBOX', priority: 'MEDIUM', due_at: null, completed_at: null, created_at: '2026-08-24T00:00:00Z', updated_at: '2026-08-24T00:00:00Z' };
const base = { schemaVersion: DATABASE_VERSION, appMetadata: [], tasks: [task], subtasks: [], memories: [], notificationDeliveries: [] };
const wrap = (data: Record<string, unknown>) => ({ format: 'offline-memory-backup', version: 1, createdAt: '2026-08-24T00:00:00Z', data });

describe('SQLite restore edge validation', () => {
  it('rejects duplicate task ids before mutation', async () => {
    const db = mockDb();
    await expect(restoreSQLiteBackupData(db, wrap({ ...base, tasks: [task, task] }))).rejects.toThrow('Duplicate id: task-1');
    expect(db.withTransactionAsync).not.toHaveBeenCalled();
  });

  it('rejects invalid memory importance before mutation', async () => {
    const db = mockDb();
    await expect(restoreSQLiteBackupData(db, wrap({
      ...base,
      memories: [{ id: 'memory-1', title: null, content: 'x', kind: 'NOTE', source: 'USER', tags_json: '[]', importance: 9, archived: 0, created_at: '2026-08-24T00:00:00Z', updated_at: '2026-08-24T00:00:00Z', last_accessed_at: null }],
    }))).rejects.toThrow('Backup importance must be an integer from 1 to 5');
    expect(db.withTransactionAsync).not.toHaveBeenCalled();
  });
});
