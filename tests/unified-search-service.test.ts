import { searchAll } from '../src/services/unified-search-service';
import { listTasks } from '../src/services/task-service';
import { findMemories } from '../src/services/memory-service';

jest.mock('../src/services/task-service', () => ({ listTasks: jest.fn() }));
jest.mock('../src/services/memory-service', () => ({ findMemories: jest.fn() }));

describe('unified search service', () => {
  it('searches task title/notes and memories using existing services', async () => {
    (listTasks as jest.Mock).mockResolvedValue([
      { id: 'task-1', title: 'Call supplier', notes: 'Paper order', status: 'INBOX', priority: 'HIGH' },
      { id: 'task-2', title: 'Pay bill', notes: null, status: 'PLANNED', priority: 'NORMAL' },
    ]);
    (findMemories as jest.Mock).mockResolvedValue([
      { id: 'memory-1', content: 'Supplier phone number', kind: 'NOTE', importance: 4 },
    ]);

    const result = await searchAll({} as never, 'supplier');

    expect(result.tasks.map((task) => task.id)).toEqual(['task-1']);
    expect(result.memories.map((memory) => memory.id)).toEqual(['memory-1']);
  });

  it('does not query services for an empty search', async () => {
    await expect(searchAll({} as never, '   ')).resolves.toEqual({ tasks: [], memories: [] });
    expect(listTasks).not.toHaveBeenCalled();
    expect(findMemories).not.toHaveBeenCalled();
  });
});
