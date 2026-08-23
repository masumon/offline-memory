import type { SQLiteDatabase } from 'expo-sqlite';
import { readSQLiteBackupData } from '../src/backup/sqlite-reader';

describe('SQLite backup reader', () => {
  it('reads all backup tables deterministically', async () => {
    const db = {
      getAllAsync: jest.fn()
        .mockResolvedValueOnce([{ key: 'a', value: '1', updated_at: '2026-08-24T00:00:00Z' }])
        .mockResolvedValueOnce([{ id: 'task-1' }])
        .mockResolvedValueOnce([{ id: 'sub-1' }])
        .mockResolvedValueOnce([{ id: 'memory-1' }])
        .mockResolvedValueOnce([{ task_id: 'task-1', due_at: '2026-08-24T01:00:00Z', delivered_at: '2026-08-24T00:59:00Z' }]),
      getFirstAsync: jest.fn().mockResolvedValue({ user_version: 5 }),
    } as unknown as SQLiteDatabase;

    await expect(readSQLiteBackupData(db)).resolves.toEqual({
      appMetadata: [{ key: 'a', value: '1', updated_at: '2026-08-24T00:00:00Z' }],
      tasks: [{ id: 'task-1' }],
      subtasks: [{ id: 'sub-1' }],
      memories: [{ id: 'memory-1' }],
      notificationDeliveries: [{ task_id: 'task-1', due_at: '2026-08-24T01:00:00Z', delivered_at: '2026-08-24T00:59:00Z' }],
      schemaVersion: 5,
    });
  });
});
