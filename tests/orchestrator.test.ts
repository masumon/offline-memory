import { orchestrate } from '../src/ai/orchestrator';

describe('local orchestrator', () => {
  const now = new Date('2026-08-24T09:00:00+06:00');

  it('maps a task command into a pure create-task action', () => {
    const result = orchestrate('আগামীকাল সকাল ১০টায় ডাক্তারকে ফোন করতে হবে', now);

    expect(result.status).toBe('READY');
    expect(result.action).toEqual({
      type: 'CREATE_TASK',
      taskText: 'ডাক্তারকে ফোন করতে হবে',
      dueDate: '2026-08-25',
      dueMinutes: 600,
    });
  });

  it('maps memory creation without touching persistence', () => {
    const result = orchestrate('মনে রাখো আমার দোকান শুক্রবার বন্ধ থাকে', now);

    expect(result.status).toBe('READY');
    expect(result.action).toEqual({
      type: 'CREATE_MEMORY',
      content: 'আমার দোকান শুক্রবার বন্ধ থাকে',
    });
  });

  it('maps memory search to a query action', () => {
    const result = orchestrate('আমার দোকান কখন বন্ধ থাকে খুঁজে দাও', now);

    expect(result.status).toBe('READY');
    expect(result.action).toEqual({
      type: 'SEARCH_MEMORY',
      query: 'আমার দোকান কখন বন্ধ থাকে',
    });
  });

  it('requires a task reference before completing a task', () => {
    const result = orchestrate('শেষ করো', now);

    expect(result.status).toBe('NEEDS_INPUT');
    expect(result.action).toEqual({
      type: 'CLARIFY',
      reason: 'MISSING_TASK_REFERENCE',
    });
  });

  it('resolves a short follow-up against explicit local context', () => {
    const result = orchestrate('শেষ করো', now, {
      lastTaskText: 'ডাক্তারকে ফোন করতে হবে',
    });

    expect(result.status).toBe('READY');
    expect(result.action).toEqual({
      type: 'COMPLETE_TASK',
      taskText: 'ডাক্তারকে ফোন করতে হবে',
    });
  });

  it('resolves a reschedule follow-up against explicit local context', () => {
    const result = orchestrate('আগামীকাল সকাল ১১টায় করো', now, {
      lastTaskText: 'ডাক্তারকে ফোন করতে হবে',
    });

    expect(result.status).toBe('READY');
    expect(result.action).toEqual({
      type: 'RESCHEDULE_TASK',
      taskText: 'ডাক্তারকে ফোন করতে হবে',
      dueDate: '2026-08-25',
      dueMinutes: 660,
    });
  });

  it('does not execute database work for unknown input', () => {
    const result = orchestrate('আজ আকাশ অনেক সুন্দর', now);

    expect(result.status).toBe('UNSUPPORTED');
    expect(result.action).toEqual({
      type: 'CLARIFY',
      reason: 'UNKNOWN_INTENT',
    });
  });
});
