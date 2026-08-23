import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';

export interface RuntimeHealth {
  platform: string;
  notifications: 'granted' | 'denied' | 'undetermined';
  scheduledNotificationCount: number;
  databaseReadable: boolean;
}

export async function collectRuntimeHealth(db: SQLiteDatabase): Promise<RuntimeHealth> {
  let databaseReadable = false;
  try {
    await db.getFirstAsync<{ ok: number }>('SELECT 1 AS ok');
    databaseReadable = true;
  } catch {
    databaseReadable = false;
  }

  const permission = await Notifications.getPermissionsAsync();
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const notifications = permission.granted ? 'granted' : permission.canAskAgain ? 'undetermined' : 'denied';

  return {
    platform: Platform.OS,
    notifications,
    scheduledNotificationCount: scheduled.length,
    databaseReadable,
  };
}
