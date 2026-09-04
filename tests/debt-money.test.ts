import {
  parseTakaToPaisa,
  paisaToTakaString,
  formatPaisa,
  groupBangladesh,
  applyBps,
  percentOf,
  splitEven,
  allocateByWeights,
  clampNonNegative,
  asciiDigitsToBengali,
  bengaliDigitsToAscii,
} from '../src/services/debt/money';

describe('money — parsing', () => {
  it('parses plain and grouped taka to integer paisa', () => {
    expect(parseTakaToPaisa('100')).toBe(10_000);
    expect(parseTakaToPaisa('1,50,000')).toBe(15_000_000);
    expect(parseTakaToPaisa('1234.5')).toBe(123_450);
    expect(parseTakaToPaisa('0.01')).toBe(1);
    expect(parseTakaToPaisa('৳ 2,000.75')).toBe(200_075);
  });

  it('rounds a longer fraction to the nearest paisa (half up)', () => {
    expect(parseTakaToPaisa('1.005')).toBe(101);
    expect(parseTakaToPaisa('1.004')).toBe(100);
  });

  it('accepts Bengali digits', () => {
    expect(parseTakaToPaisa('১২৩৪.৫০')).toBe(123_450);
  });

  it('treats blank-ish input as zero and rejects garbage', () => {
    expect(parseTakaToPaisa('')).toBe(0);
    expect(parseTakaToPaisa('.')).toBe(0);
    expect(() => parseTakaToPaisa('12ab')).toThrow();
  });

  it('round-trips through paisaToTakaString', () => {
    for (const p of [0, 1, 99, 100, 123_450, 15_000_000]) {
      expect(parseTakaToPaisa(paisaToTakaString(p))).toBe(p);
    }
  });
});

describe('money — Bangladesh formatting', () => {
  it('groups the last three digits then pairs', () => {
    expect(groupBangladesh(0)).toBe('0');
    expect(groupBangladesh(1_250)).toBe('1,250');
    expect(groupBangladesh(150_000)).toBe('1,50,000');
    expect(groupBangladesh(1_000_000)).toBe('10,00,000');
    expect(groupBangladesh(12_34_567)).toBe('12,34,567');
  });

  it('formats paisa with symbol and only-when-needed decimals', () => {
    expect(formatPaisa(15_000_000)).toBe('৳ 1,50,000');
    expect(formatPaisa(200_075)).toBe('৳ 2,000.75');
    expect(formatPaisa(-50_000_00, { symbol: false })).toBe('-50,000');
    expect(formatPaisa(10_000, { decimals: 'always' })).toBe('৳ 100.00');
  });

  it('can render Bengali digits', () => {
    expect(formatPaisa(15_000_000, { bnDigits: true })).toBe('৳ ১,৫০,০০০');
  });
});

describe('money — exact arithmetic', () => {
  it('applyBps is half-up basis-point maths', () => {
    expect(applyBps(10_000, 1_200)).toBe(1_200); // 12% of 100.00
    expect(applyBps(333, 5_000)).toBe(167); // 50% of 3.33 = 1.665 -> 1.67
  });

  it('percentOf is safe when the whole is zero', () => {
    expect(percentOf(50, 200)).toBe(25);
    expect(percentOf(1, 3)).toBe(33.33);
    expect(percentOf(10, 0)).toBe(0);
  });

  it('splitEven never drifts — parts always sum to the total', () => {
    for (const [total, count] of [[10_000, 3], [100, 7], [999_999, 12], [5, 4]] as const) {
      const parts = splitEven(total, count);
      expect(parts).toHaveLength(count);
      expect(parts.reduce((s, v) => s + v, 0)).toBe(total);
      expect(Math.max(...parts) - Math.min(...parts)).toBeLessThanOrEqual(1);
    }
  });

  it('allocateByWeights distributes the remainder and sums exactly', () => {
    const out = allocateByWeights(10_000, [1, 1, 1]);
    expect(out.reduce((s, v) => s + v, 0)).toBe(10_000);
    const weighted = allocateByWeights(1_000, [50, 30, 20]);
    expect(weighted.reduce((s, v) => s + v, 0)).toBe(1_000);
    expect(weighted[0]).toBeGreaterThan(weighted[2]!);
  });

  it('clampNonNegative floors at zero', () => {
    expect(clampNonNegative(-1)).toBe(0);
    expect(clampNonNegative(50)).toBe(50);
  });
});

describe('money — digit conversion', () => {
  it('round-trips ascii <-> bengali digits', () => {
    expect(asciiDigitsToBengali('2026-09')).toBe('২০২৬-০৯');
    expect(bengaliDigitsToAscii('২০২৬-০৯')).toBe('2026-09');
  });
});
