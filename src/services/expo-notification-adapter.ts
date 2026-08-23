import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';
import { hasNotificationBeenDelivered, markNotificationDelivered } from './notification-delivery-repository';
import type { NotificationCandidate } from './scheduler-notification-service';

export async function configureNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('tasks', {
    name: 'Tasks',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function scheduleTaskNotification(
  db: SQLiteDatabase,
  candidate: NotificationCandidate,
): Promise<string | null> {
  if (await hasNotificationBeenDelivered(db, candidate.taskId, candidate.dueAt)) return null;

  const dueAt = new Date(candidate.dueAt);
  if (Number.isNaN(dueAt.getTime()) || dueAt.getTime() <= Date.now()) return null;

  // Recover from a crash between OS scheduling and SQLite bookkeeping.
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const existing = scheduled.find((item) => {
    const data = item.content.data as { taskId?: unknown; dueAt?: unknown } | undefined;
    return data?.taskId === candidate.taskId && data?.dueAt === candidate.dueAt;
  });
  if (existing) {
    await markNotificationDelivered(db, candidate.taskId, candidate.dueAt);
    return existing.identifier;
  }

  await configureNotificationChannel();
  const permitted = await requestNotificationPermission();
  if (!permitted) return null;

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Offline Memory',
      body: candidate.title,
      data: { taskId: candidate.taskId, dueAt: candidate.dueAt },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: dueAt,
      ...(Platform.OS === 'android' ? { channelId: 'tasks' } : {}),
    },
  });

  await markNotificationDelivered(db, candidate.taskId, candidate.dueAt);
  return notificationId;
}
