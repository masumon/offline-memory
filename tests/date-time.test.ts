import { formatBangladeshDate, formatBangladeshDateTime, formatBangladeshTime } from '../src/i18n/date-time';

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

  it('keeps date-time and time formatting deterministic for both languages', () => {
    expect(formatBangladeshDateTime(value, 'bn')).toContain('২১');
    expect(formatBangladeshDateTime(value, 'en')).toContain('21');
    expect(formatBangladeshTime(value, 'bn')).toContain('২১');
    expect(formatBangladeshTime(value, 'en')).toContain('21');
  });
});
