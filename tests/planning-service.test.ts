import type { SQLiteDatabase } from 'expo-sqlite';
import { getDailyPlan, planInboxTasks } from '../src/services/planning-service';
import * as taskService from '../src/services/task-service';

jest.mock('../src/services/task-service', () => ({ listTasks: jest.fn(), getTask: jest.fn(), editTask: jest.fn() }));

const mockedListTasks = jest.mocked(taskService.listTasks);
const mockedGetTask = jest.mocked(taskService.getTask);
const mockedEditTask = jest.mocked(taskService.editTask);

function mockDb(): SQLiteDatabase { return { withTransactionAsync: async (callback: () => Promise<void>) => callback() } as unknown as SQLiteDatabase; }

describe('daily planning service', () => {
  beforeEach(() => jest.clearAllMocks());
  it('separates inbox and date-only planned tasks without creating a reminder time', async () => {
    mockedListTasks.mockImplementation(async (_db, options) => {
      if (options.status === 'INBOX') return [{ id: 'inbox', title: 'Inbox', status: 'INBOX', priority: 'MEDIUM', notes: null, dueAt: null, plannedDate: null, completedAt: null, createdAt: '', updatedAt: '' }];
      if (options.status === 'IN_PROGRESS') return [];
      return [{ id: 'planned', title: 'Planned', status: 'PLANNED', priority: 'HIGH', notes: null, dueAt: null, plannedDate: '2026-08-24', completedAt: null, createdAt: '', updatedAt: '' }];
    });
    const plan = await getDailyPlan(mockDb(), new Date('2026-08-24T09:00:00+06:00'));
    expect(plan.scheduled.map((task) => task.id)).toEqual(['planned']);
    expect(plan.inbox.map((task) => task.id)).toEqual(['inbox']);
  });
  it('plans inbox tasks using plannedDate rather than a fake midnight reminder', async () => {
    mockedGetTask.mockResolvedValue({ id: 'task-1', title: 'Task', status: 'INBOX', priority: 'MEDIUM', notes: null, dueAt: null, plannedDate: null, completedAt: null, createdAt: '', updatedAt: '' });
    mockedEditTask.mockResolvedValue({ id: 'task-1', title: 'Task', status: 'PLANNED', priority: 'MEDIUM', notes: null, dueAt: null, plannedDate: '2026-08-25', completedAt: null, createdAt: '', updatedAt: '' });
    const result = await planInboxTasks(mockDb(), ['task-1'], new Date('2026-08-25T10:00:00+06:00'));
    expect(mockedEditTask).toHaveBeenCalledWith(expect.anything(), 'task-1', { status: 'PLANNED', plannedDate: '2026-08-25' });
    expect(result[0]?.plannedDate).toBe('2026-08-25');
  });
});
