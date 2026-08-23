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

  it('parses English time with an explicit date', () => {
    const result = parseLocalNlp('Create a task to call the supplier on 12/8/2026 at 5pm', now);

    expect(result.intent).toBe('CREATE_TASK');
    expect(result.entities.date?.isoDate).toBe('2026-08-12');
    expect(result.entities.time?.minutes).toBe(1020);
    expect(result.entities.taskText).toContain('call the supplier');
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

  it('does not invent an intent for unrelated input', () => {
    const result = parseLocalNlp('আজ আকাশ অনেক সুন্দর', now);

    expect(result.intent).toBe('UNKNOWN');
    expect(result.confidence).toBe(0);
  });
});
