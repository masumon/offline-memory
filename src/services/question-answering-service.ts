import type { SQLiteDatabase } from 'expo-sqlite';
import type { Memory } from '../types/memory-model';
import type { Task } from '../types/task-model';
import { classifyQuestionType, type QuestionType } from '../ai/nlp/keywords';
import { normalizeText } from '../ai/nlp/normalize';
import { synonymsOf } from '../ai/semantic';
import { searchRankedMemories } from './memory-search-service';
import { semanticSearchMemories } from './semantic-memory-service';
import { searchTasks } from './task-service';

// Deterministic, on-device question answering — a small retrieval-and-extract pipeline,
// no model and no network:
//   1. Retrieve   – hybrid: lexical keyword ranking ∪ semantic (embedding) similarity
//                   over stored memories, then tasks.
//   2. Ground     – keep a source only when lexical coverage OR semantic similarity is
//                   strong enough; otherwise we say we don't know.
//   3. Extract    – pull the answer span that matches the question type
//                   (quantity / time / place / person / generic).
//   4. Compose    – a short bilingual reply, always with the source snippet.
//   5. Guardrails – below the confidence floor we say we don't know instead of guessing.

export type AnswerLanguage = 'bn' | 'en';

export interface AnswerSource {
  id: string;
  origin: 'MEMORY' | 'TASK';
  snippet: string;
}

export interface AnswerResult {
  type: 'ANSWER' | 'NO_ANSWER';
  /** The composed, user-facing reply. Always populated. */
  text: string;
  /** The extracted value, when a specific span was found ("2030 সাল"). */
  span?: string;
  /** 0..1 — retrieval coverage + span bonus. */
  confidence: number;
  questionType: QuestionType;
  sources: AnswerSource[];
  /** Step log for diagnostics/monitoring; never shown to the user. */
  trace: string[];
}

const MIN_COVERAGE = 0.5;
// Semantic acceptance: a strong embedding match can stand in for exact keywords, but
// only with at least a toe-hold of lexical overlap so we never answer from a note that
// merely "feels" related.
const MIN_SEMANTIC = 0.16;
const STRONG_SEMANTIC = 0.4;
const SNIPPET_MAX = 160;

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
function toBengaliDigits(value: string): string {
  return value.replace(/\d/g, (d) => BN_DIGITS[Number(d)] ?? d);
}
function forLang(value: string, lang: AnswerLanguage): string {
  return lang === 'bn' ? toBengaliDigits(value) : value;
}

function uniq(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim().toLowerCase()).filter(Boolean))];
}

function clampSnippet(value: string): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length > SNIPPET_MAX ? `${clean.slice(0, SNIPPET_MAX - 1)}…` : clean;
}

/** Split into sentence-ish units and return the one that covers the most keywords. */
function bestSentence(haystack: string, keywords: string[]): string {
  const parts = haystack
    .split(/(?<=[।.!?\n])\s+|[\n;]+/u)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (parts.length <= 1) return haystack.trim();
  let best = parts[0]!;
  let bestHits = -1;
  for (const part of parts) {
    const lower = part.toLowerCase();
    const hits = keywords.reduce((n, k) => (lower.includes(k) ? n + 1 : n), 0);
    if (hits > bestHits) { best = part; bestHits = hits; }
  }
  return best;
}

const MONTHS =
  '(?:january|february|march|april|may|june|july|august|september|october|november|december|জানুয়ারি|ফেব্রুয়ারি|মার্চ|এপ্রিল|মে|জুন|জুলাই|আগস্ট|সেপ্টেম্বর|অক্টোবর|নভেম্বর|ডিসেম্বর|জানুয়ারী|ফেব্রুয়ারী)';
const REL_DAY = '(?:today|tomorrow|yesterday|tonight|আজ|আগামীকাল|কাল|পরশু|গতকাল)';

/** Trim leading/trailing separators and filler that regex capture sometimes leaves behind. */
function tidySpan(value: string | undefined): string | undefined {
  const cleaned = value?.replace(/^[\s\-:=–—,.।]+/u, '').replace(/[\s\-:=–—,.।]+$/u, '').trim();
  return cleaned || undefined;
}

/** Pull the answer span from a sentence, guided by the question type. */
function extractSpan(sentence: string, type: QuestionType): string | undefined {
  const s = normalizeText(sentence); // digits → ASCII, lower-cased, NFKC

  const year = s.match(/(?<!\d)(?:19|20)\d{2}(?!\d)/u)?.[0];
  const isoDate = s.match(/(?<!\d)\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?(?!\d)/u)?.[0];
  const monthDate = s.match(new RegExp(`(?:\\d{1,2}\\s+)?${MONTHS}(?:\\s+\\d{1,4})?`, 'u'))?.[0];
  const relDay = s.match(new RegExp(REL_DAY, 'u'))?.[0];
  const clock = s.match(/\d{1,2}(?::\d{2})?\s*(?:am|pm|টা|টায়)/u)?.[0];
  const numberWithUnit = s.match(
    /\d[\d,]*(?:\.\d+)?\s*(?:সাল|টাকা|tk|৳|\$|percent|%|শতাংশ|বছর|মাস|সপ্তাহ|দিন|ঘণ্টা|ঘন্টা|মিনিট|কেজি|kg|জন|টি|টা|বার|kilo|km|মিটার|gb|mb)?/u,
  )?.[0]?.trim();

  if (type === 'TIME') {
    return tidySpan(year ?? isoDate ?? monthDate ?? relDay ?? clock ?? numberWithUnit);
  }
  if (type === 'QUANTITY') {
    return tidySpan(numberWithUnit ?? year ?? isoDate);
  }
  if (type === 'PERSON') {
    // "… নাম <X>" / "name is <X>" / "… হলেন <X>"
    const m = s.match(/(?:name\s+is|নাম\s*[:\-]?|হলেন|হল|হচ্ছে|is)\s+([^\s।.,;]+(?:\s+[^\s।.,;]+){0,2})/u);
    return tidySpan(m?.[1]);
  }
  if (type === 'PLACE') {
    const m = s.match(/(?:address\s+is|ঠিকানা\s*[:\-]?|located\s+at|at\s+|in\s+|এ\s+আছে|তে\s+আছে|রেখেছি|রাখা\s+আছে)\s*([^।.;]+)/u);
    return tidySpan(m?.[1]);
  }
  // GENERIC: whatever follows a copula / colon.
  const copula = s.match(/(?:\bis\b|\bare\b|হল|হলো|হচ্ছে|:|=)\s*([^।.;]+)/u);
  return tidySpan(copula?.[1] || year || numberWithUnit);
}

/** Fraction of keyword *concepts* (a keyword or any of its synonyms) present in `text`. */
function keywordCoverage(text: string, concepts: string[][]): number {
  if (concepts.length === 0) return 0;
  const lower = normalizeText(text);
  const hit = concepts.filter((forms) => forms.some((f) => lower.includes(f))).length;
  return hit / concepts.length;
}

/** True when the question's subject (its first concept) is actually in `text`. */
function subjectPresent(text: string, concepts: string[][]): boolean {
  const lower = normalizeText(text);
  return concepts.slice(0, 2).some((forms) => forms.some((f) => lower.includes(f)));
}

function composeAnswer(
  lang: AnswerLanguage,
  span: string | undefined,
  snippet: string,
  origin: 'MEMORY' | 'TASK',
): string {
  const src = clampSnippet(snippet);
  if (span) {
    const value = forLang(span, lang);
    return lang === 'bn'
      ? `উত্তর: ${value}\n(আপনার ${origin === 'TASK' ? 'টাস্ক' : 'নোট'} থেকে: “${forLang(src, lang)}”)`
      : `Answer: ${value}\n(from your ${origin === 'TASK' ? 'task' : 'note'}: “${src}”)`;
  }
  return lang === 'bn'
    ? `আপনার সেভ করা ${origin === 'TASK' ? 'টাস্কে' : 'নোটে'} যা আছে:\n“${forLang(src, lang)}”`
    : `Here is what your saved ${origin === 'TASK' ? 'task' : 'note'} says:\n“${src}”`;
}

function noAnswer(lang: AnswerLanguage, type: QuestionType, trace: string[]): AnswerResult {
  return {
    type: 'NO_ANSWER',
    text:
      lang === 'bn'
        ? 'এই বিষয়ে সেভ করা কোনো তথ্য খুঁজে পাইনি। মেমোরিতে যোগ করে রাখলে পরে উত্তর দিতে পারব।'
        : "I couldn't find anything saved about that. Add it to memory and I can answer next time.",
    confidence: 0,
    questionType: type,
    sources: [],
    trace,
  };
}

function taskWhen(task: Task, lang: AnswerLanguage): string | undefined {
  const raw = task.dueAt ?? task.plannedDate ?? undefined;
  if (!raw) return undefined;
  return forLang(raw.replace('T', ' ').slice(0, 16), lang);
}

export interface AnswerQuestionInput {
  question: string;
  keywords: string[];
  language?: AnswerLanguage;
}

export async function answerQuestion(
  db: SQLiteDatabase,
  input: AnswerQuestionInput,
): Promise<AnswerResult> {
  const lang: AnswerLanguage = input.language ?? 'bn';
  const type = classifyQuestionType(input.question);
  const keywords = uniq(input.keywords).slice(0, 8);
  const trace: string[] = [`q="${input.question}"`, `type=${type}`, `keywords=[${keywords.join(', ')}]`];

  if (keywords.length === 0) return noAnswer(lang, type, [...trace, 'no-keywords']);

  // Each keyword becomes a "concept" = the word plus its bilingual synonyms, so a
  // question in English can still match a Bengali note (and vice-versa).
  const concepts = keywords.map((k) => uniq([k, ...synonymsOf(k)]));
  const query = keywords.join(' ');

  try {
    // ── 1. Hybrid retrieval over memories: lexical keywords ∪ semantic embeddings ──
    const [ranked, semantic] = await Promise.all([
      searchRankedMemories(db, query),
      semanticSearchMemories(db, input.question, 8).catch(() => []),
    ]);
    trace.push(`memories.lexical=${ranked.length}`, `memories.semantic=${semantic.length}`);

    const candidates = new Map<string, { memory: Memory; coverage: number; subject: boolean; sem: number }>();
    const consider = (memory: Memory, sem: number) => {
      const haystack = `${memory.title ?? ''} ${memory.content} ${memory.tags.join(' ')}`;
      const existing = candidates.get(memory.id);
      if (existing) { existing.sem = Math.max(existing.sem, sem); return; }
      candidates.set(memory.id, {
        memory,
        coverage: keywordCoverage(haystack, concepts),
        subject: subjectPresent(haystack, concepts),
        sem,
      });
    };
    for (const memory of ranked.slice(0, 8)) consider(memory, 0);
    for (const hit of semantic) consider(hit.memory, hit.score);

    // Rank by a blend (lexical coverage dominates; semantic breaks ties / boosts recall).
    const scored = [...candidates.values()]
      .map((c) => ({ ...c, blend: c.coverage * 0.6 + Math.min(1, c.sem / STRONG_SEMANTIC) * 0.4 }))
      .sort((a, b) => b.blend - a.blend);
    const best = scored[0];

    // Guardrail: never answer unless the question's subject is actually in the note,
    // then require solid keyword coverage OR decent coverage plus a semantic signal.
    const accepted =
      best &&
      best.subject &&
      (best.coverage >= MIN_COVERAGE || (best.coverage >= 0.34 && best.sem >= MIN_SEMANTIC));

    if (best && accepted) {
      trace.push(`memory.match coverage=${best.coverage.toFixed(2)} sem=${best.sem.toFixed(2)} subject=${best.subject}`);
      const sentence = bestSentence(best.memory.content, keywords);
      const span = extractSpan(sentence, type);
      const confidence = Math.min(
        0.99,
        0.35 + best.coverage * 0.4 + Math.min(0.2, best.sem * 0.4) + (span ? 0.12 : 0),
      );
      trace.push(`span=${span ?? '∅'}`, `confidence=${confidence.toFixed(2)}`);
      return {
        type: 'ANSWER',
        text: composeAnswer(lang, span, sentence, 'MEMORY'),
        span,
        confidence,
        questionType: type,
        sources: [{ id: best.memory.id, origin: 'MEMORY', snippet: clampSnippet(best.memory.content) }],
        trace,
      };
    }
    trace.push(`memory.rejected best=${best ? `${best.blend.toFixed(2)}/subj=${best.subject}` : 'none'}`);

    // ── 2. Fall back to tasks ───────────────────────────────────────────────────
    const tasks = await searchTasks(db, query, 10);
    trace.push(`tasks.matched=${tasks.length}`);
    let bestTask: Task | undefined;
    let bestTaskCoverage = 0;
    for (const task of tasks) {
      const hay = `${task.title} ${task.notes ?? ''}`;
      const coverage = keywordCoverage(hay, concepts);
      if (coverage > bestTaskCoverage && subjectPresent(hay, concepts)) { bestTaskCoverage = coverage; bestTask = task; }
    }
    if (bestTask && bestTaskCoverage >= MIN_COVERAGE) {
      const when = (type === 'TIME' || type === 'QUANTITY') ? taskWhen(bestTask, lang) : undefined;
      const confidence = Math.min(0.9, 0.35 + bestTaskCoverage * 0.4 + (when ? 0.15 : 0));
      trace.push(`task.span=${when ?? '∅'}`, `confidence=${confidence.toFixed(2)}`);
      return {
        type: 'ANSWER',
        text: composeAnswer(lang, when, bestTask.title, 'TASK'),
        span: when,
        confidence,
        questionType: type,
        sources: [{ id: bestTask.id, origin: 'TASK', snippet: clampSnippet(bestTask.title) }],
        trace,
      };
    }

    return noAnswer(lang, type, [...trace, 'below-floor']);
  } catch (error) {
    trace.push(`error=${error instanceof Error ? error.message : String(error)}`);
    return noAnswer(lang, type, trace);
  }
}
