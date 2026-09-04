import type { SQLiteDatabase } from 'expo-sqlite';
import { advanceRecurrence, completeTask, skipRecurrence } from '../src/services/task-service';
import * as repo from '../src/services/task-repository';
import type { Task } from '../src/types/task-model';

jest.mock('../src/services/task-repository', () => ({
  getTask: jest.fn(),
  updateTask: jest.fn(),
  createTask: jest.fn(),
  deleteTask: jest.fn(),
  findTasksByExactTitle: jest.fn(),
  listTasks: jest.fn(),
  searchTasks: jest.fn(),
}));

const mockedGet = jest.mocked(repo.getTask);
const mockedUpdate = jest.mocked(repo.updateTask);
const mockedCreate = jest.mocked(repo.createTask);
const db = {} as SQLiteDatabase;

const baseTask: Task = {
  id: 't1', title: 'Water the plants', notes: null, status: 'PLANNED', priority: 'MEDIUM',
  dueAt: '2026-08-28T07:00:00.000Z', plannedDate: '2026-08-28', completedAt: null, recurrence: 'DAILY',
  createdAt: '', updatedAt: '',
};

describe('advanceRecurrence', () => {
  it('adds a day for DAILY, preserving time', () => {
    expect(advanceRecurrence('2026-08-28T07:00:00.000Z', 'DAILY')).toBe(new Date('2026-08-29T07:00:00.000Z').toISOString());
  });
  it('adds a week for WEEKLY', () => {
    expect(advanceRecurrence('2026-08-28T07:00:00.000Z', 'WEEKLY')).toBe(new Date('2026-09-04T07:00:00.000Z').toISOString());
  });
  it('skips the weekend for WEEKDAYS (Fri -> Mon)', () => {
    // 2026-08-28 is a Friday.
    const next = new Date(advanceRecurrence('2026-08-28T07:00:00.000Z', 'WEEKDAYS'));
    expect(next.getDay()).toBe(1); // Monday
  });
});

describe('completeTask with recurrence', () => {
  beforeEach(() => jest.clearAllMocks());

  it('spawns the next occurrence when a recurring task is completed', async () => {
    mockedGet.mockResolvedValue(baseTask);
    mockedUpdate.mockResolvedValue({ ...baseTask, status: 'COMPLETED', completedAt: 'now' });
    mockedCreate.mockResolvedValue({ ...baseTask, id: 't2' });

    await completeTask(db, 't1');

    expect(mockedCreate).toHaveBeenCalledTimes(1);
    expect(mockedCreate).toHaveBeenCalledWith(db, expect.objectContaining({
      title: 'Water the plants',
      recurrence: 'DAILY',
      status: 'PLANNED',
      dueAt: new Date('2026-08-29T07:00:00.000Z').toISOString(),
    }));
  });

  it('does not spawn anything for a non-recurring task', async () => {
    mockedGet.mockResolvedValue({ ...baseTask, recurrence: null });
    mockedUpdate.mockResolvedValue({ ...baseTask, recurrence: null, status: 'COMPLETED' });

    await completeTask(db, 't1');

    expect(mockedCreate).not.toHaveBeenCalled();
  });
});

describe('skipRecurrence', () => {
  beforeEach(() => jest.clearAllMocks());

  it('moves a recurring task to its next occurrence without spawning a duplicate', async () => {
    mockedGet.mockResolvedValue(baseTask);
    mockedUpdate.mockResolvedValue({ ...baseTask, dueAt: '2026-08-29T07:00:00.000Z' });

    await skipRecurrence(db, 't1');

    expect(mockedCreate).not.toHaveBeenCalled();
    expect(mockedUpdate).toHaveBeenCalledWith(db, 't1', expect.objectContaining({
      dueAt: new Date('2026-08-29T07:00:00.000Z').toISOString(),
    }));
  });

  it('is a no-op for a one-off task (no recurrence)', async () => {
    mockedGet.mockResolvedValue({ ...baseTask, recurrence: null });

    const result = await skipRecurrence(db, 't1');

    expect(result).toBeNull();
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it('is a no-op for a recurring task with no due date', async () => {
    mockedGet.mockResolvedValue({ ...baseTask, dueAt: null });

    const result = await skipRecurrence(db, 't1');

    expect(result).toBeNull();
    expect(mockedUpdate).not.toHaveBeenCalled();
  });
});
