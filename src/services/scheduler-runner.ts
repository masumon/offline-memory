import type { SQLiteDatabase } from 'expo-sqlite';
import { getNotificationCandidates } from './scheduler-notification-service';
import * as notificationAdapter from './expo-notification-adapter';

const DEFAULT_HORIZON_MINUTES = 7 * 24 * 60;

export async function runNotificationScheduler(
  db: SQLiteDatabase,
  now = new Date(),
  horizonMinutes = DEFAULT_HORIZON_MINUTES,
): Promise<number> {
  try {
    if (notificationAdapter.reconcileScheduledTaskNotifications) {
      await notificationAdapter.reconcileScheduledTaskNotifications(db, now);
    }
    const candidates = await getNotificationCandidates(db, now, horizonMinutes);
    let scheduled = 0;
    for (const candidate of candidates) {
      try {
        const notificationId = await notificationAdapter.scheduleTaskNotification(db, candidate);
        if (notificationId) scheduled += 1;
      } catch {
        // One failed platform operation must not block other reminders.
      }
    }
    return scheduled;
  } catch {
    // Background scheduling is best-effort and must never destabilize the app.
    return 0;
  }
}

export { DEFAULT_HORIZON_MINUTES };
