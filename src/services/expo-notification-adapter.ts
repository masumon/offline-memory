import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';
import { hasNotificationBeenDelivered, markNotificationDelivered } from './notification-delivery-repository';
import { initializeNotifications, requestNotificationPermission, TASK_CHANNEL_ID } from './notification.service';
import type { NotificationCandidate } from './scheduler-notification-service';

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

  await initializeNotifications();
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
      ...(Platform.OS === 'android' ? { channelId: TASK_CHANNEL_ID } : {}),
    },
  });

  await markNotificationDelivered(db, candidate.taskId, candidate.dueAt);
  return notificationId;
}
