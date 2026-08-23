import type { SQLiteDatabase } from 'expo-sqlite';
import type { Task } from '../types/task-model';
import { editTask, listTasks } from './task-service';

export interface DailyPlan {
  date: string;
  overdue: Task[];
  inProgress: Task[];
  scheduled: Task[];
  inbox: Task[];
}

function dayRangeIso(date: Date): { start: string; end: string } {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function getDailyPlan(db: SQLiteDatabase, date = new Date()): Promise<DailyPlan> {
  const { start, end } = dayRangeIso(date);
  const [inbox, inProgress, planned] = await Promise.all([
    listTasks(db, { status: 'INBOX', limit: 500 }),
    listTasks(db, { status: 'IN_PROGRESS', limit: 500 }),
    listTasks(db, { status: 'PLANNED', limit: 500 }),
  ]);

  const scheduled = planned.filter((task) => task.dueAt !== null && task.dueAt >= start && task.dueAt < end);
  const overdue = [...planned, ...inProgress]
    .filter((task) => task.dueAt !== null && task.dueAt < start)
    .sort((a, b) => (a.dueAt ?? '').localeCompare(b.dueAt ?? ''));

  return {
    date: localDateKey(date),
    overdue,
    inProgress,
    scheduled,
    inbox,
  };
}

export async function planInboxTasks(
  db: SQLiteDatabase,
  taskIds: string[],
  date = new Date(),
): Promise<Task[]> {
  const uniqueIds = [...new Set(taskIds.filter(Boolean))];
  if (!uniqueIds.length) return [];

  const { start } = dayRangeIso(date);
  const planned: Task[] = [];

  await db.withTransactionAsync(async () => {
    for (const id of uniqueIds) {
      const current = await editTask(db, id, { status: 'PLANNED', dueAt: start });
      if (!current) throw new Error(`Task not found: ${id}`);
      planned.push(current);
    }
  });

  return planned;
}
