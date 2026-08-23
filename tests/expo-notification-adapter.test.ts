import type { SQLiteDatabase } from 'expo-sqlite';
import * as Notifications from 'expo-notifications';
import { hasNotificationBeenDelivered, markNotificationDelivered } from '../src/services/notification-delivery-repository';
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

describe('Expo notification adapter', () => {
  it('recovers an OS-scheduled notification after a process restart', async () => {
    const db = {} as SQLiteDatabase;
    jest.spyOn({ hasNotificationBeenDelivered }, 'hasNotificationBeenDelivered');
    jest.spyOn({ markNotificationDelivered }, 'markNotificationDelivered');
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
