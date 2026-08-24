import { searchAll } from '../src/services/unified-search-service';
import { searchTasks } from '../src/services/task-service';
import { findMemories } from '../src/services/memory-service';

jest.mock('../src/services/task-service', () => ({ searchTasks: jest.fn() }));
jest.mock('../src/services/memory-service', () => ({ findMemories: jest.fn() }));

describe('unified search service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('searches task title/notes and memories using existing services', async () => {
    (searchTasks as jest.Mock).mockResolvedValue([
      { id: 'task-1', title: 'Call supplier', notes: 'Paper order', status: 'INBOX', priority: 'HIGH' },
    ]);
    (findMemories as jest.Mock).mockResolvedValue([
      { id: 'memory-1', content: 'Supplier phone number', kind: 'NOTE', importance: 4 },
    ]);

    const result = await searchAll({} as never, 'supplier');

    expect(searchTasks).toHaveBeenCalledWith({}, 'supplier', 100);
    expect(findMemories).toHaveBeenCalledWith({}, 'supplier');
    expect(result.tasks.map((task) => task.id)).toEqual(['task-1']);
    expect(result.memories.map((memory) => memory.id)).toEqual(['memory-1']);
  });

  it('does not query services for an empty search', async () => {
    await expect(searchAll({} as never, '   ')).resolves.toEqual({ tasks: [], memories: [] });
    expect(searchTasks).not.toHaveBeenCalled();
    expect(findMemories).not.toHaveBeenCalled();
  });
});
