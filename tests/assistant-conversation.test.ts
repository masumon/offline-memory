import { orchestrate } from '../src/ai/orchestrator';
import { parseLocalNlp } from '../src/ai/nlp';
import { helpTopics, smallTalkReply, classifySmallTalk } from '../src/ai/assistant/conversation';

describe('conversational intents', () => {
  it('routes help requests (both languages) to HELP', () => {
    for (const q of ['help', 'what can you do', 'তুমি কী কী করতে পারো', 'অ্যাপটা কী করে', 'সব ফিচার দেখাও']) {
      expect(parseLocalNlp(q).intent).toBe('HELP');
    }
    const r = orchestrate('help');
    expect(r.status).toBe('READY');
    expect(r.action.type).toBe('SHOW_HELP');
  });

  it('routes greetings / thanks / identity to SMALL_TALK', () => {
    for (const q of ['hi', 'hello', 'thanks', 'ধন্যবাদ', 'আসসালামু আলাইকুম', 'কেমন আছো', 'তুমি কে?']) {
      expect(parseLocalNlp(q).intent).toBe('SMALL_TALK');
    }
    const r = orchestrate('thank you');
    expect(r.status).toBe('READY');
    expect(r.action).toEqual({ type: 'SMALL_TALK', text: 'thank you' });
  });

  it('does not mistake real commands for chat', () => {
    expect(parseLocalNlp('call mom tomorrow at 9am').intent).toBe('CREATE_TASK');
    expect(parseLocalNlp('আমার পাসপোর্টের মেয়াদ কত?').intent).toBe('ANSWER_QUESTION');
    expect(parseLocalNlp('মনে রাখো আমার পিন 1234').intent).toBe('CREATE_MEMORY');
  });

  it('help content covers the core features in the chosen language', () => {
    const bn = helpTopics('bn');
    expect(bn.topics.length).toBeGreaterThanOrEqual(6);
    expect(bn.topics.map((t) => t.title).join(' ')).toMatch(/টাস্ক|মেমোরি|প্রশ্ন/);
    const en = helpTopics('en');
    expect(en.topics.some((t) => /task/i.test(t.title))).toBe(true);
  });

  it('small-talk replies are non-empty and kind-aware', () => {
    expect(classifySmallTalk('thanks a lot')).toBe('thanks');
    expect(classifySmallTalk('who are you')).toBe('identity');
    expect(smallTalkReply('thanks', 'bn')).toMatch(/সবসময়|ধন্যবাদ|লাগলে/);
    expect(smallTalkReply('who are you', 'en')).toMatch(/assistant/i);
    expect(smallTalkReply('hi', 'bn').length).toBeGreaterThan(0);
  });
});
