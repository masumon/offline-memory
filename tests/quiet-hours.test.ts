import { applyQuietHours } from '../src/services/expo-notification-adapter';

jest.mock('expo-notifications', () => ({ SchedulableTriggerInputTypes: { DATE: 'date' }, AndroidNotificationPriority: { HIGH: 'HIGH' }, setNotificationHandler: jest.fn() }));

describe('applyQuietHours', () => {
  // Pin "now" so the "don't shift a reminder into the past" guard is deterministic
  // regardless of the wall clock the suite runs at.
  let nowSpy: jest.SpyInstance;
  beforeEach(() => { nowSpy = jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-08-29T00:00:00').getTime()); });
  afterEach(() => { nowSpy.mockRestore(); });

  it('returns the original time when no quiet hours are set', () => {
    const due = new Date('2026-08-29T23:30:00');
    expect(applyQuietHours(due, null)).toBe(due);
  });

  it('leaves a daytime reminder untouched', () => {
    const due = new Date('2026-08-29T14:00:00');
    expect(applyQuietHours(due, { start: 22, end: 7 }).getHours()).toBe(14);
  });

  it('pushes a late-night reminder to the end of the window (next morning)', () => {
    const due = new Date('2026-08-29T23:30:00');
    const shifted = applyQuietHours(due, { start: 22, end: 7 });
    expect(shifted.getHours()).toBe(7);
    expect(shifted.getDate()).toBe(30);
  });

  it('pushes an early-morning reminder to the window end on the same day', () => {
    const due = new Date('2026-08-29T05:15:00');
    const shifted = applyQuietHours(due, { start: 22, end: 7 });
    expect(shifted.getHours()).toBe(7);
    expect(shifted.getDate()).toBe(29);
  });

  it('handles a non-wrapping window (13:00-15:00)', () => {
    expect(applyQuietHours(new Date('2026-08-29T14:00:00'), { start: 13, end: 15 }).getHours()).toBe(15);
    expect(applyQuietHours(new Date('2026-08-29T16:00:00'), { start: 13, end: 15 }).getHours()).toBe(16);
  });
});
