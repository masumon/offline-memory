import { executeAssistantAction, resolveAssistantTaskChoice } from '../src/services/assistant-action-service';
import * as repo from '../src/services/task-repository';

jest.mock('../src/services/task-repository', () => ({
  getTask: jest.fn(),
  updateTask: jest.fn(),
  createTask: jest.fn(),
  deleteTask: jest.fn(),
  findTasksByExactTitle: jest.fn(),
  listTasks: jest.fn(),
  searchTasks: jest.fn(),
}));

const R = jest.mocked(repo);
const db = {} as never;
const task = (id: string, title: string) => ({ id, title, notes: null, status: 'PLANNED' as const, priority: 'MEDIUM' as const, dueAt: '2026-08-28T07:00:00.000Z', plannedDate: '2026-08-28', completedAt: null, recurrence: null, createdAt: '', updatedAt: '' });

describe('assistant ambiguous task choice', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns candidates instead of failing when a reference is ambiguous', async () => {
    R.findTasksByExactTitle.mockResolvedValue([]);
    R.searchTasks.mockResolvedValue([task('a', 'Call the bank'), task('b', 'Call the school')]);

    const result = await executeAssistantAction(db, { type: 'COMPLETE_TASK', taskText: 'call' });

    expect(result?.type).toBe('NEEDS_TASK_CHOICE');
    if (result?.type === 'NEEDS_TASK_CHOICE') {
      expect(result.candidates.map((c) => c.id)).toEqual(['a', 'b']);
      expect(result.pending.type).toBe('COMPLETE_TASK');
    }
  });

  it('completes the specific task the user picked', async () => {
    R.getTask.mockResolvedValue(task('b', 'Call the school'));
    R.updateTask.mockResolvedValue({ ...task('b', 'Call the school'), status: 'COMPLETED' });

    const result = await resolveAssistantTaskChoice(db, { type: 'COMPLETE_TASK', taskText: 'call' }, 'b');

    expect(result.type).toBe('TASK_COMPLETED');
    expect(R.updateTask).toHaveBeenCalledWith(db, 'b', expect.objectContaining({ status: 'COMPLETED' }));
  });

  it('uses a single fuzzy match directly without asking', async () => {
    R.findTasksByExactTitle.mockResolvedValue([]);
    R.searchTasks.mockResolvedValue([task('only', 'Renew the licence')]);
    R.getTask.mockResolvedValue(task('only', 'Renew the licence'));
    R.updateTask.mockResolvedValue({ ...task('only', 'Renew the licence'), status: 'COMPLETED' });

    const result = await executeAssistantAction(db, { type: 'COMPLETE_TASK', taskText: 'licence' });

    expect(result?.type).toBe('TASK_COMPLETED');
  });
});
