import type { NlpIntent } from './types';
import { EN_ACTION_VERBS, fuzzyIncludes } from './lexicon';

interface IntentRule {
  intent: NlpIntent;
  patterns: RegExp[];
  confidence: number;
}

// Multi-word verbs need phrase matching; single words go through fuzzyIncludes for
// light typo tolerance ("submt the report" still → task).
const EN_MULTIWORD_VERBS = EN_ACTION_VERBS.filter((v) => v.includes(' '));
const EN_SINGLEWORD_VERBS = EN_ACTION_VERBS.filter((v) => !v.includes(' '));

// Bengali "word" boundary: exclude preceding/following letters *and* combining marks,
// otherwise "কাল" wrongly matches inside "বিকাল"/"সকাল" and verb endings mis-fire.
const BN_TASK_VERBS =
  /(?<![\p{L}\p{M}])(?:কর(?:ব|বো)|যাব(?:ো)?|কিনব(?:ো)?|আনব(?:ো)?|নেব(?:ো)?|নিব|দেব(?:ো)?|দিব|লিখব(?:ো)?|পাঠাব(?:ো)?|বানাব(?:ো)?|রাখব(?:ো)?|ডাকব|বলব|আসব|খাব|নামাব|তুলব|ধরব)(?![\p{L}\p{M}])/u;

// English plain-imperative task capture. Real users type "call the supplier tomorrow
// at 9am" or "pick up medicine", not "create a task to …". Match a leading action verb
// (optionally after a soft intro like "i need to" / "don't forget to"), or an explicit
// "remind me to". Kept below the explicit rules so "search"/"remember" still win.
const EN_TASK_INTRO =
  /^(?:i\s+(?:need|have|want|got)\s+to|i\s+must|don'?t\s+forget\s+to|make\s+sure\s+to|remember\s+to|remind\s+me\s+to|need\s+to|have\s+to|please\s+)+/u;
function isEnglishImperativeTask(text: string): boolean {
  const stripped = text.replace(EN_TASK_INTRO, '').trimStart();
  if (EN_TASK_INTRO.test(text) && stripped.length > 0) return true;
  if (EN_MULTIWORD_VERBS.some((v) => stripped.startsWith(v + ' ') || stripped === v)) return true;
  const first = stripped.split(/[\s,]/u)[0] ?? '';
  return first.length > 1 && fuzzyIncludes(first, EN_SINGLEWORD_VERBS);
}

const RULES: IntentRule[] = [
  {
    intent: 'COMPLETE_TASK',
    confidence: 0.96,
    patterns: [
      /^(done|complete|finish|mark .* complete)\b/u,
      /\bdone\b/u,
      /শেষ (?:কর(?:ো|তে(?! হবে)|ে ফেল|েছি|ে দিয়েছি)|হয়ে গে)/u,
      /সম্পন্ন (?:কর(?:ো|তে(?! হবে)|েছি|ে ফেলেছি)|হয়ে গেছে|হয়েছে)/u,
      /হয়ে গেছে/u,
      /কমপ্লিট(?!\s*(?:কর(?:তে|ব|বো)|হবে))/u,
      /কম্পলিট(?!\s*(?:কর(?:তে|ব|বো)|হবে))/u,
      /সেরে ফেলেছি/u,
      /করে ফেলেছি/u,
    ],
  },
  {
    intent: 'RESCHEDULE_TASK',
    confidence: 0.95,
    patterns: [
      /\b(reschedule|postpone|delay)\b/u,
      /পিছিয়ে/u,
      /এগিয়ে (?:দা|আন|নি)/u,
      /সরিয়ে (?:দা|নি)/u,
      /তারিখ (?:বদল|পরিবর্তন|পাল্টা)/u,
      /অন্য দিন(?:ে)? কর/u,
      /পরে কর(?:ে দাও|ব|তে হবে)/u,
    ],
  },
  {
    intent: 'SEARCH_MEMORY',
    confidence: 0.94,
    patterns: [
      /\b(search|find|recall|look up)\b/u,
      /খুঁজ(?:ে|ে দাও|ে দেখ|ে বের)/u,
      /মনে কর(?:িয়ে|ে) দাও/u,
      /মনে আছে/u,
      /কোথায় (?:আছে|রেখেছি|লিখেছি)/u,
      /কী (?:ছিল|লিখেছিলাম)/u,
    ],
  },
  {
    intent: 'CREATE_MEMORY',
    confidence: 0.93,
    patterns: [
      /\b(remember|save|memorize|note down)\b/u,
      /মনে রাখ(?:ো|বে|বেন|তে)/u,
      /নোট (?:কর(?:ো)?|ে রাখ)/u,
      /মনে রাখার জন্য/u,
      /টুকে রাখ/u,
      /সেভ কর/u,
      /লিখে রাখ/u,
    ],
  },
  {
    intent: 'LIST_TASKS',
    confidence: 0.92,
    patterns: [
      /\b(list tasks|show tasks|what are my tasks|today'?s tasks|my tasks)\b/u,
      /কাজগুলো? দেখ/u,
      /কাজের তালিকা/u,
      /আজকের কাজ(?:গুলো)? (?:দেখ|কি|কী)/u,
      /কি কি কাজ (?:আছে|বাকি)/u,
    ],
  },
  {
    intent: 'CREATE_TASK',
    confidence: 0.91,
    patterns: [
      /\b(add|create|make) (?:a )?(?:task|todo|reminder)\b/u,
      /\bremind me to\b/u,
      /\btodo\b/u,
      /কাজ যোগ/u,
      /(?:করতে|যেতে|পাঠাতে|দেখতে|কিনতে|আনতে|নিতে|দিতে|বলতে|লিখতে|ধরতে|আসতে|খেতে|জমা দিতে|কল দিতে|ফোন দিতে|যোগ দিতে|শুরু করতে|নিয়ে যেতে) (?:হবে|লাগবে|আছে)/u,
      /(?:কিনতে|আনতে|করতে|যেতে|দিতে|নিতে|খেতে|আসতে) লাগবে/u,
      BN_TASK_VERBS,
      /কাজ(?:টা|টি)(?![\p{L}\p{M}])/u,
      /আমাকে মনে করিয়ে দিও/u,
    ],
  },
];

export function classifyIntent(text: string): { intent: NlpIntent; confidence: number } {
  const normalized = text.trim().toLocaleLowerCase();

  for (const rule of RULES) {
    if (rule.patterns.some((pattern) => pattern.test(normalized))) {
      return { intent: rule.intent, confidence: rule.confidence };
    }
  }

  // Fallback: a plain English imperative ("call the supplier tomorrow at 9am").
  if (isEnglishImperativeTask(normalized)) {
    return { intent: 'CREATE_TASK', confidence: 0.82 };
  }

  return { intent: 'UNKNOWN', confidence: 0 };
}
