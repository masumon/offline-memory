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

  it('re-queues a delivered reminder the OS has dropped, and clears its marker', async () => {
    const cleared: string[] = [];
    const db = {
      getFirstAsync: async () => ({ task_id: 'task-x' }), // marked delivered
      runAsync: async (_sql: string, taskId: string, dueAt: string) => { cleared.push(`${taskId}:${dueAt}`); return { changes: 1 }; },
    } as unknown as SQLiteDatabase;
    const now = new Date('2026-08-24T09:00:00.000Z');
    jest.spyOn(scheduler, 'listDueTasks').mockResolvedValue([
      { id: 'task-x', title: 'Dropped by Doze', notes: null, status: 'PLANNED', priority: 'HIGH',
        dueAt: '2026-08-24T10:00:00.000Z', plannedDate: '2026-08-24', completedAt: null,
        createdAt: '', updatedAt: '', dueAtDate: new Date('2026-08-24T10:00:00.000Z') },
    ]);

    // OS has NO live reminder for this key → treat as dropped and re-queue.
    const result = await getNotificationCandidates(db, now, 120, { liveScheduledKeys: new Set<string>() });
    expect(result).toEqual([{ taskId: 'task-x', title: 'Dropped by Doze', dueAt: '2026-08-24T10:00:00.000Z' }]);
    expect(cleared).toEqual(['task-x:2026-08-24T10:00:00.000Z']);

    // OS still HAS it → leave it alone.
    cleared.length = 0;
    const kept = await getNotificationCandidates(db, now, 120, { liveScheduledKeys: new Set(['task-x:2026-08-24T10:00:00.000Z']) });
    expect(kept).toEqual([]);
    expect(cleared).toEqual([]);
  });
});
