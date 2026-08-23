import type { SQLiteDatabase } from 'expo-sqlite';
import { getNotificationCandidates } from '../src/services/scheduler-notification-service';

function mockDb(): SQLiteDatabase {
  return {} as SQLiteDatabase;
}

describe('scheduler notification service', () => {
  it('does not emit already delivered task ids', async () => {
    const db = mockDb();
    const state = { deliveredTaskIds: new Set(['task-1']) };
    const scheduler = jest
      .require('../src/services/scheduler-service') as typeof import('../src/services/scheduler-service');

    jest.spyOn(scheduler, 'listDueTasks').mockResolvedValue([
      {
        id: 'task-1', title: 'Already sent', notes: null, status: 'PLANNED', priority: 'MEDIUM',
        dueAt: '2026-08-24T10:00:00.000Z', completedAt: null,
        createdAt: '2026-08-23T10:00:00.000Z', updatedAt: '2026-08-23T10:00:00.000Z',
        dueAtDate: new Date('2026-08-24T10:00:00.000Z'),
      },
      {
        id: 'task-2', title: 'Send this', notes: null, status: 'PLANNED', priority: 'MEDIUM',
        dueAt: '2026-08-24T11:00:00.000Z', completedAt: null,
        createdAt: '2026-08-23T10:00:00.000Z', updatedAt: '2026-08-23T10:00:00.000Z',
        dueAtDate: new Date('2026-08-24T11:00:00.000Z'),
      },
    ]);

    await expect(getNotificationCandidates(db, new Date(), 60, state)).resolves.toEqual([
      { taskId: 'task-2', title: 'Send this', dueAt: '2026-08-24T11:00:00.000Z' },
    ]);
  });
});
