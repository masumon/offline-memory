import type { SQLiteDatabase } from 'expo-sqlite';
import type { Task } from '../types/task-model';
import { listTasks } from './task-service';

export interface ScheduledTask extends Task {
  dueAtDate: Date;
}

/**
 * Deterministic offline scheduler query. It does not mutate tasks or trigger
 * notifications; callers decide how to present/notify the returned tasks.
 */
export async function listDueTasks(
  db: SQLiteDatabase,
  now = new Date(),
  horizonMinutes = 0,
): Promise<ScheduledTask[]> {
  if (!Number.isFinite(horizonMinutes) || horizonMinutes < 0) {
    throw new Error('Scheduler horizon must be a non-negative finite number');
  }

  const horizon = new Date(now.getTime() + horizonMinutes * 60_000);
  const tasks = await listTasks(db, { status: 'PLANNED', limit: 500 });

  return tasks
    .filter((task): task is Task & { dueAt: string } => Boolean(task.dueAt))
    .map((task) => ({ ...task, dueAtDate: new Date(task.dueAt) }))
    .filter(({ dueAtDate }) => !Number.isNaN(dueAtDate.getTime()) && dueAtDate.getTime() <= horizon.getTime())
    .sort((a, b) => a.dueAtDate.getTime() - b.dueAtDate.getTime());
}
