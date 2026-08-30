import { planTurn } from '../src/ai/planner';

describe('assistant planner', () => {
  const now = new Date('2026-08-24T09:00:00+06:00');

  it('treats a single instruction as a one-step, non-plan turn', () => {
    const plan = planTurn('call the supplier tomorrow at 9am', now);
    expect(plan.multi).toBe(false);
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0]?.action.type).toBe('CREATE_TASK');
  });

  it('splits a compound instruction into ordered, validated steps', () => {
    const plan = planTurn('call the supplier tomorrow at 9am, then email the report', now);
    expect(plan.multi).toBe(true);
    expect(plan.readyCount).toBe(2);
    expect(plan.steps.map((s) => s.action.type)).toEqual(['CREATE_TASK', 'CREATE_TASK']);
  });

  it('handles a mixed memory + task plan in Bengali', () => {
    const plan = planTurn('মনে রাখো আমার পাসপোর্ট নম্বর 1234, আর কাল ব্যাংকে যেতে হবে', now);
    expect(plan.multi).toBe(true);
    const types = plan.steps.filter((s) => s.status === 'READY').map((s) => s.action.type);
    expect(types).toEqual(expect.arrayContaining(['CREATE_MEMORY', 'CREATE_TASK']));
  });

  it('splits on a bare "and" too', () => {
    const plan = planTurn('buy the groceries and call the landlord', now);
    expect(plan.multi).toBe(true);
    expect(plan.steps.map((s) => s.action.type)).toEqual(['CREATE_TASK', 'CREATE_TASK']);
  });

  it('keeps an under-specified step but marks it not-ready', () => {
    const plan = planTurn('buy the groceries, then remind me at 9am', now);
    expect(plan.steps.some((s) => s.status === 'READY' && s.action.type === 'CREATE_TASK')).toBe(true);
    // "remind me at 9am" has a time but no date → not runnable yet.
    expect(plan.steps.some((s) => s.status === 'NEEDS_INPUT')).toBe(true);
  });

  it('drops a duplicate step', () => {
    const plan = planTurn('buy milk, then buy milk', now);
    expect(plan.steps.filter((s) => s.status === 'READY')).toHaveLength(1);
  });
});
