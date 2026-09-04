import type { SQLiteDatabase } from 'expo-sqlite';
import { orchestrate } from '../src/ai/orchestrator';
import { parseLocalNlp } from '../src/ai/nlp';
import { answerQuestion } from '../src/services/question-answering-service';
import { executeAiAction } from '../src/services/ai-action-executor';
import * as memorySearch from '../src/services/memory-search-service';
import * as semanticMemory from '../src/services/semantic-memory-service';
import * as taskService from '../src/services/task-service';

jest.mock('../src/services/memory-search-service');
jest.mock('../src/services/semantic-memory-service');
jest.mock('../src/services/task-service');

const db = {} as SQLiteDatabase;

const mem = (id: string, content: string, title: string | null = null, tags: string[] = []) => ({
  id, title, content, kind: 'FACT', source: 'USER', tags, importance: 3, archived: false,
  createdAt: '2026-08-01', updatedAt: '2026-08-01', lastAccessedAt: null, relevance: 1,
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(taskService.searchTasks).mockResolvedValue([] as never);
  jest.mocked(semanticMemory.semanticSearchMemories).mockResolvedValue([] as never);
});

describe('local question answering (no LLM, no network)', () => {
  it('answers "what is my passport validity" from a stored Bengali memory', async () => {
    jest.mocked(memorySearch.searchRankedMemories).mockResolvedValue([
      mem('m1', 'আমার পাসপোর্ট এর মেয়াদ ২০৩০ সাল পর্যন্ত'),
    ] as never);

    const parsed = orchestrate('আমার পাসপোর্টের মেয়াদ কত?');
    expect(parsed.status).toBe('READY');
    expect(parsed.action.type).toBe('ANSWER_QUESTION');

    const action = parsed.action as Extract<typeof parsed.action, { type: 'ANSWER_QUESTION' }>;
    const result = await answerQuestion(db, { question: action.question, keywords: action.keywords, language: 'bn' });

    expect(result.type).toBe('ANSWER');
    expect(result.span).toContain('2030');
    expect(result.text).toContain('২০৩০'); // rendered in Bengali digits for a bn reply
    expect(result.sources[0]?.id).toBe('m1');
  });

  it('extracts a full plate/ID value after the subject, not just the first digit', async () => {
    jest.mocked(memorySearch.searchRankedMemories).mockResolvedValue([
      mem('car1', 'আমার গাড়ির নম্বর ঢাকা মেট্রো গ ১২-৩৪৫৬'),
    ] as never);
    const action = orchestrate('আমার গাড়ির নম্বর কত?').action as Extract<
      ReturnType<typeof orchestrate>['action'], { type: 'ANSWER_QUESTION' }
    >;
    const result = await answerQuestion(db, { question: action.question, keywords: action.keywords, language: 'bn' });
    expect(result.type).toBe('ANSWER');
    expect(result.span).toContain('ঢাকা');
    expect(result.span).toContain('12-3456');
  });

  it('answers the English form "when does my passport expire?"', async () => {
    jest.mocked(memorySearch.searchRankedMemories).mockResolvedValue([
      mem('m2', 'My passport expires in 2030.', 'Passport'),
    ] as never);

    const action = orchestrate('when does my passport expire?').action as Extract<
      ReturnType<typeof orchestrate>['action'], { type: 'ANSWER_QUESTION' }
    >;
    const result = await answerQuestion(db, { question: action.question, keywords: action.keywords, language: 'en' });

    expect(result.type).toBe('ANSWER');
    expect(result.span).toContain('2030');
    expect(result.text).toContain('2030');
  });

  it('returns a best-effort sourced answer when the note is on-subject but coverage is partial', async () => {
    // Only "পাসপোর্ট" overlaps literally; "নবায়ন"/"তারিখ" do not — below the strict
    // floor, but the note is unmistakably about the passport the user asked about.
    jest.mocked(memorySearch.searchRankedMemories).mockResolvedValue([
      mem('soft1', 'পাসপোর্ট বইয়ের ভেতরে লেখা আছে ইস্যু ২০২২, বৈধতা দশ বছর'),
    ] as never);
    const action = orchestrate('আমার পাসপোর্ট নবায়নের তারিখ কত?').action as Extract<
      ReturnType<typeof orchestrate>['action'], { type: 'ANSWER_QUESTION' }
    >;
    const result = await answerQuestion(db, { question: action.question, keywords: action.keywords, language: 'bn' });
    expect(result.type).toBe('ANSWER');
    expect(result.sources[0]?.id).toBe('soft1');
    expect(result.confidence).toBeLessThan(0.75);
  });

  it('says it does not know when nothing is stored', async () => {
    jest.mocked(memorySearch.searchRankedMemories).mockResolvedValue([] as never);
    const action = orchestrate('আমার ভিসার মেয়াদ কত?').action as Extract<
      ReturnType<typeof orchestrate>['action'], { type: 'ANSWER_QUESTION' }
    >;
    const result = await answerQuestion(db, { question: action.question, keywords: action.keywords, language: 'bn' });
    expect(result.type).toBe('NO_ANSWER');
    expect(result.confidence).toBe(0);
  });

  it('does not guess from an unrelated memory (keyword coverage guardrail)', async () => {
    jest.mocked(memorySearch.searchRankedMemories).mockResolvedValue([
      mem('m3', 'আমার বাসার wifi পাসওয়ার্ড হলো hunter2'),
    ] as never);
    const action = orchestrate('আমার পাসপোর্টের মেয়াদ কত?').action as Extract<
      ReturnType<typeof orchestrate>['action'], { type: 'ANSWER_QUESTION' }
    >;
    const result = await answerQuestion(db, { question: action.question, keywords: action.keywords, language: 'bn' });
    expect(result.type).toBe('NO_ANSWER');
  });

  it('runs end-to-end through the action executor', async () => {
    jest.mocked(memorySearch.searchRankedMemories).mockResolvedValue([
      mem('m4', 'পাসপোর্টের মেয়াদ ২০৩০ সাল'),
    ] as never);
    const action = orchestrate('পাসপোর্টের মেয়াদ কবে শেষ?').action as Exclude<
      ReturnType<typeof orchestrate>['action'], { type: 'CLARIFY' }
    >;
    const result = await executeAiAction(db, action, { language: 'bn' });
    expect(result.type).toBe('QUESTION_ANSWERED');
    if (result.type === 'QUESTION_ANSWERED') expect(result.answer.span).toContain('2030');
  });

  it('answers cross-language: English question against a Bengali-only note', async () => {
    // Note is entirely Bengali; the question is English. Synonym expansion bridges
    // "passport"→"পাসপোর্ট" and "expiry/validity"→"মেয়াদ"; semantic gives a nudge.
    jest.mocked(memorySearch.searchRankedMemories).mockResolvedValue([] as never);
    jest.mocked(semanticMemory.semanticSearchMemories).mockResolvedValue([
      { memory: mem('s1', 'আমার পাসপোর্ট এর মেয়াদ ২০৩০ সাল পর্যন্ত'), score: 0.22 },
    ] as never);

    const action = orchestrate('what is my passport validity?').action as Extract<
      ReturnType<typeof orchestrate>['action'], { type: 'ANSWER_QUESTION' }
    >;
    const result = await answerQuestion(db, { question: action.question, keywords: action.keywords, language: 'en' });
    expect(result.type).toBe('ANSWER');
    expect(result.span).toContain('2030');
    expect(result.sources[0]?.id).toBe('s1');
  });

  it('does not answer a visa question from a passport note (subject guardrail)', async () => {
    jest.mocked(memorySearch.searchRankedMemories).mockResolvedValue([
      mem('p1', 'আমার পাসপোর্ট এর মেয়াদ ২০৩০ সাল পর্যন্ত'),
    ] as never);
    jest.mocked(semanticMemory.semanticSearchMemories).mockResolvedValue([
      { memory: mem('p1', 'আমার পাসপোর্ট এর মেয়াদ ২০৩০ সাল পর্যন্ত'), score: 0.19 },
    ] as never);
    const action = orchestrate('আমার ভিসার মেয়াদ কত?').action as Extract<
      ReturnType<typeof orchestrate>['action'], { type: 'ANSWER_QUESTION' }
    >;
    const result = await answerQuestion(db, { question: action.question, keywords: action.keywords, language: 'bn' });
    expect(result.type).toBe('NO_ANSWER');
  });

  it('falls back to a matching task when no memory covers the question', async () => {
    jest.mocked(memorySearch.searchRankedMemories).mockResolvedValue([] as never);
    jest.mocked(taskService.searchTasks).mockResolvedValue([
      { id: 't1', title: 'পাসপোর্ট রিনিউ করতে হবে', notes: null, status: 'PLANNED', priority: 'MEDIUM',
        dueAt: '2026-09-10T10:00:00', plannedDate: '2026-09-10', completedAt: null, createdAt: '', updatedAt: '' },
    ] as never);
    const action = orchestrate('পাসপোর্ট রিনিউ কবে?').action as Extract<
      ReturnType<typeof orchestrate>['action'], { type: 'ANSWER_QUESTION' }
    >;
    const result = await answerQuestion(db, { question: action.question, keywords: action.keywords, language: 'bn' });
    expect(result.type).toBe('ANSWER');
    expect(result.sources[0]?.origin).toBe('TASK');
  });
});

describe('follow-up questions inherit the previous topic', () => {
  it('folds the previous question keywords into a terse follow-up', () => {
    const action = orchestrate('আর ভিসারটা?', new Date(), { lastKeywords: ['পাসপোর্ট', 'মেয়াদ'] }).action as Extract<
      ReturnType<typeof orchestrate>['action'], { type: 'ANSWER_QUESTION' }
    >;
    expect(action.type).toBe('ANSWER_QUESTION');
    expect(action.keywords).toEqual(expect.arrayContaining(['ভিসার', 'মেয়াদ']));
  });

  it('does not fold context into a self-sufficient question', () => {
    const action = orchestrate('আমার গাড়ির নম্বর প্লেট কত এবং রঙ কী?', new Date(), { lastKeywords: ['পাসপোর্ট', 'মেয়াদ'] }).action as Extract<
      ReturnType<typeof orchestrate>['action'], { type: 'ANSWER_QUESTION' }
    >;
    expect(action.keywords).not.toContain('পাসপোর্ট');
  });
});

describe('question intent classification stays clear of commands', () => {
  it('routes an interrogative to ANSWER_QUESTION', () => {
    expect(parseLocalNlp('আমার পাসপোর্টের মেয়াদ কত?').intent).toBe('ANSWER_QUESTION');
    expect(parseLocalNlp('what is my wifi password?').intent).toBe('ANSWER_QUESTION');
  });

  it('keeps task creation, completion, memory save and search intact', () => {
    expect(parseLocalNlp('call the supplier tomorrow at 9am').intent).toBe('CREATE_TASK');
    expect(parseLocalNlp('শেষ করো').intent).toBe('COMPLETE_TASK');
    expect(parseLocalNlp('মনে রাখো আমার দোকান শুক্রবার বন্ধ থাকে').intent).toBe('CREATE_MEMORY');
    expect(parseLocalNlp('আমার দোকান কখন বন্ধ থাকে খুঁজে দাও').intent).toBe('SEARCH_MEMORY');
  });

  it('exposes the question and salient keywords as entities', () => {
    const parsed = parseLocalNlp('আমার পাসপোর্টের মেয়াদ কত?');
    expect(parsed.entities.question).toBeTruthy();
    expect(parsed.entities.keywords).toEqual(expect.arrayContaining(['পাসপোর্ট', 'মেয়াদ']));
  });
});
