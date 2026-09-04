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
    let leadMinutes = 0;
    try {
      const rows = await db.getAllAsync<{ key: string; value: string }>("SELECT key, value FROM app_preferences WHERE key IN ('quietHours', 'reminderLeadMinutes')");
      for (const row of rows) {
        if (row.key === 'quietHours') { const m = row.value.match(/^(\d{1,2}):(\d{1,2})$/u); if (m) quietHours = { start: Number(m[1]), end: Number(m[2]) }; }
        if (row.key === 'reminderLeadMinutes') { const n = Number(row.value); if (Number.isFinite(n) && n >= 0 && n <= 7 * 24 * 60) leadMinutes = n; }
      }
    } catch { /* both preferences are optional */ }
    // What the OS still has queued — lets the candidate query re-schedule reminders a
    // battery optimiser or Doze silently dropped. Undefined = keep plain behaviour.
    let liveScheduledKeys: ReadonlySet<string> | undefined;
    try {
      liveScheduledKeys = notificationAdapter.getLiveScheduledKeys
        ? await notificationAdapter.getLiveScheduledKeys()
        : undefined;
    } catch {
      liveScheduledKeys = undefined;
    }
    const candidates = await getNotificationCandidates(db, now, horizonMinutes, { liveScheduledKeys });
    let scheduled = 0;
    for (const candidate of candidates) {
      try {
        const notificationId = await notificationAdapter.scheduleTaskNotification(db, candidate, quietHours, leadMinutes);
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
