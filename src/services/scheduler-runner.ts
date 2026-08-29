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
    let quietHours: notificationAdapter.QuietHours | null = null;
    try {
      const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM app_preferences WHERE key = 'quietHours'");
      const m = row?.value.match(/^(\d{1,2}):(\d{1,2})$/u);
      if (m) quietHours = { start: Number(m[1]), end: Number(m[2]) };
    } catch { /* quiet hours are optional */ }
    const candidates = await getNotificationCandidates(db, now, horizonMinutes);
    let scheduled = 0;
    for (const candidate of candidates) {
      try {
        const notificationId = await notificationAdapter.scheduleTaskNotification(db, candidate, quietHours);
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
