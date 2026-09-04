import { DEBT_TABLES, readDebtTables, restoreDebtTables, validateDebtBackup } from '../src/backup/debt-tables';
import type { SQLiteDatabase } from 'expo-sqlite';

const TABLES = Object.keys(DEBT_TABLES);

function fakeDb(data: Record<string, Record<string, unknown>[]>, opts: { missingSchema?: boolean } = {}) {
  const runs: { sql: string; args: unknown[] }[] = [];
  const db = {
    getAllAsync: jest.fn(async (sql: string) => {
      if (opts.missingSchema) throw new Error('no such table');
      const table = /FROM (\w+)/.exec(sql)?.[1] ?? '';
      return data[table] ?? [];
    }),
    runAsync: jest.fn(async (sql: string, ...args: unknown[]) => { runs.push({ sql, args }); }),
  } as unknown as SQLiteDatabase;
  return { db, runs };
}

describe('readDebtTables', () => {
  it('reads every dr_ table', async () => {
    const { db } = fakeDb({ dr_people: [{ id: 'p1', name: 'Rahim' }] });
    const out = await readDebtTables(db);
    expect(Object.keys(out).sort()).toEqual([...TABLES].sort());
    expect(out.dr_people).toEqual([{ id: 'p1', name: 'Rahim' }]);
  });

  it('returns nothing on a database without the debt schema', async () => {
    const { db } = fakeDb({}, { missingSchema: true });
    expect(await readDebtTables(db)).toEqual({});
  });
});

describe('validateDebtBackup', () => {
  it('accepts a well-formed payload and rejects junk', () => {
    expect(validateDebtBackup({ dr_people: [{ id: 'p1' }] })).toEqual({ dr_people: [{ id: 'p1' }] });
    expect(() => validateDebtBackup(null)).toThrow(/must be an object/);
    expect(() => validateDebtBackup({ tasks: [] })).toThrow(/Unknown debt table/);
    expect(() => validateDebtBackup({ dr_people: 'nope' })).toThrow(/array of objects/);
  });
});

describe('restoreDebtTables', () => {
  it('clears child tables before parents and writes every column', async () => {
    const { db, runs } = fakeDb({});
    const inserted = await restoreDebtTables(db, {
      dr_people: [{ id: 'p1', name: 'Rahim', phone: null, created_at: 'x', updated_at: 'x' }],
      dr_settings: [{ key: 'strategy', value: 'AVALANCHE' }],
    });
    expect(inserted).toBe(2);

    const deletes = runs.filter((r) => r.sql.startsWith('DELETE')).map((r) => r.sql);
    expect(deletes).toHaveLength(TABLES.length);
    // dr_audit (a leaf) is cleared before dr_people (referenced by dr_accounts).
    expect(deletes.indexOf('DELETE FROM dr_audit')).toBeLessThan(deletes.indexOf('DELETE FROM dr_people'));

    const peopleInsert = runs.find((r) => r.sql.includes('INSERT INTO dr_people'))!;
    expect(peopleInsert.args).toHaveLength(DEBT_TABLES.dr_people!.length);
    // Columns the backup row did not carry become NULL rather than undefined.
    expect(peopleInsert.args).toEqual(['p1', 'Rahim', null, null, null, null, 'x', 'x', null]);
  });

  it('normalises booleans and refuses unexpected cell types', async () => {
    const { db, runs } = fakeDb({});
    await restoreDebtTables(db, { dr_transactions: [{ id: 't1', reversed: true }] });
    const insert = runs.find((r) => r.sql.includes('INSERT INTO dr_transactions'))!;
    expect(insert.args[DEBT_TABLES.dr_transactions!.indexOf('reversed')]).toBe(1);

    const bad = fakeDb({});
    await expect(restoreDebtTables(bad.db, { dr_people: [{ id: { nested: true } }] })).rejects.toThrow(/string, number, boolean or null/);
  });
});
