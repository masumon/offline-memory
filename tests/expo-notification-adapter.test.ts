import type { SQLiteDatabase } from 'expo-sqlite';
import * as Notifications from 'expo-notifications';
import { reconcileScheduledTaskNotifications, scheduleTaskNotification } from '../src/services/expo-notification-adapter';

jest.mock('expo-notifications', () => ({
  getAllScheduledNotificationsAsync: jest.fn(), cancelScheduledNotificationAsync: jest.fn(), getPermissionsAsync: jest.fn(), requestPermissionsAsync: jest.fn(), scheduleNotificationAsync: jest.fn(), setNotificationChannelAsync: jest.fn(),
  AndroidImportance: { HIGH: 4 }, AndroidNotificationVisibility: { PUBLIC: 1 }, SchedulableTriggerInputTypes: { DATE: 'date' },
}));
jest.mock('../src/services/notification-delivery-repository', () => ({ hasNotificationBeenDelivered: jest.fn().mockResolvedValue(false), markNotificationDelivered: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../src/services/task-repository', () => ({ getTask: jest.fn() }));

import * as taskRepository from '../src/services/task-repository';
const mockedGetTask = jest.mocked(taskRepository.getTask);

describe('Expo notification adapter', () => {
  beforeEach(() => jest.clearAllMocks());

  it('recovers an OS-scheduled notification after a process restart', async () => {
    const db = {} as SQLiteDatabase;
    jest.mocked(Notifications.getAllScheduledNotificationsAsync).mockResolvedValue([{ identifier: 'existing-1', content: { data: { taskId: 'task-1', dueAt: '2026-08-25T10:00:00.000Z' } }, trigger: null } as never]);
    await expect(scheduleTaskNotification(db, { taskId: 'task-1', title: 'Existing reminder', dueAt: '2026-08-25T10:00:00.000Z' })).resolves.toBe('existing-1');
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('cancels an OS reminder whose task was completed', async () => {
    const db = {} as SQLiteDatabase;
    jest.mocked(Notifications.getAllScheduledNotificationsAsync).mockResolvedValue([{ identifier: 'stale-1', content: { data: { taskId: 'task-1', dueAt: '2026-08-25T10:00:00.000Z' } }, trigger: null } as never]);
    mockedGetTask.mockResolvedValue({ id: 'task-1', title: 'Task', status: 'COMPLETED', priority: 'MEDIUM', notes: null, dueAt: '2026-08-25T10:00:00.000Z', plannedDate: '2026-08-25', completedAt: '2026-08-24T08:00:00.000Z', createdAt: '', updatedAt: '' });
    await expect(reconcileScheduledTaskNotifications(db, new Date('2026-08-24T09:00:00.000Z'))).resolves.toBe(1);
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('stale-1');
  });
});
