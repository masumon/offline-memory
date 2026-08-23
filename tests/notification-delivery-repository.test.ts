import type { SQLiteDatabase } from 'expo-sqlite';
import { hasNotificationBeenDelivered, markNotificationDelivered } from '../src/services/notification-delivery-repository';

describe('notification delivery repository', () => {
  it('uses task and due time as the idempotency key', async () => {
    const runAsync = jest.fn().mockResolvedValue({ changes: 1 });
    const getFirstAsync = jest.fn().mockResolvedValue(undefined);
    const db = { runAsync, getFirstAsync } as unknown as SQLiteDatabase;
    const dueAt = '2026-08-24T10:00:00.000Z';

    await markNotificationDelivered(db, 'task-1', dueAt);
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR IGNORE'),
      'task-1',
      dueAt,
      expect.any(String),
    );
    await expect(hasNotificationBeenDelivered(db, 'task-1', dueAt)).resolves.toBe(false);
    expect(getFirstAsync).toHaveBeenCalledWith(expect.stringContaining('due_at = ?'), 'task-1', dueAt);
  });
});
