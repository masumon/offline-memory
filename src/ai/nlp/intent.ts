import type { NlpIntent } from './types';

interface IntentRule {
  intent: NlpIntent;
  patterns: RegExp[];
  confidence: number;
}

// Bengali "word" boundary: exclude preceding/following letters *and* combining marks,
// otherwise "কাল" wrongly matches inside "বিকাল"/"সকাল" and verb endings mis-fire.
const BN_TASK_VERBS =
  /(?<![\p{L}\p{M}])(?:কর(?:ব|বো)|যাব(?:ো)?|কিনব(?:ো)?|আনব(?:ো)?|নেব(?:ো)?|নিব|দেব(?:ো)?|দিব|লিখব(?:ো)?|পাঠাব(?:ো)?|বানাব(?:ো)?|রাখব(?:ো)?|ডাকব|বলব|আসব|খাব|নামাব|তুলব|ধরব)(?![\p{L}\p{M}])/u;

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

  return { intent: 'UNKNOWN', confidence: 0 };
}
