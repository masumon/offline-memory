import * as Notifications from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';
import { markNotificationDelivered } from './notification-delivery-repository';
import type { NotificationCandidate } from './scheduler-notification-service';

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
  const dueAt = new Date(candidate.dueAt);
  if (Number.isNaN(dueAt.getTime()) || dueAt.getTime() <= Date.now()) return null;

  const permitted = await requestNotificationPermission();
  if (!permitted) return null;

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Offline Memory',
      body: candidate.title,
      data: { taskId: candidate.taskId },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: dueAt,
    },
  });

  await markNotificationDelivered(db, candidate.taskId, candidate.dueAt);
  return notificationId;
}
