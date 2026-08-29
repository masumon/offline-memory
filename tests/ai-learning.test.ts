import type { SQLiteDatabase } from 'expo-sqlite';
import { editDistance, fuzzyIncludes } from '../src/ai/nlp/lexicon';
import { numberWordsToDigits } from '../src/ai/nlp/normalize';
import { extractPriority, extractTags, extractRelativeTime } from '../src/ai/nlp/entities';
import { parseLocalNlpMulti } from '../src/ai/nlp';
import { titleSignature, suggestTime, preferredIntent, topFrequentTasks } from '../src/services/learning-service';
import { bumpStreak, getStreak } from '../src/services/streak-service';
import { listAiEngines, getAiEngine, resolveActiveEngine, registerAiEngine, type AiEngine } from '../src/ai/engine';
import { linkTaskMemory, unlinkTaskMemory, listLinkedMemories } from '../src/services/relation-service';

jest.mock('../src/services/memory-repository', () => ({ getMemory: jest.fn(async (_db: unknown, id: string) => ({ id, content: `memory ${id}`, title: null, tags: [] })) }));
jest.mock('../src/services/task-repository', () => ({ getTask: jest.fn(async (_db: unknown, id: string) => ({ id, title: `task ${id}` })) }));

describe('P1 lexicon helpers', () => {
  it('measures edit distance', () => {
    expect(editDistance('call', 'call')).toBe(0);
    expect(editDistance('remaind', 'remind')).toBe(1);
    expect(editDistance('kitten', 'sitting')).toBe(3);
  });

  it('fuzzy-matches typos only for longer words', () => {
    expect(fuzzyIncludes('schedule', ['schedule'])).toBe(true);
    expect(fuzzyIncludes('shedule', ['schedule'])).toBe(true); // 1 edit, len >= 5
    expect(fuzzyIncludes('buy', ['try'])).toBe(false); // short words need exact
  });
});

describe('P1 number-word normalisation', () => {
  it('turns bare cardinals into digits', () => {
    expect(numberWordsToDigits('call in two hours')).toContain('2');
    expect(numberWordsToDigits('তিন দিন পর')).toContain('3');
  });
  it('converts a cardinal even when a Bengali counter suffix follows it', () => {
    // Only the preceding char is boundary-checked, so "তিনটায়" → "3টায়" and the
    // time extractor can then read "3টায়".
    expect(numberWordsToDigits('তিনটায় মিটিং')).toBe('3টায় মিটিং');
  });
});

describe('P1 priority + tag extraction', () => {
  it('reads urgency words in both languages', () => {
    expect(extractPriority('call the client asap')).toBe('URGENT');
    expect(extractPriority('this is important')).toBe('HIGH');
    expect(extractPriority('do it whenever')).toBe('LOW');
    expect(extractPriority('জরুরি কাজ')).toBe('URGENT');
    expect(extractPriority('just a normal note')).toBeUndefined();
  });

  it('auto-tags from common nouns, capped at 3', () => {
    expect(extractTags('pay the electricity bill')).toEqual(expect.arrayContaining(['money']));
    expect(extractTags('take mom to the doctor')).toEqual(expect.arrayContaining(['health', 'family']));
    expect(extractTags('office meeting report deadline bill rent exam class').length).toBeLessThanOrEqual(3);
  });
});

describe('P1 relative time', () => {
  it('resolves "in N hours" to an absolute time today', () => {
    const now = new Date('2026-08-28T10:00:00');
    const out = extractRelativeTime('call supplier in 2 hours', now);
    expect(out?.time.minutes).toBe(12 * 60);
    expect(out?.date.isoDate).toBe('2026-08-28');
  });
  it('handles the Bengali "পর" form', () => {
    const now = new Date('2026-08-28T10:00:00');
    const out = extractRelativeTime('৩০ মিনিট পর ওষুধ', now);
    expect(out?.time.minutes).toBe(10 * 60 + 30);
  });
  it('returns undefined without a relative marker', () => {
    expect(extractRelativeTime('call supplier at 9am')).toBeUndefined();
  });
});

describe('P1 multi-step capture', () => {
  it('splits only when 2+ parts are real create actions', () => {
    const multi = parseLocalNlpMulti('buy milk, then call the bank, and email the report');
    expect(multi.length).toBeGreaterThanOrEqual(2);
  });
  it('does not split a single instruction', () => {
    const single = parseLocalNlpMulti('call the supplier tomorrow at 9am');
    expect(single).toHaveLength(1);
  });
});

describe('P1 learning-service', () => {
  it('builds a stable title signature', () => {
    expect(titleSignature('Call the supplier about the invoice')).toBe('call supplier');
    expect(titleSignature('go to the gym')).toBe('go gym');
  });

  it('suggests a time only after the pattern repeats', async () => {
    const withCount = (count: number) => ({
      getFirstAsync: jest.fn().mockResolvedValue(count ? { value: '06:00', count } : null),
    }) as unknown as SQLiteDatabase;
    expect(await suggestTime(withCount(3), 'go to the gym')).toBe(6 * 60);
    expect(await suggestTime(withCount(1), 'go to the gym')).toBeNull();
    expect(await suggestTime(withCount(0), 'go to the gym')).toBeNull();
  });

  it('returns a preferred intent once corrections pass the threshold', async () => {
    const db = {
      getAllAsync: jest.fn().mockResolvedValue([{ value: 'MEMORY', count: 4 }, { value: 'TASK', count: 1 }]),
    } as unknown as SQLiteDatabase;
    expect(await preferredIntent(db, 'wifi password')).toBe('MEMORY');
  });

  it('lists frequent tasks from the repository shape', async () => {
    const db = {
      getAllAsync: jest.fn().mockResolvedValue([{ value: 'water the plants', count: 5 }]),
    } as unknown as SQLiteDatabase;
    expect(await topFrequentTasks(db, 4)).toEqual(['water the plants']);
  });

  it('never throws when the learning table is unavailable', async () => {
    const db = { getFirstAsync: jest.fn().mockRejectedValue(new Error('no table')), getAllAsync: jest.fn().mockRejectedValue(new Error('no table')) } as unknown as SQLiteDatabase;
    await expect(suggestTime(db, 'x y')).resolves.toBeNull();
    await expect(preferredIntent(db, 'x y')).resolves.toBeNull();
    await expect(topFrequentTasks(db)).resolves.toEqual([]);
  });
});

function fakePrefsDb() {
  const store = new Map<string, string>();
  return {
    getAllAsync: jest.fn(async (_sql: string) =>
      [...store.entries()].filter(([k]) => k === 'streakCount' || k === 'streakDate').map(([key, value]) => ({ key, value })),
    ),
    runAsync: jest.fn(async (_sql: string, ...args: unknown[]) => {
      const key = _sql.includes('streakCount') ? 'streakCount' : 'streakDate';
      store.set(key, String(args[0]));
      return { changes: 1, lastInsertRowId: 0 };
    }),
  } as unknown as SQLiteDatabase;
}

describe('P1 streak-service', () => {
  it('counts consecutive days and resets after a gap', async () => {
    const db = fakePrefsDb();
    const d1 = new Date('2026-08-26T20:00:00');
    const d2 = new Date('2026-08-27T20:00:00');
    const d4 = new Date('2026-08-29T20:00:00');
    expect(await bumpStreak(db, d1)).toBe(1);
    expect(await bumpStreak(db, d2)).toBe(2);
    expect(await bumpStreak(db, d2)).toBe(2); // same day is idempotent
    expect(await bumpStreak(db, d4)).toBe(1); // missed the 28th
  });

  it('reports 0 once the streak goes stale', async () => {
    const db = fakePrefsDb();
    await bumpStreak(db, new Date('2026-08-20T20:00:00'));
    expect(await getStreak(db, new Date('2026-08-29T09:00:00'))).toBe(0);
  });
});

describe('P5 task ↔ memory links', () => {
  function fakeRelDb() {
    const rows: { from_id: string; to_id: string; created_at: string }[] = [];
    return {
      runAsync: jest.fn(async (sql: string, ...args: unknown[]) => {
        const a = args.map(String);
        if (sql.includes('INSERT INTO relations')) {
          const [, from_id = '', to_id = '', created_at = ''] = a;
          if (!rows.some(r => r.from_id === from_id && r.to_id === to_id)) rows.push({ from_id, to_id, created_at });
        } else if (sql.includes('DELETE FROM relations')) {
          const [from_id = '', to_id = ''] = a;
          for (let i = rows.length - 1; i >= 0; i--) if (rows[i]!.from_id === from_id && rows[i]!.to_id === to_id) rows.splice(i, 1);
        }
        return { changes: 1, lastInsertRowId: 0 };
      }),
      getAllAsync: jest.fn(async (_sql: string, taskId: string) =>
        rows.filter(r => r.from_id === taskId).map(r => ({ to_id: r.to_id })),
      ),
    } as unknown as SQLiteDatabase;
  }

  it('links, dedups, hydrates, and unlinks', async () => {
    const db = fakeRelDb();
    await linkTaskMemory(db, 't1', 'm1');
    await linkTaskMemory(db, 't1', 'm1'); // idempotent
    await linkTaskMemory(db, 't1', 'm2');
    const linked = await listLinkedMemories(db, 't1');
    expect(linked.map(m => m.id)).toEqual(['m1', 'm2']);
    await unlinkTaskMemory(db, 't1', 'm1');
    expect((await listLinkedMemories(db, 't1')).map(m => m.id)).toEqual(['m2']);
  });

  it('rejects a link with a missing side', async () => {
    await expect(linkTaskMemory(fakeRelDb(), '', 'm1')).rejects.toThrow(/required/i);
  });
});

describe('P4 pluggable AI engine', () => {
  it('always exposes the built-in rule engine as ready', async () => {
    const builtIn = getAiEngine('local-rules');
    expect(builtIn?.descriptor.builtIn).toBe(true);
    expect(await builtIn?.isReady()).toBe(true);
    expect(listAiEngines().some((e) => e.descriptor.id === 'local-rules')).toBe(true);
  });

  it('falls back to the built-in engine when the preferred one is missing', async () => {
    expect((await resolveActiveEngine('on-device-llm')).descriptor.id).toBe('local-rules');
    expect((await resolveActiveEngine(null)).descriptor.id).toBe('local-rules');
  });

  it('uses a registered opt-in engine only while it reports ready', async () => {
    let ready = false;
    const stub: AiEngine = {
      descriptor: { id: 'on-device-llm', label: { bn: 'x', en: 'x' }, description: { bn: 'x', en: 'x' }, builtIn: false },
      isReady: async () => ready,
      generate: async () => 'hi',
    };
    registerAiEngine(stub);
    expect((await resolveActiveEngine('on-device-llm')).descriptor.id).toBe('local-rules');
    ready = true;
    expect((await resolveActiveEngine('on-device-llm')).descriptor.id).toBe('on-device-llm');
  });
});
