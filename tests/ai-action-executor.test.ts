import { executeAiAction } from '../src/services/ai-action-executor';

function mockDb() {
  const tasks = [
    {
      id: 'task-1', title: 'Supplier call', notes: null, status: 'PLANNED', priority: 'MEDIUM',
      dueAt: '2026-08-25T14:30:00', completedAt: null, createdAt: '2026-08-24T00:00:00.000Z', updatedAt: '2026-08-24T00:00:00.000Z',
    },
  ];

  return {
    getAllAsync: async () => tasks.map((task) => ({ ...task, due_at: task.dueAt, completed_at: task.completedAt, created_at: task.createdAt, updated_at: task.updatedAt })),
    getFirstAsync: async (_sql: string, id: string) => {
      const task = tasks.find((item) => item.id === id);
      return task
        ? { ...task, due_at: task.dueAt, completed_at: task.completedAt, created_at: task.createdAt, updated_at: task.updatedAt }
        : null;
    },
    runAsync: async () => ({ changes: 1 }),
  } as never;
}

describe('AI action executor', () => {
  it('rejects a time without a date', async () => {
    await expect(executeAiAction(mockDb(), {
      type: 'CREATE_TASK', taskText: 'Call supplier', dueMinutes: 600,
    })).rejects.toThrow('A due date is required when a task time is supplied');
  });

  it('rejects an invalid due minute value', async () => {
    await expect(executeAiAction(mockDb(), {
      type: 'CREATE_TASK', taskText: 'Call supplier', dueDate: '2026-08-25', dueMinutes: 1440,
    })).rejects.toThrow('Task due time must be between 00:00 and 23:59');
  });

  it('rejects rescheduling without a schedule before touching persistence', async () => {
    await expect(executeAiAction(mockDb(), {
      type: 'RESCHEDULE_TASK', taskText: 'Supplier call',
    })).rejects.toThrow('A schedule is required to reschedule a task');
  });

  it('rejects an ambiguous task reference', async () => {
    const db = mockDb();
    (db as any).getAllAsync = async () => [
      { id: '1', title: 'Call supplier', notes: null, status: 'PLANNED', priority: 'MEDIUM', due_at: null, completed_at: null, created_at: '', updated_at: '' },
      { id: '2', title: 'Call supplier', notes: null, status: 'PLANNED', priority: 'MEDIUM', due_at: null, completed_at: null, created_at: '', updated_at: '' },
    ];
    await expect(executeAiAction(db, { type: 'COMPLETE_TASK', taskText: 'Call supplier' }))
      .rejects.toThrow('Referenced task is ambiguous');
  });

  it('preserves the existing task time when only the date changes', async () => {
    const result = await executeAiAction(mockDb(), {
      type: 'RESCHEDULE_TASK',
      taskText: 'Supplier call',
      dueDate: '2026-08-27',
    });

    expect(result.type).toBe('TASK_RESCHEDULED');
  });
});
