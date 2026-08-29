import type { SQLiteDatabase } from 'expo-sqlite';
import { addSubtask, SUBTASK_LIMIT } from '../src/services/subtask-service';
import * as repo from '../src/services/subtask-repository';

jest.mock('../src/services/subtask-repository', () => ({
  createSubtask: jest.fn(),
  deleteSubtask: jest.fn(),
  listSubtaskProgress: jest.fn(),
  listSubtasks: jest.fn(),
  reorderSubtasks: jest.fn(),
  setSubtaskCompleted: jest.fn(),
}));

const mockedList = jest.mocked(repo.listSubtasks);
const mockedCreate = jest.mocked(repo.createSubtask);
const db = {} as SQLiteDatabase;

describe('subtask service', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects blank step titles', async () => {
    await expect(addSubtask(db, { taskId: 't1', title: '   ' })).rejects.toThrow(/required/i);
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('appends new steps at the next position', async () => {
    mockedList.mockResolvedValue([
      { id: 's1', taskId: 't1', title: 'a', completed: false, position: 0, createdAt: '', updatedAt: '' },
      { id: 's2', taskId: 't1', title: 'b', completed: true, position: 1, createdAt: '', updatedAt: '' },
    ]);
    mockedCreate.mockResolvedValue({ id: 's3', taskId: 't1', title: 'c', completed: false, position: 2, createdAt: '', updatedAt: '' });
    await addSubtask(db, { taskId: 't1', title: '  c  ' });
    expect(mockedCreate).toHaveBeenCalledWith(db, { taskId: 't1', title: 'c', position: 2 });
  });

  it('enforces the per-task step ceiling', async () => {
    mockedList.mockResolvedValue(Array.from({ length: SUBTASK_LIMIT }, (_, i) => ({ id: `s${i}`, taskId: 't1', title: 'x', completed: false, position: i, createdAt: '', updatedAt: '' })));
    await expect(addSubtask(db, { taskId: 't1', title: 'one more' })).rejects.toThrow(/maximum/i);
  });
});
