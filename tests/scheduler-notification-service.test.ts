import type { SQLiteDatabase } from 'expo-sqlite';
import { getNotificationCandidates } from '../src/services/scheduler-notification-service';
import * as scheduler from '../src/services/scheduler-service';

function mockDb(): SQLiteDatabase {
  return {} as SQLiteDatabase;
}

describe('scheduler notification service', () => {
  it('does not emit an already delivered task/due-time key', async () => {
    const db = mockDb();
    const state = { deliveredNotificationKeys: new Set(['task-1:2026-08-24T10:00:00.000Z']) };

    jest.spyOn(scheduler, 'listDueTasks').mockResolvedValue([
      {
        id: 'task-1', title: 'Already sent', notes: null, status: 'PLANNED', priority: 'MEDIUM',
        dueAt: '2026-08-24T10:00:00.000Z', plannedDate: '2026-08-24', completedAt: null,
        createdAt: '2026-08-23T10:00:00.000Z', updatedAt: '2026-08-23T10:00:00.000Z',
        dueAtDate: new Date('2026-08-24T10:00:00.000Z'),
      },
      {
        id: 'task-2', title: 'Send this', notes: null, status: 'PLANNED', priority: 'MEDIUM',
        dueAt: '2026-08-24T11:00:00.000Z', plannedDate: '2026-08-24', completedAt: null,
        createdAt: '2026-08-23T10:00:00.000Z', updatedAt: '2026-08-23T10:00:00.000Z',
        dueAtDate: new Date('2026-08-24T11:00:00.000Z'),
      },
    ]);

    await expect(getNotificationCandidates(db, new Date(), 60, state)).resolves.toEqual([
      { taskId: 'task-2', title: 'Send this', dueAt: '2026-08-24T11:00:00.000Z' },
    ]);
  });
});
