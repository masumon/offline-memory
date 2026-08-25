import type { SQLiteDatabase } from 'expo-sqlite';
import { DATABASE_VERSION } from '../src/database';
import { restoreSQLiteBackupData } from '../src/backup/sqlite-restore';

function mockDb(): SQLiteDatabase {
  return {
    withTransactionAsync: jest.fn(async (callback) => callback()),
    runAsync: jest.fn(async () => ({ changes: 1, lastInsertRowId: 1 })),
  } as unknown as SQLiteDatabase;
}

const baseData = {
  schemaVersion: DATABASE_VERSION,
  appMetadata: [],
  tasks: [{ id: 'task-1', title: 'Test', notes: null, status: 'INBOX', priority: 'MEDIUM', due_at: null, completed_at: null, created_at: '2026-08-24T00:00:00Z', updated_at: '2026-08-24T00:00:00Z' }],
  subtasks: [],
  memories: [],
  notificationDeliveries: [],
};

function backup(data: Record<string, unknown>) {
  return { format: 'offline-memory-backup', version: 1, createdAt: '2026-08-24T00:00:00Z', data };
}

describe('SQLite backup restore', () => {
  it('rejects an unsupported schema before opening a transaction', async () => {
    const db = mockDb();
    await expect(restoreSQLiteBackupData(db, backup({ ...baseData, schemaVersion: DATABASE_VERSION - 3 }))).rejects.toThrow(
      `Unsupported database schema version: ${DATABASE_VERSION - 3}`,
    );
    expect(db.withTransactionAsync).not.toHaveBeenCalled();
  });

  it('rejects a subtask referencing a missing task', async () => {
    const db = mockDb();
    await expect(restoreSQLiteBackupData(db, backup({
      ...baseData,
      subtasks: [{ id: 'sub-1', task_id: 'missing', title: 'Bad', completed: 0, position: 0, created_at: '2026-08-24T00:00:00Z', updated_at: '2026-08-24T00:00:00Z' }],
    }))).rejects.toThrow('Subtask references missing task: missing');
    expect(db.withTransactionAsync).not.toHaveBeenCalled();
  });
});
