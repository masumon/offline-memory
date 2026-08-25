import { scheduleTaskNotification } from '../src/services/expo-notification-adapter';
import * as Notifications from 'expo-notifications';

jest.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { DATE: 'date' },
  AndroidNotificationPriority: { HIGH: 'HIGH', MAX: 'MAX', DEFAULT: 'DEFAULT', LOW: 'LOW', MIN: 'MIN' },
  getAllScheduledNotificationsAsync: jest.fn().mockResolvedValue([]),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('os-notification-1'),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../src/services/notification.service', () => ({
  initializeNotifications: jest.fn().mockResolvedValue(undefined),
  requestNotificationPermission: jest.fn().mockResolvedValue(true),
  TASK_CHANNEL_ID: 'tasks',
}));

jest.mock('../src/services/notification-delivery-repository', () => ({
  hasNotificationBeenDelivered: jest.fn().mockResolvedValue(false),
  markNotificationDelivered: jest.fn().mockRejectedValue(new Error('db write failed')),
}));

describe('notification scheduling atomicity', () => {
  it('cancels the OS reminder when delivery state cannot be persisted', async () => {
    const db = {} as never;
    await expect(scheduleTaskNotification(db, {
      taskId: 'task-1',
      title: 'Test reminder',
      dueAt: '2099-01-01T10:00:00.000Z',
    })).rejects.toThrow('db write failed');
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('os-notification-1');
  });
});
