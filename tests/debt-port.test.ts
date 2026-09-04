import { normaliseDate, parseImportRow, buildImportPreview, buildDebtCsv } from '../src/services/debt/port-core';

describe('normaliseDate (spec §74)', () => {
  it('parses real dates in several orders', () => {
    expect(normaliseDate('15/09/2025').iso).toBe('2025-09-15');
    expect(normaliseDate('2025-09-15').iso).toBe('2025-09-15');
    expect(normaliseDate('2025/9/5').iso).toBe('2025-09-05');
    expect(normaliseDate('05.06.24').iso).toBe('2024-06-05');
    expect(normaliseDate('১৫/০৯/২০২৫').iso).toBe('2025-09-15');
  });
  it('keeps incomplete / invalid dates as text with a null iso', () => {
    for (const bad of ['2025', '2025-2026', 'next month', '', '32/01/2025', '2025-13-01']) {
      const r = normaliseDate(bad);
      expect(r.iso).toBeNull();
      expect(r.originalText).toBe(bad.trim());
    }
  });
});

describe('parseImportRow (spec §75)', () => {
  it('pulls the valid installment cells, skipping blanks and zeros', () => {
    const row = parseImportRow({
      personName: 'Rahim', amount: '50,000', direction: 'DEBT',
      installments: ['10000', '', '0', '15000', '25000'],
    });
    expect(row.errors).toEqual([]);
    expect(row.principalPaisa).toBe(50_000 * 100);
    expect(row.installmentAmountsPaisa).toEqual([10_000 * 100, 15_000 * 100, 25_000 * 100]);
  });
  it('detects the receivable direction and reports missing fields', () => {
    const recv = parseImportRow({ personName: 'Karim', amount: '1000', direction: 'পাওনা' });
    expect(recv.direction).toBe('RECEIVABLE');
    const bad = parseImportRow({ personName: '', amount: '' });
    expect(bad.errors).toEqual(expect.arrayContaining(['missing person name', 'missing amount']));
  });
  it('carries an unparseable taken-date through as text', () => {
    const row = parseImportRow({ personName: 'A', amount: '100', takenOrGivenDate: '2025-2026' });
    expect(row.openedDate).toBeNull();
    expect(row.openedDateText).toBe('2025-2026');
  });
});

describe('buildImportPreview (spec §76, §77)', () => {
  it('counts new vs duplicate people, debts, receivables, installments and totals', () => {
    const { preview } = buildImportPreview(
      [
        { personName: 'Rahim', amount: '50000', direction: 'DEBT', installments: ['25000', '25000'] },
        { personName: 'rahim', amount: '10000', direction: 'DEBT' }, // duplicate name (case-insensitive)
        { personName: 'Karim', amount: '8000', direction: 'RECEIVABLE' },
        { personName: '', amount: '' }, // error row
      ],
      new Set(),
    );
    expect(preview.totalRows).toBe(4);
    expect(preview.validRows).toBe(3);
    expect(preview.newPeople).toBe(2);
    expect(preview.duplicatePeople).toBe(1);
    expect(preview.newDebts).toBe(3);
    expect(preview.newReceivables).toBe(1);
    expect(preview.installments).toBe(2);
    expect(preview.errorRows).toHaveLength(1);
    // reconciliation totals (spec §77): 50000 + 10000 + 8000 = 68000 taka
    expect(preview.excelTotalPaisa).toBe(68_000 * 100);
    expect(preview.parsedTotalPaisa).toBe(68_000 * 100);
  });

  it('treats a name already in the DB as a duplicate', () => {
    const { preview } = buildImportPreview([{ personName: 'Existing', amount: '100' }], new Set(['existing']));
    expect(preview.duplicatePeople).toBe(1);
    expect(preview.newPeople).toBe(0);
  });
});

describe('buildDebtCsv', () => {
  it('quotes fields containing commas / quotes / newlines (RFC-4180)', async () => {
    const mockDb = {
      getAllAsync: jest.fn(async (sql: string) => {
        if (sql.includes('dr_transactions')) {
          return [{ id: 't1', txn_date: '2026-09-01', kind: 'PAYMENT', account_id: 'a1', amount_paisa: 500000, method: null, reference: 'ref, with comma', note: 'line\nbreak', reversed: 0, deleted_at: null }];
        }
        return [];
      }),
      getFirstAsync: jest.fn(async () => null),
    } as unknown as import('expo-sqlite').SQLiteDatabase;
    const csv = await buildDebtCsv(mockDb, 'ledger');
    expect(csv).toContain('"ref, with comma"');
    expect(csv).toContain('"line\nbreak"');
    expect(csv.split('\r\n')[0]).toBe('id,date,kind,account_id,amount,method,reference,note,reversed');
  });
});
