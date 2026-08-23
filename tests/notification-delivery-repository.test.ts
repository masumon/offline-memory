import type { SQLiteDatabase } from 'expo-sqlite';
import { hasNotificationBeenDelivered, markNotificationDelivered } from '../src/services/notification-delivery-repository';

describe('notification delivery repository', () => {
  it('uses an idempotent insert for delivery state', async () => {
    const runAsync = jest.fn().mockResolvedValue({ changes: 1 });
    const getFirstAsync = jest.fn().mockResolvedValue(undefined);
    const db = { runAsync, getFirstAsync } as unknown as SQLiteDatabase;

    await markNotificationDelivered(db, 'task-1', '2026-08-24T10:00:00.000Z');
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR IGNORE'),
      'task-1',
      expect.any(String),
      '2026-08-24T10:00:00.000Z',
    );
    await expect(hasNotificationBeenDelivered(db, 'task-1')).resolves.toBe(false);
  });
});
