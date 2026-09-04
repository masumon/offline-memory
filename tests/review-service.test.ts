import { weeklyReview } from '../src/services/review-service';
import type { Task } from '../src/types/task-model';

const t = (over: Partial<Task>): Task => ({
  id: Math.random().toString(36).slice(2), title: 'x', notes: null, status: 'INBOX', priority: 'MEDIUM',
  dueAt: null, plannedDate: null, completedAt: null, recurrence: null,
  createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z', ...over,
});

// Week starting Saturday 2026-08-29 (Dhaka), now = Wednesday 2026-09-02 12:00 Dhaka.
const now = new Date('2026-09-02T06:00:00.000Z');

describe('weeklyReview', () => {
  it('counts completions inside the review week and breaks them down by priority and day', () => {
    const r = weeklyReview(
      [
        t({ status: 'COMPLETED', priority: 'HIGH', completedAt: '2026-08-31T04:00:00.000Z' }), // Mon
        t({ status: 'COMPLETED', priority: 'LOW', completedAt: '2026-08-31T09:00:00.000Z' }),  // Mon
        t({ status: 'COMPLETED', priority: 'MEDIUM', completedAt: '2026-07-01T04:00:00.000Z' }), // last month — excluded
      ],
      now, 6,
    );
    expect(r.completed).toBe(2);
    expect(r.byPriority.HIGH).toBe(1);
    expect(r.byPriority.LOW).toBe(1);
    expect(r.busiestDay?.count).toBe(2);
  });

  it('flags overdue and carried-over open tasks', () => {
    const r = weeklyReview(
      [
        t({ status: 'IN_PROGRESS', dueAt: '2026-08-20T04:00:00.000Z' }), // due before this week + before now → overdue + carried
        t({ status: 'PLANNED', dueAt: '2026-09-05T04:00:00.000Z' }),     // future, in week
      ],
      now, 6,
    );
    expect(r.stillOpen).toBe(2);
    expect(r.overdue).toBe(1);
    expect(r.carriedOver).toBe(1);
  });

  it('completion rate is completed over (completed + planned-this-week open)', () => {
    const r = weeklyReview(
      [
        t({ status: 'COMPLETED', completedAt: '2026-08-30T04:00:00.000Z' }),
        t({ status: 'PLANNED', dueAt: '2026-09-03T04:00:00.000Z' }),
      ],
      now, 6,
    );
    expect(r.completionRate).toBeCloseTo(0.5, 5);
  });

  it('returns a 7-day byDay grid and null busiestDay when nothing was completed', () => {
    const r = weeklyReview([t({ status: 'INBOX' })], now, 6);
    expect(r.byDay).toHaveLength(7);
    expect(r.busiestDay).toBeNull();
    expect(r.completionRate).toBe(0);
  });
});
