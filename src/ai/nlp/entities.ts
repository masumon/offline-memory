import type { DateEntity, NlpEntities, NlpIntent, TimeEntity } from './types';

const WEEKDAYS: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  'রবিবার': 0,
  'সোমবার': 1,
  'মঙ্গলবার': 2,
  'বুধবার': 3,
  'বৃহস্পতিবার': 4,
  'শুক্রবার': 5,
  'শনিবার': 6,
};

function startOfDay(date: Date): Date {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function dateEntity(raw: string, date: Date): DateEntity {
  return { raw, isoDate: date.toISOString().slice(0, 10), confidence: 0.98 };
}

export function extractDate(text: string, now = new Date()): DateEntity | undefined {
  const normalized = text.trim().toLocaleLowerCase();
  const base = startOfDay(now);

  if (/\b(today|আজ)\b/u.test(normalized)) return dateEntity(normalized.match(/\b(today|আজ)\b/u)?.[0] ?? 'today', base);
  if (/\b(tomorrow|আগামীকাল|কাল)\b/u.test(normalized)) {
    const date = new Date(base);
    date.setDate(date.getDate() + 1);
    return dateEntity(normalized.match(/\b(tomorrow|আগামীকাল|কাল)\b/u)?.[0] ?? 'tomorrow', date);
  }
  if (/\b(day after tomorrow|পরশু)\b/u.test(normalized)) {
    const date = new Date(base);
    date.setDate(date.getDate() + 2);
    return dateEntity(normalized.match(/\b(day after tomorrow|পরশু)\b/u)?.[0] ?? 'পরশু', date);
  }

  const numeric = normalized.match(/\b(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{4}))?\b/u);
  if (numeric) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]) - 1;
    const year = numeric[3] ? Number(numeric[3]) : now.getFullYear();
    const date = new Date(year, month, day);
    if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) return dateEntity(numeric[0], date);
  }

  const weekday = Object.entries(WEEKDAYS).find(([name]) => normalized.includes(name));
  if (weekday) {
    const target = weekday[1];
    const date = new Date(base);
    const delta = (target - date.getDay() + 7) % 7 || 7;
    date.setDate(date.getDate() + delta);
    return dateEntity(weekday[0], date);
  }

  return undefined;
}

function normalizeHour(hour: number, meridiem?: string): number {
  if (!meridiem) return hour;
  const afternoon = /^(pm|p\.m\.|দুপুর|বিকাল|বিকেলে|সন্ধ্যা|রাতে)/u.test(meridiem);
  const morning = /^(am|a\.m\.|সকাল|সকালে)/u.test(meridiem);
  if (afternoon && hour < 12) return hour + 12;
  if (morning && hour === 12) return 0;
  return hour;
}

const TIME_SUFFIX = '(?:am|pm|a\\.m\\.|p\\.m\\.|সকাল|সকালে|দুপুর|বিকাল|বিকেলে|সন্ধ্যা|রাতে|টা|টায়|টায়)';

export function extractTime(text: string): TimeEntity | undefined {
  const normalized = text.trim().toLocaleLowerCase();
  const match = normalized.match(new RegExp(`(?:at\\s+|সময়\\s*)?(\\d{1,2})(?::(\\d{2}))?\\s*(${TIME_SUFFIX})(?=\\s|$|[.,!?।])`, 'u'));
  if (!match) return undefined;

  let hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  const meridiem = match[3];
  if (hour > 23 || minute > 59) return undefined;
  hour = normalizeHour(hour, meridiem);
  if (hour > 23) return undefined;

  return { raw: match[0].trim(), minutes: hour * 60 + minute, confidence: 0.96 };
}

function removeDateTime(text: string): string {
  const normalized = text
    .replace(/\b(today|tomorrow|day after tomorrow|আজ|আগামীকাল|কাল|পরশু)\b/gu, ' ')
    .replace(/\b\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{4})?\b/gu, ' ');

  const time = extractTime(normalized);
  if (!time) return normalized.replace(/\s+/g, ' ').trim();
  return normalized.replace(time.raw, ' ').replace(/\s+/g, ' ').trim();
}

function cleanContent(text: string): string {
  return text
    .replace(/^(please|pls|দয়া করে|দয়া করে|আমাকে|একটা|একটি)\s+/u, '')
    .replace(/^(remember|save|note|search|find|মনে রাখো|মনে রাখ|মনে রাখবে|নোট করো|কাজ যোগ করো|কাজ যোগ|খুঁজে দাও|খুঁজে দেখ|খুঁজে|করতে হবে)\s*[:,-]?\s*/u, '')
    .replace(/\s+(please|pls|দয়া করে|দয়া করে|খুঁজে দাও|খুঁজে দেখ|খুঁজে দিন)$/u, '')
    .trim();
}

export function extractEntities(text: string, intent: NlpIntent, now = new Date()): NlpEntities {
  const date = extractDate(text, now);
  const time = extractTime(text);
  const cleaned = removeDateTime(text);
  const content = cleanContent(cleaned);

  if (intent === 'CREATE_TASK' || intent === 'RESCHEDULE_TASK') return { taskText: content || undefined, date, time };
  if (intent === 'CREATE_MEMORY') return { memoryText: content || undefined };
  if (intent === 'SEARCH_MEMORY') return { query: content || undefined };
  return { date, time };
}
