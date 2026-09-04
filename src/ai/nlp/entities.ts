import type { DateEntity, NlpEntities, NlpIntent, NlpPriority, TimeEntity } from './types';
import { PRIORITY_KEYWORDS, TAG_HINTS } from './lexicon';
import { extractKeywords } from './keywords';
import { recoverCase } from './normalize';

// "show all my memories / notes" — a request to list everything, not to search a term.
// True when, after removing the list/show/all/my scaffolding and the word "memory/note"
// itself, nothing substantive is left.
const LIST_SCAFFOLD = /\b(?:all|every|my|show|list|see|view|open|the)\b|(?<![\p{L}\p{M}])(?:সব|সকল|সমস্ত|আমার|আমাদের|দেখাও|দেখাতে|দেখা|দেখি|তালিকা|খুলে|খোলো)(?![\p{L}\p{M}])|(?:মেমোরি|মেমরি|নোট|memor(?:y|ies)|notes?)(?:গুলো|স)?/giu;
function isListAllMemories(text: string): boolean {
  if (!/(?:মেমোরি|মেমরি|নোট|memor(?:y|ies)|\bnotes?\b)/iu.test(text)) return false;
  return !text.replace(LIST_SCAFFOLD, '').replace(/[\s।.,!?]+/gu, '').trim();
}

const WEEKDAYS: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
  'রবিবার': 0, 'সোমবার': 1, 'মঙ্গলবার': 2, 'বুধবার': 3, 'বৃহস্পতিবার': 4, 'শুক্রবার': 5, 'শনিবার': 6,
};
const DATE_TERMS = ['day after tomorrow', 'tomorrow', 'today', 'আগামীকাল', 'পরশু', 'কাল', 'আজ'] as const;
const BENGALI_DIGITS = '০১২৩৪৫৬৭৮৯';

// Bengali "word" boundary must exclude combining marks too, or "কাল" matches inside "বিকাল".
const NB = '[\\p{L}\\p{M}]';

function toAsciiDigits(value: string): string {
  return [...value].map((char) => { const index = BENGALI_DIGITS.indexOf(char); return index >= 0 ? String(index) : char; }).join('');
}
function startOfDay(date: Date): Date { const value = new Date(date); value.setHours(0, 0, 0, 0); return value; }
function localIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function dateEntity(raw: string, date: Date): DateEntity { return { raw, isoDate: localIsoDate(date), confidence: 0.98 }; }
function findDateTerm(text: string): string | undefined {
  for (const term of DATE_TERMS) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = text.match(new RegExp(`(?<!${NB})${escaped}(?!${NB})`, 'u'));
    if (match) return match[0];
  }
  return undefined;
}

export function extractDate(text: string, now = new Date()): DateEntity | undefined {
  const normalized = toAsciiDigits(text.trim().toLocaleLowerCase());
  const base = startOfDay(now);
  const dateTerm = findDateTerm(normalized);
  if (dateTerm === 'today' || dateTerm === 'আজ') return dateEntity(dateTerm, base);
  if (dateTerm === 'tomorrow' || dateTerm === 'আগামীকাল' || dateTerm === 'কাল') { const date = new Date(base); date.setDate(date.getDate() + 1); return dateEntity(dateTerm, date); }
  if (dateTerm === 'day after tomorrow' || dateTerm === 'পরশু') { const date = new Date(base); date.setDate(date.getDate() + 2); return dateEntity(dateTerm, date); }

  const numeric = normalized.match(/(?<!\d)(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{4}))?(?!\d)/u);
  if (numeric) {
    const day = Number(numeric[1]); const month = Number(numeric[2]) - 1; const year = numeric[3] ? Number(numeric[3]) : now.getFullYear();
    const date = new Date(year, month, day);
    if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) return dateEntity(numeric[0], date);
  }

  const weekday = Object.entries(WEEKDAYS).find(([name]) => normalized.includes(name));
  if (weekday) { const date = new Date(base); const delta = (weekday[1] - date.getDay() + 7) % 7 || 7; date.setDate(date.getDate() + delta); return dateEntity(weekday[0], date); }
  return undefined;
}

function normalizeHour(hour: number, meridiem?: string): number {
  if (!meridiem) return hour;
  const afternoon = /^(pm|p\.m\.|দুপুর|বিকাল|বিকেলে|সন্ধ্যা)/u.test(meridiem);
  const morning = /^(am|a\.m\.|সকাল|সকালে)/u.test(meridiem);
  const night = /^(রাতে)/u.test(meridiem);
  if ((afternoon || night) && hour < 12 && afternoon) return hour + 12;
  if ((morning || night) && hour === 12) return 0;
  return hour;
}

const TIME_PATTERN = /(?:(?:\bat\s+|সময়\s*|(?<period>সকাল|সকালে|দুপুর|বিকাল|বিকেলে|সন্ধ্যা|রাতে)\s*)(?<hour>\d{1,2})(?::(?<minute>\d{2}))?\s*(?<suffix>am|pm|a\.m\.|p\.m\.|টা|টায়|টায়)?|(?<plainHour>\d{1,2}):(?<plainMinute>\d{2})\s*(?<plainSuffix>am|pm|a\.m\.|p\.m\.)?|(?<suffixHour>\d{1,2})\s*(?<suffixOnly>am|pm|a\.m\.|p\.m\.|টা|টায়|টায়))(?=\s|$|[.,!?।])/u;

// "in 2 hours" / "২ ঘণ্টা পর" / "30 min later" / "আধা ঘণ্টা পর" → an absolute time today.
const REL_TIME_PATTERN = /(?:in\s+)?(\d{1,3})\s*(hour|hr|hours|hrs|minute|min|mins|minutes|ঘণ্টা|ঘন্টা|মিনিট)\s*(?:later|from now|পর|পরে)?/u;

export function extractRelativeTime(text: string, now = new Date()): { date: DateEntity; time: TimeEntity } | undefined {
  const normalized = toAsciiDigits(text.trim().toLocaleLowerCase());
  if (!/\b(?:later|from now|in\s+\d)|পর|পরে/u.test(normalized)) return undefined;
  const m = normalized.match(REL_TIME_PATTERN);
  if (!m) return undefined;
  const qty = Number(m[1]);
  const unit = m[2]!;
  const deltaMin = /hour|hr|ঘণ্টা|ঘন্টা/u.test(unit) ? qty * 60 : qty;
  if (!Number.isFinite(deltaMin) || deltaMin <= 0 || deltaMin > 60 * 24 * 7) return undefined;
  const target = new Date(now.getTime() + deltaMin * 60_000);
  return {
    date: { raw: m[0], isoDate: localIsoDate(target), confidence: 0.9 },
    time: { raw: m[0], minutes: target.getHours() * 60 + target.getMinutes(), confidence: 0.9 },
  };
}

export function extractPriority(text: string): NlpPriority | undefined {
  const t = text.toLocaleLowerCase();
  if (PRIORITY_KEYWORDS.URGENT.some((k) => t.includes(k))) return 'URGENT';
  if (PRIORITY_KEYWORDS.HIGH.some((k) => t.includes(k))) return 'HIGH';
  if (PRIORITY_KEYWORDS.LOW.some((k) => t.includes(k))) return 'LOW';
  return undefined;
}

export function extractTags(text: string): string[] {
  const t = text.toLocaleLowerCase();
  const tags: string[] = [];
  for (const [tag, words] of Object.entries(TAG_HINTS)) {
    // Whole-word match only — an unanchored `includes` fired "family" for "আমার"
    // (contains "মা") and "son"/"reason"/"person".
    const hit = words.some((w) => {
      const esc = w.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
      const re = /[a-z]/u.test(w[0] ?? '')
        ? new RegExp(`\\b${esc}\\b`, 'u')
        : new RegExp(`(?<![\\p{L}\\p{M}])${esc}(?![\\p{L}\\p{M}])`, 'u');
      return re.test(t);
    });
    if (hit) tags.push(tag);
  }
  return tags.slice(0, 3);
}

export function extractTime(text: string): TimeEntity | undefined {
  const normalized = toAsciiDigits(text.trim().toLocaleLowerCase());
  const match = normalized.match(TIME_PATTERN);
  if (!match?.groups) return undefined;
  const groups = match.groups;
  const hour = Number(groups.hour ?? groups.plainHour ?? groups.suffixHour);
  const minute = Number(groups.minute ?? groups.plainMinute ?? 0);
  const meridiem = groups.period ?? groups.suffix ?? groups.plainSuffix ?? groups.suffixOnly;
  if (hour > 23 || minute > 59) return undefined;
  const normalizedHour = normalizeHour(hour, meridiem);
  if (normalizedHour > 23) return undefined;
  return { raw: match[0].trim(), minutes: normalizedHour * 60 + minute, confidence: 0.96 };
}

function removeDateTime(text: string): string {
  let cleaned = text.replace(new RegExp(`(?<!${NB})(?:today|tomorrow|day after tomorrow|আজ|আগামীকাল|কাল|পরশু)(?!${NB})`, 'gu'), ' ');
  cleaned = cleaned.replace(/(?<!\d)\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{4})?(?!\d)/gu, ' ');
  // English weekday references ("next Monday", "on friday") — the date is captured
  // by extractDate; drop the words so the stored title stays clean.
  cleaned = cleaned.replace(/(?<![\p{L}\p{M}])(?:(?:next|this|coming|on)\s+)?(?:sunday|monday|tuesday|wednesday|thursday|friday|saturday)(?![\p{L}\p{M}])/giu, ' ');
  // Strip the time span while the period word ("বিকাল" etc.) is still present so
  // extractTime can resolve AM/PM, then mop up any leftover bare period / "Nটা".
  const time = extractTime(cleaned);
  if (time) cleaned = cleaned.replace(time.raw, ' ');
  cleaned = cleaned.replace(/(?<![\p{L}\p{M}])(?:সকাল|সকালে|দুপুর|বিকাল|বিকেলে|সন্ধ্যা|রাত|রাতে|ভোর|(?:early\s+|this\s+|in\s+the\s+)?(?:morning|afternoon|evening|tonight|midnight|noon))(?![\p{L}\p{M}])/giu, ' ');
  cleaned = cleaned.replace(/(?<![\p{L}\p{M}])\d{1,2}\s*(?:টা|টায়)(?![\p{L}\p{M}])/gu, ' ');
  return cleaned.replace(/\s+/g, ' ').trim();
}
// Leading conversational scaffolding for English task capture — stripped so the stored
// task title reads "pay the rent", not "remind me to pay the rent".
const EN_TASK_PREFIX =
  /^(?:(?:i\s+(?:need|have|want|got)\s+to|i\s+must|i'?d\s+like\s+to|don'?t\s+forget\s+to|make\s+sure\s+to|remember\s+to|remind\s+me\s+to|need\s+to|have\s+to|got\s+to|gotta|please|kindly|can\s+you|could\s+you|task\s*[:-]?)\s+)+/u;

function cleanContent(text: string): string {
  return text
    .replace(/^(please|pls|দয়া করে|দয়া করে|আমাকে|একটা|একটি)\s+/u, '')
    .replace(EN_TASK_PREFIX, '')
    .replace(/^(remember|save|note|search|find|add a task to|create a task to|make a task to|add task|new task|todo|to-do|মনে রাখো|মনে রাখ|মনে রাখবে|নোট করো|কাজ যোগ করো|কাজ যোগ|খুঁজে দাও|খুঁজে দেখ|খুঁজে|পিছিয়ে দাও|পিছিয়ে দাও|করতে হবে)\s*[:,-]?\s*/u, '')
    .replace(EN_TASK_PREFIX, '')
    .replace(/(?<![\p{L}\p{M}])(?:কাজটা|কাজটি|কাজটার|কাজটিকে)(?![\p{L}\p{M}])/u, ' ')
    .replace(/\s+(please|pls|দয়া করে|দয়া করে|খুঁজে দাও|খুঁজে দেখ|খুঁজে দিন|পিছিয়ে দাও|পিছিয়ে দাও|করে দাও|করে দিন|কমপ্লিট|কম্পলিট|সম্পন্ন|হয়ে গেছে|শেষ|করে ফেলেছি|করেছি|সেরে ফেলেছি)$/u, '')
    .replace(/\s+/g, ' ')
    .trim();
}
export function extractEntities(text: string, intent: NlpIntent, now = new Date(), rawCased?: string): NlpEntities {
  const relative = extractRelativeTime(text, now);
  const date = relative?.date ?? extractDate(text, now);
  const time = relative?.time ?? extractTime(text);
  const cleaned = removeDateTime(text);
  const content = cleanContent(cleaned);
  // Give stored content back the user's original capitalisation (passwords, proper nouns).
  const cased = (value: string) => (rawCased ? recoverCase(rawCased, value) : value);
  if (intent === 'CREATE_TASK' || intent === 'RESCHEDULE_TASK') {
    const taskText = content
      .replace(/^(?:রবিবার|সোমবার|মঙ্গলবার|বুধবার|বৃহস্পতিবার|শুক্রবার|শনিবার|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\s+/iu, '')
      .replace(REL_TIME_PATTERN, '')
      .replace(/\s+(?:(?:top|high|low|medium|normal)\s+)?(?:priority|importance)\s*$/iu, '')
      .replace(/\s+(?:urgent|asap|important|!!+|জরুরি|গুরুত্বপূর্ণ|এখনই|তাড়াতাড়ি|অগ্রাধিকার)\s*$/iu, '')
      .replace(/\s+(?:morning|afternoon|evening|night)\s*$/iu, '')
      .replace(/\s+/g, ' ')
      .trim();
    return { taskText: taskText ? cased(taskText) : undefined, date, time, priority: extractPriority(text), tags: extractTags(text) };
  }
  if (intent === 'CREATE_MEMORY') return { memoryText: content ? cased(content) : undefined, keywords: extractKeywords(content || text), tags: extractTags(text) };
  if (intent === 'SEARCH_MEMORY') {
    if (isListAllMemories(text)) return { query: '', keywords: [] }; // '' = list everything
    return { query: content || undefined, keywords: extractKeywords(content || text) };
  }
  if (intent === 'ANSWER_QUESTION' || intent === 'UNKNOWN') {
    // UNKNOWN still gets a question + keywords so the orchestrator can fall back to a
    // best-effort lookup ("আমার wifi পাসওয়ার্ড দাও") instead of a dead end.
    const question = text.trim();
    return { question: question || undefined, keywords: extractKeywords(text), date, time };
  }
  if (intent === 'HELP' || intent === 'SMALL_TALK') {
    return { question: text.trim() || undefined };
  }
  return { date, time };
}
