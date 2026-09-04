import { computeInterest, elapsedPeriods, type InterestParams } from '../src/services/debt/interest';

const P = 100_000_00; // ৳100,000 in paisa

describe('elapsedPeriods', () => {
  it('is zero when the end is not after the start', () => {
    expect(elapsedPeriods('2026-09-01', '2026-09-01', 'DAY')).toBe(0);
    expect(elapsedPeriods('2026-09-10', '2026-09-01', 'MONTH')).toBe(0);
  });

  it('counts days and weeks', () => {
    expect(elapsedPeriods('2026-09-01', '2026-09-11', 'DAY')).toBeCloseTo(10, 5);
    expect(elapsedPeriods('2026-09-01', '2026-09-15', 'WEEK')).toBeCloseTo(2, 5);
  });

  it('counts calendar months and years with a day fraction', () => {
    expect(elapsedPeriods('2026-01-01', '2026-07-01', 'MONTH')).toBeCloseTo(6, 5);
    expect(elapsedPeriods('2025-01-01', '2026-01-01', 'YEAR')).toBeCloseTo(1, 5);
    expect(elapsedPeriods('2026-01-01', '2026-02-16', 'MONTH')).toBeGreaterThan(1.5);
  });
});

describe('computeInterest', () => {
  it('NONE → interest is zero, total equals principal', () => {
    const b = computeInterest({ principalPaisa: P, interestType: 'NONE' }, '2027-01-01');
    expect(b.interestPaisa).toBe(0);
    expect(b.totalPayablePaisa).toBe(P);
  });

  it('FLAT_TOTAL → interest is the stated total minus principal', () => {
    const b = computeInterest(
      { principalPaisa: P, interestType: 'FLAT_TOTAL', manualTotalPayablePaisa: 110_000_00 },
      '2027-01-01',
    );
    expect(b.totalPayablePaisa).toBe(110_000_00);
    expect(b.interestPaisa).toBe(10_000_00);
  });

  it('FLAT_TOTAL never lets the total drop below principal', () => {
    const b = computeInterest(
      { principalPaisa: P, interestType: 'FLAT_TOTAL', manualTotalPayablePaisa: 50_000_00 },
      '2027-01-01',
    );
    expect(b.totalPayablePaisa).toBe(P);
    expect(b.interestPaisa).toBe(0);
  });

  it('SIMPLE → I = P × r × t, no compounding', () => {
    const params: InterestParams = {
      principalPaisa: P,
      interestType: 'SIMPLE',
      interestRateBps: 1_000, // 10% per year
      interestPeriod: 'YEAR',
      openedDate: '2025-01-01',
    };
    const oneYear = computeInterest(params, '2026-01-01');
    expect(oneYear.interestPaisa).toBe(10_000_00); // exactly 10%
    const twoYears = computeInterest(params, '2027-01-01');
    expect(twoYears.interestPaisa).toBe(20_000_00); // linear, not 21%
  });

  it('MONTHLY_FLAT → simple interest fixed to whole months', () => {
    const params: InterestParams = {
      principalPaisa: P,
      interestType: 'MONTHLY_FLAT',
      interestRateBps: 200, // 2% per month
      openedDate: '2026-01-01',
    };
    // 3 months and a bit → floors to 3 → 6%
    expect(computeInterest(params, '2026-04-10').interestPaisa).toBe(6_000_00);
    // under a month → 0
    expect(computeInterest(params, '2026-01-20').interestPaisa).toBe(0);
  });

  it('COMPOUND → grows faster than simple over the same span', () => {
    const base = {
      principalPaisa: P,
      interestRateBps: 1_000, // 10%/yr
      interestPeriod: 'YEAR' as const,
      openedDate: '2025-01-01',
    };
    const simple = computeInterest({ ...base, interestType: 'SIMPLE' }, '2027-01-01');
    const compoundYearly = computeInterest(
      { ...base, interestType: 'COMPOUND', compoundPeriod: 'YEAR' },
      '2027-01-01',
    );
    const compoundMonthly = computeInterest(
      { ...base, interestType: 'COMPOUND', compoundPeriod: 'MONTH' },
      '2027-01-01',
    );
    expect(compoundYearly.interestPaisa).toBeGreaterThan(simple.interestPaisa);
    expect(compoundMonthly.interestPaisa).toBeGreaterThan(compoundYearly.interestPaisa);
    // 2 years @ 10% compounded yearly ≈ 21% of principal
    expect(compoundYearly.totalPayablePaisa).toBeCloseTo(Math.round(P * 1.21), -2);
  });

  it('COMPOUND with no elapsed time or no rate returns principal only', () => {
    expect(
      computeInterest(
        { principalPaisa: P, interestType: 'COMPOUND', interestRateBps: 1_000, interestPeriod: 'YEAR', compoundPeriod: 'MONTH', openedDate: '2027-01-01' },
        '2026-01-01',
      ).interestPaisa,
    ).toBe(0);
  });

  it('always returns integer paisa', () => {
    const b = computeInterest(
      { principalPaisa: 333_33, interestType: 'COMPOUND', interestRateBps: 777, interestPeriod: 'YEAR', compoundPeriod: 'MONTH', openedDate: '2024-03-07' },
      '2026-09-02',
    );
    expect(Number.isInteger(b.interestPaisa)).toBe(true);
    expect(Number.isInteger(b.totalPayablePaisa)).toBe(true);
  });
});
