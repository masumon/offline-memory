import { parseLocalNlp } from '../src/ai/nlp';

describe('local NLP parser', () => {
  const now = new Date('2026-08-24T09:00:00+06:00');

  it('normalizes Bengali digits and classifies task creation', () => {
    const result = parseLocalNlp('আগামীকাল সকাল ১০টায় ডাক্তারকে ফোন করতে হবে', now);
    expect(result.intent).toBe('CREATE_TASK');
    expect(result.entities.taskText).toContain('ডাক্তারকে ফোন');
    expect(result.entities.date?.isoDate).toBe('2026-08-25');
    expect(result.entities.time?.minutes).toBe(600);
  });

  it('parses Bengali afternoon time using the period prefix', () => {
    const result = parseLocalNlp('আগামীকাল দুপুর ৫টায় দোকানে যেতে হবে', now);
    expect(result.intent).toBe('CREATE_TASK');
    expect(result.entities.date?.isoDate).toBe('2026-08-25');
    expect(result.entities.time?.minutes).toBe(1020);
  });

  it('parses Bengali midnight correctly', () => {
    const result = parseLocalNlp('আগামীকাল রাতে ১২টায় রিপোর্ট দেখতে হবে', now);
    expect(result.intent).toBe('CREATE_TASK');
    expect(result.entities.time?.minutes).toBe(0);
  });

  it('parses English time with an explicit date', () => {
    const result = parseLocalNlp('Create a task to call the supplier on 12/8/2026 at 5pm', now);
    expect(result.intent).toBe('CREATE_TASK');
    expect(result.entities.date?.isoDate).toBe('2026-08-12');
    expect(result.entities.time?.minutes).toBe(1020);
    expect(result.entities.taskText).toContain('call the supplier');
  });

  it('keeps "next <weekday> morning" and a priority phrase out of the task title', () => {
    const result = parseLocalNlp('pay the electricity bill next Monday morning high priority', now);
    expect(result.intent).toBe('CREATE_TASK');
    expect(result.entities.date?.isoDate).toBe('2026-08-31');
    expect(result.entities.priority).toBe('HIGH');
    expect(result.entities.tags).toContain('money');
    expect(result.entities.taskText).toBe('pay the electricity bill');
  });

  it('classifies memory creation without persistence access', () => {
    const result = parseLocalNlp('মনে রাখো আমার দোকান শুক্রবার বন্ধ থাকে', now);
    expect(result.intent).toBe('CREATE_MEMORY');
    expect(result.entities.memoryText).toContain('আমার দোকান শুক্রবার বন্ধ থাকে');
  });

  it('classifies memory search and removes the search command', () => {
    const result = parseLocalNlp('আমার দোকান কখন বন্ধ থাকে খুঁজে দাও', now);
    expect(result.intent).toBe('SEARCH_MEMORY');
    expect(result.entities.query).toBe('আমার দোকান কখন বন্ধ থাকে');
  });

  it('keeps the original capitalisation of a saved memory (passwords, proper nouns)', () => {
    const result = parseLocalNlp('remember my Gmail password is AbC#123XyZ', now);
    expect(result.intent).toBe('CREATE_MEMORY');
    expect(result.entities.memoryText).toContain('AbC#123XyZ');
    expect(result.entities.memoryText).toContain('Gmail');
  });

  it('routes "show all my memories" to a list-everything search', () => {
    const result = parseLocalNlp('আমার সব মেমোরি দেখাও', now);
    expect(result.intent).toBe('SEARCH_MEMORY');
    expect(result.entities.query).toBe('');
  });

  it('does not mis-tag a shop note as family from a substring of "আমার"', () => {
    const result = parseLocalNlp('মনে রাখো আমার দোকান শুক্রবার বন্ধ থাকে', now);
    expect(result.entities.tags ?? []).not.toContain('family');
  });

  it('parses Bengali date terms without ASCII word-boundary assumptions', () => {
    const result = parseLocalNlp('পরশু সকাল ৮টায় রিপোর্ট পাঠাতে হবে', now);
    expect(result.intent).toBe('CREATE_TASK');
    expect(result.entities.date?.isoDate).toBe('2026-08-26');
    expect(result.entities.time?.minutes).toBe(480);
  });

  it('does not invent an intent for unrelated input', () => {
    const result = parseLocalNlp('আজ আকাশ অনেক সুন্দর', now);
    expect(result.intent).toBe('UNKNOWN');
    expect(result.confidence).toBe(0);
  });

  it('classifies a plain English imperative as task creation', () => {
    const result = parseLocalNlp('call the supplier tomorrow at 9am', now);
    expect(result.intent).toBe('CREATE_TASK');
    expect(result.entities.taskText).toContain('call the supplier');
    expect(result.entities.date?.isoDate).toBe('2026-08-25');
    expect(result.entities.time?.minutes).toBe(540);
  });

  it('strips the "remind me to" scaffold from the stored task text', () => {
    const result = parseLocalNlp('remind me to pay the rent tomorrow at 9am', now);
    expect(result.intent).toBe('CREATE_TASK');
    expect(result.entities.taskText).toBe('pay the rent');
  });

  it('handles an imperative with no schedule', () => {
    const result = parseLocalNlp('pick up medicine', now);
    expect(result.intent).toBe('CREATE_TASK');
    expect(result.entities.taskText).toBe('pick up medicine');
    expect(result.entities.date).toBeUndefined();
  });

  it('still treats English notes as memories, not tasks', () => {
    const result = parseLocalNlp('remember the home wifi password is hunter2', now);
    expect(result.intent).toBe('CREATE_MEMORY');
  });
});
