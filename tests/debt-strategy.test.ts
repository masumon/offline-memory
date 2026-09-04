import { orderByStrategy, bestNextPayment, whatIfPayment, projectDebtFree, riskLevel, toMonthlyBps, type PlanRow } from '../src/services/debt/strategy';

const TK = 100;
const row = (over: Partial<PlanRow>): PlanRow => ({
  accountId: 'a', remainingPaisa: 10_000 * TK, interestRateBps: 0, overdueDays: 0, minPaymentPaisa: 0, priorityRank: null, ...over,
});

describe('orderByStrategy', () => {
  const rows = [
    row({ accountId: 'small', remainingPaisa: 5_000 * TK, interestRateBps: 500 }),
    row({ accountId: 'mid', remainingPaisa: 20_000 * TK, interestRateBps: 1_200 }),
    row({ accountId: 'big', remainingPaisa: 50_000 * TK, interestRateBps: 2_000 }),
    row({ accountId: 'done', remainingPaisa: 0, interestRateBps: 9_999 }),
  ];
  it('snowball = smallest balance first, done accounts dropped', () => {
    expect(orderByStrategy(rows, 'SNOWBALL').map((r) => r.accountId)).toEqual(['small', 'mid', 'big']);
  });
  it('avalanche = highest interest first', () => {
    expect(orderByStrategy(rows, 'AVALANCHE').map((r) => r.accountId)).toEqual(['big', 'mid', 'small']);
  });
  it('custom = explicit rank first, then most overdue', () => {
    const custom = [
      row({ accountId: 'r2', priorityRank: 2 }),
      row({ accountId: 'r1', priorityRank: 1 }),
      row({ accountId: 'noRank', overdueDays: 40 }),
    ];
    expect(orderByStrategy(custom, 'CUSTOM').map((r) => r.accountId)).toEqual(['r1', 'r2', 'noRank']);
  });
});

describe('bestNextPayment', () => {
  it('always points at the most-overdue account first', () => {
    const res = bestNextPayment([
      row({ accountId: 'a', overdueDays: 0, interestRateBps: 3_000 }),
      row({ accountId: 'b', overdueDays: 12, interestRateBps: 100 }),
    ], 'AVALANCHE');
    expect(res.accountId).toBe('b');
    expect(res.reasonEn).toMatch(/overdue/i);
  });
  it('falls back to the strategy order when nothing is overdue', () => {
    const res = bestNextPayment([
      row({ accountId: 'a', interestRateBps: 500 }),
      row({ accountId: 'b', interestRateBps: 2_500 }),
    ], 'AVALANCHE');
    expect(res.accountId).toBe('b');
  });
  it('reports done when there is nothing left', () => {
    expect(bestNextPayment([row({ remainingPaisa: 0 })], 'SNOWBALL').accountId).toBeNull();
  });
});

describe('whatIfPayment', () => {
  it('computes the new debt and reduction %', () => {
    const w = whatIfPayment(180_000 * TK, 20_000 * TK);
    expect(w.newDebtPaisa).toBe(160_000 * TK);
    expect(w.reductionPct).toBeCloseTo(11.11, 2);
  });
  it('never drives the balance below zero', () => {
    expect(whatIfPayment(5_000 * TK, 9_000 * TK).newDebtPaisa).toBe(0);
  });
});

describe('projectDebtFree', () => {
  it('clears a single interest-free debt in the expected number of months', () => {
    const p = projectDebtFree({ balances: [{ remainingPaisa: 100_000 * TK, monthlyInterestBps: 0 }], monthlyPaymentPaisa: 20_000 * TK });
    expect(p.clears).toBe(true);
    expect(p.months).toBe(5);
    expect(p.totalInterestPaisa).toBe(0);
  });
  it('takes longer and costs interest when the debt bears interest', () => {
    const p = projectDebtFree({ balances: [{ remainingPaisa: 100_000 * TK, monthlyInterestBps: 100 }], monthlyPaymentPaisa: 20_000 * TK });
    expect(p.clears).toBe(true);
    expect(p.months).toBeGreaterThan(5);
    expect(p.totalInterestPaisa).toBeGreaterThan(0);
  });
  it('reports "never clears" when the payment cannot beat interest + new debt', () => {
    const p = projectDebtFree({ balances: [{ remainingPaisa: 100_000 * TK, monthlyInterestBps: 500 }], monthlyPaymentPaisa: 100 * TK, maxMonths: 24 });
    expect(p.clears).toBe(false);
  });
});

describe('riskLevel & toMonthlyBps', () => {
  it('escalates with overdue age, interest and size', () => {
    expect(riskLevel({ overdueDays: 0, overduePaisa: 0, remainingPaisa: 1_000, interestRateBps: 0 })).toBe('LOW');
    expect(riskLevel({ overdueDays: 10, overduePaisa: 100, remainingPaisa: 1_000, interestRateBps: 0 })).toBe('MEDIUM');
    expect(riskLevel({ overdueDays: 40, overduePaisa: 100, remainingPaisa: 200_000 * TK, interestRateBps: 2_500 })).toBe('CRITICAL');
  });
  it('normalises a stored rate to an approximate monthly bps', () => {
    expect(toMonthlyBps(1_200, 'YEAR')).toBe(100);
    expect(toMonthlyBps(200, 'MONTH')).toBe(200);
    expect(toMonthlyBps(null, 'YEAR')).toBe(0);
  });
});
