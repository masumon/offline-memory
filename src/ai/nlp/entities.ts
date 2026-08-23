import type { DateEntity, NlpEntities, NlpIntent, TimeEntity } from './types';

const WEEKDAYS: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
  'রবিবার': 0, 'সোমবার': 1, 'মঙ্গলবার': 2, 'বুধবার': 3, 'বৃহস্পতিবার': 4, 'শুক্রবার': 5, 'শনিবার': 6,
};
const DATE_TERMS = ['day after tomorrow', 'tomorrow', 'today', 'আগামীকাল', 'পরশু', 'কাল', 'আজ'] as const;
const BENGALI_DIGITS = '০১২৩৪৫৬৭৮৯';

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
    const match = text.match(new RegExp(`(?<!\\p{L})${escaped}(?!\\p{L})`, 'u'));
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

const TIME_PATTERN = /(?:(?:\bat\s+|সময়\s*|(?<period>সকাল|সকালে|দুপুর|বিকাল|বিকেলে|সন্ধ্যা|রাতে)\s*)(?<hour>\d{1,2})(?::(?<minute>\d{2}))?\s*(?<suffix>am|pm|a\.m\.|p\.m\.|টা|টায়|টায়)?|(?<plainHour>\d{1,2}):(?<plainMinute>\d{2})\s*(?<plainSuffix>am|pm|a\.m\.|p\.m\.)?|(?<suffixHour>\d{1,2})\s*(?<suffixOnly>am|pm|a\.m\.|p\.m\.|টা|টায়|টায়))(?=\s|$|[.,!?।])/u;

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
  let cleaned = text.replace(/(?<!\p{L})(?:today|tomorrow|day after tomorrow|আজ|আগামীকাল|কাল|পরশু)(?!\p{L})/gu, ' ');
  cleaned = cleaned.replace(/(?<!\d)\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{4})?(?!\d)/gu, ' ');
  const time = extractTime(cleaned);
  if (time) cleaned = cleaned.replace(time.raw, ' ');
  return cleaned.replace(/\s+/g, ' ').trim();
}
function cleanContent(text: string): string {
  return text.replace(/^(please|pls|দয়া করে|দয়া করে|আমাকে|একটা|একটি)\s+/u, '').replace(/^(remember|save|note|search|find|মনে রাখো|মনে রাখ|মনে রাখবে|নোট করো|কাজ যোগ করো|কাজ যোগ|খুঁজে দাও|খুঁজে দেখ|খুঁজে|পিছিয়ে দাও|পিছিয়ে দাও|করতে হবে)\s*[:,-]?\s*/u, '').replace(/\s+(please|pls|দয়া করে|দয়া করে|খুঁজে দাও|খুঁজে দেখ|খুঁজে দিন|পিছিয়ে দাও|পিছিয়ে দাও)$/u, '').trim();
}
export function extractEntities(text: string, intent: NlpIntent, now = new Date()): NlpEntities {
  const date = extractDate(text, now); const time = extractTime(text); const cleaned = removeDateTime(text); const content = cleanContent(cleaned);
  if (intent === 'CREATE_TASK' || intent === 'RESCHEDULE_TASK') return { taskText: content || undefined, date, time };
  if (intent === 'CREATE_MEMORY') return { memoryText: content || undefined };
  if (intent === 'SEARCH_MEMORY') return { query: content || undefined };
  return { date, time };
}
