import * as Notifications from 'expo-notifications';

export interface ScheduledReminderSummary {
  id: string;
  taskId: string | null;
  dueAt: string | null;
  title: string;
}

export interface NotificationStatus {
  granted: boolean;
  canAskAgain: boolean;
  scheduled: ScheduledReminderSummary[];
}

export async function getNotificationStatus(): Promise<NotificationStatus> {
  const permission = await Notifications.getPermissionsAsync();
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  return {
    granted: permission.granted,
    canAskAgain: permission.canAskAgain,
    scheduled: scheduled.map((item) => {
      const data = item.content.data as { taskId?: unknown; dueAt?: unknown } | undefined;
      return {
        id: item.identifier,
        taskId: typeof data?.taskId === 'string' ? data.taskId : null,
        dueAt: typeof data?.dueAt === 'string' ? data.dueAt : null,
        title: item.content.body ?? item.content.title ?? 'Task reminder',
      };
    }),
  };
}
