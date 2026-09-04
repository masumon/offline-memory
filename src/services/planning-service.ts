import type { SQLiteDatabase } from 'expo-sqlite';
import type { Task } from '../types/task-model';
import { editTask, getTask, listTasks } from './task-service';
import { bangladeshDateKey } from '../i18n/date-time';

export interface DailyPlan { date: string; overdue: Task[]; inProgress: Task[]; scheduled: Task[]; inbox: Task[]; }

function localDateKey(date: Date): string {
  return bangladeshDateKey(date);
}

export async function getDailyPlan(db: SQLiteDatabase, date = new Date()): Promise<DailyPlan> {
  const dateKey = localDateKey(date);
  const [inbox, inProgress, planned] = await Promise.all([
    listTasks(db, { status: 'INBOX', limit: 500 }),
    listTasks(db, { status: 'IN_PROGRESS', limit: 500 }),
    listTasks(db, { status: 'PLANNED', limit: 500 }),
  ]);
  const startIso = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
  const scheduled = planned.filter((task) => task.plannedDate === dateKey);
  const scheduledIds = new Set(scheduled.map((task) => task.id));
  // A task already shown under "scheduled today" must not also appear under "overdue" —
  // that used to render the same row twice.
  const overdue = [...planned, ...inProgress]
    .filter((task) => task.dueAt !== null && task.dueAt < startIso && !scheduledIds.has(task.id))
    .sort((a, b) => (a.dueAt ?? '').localeCompare(b.dueAt ?? ''));
  return { date: dateKey, overdue, inProgress, scheduled, inbox };
}

export async function planInboxTasks(db: SQLiteDatabase, taskIds: string[], date = new Date()): Promise<Task[]> {
  const uniqueIds = [...new Set(taskIds.filter(Boolean))];
  if (!uniqueIds.length) return [];
  const dateKey = localDateKey(date);
  const planned: Task[] = [];
  await db.withTransactionAsync(async () => {
    for (const id of uniqueIds) {
      const existing = await getTask(db, id);
      if (!existing) throw new Error(`Task not found: ${id}`);
      if (existing.status !== 'INBOX') throw new Error(`Only inbox tasks can be planned: ${id}`);
      const current = await editTask(db, id, { status: 'PLANNED', plannedDate: dateKey });
      if (!current) throw new Error(`Task not found: ${id}`);
      planned.push(current);
    }
  });
  return planned;
}
