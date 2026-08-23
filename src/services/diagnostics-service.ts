import type { SQLiteDatabase } from 'expo-sqlite';
import * as Notifications from 'expo-notifications';

const EXPECTED_SCHEMA_VERSION = 6;

export type DiagnosticCheck = {
  id: 'database' | 'notifications' | 'scheduled';
  label: string;
  ok: boolean;
  detail: string;
};

export type DiagnosticsReport = {
  ok: boolean;
  checks: DiagnosticCheck[];
  generatedAt: string;
};

export async function runDiagnostics(db: SQLiteDatabase): Promise<DiagnosticsReport> {
  const checks: DiagnosticCheck[] = [];

  try {
    const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    const version = Number(row?.user_version ?? 0);
    checks.push({
      id: 'database',
      label: 'Local database',
      ok: version === EXPECTED_SCHEMA_VERSION,
      detail: `Schema v${version}; expected v${EXPECTED_SCHEMA_VERSION}`,
    });
  } catch (error) {
    checks.push({ id: 'database', label: 'Local database', ok: false, detail: error instanceof Error ? error.message : 'Database check failed' });
  }

  try {
    const permission = await Notifications.getPermissionsAsync();
    checks.push({
      id: 'notifications',
      label: 'Notification permission',
      ok: permission.granted,
      detail: permission.granted ? 'Granted' : `Not granted (${permission.status})`,
    });
  } catch (error) {
    checks.push({ id: 'notifications', label: 'Notification permission', ok: false, detail: error instanceof Error ? error.message : 'Notification permission check failed' });
  }

  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    checks.push({ id: 'scheduled', label: 'Scheduled reminders', ok: true, detail: `${scheduled.length} reminder(s) currently scheduled by the OS` });
  } catch (error) {
    checks.push({ id: 'scheduled', label: 'Scheduled reminders', ok: false, detail: error instanceof Error ? error.message : 'Scheduled reminder check failed' });
  }

  return { ok: checks.every((check) => check.ok), checks, generatedAt: new Date().toISOString() };
}

export { EXPECTED_SCHEMA_VERSION };
