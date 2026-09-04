import { periodFlow, debtReductionPct, bucketDues, breakdown, smartInsights, type PeriodFlow } from '../src/services/debt/analytics';
import type { AccountBalance, Transaction, TxnKind } from '../src/services/debt/types';

const TK = 100;
let seq = 0;
const txn = (kind: TxnKind, amtTk: number, date: string, over: Partial<Transaction> = {}): Transaction => {
  seq += 1;
  return {
    id: `t${seq}`, kind, accountId: 'a1', personId: 'p1', amountPaisa: amtTk * TK, adjSign: null,
    txnDate: date, method: null, reference: null, note: null, reversesTxnId: null, reversed: false,
    createdAt: '', deletedAt: null, ...over,
  };
};

describe('periodFlow', () => {
  it('separates real debt reduction from borrowed-funded payment (spec §106)', () => {
    const txns = [
      txn('NEW_DEBT', 50_000, '2026-09-01'),
      txn('PAYMENT', 20_000, '2026-09-10', { id: 'payBorrow' }),
      txn('PAYMENT', 10_000, '2026-09-15'),
      txn('RECEIPT', 4_000, '2026-09-20'),
      txn('PAYMENT', 5_000, '2026-08-25'), // different month, excluded
    ];
    const borrowed = new Map([['payBorrow', 20_000 * TK]]);
    const f = periodFlow(txns, borrowed, '2026-09');
    expect(f.newDebtPaisa).toBe(50_000 * TK);
    expect(f.debtPaidPaisa).toBe(30_000 * TK);
    expect(f.borrowedFundedPaisa).toBe(20_000 * TK);
    // real reduction = 30k paid − 20k borrowed − 50k new = −40k (debt actually grew)
    expect(f.realDebtReductionPaisa).toBe(-40_000 * TK);
    expect(f.receiptPaisa).toBe(4_000 * TK);
  });

  it('ignores reversed and deleted rows', () => {
    const f = periodFlow(
      [txn('PAYMENT', 10_000, '2026-09-01', { reversed: true }), txn('PAYMENT', 3_000, '2026-09-02', { deletedAt: 'x' }), txn('PAYMENT', 7_000, '2026-09-03')],
      new Map(), '2026-09',
    );
    expect(f.debtPaidPaisa).toBe(7_000 * TK);
  });
});

describe('debtReductionPct', () => {
  it('is (start - current)/start, clamped, zero-safe', () => {
    expect(debtReductionPct(200_000 * TK, 150_000 * TK)).toBe(25);
    expect(debtReductionPct(0, 100)).toBe(0);
    expect(debtReductionPct(100, 200)).toBe(0); // never negative
  });
});

describe('bucketDues', () => {
  it('rolls unpaid slices into today / tomorrow / 3 / 7 / 30 / overdue', () => {
    const b = bucketDues([
      { dueDate: '2026-09-02', amountPaisa: 1_000 * TK }, // today
      { dueDate: '2026-09-03', amountPaisa: 2_000 * TK }, // tomorrow
      { dueDate: '2026-09-08', amountPaisa: 3_000 * TK }, // within 7
      { dueDate: '2026-09-20', amountPaisa: 4_000 * TK }, // within 30, this month
      { dueDate: '2026-08-15', amountPaisa: 5_000 * TK }, // overdue
    ], '2026-09-02T00:00:00.000Z');
    expect(b.todayPaisa).toBe(1_000 * TK);
    expect(b.tomorrowPaisa).toBe(2_000 * TK);
    expect(b.next7Paisa).toBe(1_000 * TK + 2_000 * TK + 3_000 * TK);
    expect(b.next30Paisa).toBe(10_000 * TK);
    expect(b.overduePaisa).toBe(5_000 * TK);
    expect(b.thisMonthPaisa).toBe(1_000 * TK + 2_000 * TK + 3_000 * TK + 4_000 * TK);
  });
});

describe('breakdown', () => {
  it('sums by key, sorts by amount, adds percentages', () => {
    const out = breakdown([
      { key: 'SALARY', amountPaisa: 100 }, { key: 'SAVINGS', amountPaisa: 30 },
      { key: 'SALARY', amountPaisa: 20 }, { key: 'BORROWED', amountPaisa: 50 },
    ]);
    expect(out[0]).toEqual({ key: 'SALARY', amountPaisa: 120, pct: 60 });
    expect(out.map((s) => s.key)).toEqual(['SALARY', 'BORROWED', 'SAVINGS']);
    expect(out.reduce((s, x) => s + x.pct, 0)).toBeCloseTo(100, 0);
  });
});

describe('smartInsights', () => {
  const bal = (over: Partial<AccountBalance>): AccountBalance => ({
    accountId: 'a', direction: 'DEBT', totalPayablePaisa: 0, principalPaisa: 0, accruedInterestPaisa: 0,
    paidPaisa: 0, paidPrincipalPaisa: 0, paidInterestPaisa: 0, remainingPaisa: 0, advancePaisa: 0,
    adjustmentPaisa: 0, progressPct: 0, status: 'ACTIVE', nextDueDate: null, nextDuePaisa: 0,
    overduePaisa: 0, overdueDays: 0, installmentsPaidCount: 0, installmentsTotalCount: 0, ...over,
  });
  const flow = (over: Partial<PeriodFlow>): PeriodFlow => ({
    key: '2026-09', newDebtPaisa: 0, newReceivablePaisa: 0, debtPaidPaisa: 0, receiptPaisa: 0,
    borrowedFundedPaisa: 0, realDebtReductionPaisa: 0, netDebtChangePaisa: 0, ...over,
  });

  it('warns when new debt beats repayment and when a payment was borrowed', () => {
    const out = smartInsights({
      balances: [bal({ remainingPaisa: 100_000 * TK })],
      thisMonth: flow({ newDebtPaisa: 40_000 * TK, debtPaidPaisa: 10_000 * TK, borrowedFundedPaisa: 5_000 * TK }),
      lastMonth: flow({}),
      startingDebtPaisa: 100_000 * TK,
      currentDebtPaisa: 100_000 * TK,
      fmt: (p) => `৳${p / TK}`,
    });
    expect(out.some((i) => i.tone === 'warn' && /new debt/i.test(i.en))).toBe(true);
    expect(out.some((i) => /borrowed/i.test(i.en))).toBe(true);
  });

  it('flags single-account concentration over 50%', () => {
    const out = smartInsights({
      balances: [bal({ remainingPaisa: 80_000 * TK }), bal({ accountId: 'b', remainingPaisa: 20_000 * TK })],
      thisMonth: flow({}), lastMonth: flow({}), startingDebtPaisa: 100_000 * TK, currentDebtPaisa: 100_000 * TK,
      fmt: (p) => String(p),
    });
    expect(out.some((i) => /single account/i.test(i.en))).toBe(true);
  });
});
