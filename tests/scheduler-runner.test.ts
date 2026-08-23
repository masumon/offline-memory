import type { SQLiteDatabase } from 'expo-sqlite';
import { getNotificationCandidates } from '../src/services/scheduler-notification-service';
import { scheduleTaskNotification } from '../src/services/expo-notification-adapter';
import { runNotificationScheduler } from '../src/services/scheduler-runner';

jest.mock('../src/services/scheduler-notification-service', () => ({
  getNotificationCandidates: jest.fn(),
}));
jest.mock('../src/services/expo-notification-adapter', () => ({
  scheduleTaskNotification: jest.fn(),
}));

describe('scheduler runner', () => {
  it('schedules every candidate and reports successful schedules', async () => {
    const candidates = [
      { taskId: 'task-1', title: 'First', dueAt: '2026-08-25T10:00:00.000Z' },
      { taskId: 'task-2', title: 'Second', dueAt: '2026-08-25T11:00:00.000Z' },
    ];
    jest.mocked(getNotificationCandidates).mockResolvedValue(candidates);
    jest.mocked(scheduleTaskNotification)
      .mockResolvedValueOnce('notification-1')
      .mockResolvedValueOnce(null);

    await expect(runNotificationScheduler({} as SQLiteDatabase)).resolves.toBe(1);
    expect(scheduleTaskNotification).toHaveBeenCalledTimes(2);
  });
});
