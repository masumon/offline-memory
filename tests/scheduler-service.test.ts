import type { SQLiteDatabase } from 'expo-sqlite';
import { listDueTasks } from '../src/services/scheduler-service';

function mockDb(): SQLiteDatabase {
  return {} as SQLiteDatabase;
}

describe('scheduler service', () => {
  it('rejects a negative horizon', async () => {
    await expect(listDueTasks(mockDb(), new Date(), -1)).rejects.toThrow(
      'Scheduler horizon must be a non-negative finite number',
    );
  });
});
