import type { SQLiteDatabase } from 'expo-sqlite';
import type { ScheduledTask } from './scheduler-service';
import { listDueTasks } from './scheduler-service';
import { hasNotificationBeenDelivered } from './notification-delivery-repository';

export interface NotificationCandidate {
  taskId: string;
  title: string;
  dueAt: string;
}

export interface SchedulerNotificationState {
  deliveredNotificationKeys?: ReadonlySet<string>;
}

export function notificationKey(taskId: string, dueAt: string): string {
  return `${taskId}:${dueAt}`;
}

export async function getNotificationCandidates(
  db: SQLiteDatabase,
  now = new Date(),
  horizonMinutes = 0,
  state: SchedulerNotificationState = {},
): Promise<NotificationCandidate[]> {
  const tasks = await listDueTasks(db, now, horizonMinutes);
  const candidates: NotificationCandidate[] = [];

  for (const task: ScheduledTask of tasks) {
    const dueAt = task.dueAt as string;
    if (state.deliveredNotificationKeys?.has(notificationKey(task.id, dueAt))) continue;
    if (await hasNotificationBeenDelivered(db, task.id, dueAt)) continue;
    candidates.push({ taskId: task.id, title: task.title, dueAt });
  }

  return candidates;
}
