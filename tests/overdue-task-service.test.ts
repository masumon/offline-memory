import type { SQLiteDatabase } from 'expo-sqlite';
import { listOverdueTasks } from '../src/services/overdue-task-service';
import * as repository from '../src/services/task-repository';

describe('overdue task service', () => {
  it('returns only planned tasks strictly before now', async () => {
    const db = {} as SQLiteDatabase;
    jest.spyOn(repository, 'findDueTasks').mockResolvedValue([
      {
        id: 'overdue', title: 'Missed task', notes: null, status: 'PLANNED', priority: 'MEDIUM',
        dueAt: '2026-08-24T08:00:00.000Z', completedAt: null,
        createdAt: '2026-08-23T08:00:00.000Z', updatedAt: '2026-08-23T08:00:00.000Z',
      },
      {
        id: 'future', title: 'Future task', notes: null, status: 'PLANNED', priority: 'MEDIUM',
        dueAt: '2026-08-24T12:00:00.000Z', completedAt: null,
        createdAt: '2026-08-23T08:00:00.000Z', updatedAt: '2026-08-23T08:00:00.000Z',
      },
    ]);

    await expect(listOverdueTasks(db, new Date('2026-08-24T10:00:00.000Z'))).resolves.toHaveLength(1);
  });
});
