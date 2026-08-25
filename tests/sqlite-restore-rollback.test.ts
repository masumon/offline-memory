import type { SQLiteDatabase } from 'expo-sqlite';
import { DATABASE_VERSION } from '../src/database';
import { restoreSQLiteBackupData } from '../src/backup/sqlite-restore';

const validBackup = {
  format: 'offline-memory-backup',
  version: 1,
  createdAt: '2026-08-24T00:00:00Z',
  data: {
    schemaVersion: DATABASE_VERSION,
    appMetadata: [],
    tasks: [{ id: 'task-1', title: 'Test', notes: null, status: 'INBOX', priority: 'MEDIUM', due_at: null, completed_at: null, created_at: '2026-08-24T00:00:00Z', updated_at: '2026-08-24T00:00:00Z' }],
    subtasks: [], memories: [], notificationDeliveries: [],
  },
};

describe('SQLite restore rollback boundary', () => {
  it('propagates a write failure from the transaction', async () => {
    const db = {
      withTransactionAsync: jest.fn(async (callback) => callback()),
      runAsync: jest.fn()
        .mockResolvedValueOnce({ changes: 1, lastInsertRowId: 0 })
        .mockResolvedValueOnce({ changes: 1, lastInsertRowId: 0 })
        .mockRejectedValueOnce(new Error('injected restore failure')),
    } as unknown as SQLiteDatabase;

    await expect(restoreSQLiteBackupData(db, validBackup)).rejects.toThrow('injected restore failure');
    expect(db.withTransactionAsync).toHaveBeenCalledTimes(1);
  });
});
