import type { SQLiteDatabase } from 'expo-sqlite';
import type { ScheduledTask } from './scheduler-service';
import { listDueTasks } from './scheduler-service';

export interface NotificationCandidate {
  taskId: string;
  title: string;
  dueAt: string;
}

export interface SchedulerNotificationState {
  deliveredTaskIds: ReadonlySet<string>;
}

/**
 * Produces idempotent notification candidates. It deliberately does not call
 * Expo Notifications or mutate persistence; the platform adapter owns delivery.
 */
export async function getNotificationCandidates(
  db: SQLiteDatabase,
  now = new Date(),
  horizonMinutes = 0,
  state: SchedulerNotificationState = { deliveredTaskIds: new Set() },
): Promise<NotificationCandidate[]> {
  const tasks = await listDueTasks(db, now, horizonMinutes);
  return tasks
    .filter((task: ScheduledTask) => !state.deliveredTaskIds.has(task.id))
    .map((task) => ({
      taskId: task.id,
      title: task.title,
      dueAt: task.dueAt as string,
    }));
}
