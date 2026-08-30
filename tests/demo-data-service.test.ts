import type { SQLiteDatabase } from 'expo-sqlite';
import { seedDemoData, clearDemoData } from '../src/services/demo-data-service';

function mockDb() {
  const calls: { sql: string; args: unknown[] }[] = [];
  const db = {
    withTransactionAsync: async (cb: () => Promise<void>) => { await cb(); },
    runAsync: async (sql: string, ...args: unknown[]) => { calls.push({ sql: sql.replace(/\s+/g, ' ').trim(), args }); return { changes: 1 }; },
  } as unknown as SQLiteDatabase;
  return { db, calls };
}

describe('demo data service', () => {
  it('seeds 30+ items across tasks and memories, all removable', async () => {
    const { db, calls } = mockDb();
    const result = await seedDemoData(db);
    expect(result.tasks + result.memories).toBeGreaterThanOrEqual(30);

    const taskInserts = calls.filter(c => c.sql.startsWith('INSERT INTO tasks'));
    const memInserts = calls.filter(c => c.sql.startsWith('INSERT INTO memories'));
    expect(taskInserts.length).toBe(result.tasks);
    expect(memInserts.length).toBe(result.memories);
    // every demo task id is prefixed so cleanup can target it
    expect(taskInserts.every(c => String(c.args[0]).startsWith('demo-'))).toBe(true);
    // every demo memory is source SYSTEM + carries a "demo" tag
    expect(memInserts.every(c => c.args.includes('SYSTEM'))).toBe(true);
    expect(memInserts.every(c => c.args.some(a => typeof a === 'string' && a.includes('"demo"')))).toBe(true);

    // seeding clears first (idempotent) — DELETEs run before the INSERTs
    const firstInsert = calls.findIndex(c => c.sql.startsWith('INSERT'));
    const deletesBefore = calls.slice(0, firstInsert).filter(c => c.sql.startsWith('DELETE'));
    expect(deletesBefore.length).toBeGreaterThan(0);
  });

  it('clearDemoData targets demo rows + dev test scaffolding only', async () => {
    const { db, calls } = mockDb();
    await clearDemoData(db);
    const joined = calls.map(c => c.sql).join(' | ');
    expect(joined).toMatch(/DELETE FROM tasks WHERE id LIKE 'demo-%'/);
    expect(joined).toMatch(/DELETE FROM memories WHERE source='SYSTEM'/);
    expect(joined).toMatch(/my-blood-group-is-o-positive/);
    expect(joined).not.toMatch(/DELETE FROM tasks\s*$/); // never an unconditional wipe
  });
});
