import { scheduleTaskNotification } from '../src/services/expo-notification-adapter';

const schedule = jest.fn().mockResolvedValue('os-notification-1');
const cancel = jest.fn().mockResolvedValue(undefined);

jest.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { DATE: 'date' },
  getAllScheduledNotificationsAsync: jest.fn().mockResolvedValue([]),
  scheduleNotificationAsync: schedule,
  cancelScheduledNotificationAsync: cancel,
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
    expect(schedule).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalledWith('os-notification-1');
  });
});
