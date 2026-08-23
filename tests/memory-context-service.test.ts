import type { SQLiteDatabase } from 'expo-sqlite';
import { retrieveMemoryContext } from '../src/services/memory-context-service';
import { findMemories } from '../src/services/memory-service';

jest.mock('../src/services/memory-service', () => ({
  findMemories: jest.fn(),
}));

const mockedFindMemories = jest.mocked(findMemories);

describe('memory context service', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns a bounded context and rejects empty queries', async () => {
    await expect(retrieveMemoryContext({} as SQLiteDatabase, '   ')).resolves.toEqual([]);
    expect(mockedFindMemories).not.toHaveBeenCalled();

    mockedFindMemories.mockResolvedValue(
      Array.from({ length: 25 }, (_, index) => ({ id: String(index + 1) })) as never,
    );
    const result = await retrieveMemoryContext({} as SQLiteDatabase, 'shop', { limit: 3 });
    expect(result).toHaveLength(3);
    expect(mockedFindMemories).toHaveBeenCalledWith(expect.anything(), 'shop');
  });
});
