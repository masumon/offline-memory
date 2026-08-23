import type { SQLiteDatabase } from 'expo-sqlite';
import * as Notifications from 'expo-notifications';
import { EXPECTED_SCHEMA_VERSION, runDiagnostics } from '../src/services/diagnostics-service';

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
}));

describe('diagnostics service', () => {
  beforeEach(() => jest.clearAllMocks());

  it('passes when schema and notification access are healthy', async () => {
    const db = { getFirstAsync: jest.fn().mockResolvedValue({ user_version: EXPECTED_SCHEMA_VERSION }) } as unknown as SQLiteDatabase;
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ granted: true, status: 'granted', expires: 'never', canAskAgain: true } as never);
    jest.mocked(Notifications.getAllScheduledNotificationsAsync).mockResolvedValue([]);

    const report = await runDiagnostics(db);

    expect(report.ok).toBe(true);
    expect(report.checks).toHaveLength(3);
  });

  it('fails the database check when the schema is stale', async () => {
    const db = { getFirstAsync: jest.fn().mockResolvedValue({ user_version: 5 }) } as unknown as SQLiteDatabase;
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ granted: true, status: 'granted' } as never);
    jest.mocked(Notifications.getAllScheduledNotificationsAsync).mockResolvedValue([]);

    const report = await runDiagnostics(db);

    expect(report.ok).toBe(false);
    expect(report.checks.find((check) => check.id === 'database')?.ok).toBe(false);
  });
});
