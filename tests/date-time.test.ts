import { formatBangladeshDate, formatBangladeshDateTime, formatBangladeshRelativeDate, formatBangladeshTime } from '../src/i18n/date-time';

describe('Bangladesh date and time formatting', () => {
  const value = '2026-08-26T15:30:00.000Z';

  it('formats Bengali dates with the Bangladesh locale', () => {
    const result = formatBangladeshDate(value, 'bn');
    expect(result).toContain('২০২৬');
    expect(result).toContain('আগস্ট');
  });

  it('formats English dates with the Bangladesh locale', () => {
    const result = formatBangladeshDate(value, 'en');
    expect(result).toContain('2026');
    expect(result).toContain('August');
  });

  it('shows Bangladesh clock time in 12-hour AM/PM form for both languages', () => {
    // 15:30 UTC → 21:30 Asia/Dhaka → 9:30 PM
    expect(formatBangladeshTime(value, 'en')).toMatch(/9[:.]30/);
    expect(formatBangladeshTime(value, 'en')).toMatch(/PM/i);
    expect(formatBangladeshDateTime(value, 'en')).toMatch(/9[:.]30/);
    expect(formatBangladeshDateTime(value, 'en')).toMatch(/PM/i);
    expect(formatBangladeshTime(value, 'bn')).toMatch(/৯[:.]৩০|9[:.]30/);
    expect(formatBangladeshTime(value, 'bn')).not.toMatch(/২১[:.]/);
  });

  it('uses the Bangladesh calendar day for relative dates', () => {
    const now = new Date('2026-08-26T17:30:00.000Z');
    const afterMidnightInDhaka = new Date('2026-08-26T18:30:00.000Z');
    expect(formatBangladeshRelativeDate(afterMidnightInDhaka, 'en', now)).toBe('Tomorrow');
    expect(formatBangladeshRelativeDate(afterMidnightInDhaka, 'bn', now)).toBe('আগামীকাল');
  });

  it('formats clock time in Asia/Dhaka independently of device timezone', () => {
    // 18:00 UTC → 00:00 Asia/Dhaka → 12:00 AM
    expect(formatBangladeshTime('2026-08-26T18:00:00.000Z', 'en')).toMatch(/12[:.]00/);
    expect(formatBangladeshTime('2026-08-26T18:00:00.000Z', 'en')).toMatch(/AM/i);
  });
});
