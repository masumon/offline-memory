import { getRecentMemorySnapshot } from '../src/services/memory-snapshot-service';
import { getActiveMemories } from '../src/services/memory-service';

jest.mock('../src/services/memory-service', () => ({
  getActiveMemories: jest.fn(),
}));

describe('memory snapshot service', () => {
  it('prefers higher importance and then recent memories', async () => {
    (getActiveMemories as jest.Mock).mockResolvedValue([
      { id: 'old', importance: 3, updatedAt: '2026-01-01T00:00:00.000Z' },
      { id: 'important', importance: 5, updatedAt: '2025-01-01T00:00:00.000Z' },
      { id: 'recent', importance: 3, updatedAt: '2026-02-01T00:00:00.000Z' },
    ]);

    const result = await getRecentMemorySnapshot({} as never, 2);

    expect(result.map((memory) => memory.id)).toEqual(['important', 'recent']);
  });
});
