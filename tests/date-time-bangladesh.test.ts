import { formatBangladeshDateTime, formatBangladeshRelativeDate } from '../src/i18n/date-time';

describe('Bangladesh date/time formatting', () => {
  it('formats using Asia/Dhaka rather than device-local timezone', () => {
    const value = '2026-08-25T18:30:00.000Z';
    expect(formatBangladeshDateTime(value, 'en')).toContain('Aug 26, 2026');
  });

  it('computes relative dates using Bangladesh calendar boundaries', () => {
    const now = new Date('2026-08-25T18:30:00.000Z');
    const tomorrow = new Date('2026-08-26T18:30:00.000Z');
    expect(formatBangladeshRelativeDate(now, 'bn', now)).toBe('আজ');
    expect(formatBangladeshRelativeDate(tomorrow, 'bn', now)).toBe('আগামীকাল');
  });
});
