import type { NlpIntent } from './types';

interface IntentRule {
  intent: NlpIntent;
  patterns: RegExp[];
  confidence: number;
}

const RULES: IntentRule[] = [
  { intent: 'COMPLETE_TASK', confidence: 0.96, patterns: [/^(done|complete|finish|mark .* complete)/u, /শেষ কর(?:ো|তে)?/u, /সম্পন্ন কর/u, /হয়ে গেছে/u] },
  { intent: 'RESCHEDULE_TASK', confidence: 0.95, patterns: [/\b(reschedule|move|postpone|delay)\b/u, /পিছ/u, /পরে কর/u, /তারিখ বদল/u, /পিছিয়ে/u, /পিছিয়ে/u] },
  { intent: 'SEARCH_MEMORY', confidence: 0.94, patterns: [/\b(search|find|remember|recall)\b/u, /খুঁজ(?:ে|ে দাও)/u, /মনে কর(?:িয়ে|ে) দাও/u, /মনে আছে/u] },
  { intent: 'CREATE_MEMORY', confidence: 0.93, patterns: [/\b(remember|save|memorize|note)\b/u, /মনে রাখ(?:ো|বে|বেন)/u, /নোট কর/u, /মনে রাখার জন্য/u] },
  { intent: 'LIST_TASKS', confidence: 0.92, patterns: [/\b(list|show|what are|my tasks|today's tasks)\b/u, /কাজগুলো? দেখ/u, /কাজের তালিকা/u, /আজকের কাজ/u, /কি কি কাজ/u] },
  { intent: 'CREATE_TASK', confidence: 0.91, patterns: [/\b(add|create|make|remind me to|todo|task)\b/u, /কাজ যোগ/u, /কাজ কর(?:তে হবে)?/u, /আমাকে মনে করিয়ে দিও/u, /(?:করতে|যেতে|পাঠাতে|দেখতে) হবে/u] },
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
