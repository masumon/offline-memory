import type { SQLiteDatabase } from 'expo-sqlite';
import { bangladeshDateKey } from '../i18n/date-time';

// One-tap demo content so a new user can see every screen populated — tasks across all
// priorities and states, memories of every kind, subtasks, a recurrence, and a few
// task↔memory links. Everything is tagged so `clearDemoData` can remove it cleanly
// (demo tasks: id prefix "demo-"; demo memories: source "SYSTEM" + a "demo" tag).

const now = () => new Date();
const iso = (d: Date) => d.toISOString();
function at(dayOffset: number, hour: number, min = 0): string {
  const d = now(); d.setDate(d.getDate() + dayOffset); d.setHours(hour, min, 0, 0); return iso(d);
}
function dateKey(dayOffset: number): string {
  const d = now(); d.setDate(d.getDate() + dayOffset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const rid = () => Math.random().toString(36).slice(2, 9);

interface DemoTask {
  title: string; notes?: string | null; status: string; priority: string;
  dueOffset?: [number, number, number?]; plannedOffset?: number; recurrence?: string | null;
  completedOffset?: number; subtasks?: string[];
}

const TASKS: DemoTask[] = [
  { title: 'সকালে হেঁটে আসা', status: 'PLANNED', priority: 'LOW', dueOffset: [0, 6, 30], recurrence: 'DAILY' },
  { title: 'অফিসের রিপোর্ট জমা দেওয়া', notes: 'Q3 সেলস সামারি', status: 'PLANNED', priority: 'URGENT', dueOffset: [0, 17, 0], subtasks: ['ডেটা একত্র করা', 'গ্রাফ বসানো', 'বসকে পাঠানো'] },
  { title: 'ডাক্তারের অ্যাপয়েন্টমেন্ট', status: 'PLANNED', priority: 'HIGH', dueOffset: [1, 10, 15] },
  { title: 'বাসা ভাড়া পরিশোধ', status: 'PLANNED', priority: 'HIGH', dueOffset: [2, 11, 0], recurrence: 'MONTHLY' },
  { title: 'মায়ের সাথে ফোনে কথা বলা', status: 'PLANNED', priority: 'MEDIUM', dueOffset: [0, 21, 0] },
  { title: 'গাড়ির সার্ভিসিং করানো', status: 'PLANNED', priority: 'MEDIUM', plannedOffset: 4 },
  { title: 'বিদ্যুৎ বিল দেওয়া', status: 'PLANNED', priority: 'URGENT', dueOffset: [-1, 12, 0] }, // overdue on purpose
  { title: 'বন্ধুর জন্মদিনের উপহার কেনা', status: 'PLANNED', priority: 'LOW', plannedOffset: 6 },
  { title: 'ইমেইলের ইনবক্স খালি করা', status: 'IN_PROGRESS', priority: 'MEDIUM', dueOffset: [0, 15, 0] },
  { title: 'পাসপোর্ট রিনিউ আবেদন', status: 'PLANNED', priority: 'HIGH', plannedOffset: 10, subtasks: ['ছবি তোলা', 'ফর্ম পূরণ', 'ফি জমা'] },
  { title: 'নতুন বইটা পড়া শুরু করা', status: 'INBOX', priority: 'LOW' },
  { title: 'ফ্রিজ পরিষ্কার করা', status: 'INBOX', priority: 'LOW' },
  { title: 'প্রজেক্ট প্রপোজাল খসড়া', status: 'INBOX', priority: 'MEDIUM' },
  { title: 'জিমের মেম্বারশিপ নবায়ন', status: 'COMPLETED', priority: 'MEDIUM', completedOffset: -1, dueOffset: [-1, 9, 0] },
  { title: 'ব্যাংকে চেক জমা দেওয়া', status: 'COMPLETED', priority: 'HIGH', completedOffset: -2, dueOffset: [-2, 10, 0] },
  { title: 'buy groceries for the week', notes: 'milk, eggs, rice, vegetables', status: 'PLANNED', priority: 'MEDIUM', dueOffset: [1, 18, 30] },
  { title: 'call the internet provider about the bill', status: 'INBOX', priority: 'HIGH' },
];

interface DemoMemory {
  content: string; title?: string | null; kind: string; importance: number; tags: string[];
}

const MEMORIES: DemoMemory[] = [
  { content: 'আমার পাসপোর্টের মেয়াদ ২০৩১ সালের মার্চ পর্যন্ত', title: 'পাসপোর্ট', kind: 'FACT', importance: 5, tags: ['ডকুমেন্ট', 'demo'] },
  { content: 'বাসার ওয়াইফাই পাসওয়ার্ড: Amar#Basha2024', title: 'ওয়াইফাই', kind: 'FACT', importance: 4, tags: ['পাসওয়ার্ড', 'demo'] },
  { content: 'গাড়ির নম্বর ঢাকা মেট্রো-গ ১২-৩৪৫৬', kind: 'FACT', importance: 4, tags: ['গাড়ি', 'demo'] },
  { content: 'আমার রক্তের গ্রুপ B পজিটিভ', kind: 'FACT', importance: 5, tags: ['স্বাস্থ্য', 'demo'] },
  { content: 'ব্যাংক অ্যাকাউন্ট শেষ চার সংখ্যা 7291', kind: 'FACT', importance: 3, tags: ['ব্যাংক', 'demo'] },
  { content: 'আমি সকালে কড়া করে চা খেতে পছন্দ করি, চিনি ছাড়া', kind: 'PREFERENCE', importance: 2, tags: ['খাবার', 'demo'] },
  { content: 'মিটিং সবসময় সকাল ১০টার পরে রাখতে পছন্দ করি', kind: 'PREFERENCE', importance: 3, tags: ['কাজ', 'demo'] },
  { content: 'জানালার পাশের সিট পছন্দ — বাসে ও প্লেনে', kind: 'PREFERENCE', importance: 1, tags: ['ভ্রমণ', 'demo'] },
  { content: 'বড় ভাইয়ের বিবাহবার্ষিকী ১৪ ফেব্রুয়ারি', kind: 'EVENT', importance: 4, tags: ['পরিবার', 'demo'] },
  { content: 'অফিসের বার্ষিক পিকনিক ডিসেম্বরের প্রথম শুক্রবার', kind: 'EVENT', importance: 2, tags: ['কাজ', 'demo'] },
  { content: 'ভিসা ইন্টারভিউ ছিল ২০ জানুয়ারি, ফলাফল ভালো', kind: 'EVENT', importance: 3, tags: ['ডকুমেন্ট', 'demo'] },
  { content: 'আজ অনেক কাজ শেষ করেছি — নিজেকে ভালো লাগছে। ছোট ছোট ধাপে ভাঙলে কাজ সহজ হয়।', kind: 'REFLECTION', importance: 2, tags: ['ভাবনা', 'demo'] },
  { content: 'সকালে ফোন কম দেখলে দিনটা বেশি শান্ত কাটে — পরীক্ষা করে দেখলাম।', kind: 'REFLECTION', importance: 2, tags: ['অভ্যাস', 'demo'] },
  { content: 'দোকান বন্ধ থাকে প্রতি শুক্রবার', title: 'দোকান', kind: 'NOTE', importance: 3, tags: ['ব্যবসা', 'demo'] },
  { content: 'বাসার গ্যাসের চুলার রেগুলেটর ৩ মাস পরপর বদলাতে হয়', kind: 'NOTE', importance: 2, tags: ['বাসা', 'demo'] },
  { content: 'The spare house key is with the neighbour in flat 4B', kind: 'NOTE', importance: 3, tags: ['home', 'demo'] },
  { content: 'Car insurance renews every year in September', kind: 'FACT', importance: 4, tags: ['car', 'demo'] },
];

export async function clearDemoData(db: SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM subtasks WHERE task_id LIKE 'demo-%'");
    await db.runAsync("DELETE FROM notification_deliveries WHERE task_id LIKE 'demo-%'");
    await db.runAsync("DELETE FROM relations WHERE (from_type='TASK' AND from_id LIKE 'demo-%') OR (to_type='MEMORY' AND to_id IN (SELECT id FROM memories WHERE source='SYSTEM'))");
    await db.runAsync("DELETE FROM tasks WHERE id LIKE 'demo-%'");
    await db.runAsync("DELETE FROM memories WHERE source='SYSTEM' OR tags_json LIKE '%\"demo\"%'");
    // Also sweep any leftover test scaffolding created during development.
    await db.runAsync(
      "DELETE FROM memories WHERE content IN ('my-blood-group-is-o-positive','my blood group is o positive')",
    );
    await db.runAsync(
      "DELETE FROM tasks WHERE title LIKE '%+%' OR title LIKE '%-today-at-%' OR title IN ('tumi-ki-ki-korte-paro','call bank','REMINDER TEST alarm','Call-bank-today-at-2:40am')",
    );
  });
}

export interface DemoSeedResult { tasks: number; memories: number }

export async function seedDemoData(db: SQLiteDatabase): Promise<DemoSeedResult> {
  await clearDemoData(db); // idempotent — reseeding never piles up
  const ts = iso(now());
  let taskCount = 0;
  const memoryIds: string[] = [];

  await db.withTransactionAsync(async () => {
    for (const t of TASKS) {
      const id = `demo-${rid()}`;
      const dueAt = t.dueOffset ? at(t.dueOffset[0], t.dueOffset[1], t.dueOffset[2] ?? 0) : null;
      const planned = t.plannedOffset !== undefined
        ? dateKey(t.plannedOffset)
        : dueAt
          ? bangladeshDateKey(dueAt)
          : null;
      const completedAt = t.completedOffset !== undefined ? at(t.completedOffset, 12) : null;
      await db.runAsync(
        `INSERT INTO tasks (id,title,notes,status,priority,due_at,completed_at,created_at,updated_at,planned_date,recurrence)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        id, t.title, t.notes ?? null, t.status, t.priority, dueAt, completedAt, ts, ts, planned, t.recurrence ?? null,
      );
      taskCount += 1;
      if (t.subtasks?.length) {
        for (let i = 0; i < t.subtasks.length; i += 1) {
          await db.runAsync(
            `INSERT INTO subtasks (id,task_id,title,completed,position,created_at,updated_at) VALUES (?,?,?,?,?,?,?)`,
            `demo-${rid()}`, id, t.subtasks[i]!, i === 0 && t.status !== 'INBOX' ? 1 : 0, i, ts, ts,
          );
        }
      }
    }
    for (const m of MEMORIES) {
      const id = `demo-${rid()}`;
      memoryIds.push(id);
      await db.runAsync(
        `INSERT INTO memories (id,title,content,kind,source,tags_json,importance,archived,created_at,updated_at,last_accessed_at)
         VALUES (?,?,?,?,?,?,?,0,?,?,NULL)`,
        id, m.title ?? null, m.content, m.kind, 'SYSTEM', JSON.stringify(m.tags), m.importance, ts, ts,
      );
    }
  });

  return { tasks: taskCount, memories: memoryIds.length };
}
