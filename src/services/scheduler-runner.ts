import type { SQLiteDatabase } from 'expo-sqlite';
import { getNotificationCandidates } from './scheduler-notification-service';
import { scheduleTaskNotification } from './expo-notification-adapter';

const DEFAULT_HORIZON_MINUTES = 7 * 24 * 60;

export async function runNotificationScheduler(
  db: SQLiteDatabase,
  now = new Date(),
  horizonMinutes = DEFAULT_HORIZON_MINUTES,
): Promise<number> {
  const candidates = await getNotificationCandidates(db, now, horizonMinutes);
  let scheduled = 0;

  for (const candidate of candidates) {
    try {
      const notificationId = await scheduleTaskNotification(db, candidate);
      if (notificationId) scheduled += 1;
    } catch {
      // One failed platform scheduling operation must not block other reminders.
    }
  }

  return scheduled;
}

export { DEFAULT_HORIZON_MINUTES };
