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
  deliveredTaskIds?: ReadonlySet<string>;
}

/**
 * Produces idempotent notification candidates. It does not deliver notifications.
 * Persistent delivery state is checked first; the optional in-memory state is a
 * fast-path for the current process.
 */
export async function getNotificationCandidates(
  db: SQLiteDatabase,
  now = new Date(),
  horizonMinutes = 0,
  state: SchedulerNotificationState = {},
): Promise<NotificationCandidate[]> {
  const tasks = await listDueTasks(db, now, horizonMinutes);
  const candidates: NotificationCandidate[] = [];

  for (const task: ScheduledTask of tasks) {
    if (state.deliveredTaskIds?.has(task.id)) continue;
    if (await hasNotificationBeenDelivered(db, task.id)) continue;
    candidates.push({
      taskId: task.id,
      title: task.title,
      dueAt: task.dueAt as string,
    });
  }

  return candidates;
}
