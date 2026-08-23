import { ALLOWED_TRANSITIONS } from '../src/services/task-service';

describe('task engine status transitions', () => {
  it('allows normal completion from in-progress', () => {
    expect(ALLOWED_TRANSITIONS.IN_PROGRESS).toContain('COMPLETED');
  });

  it('allows rescheduling from planned', () => {
    expect(ALLOWED_TRANSITIONS.PLANNED).toContain('RESCHEDULED');
  });

  it('does not allow arbitrary transitions from archived', () => {
    expect(ALLOWED_TRANSITIONS.ARCHIVED).toEqual([]);
  });

  it('allows cancellation recovery only to inbox or archive', () => {
    expect(ALLOWED_TRANSITIONS.CANCELLED).toEqual(['INBOX', 'ARCHIVED']);
  });
});
