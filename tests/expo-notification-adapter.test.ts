import type { SQLiteDatabase } from 'expo-sqlite';
import * as Notifications from 'expo-notifications';
import { scheduleTaskNotification } from '../src/services/expo-notification-adapter';

jest.mock('expo-notifications', () => ({
  getAllScheduledNotificationsAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  AndroidImportance: { HIGH: 4 },
  AndroidNotificationVisibility: { PUBLIC: 1 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

jest.mock('../src/services/notification-delivery-repository', () => ({
  hasNotificationBeenDelivered: jest.fn().mockResolvedValue(false),
  markNotificationDelivered: jest.fn().mockResolvedValue(undefined),
}));

describe('Expo notification adapter', () => {
  it('recovers an OS-scheduled notification after a process restart', async () => {
    const db = {} as SQLiteDatabase;
    jest.mocked(Notifications.getAllScheduledNotificationsAsync).mockResolvedValue([
      {
        identifier: 'existing-1',
        content: { data: { taskId: 'task-1', dueAt: '2026-08-25T10:00:00.000Z' } },
        trigger: null,
      } as never,
    ]);

    await expect(
      scheduleTaskNotification(db, {
        taskId: 'task-1',
        title: 'Existing reminder',
        dueAt: '2026-08-25T10:00:00.000Z',
      }),
    ).resolves.toBe('existing-1');

    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});
