export interface NotificationStateStore {
  has(taskId: string): boolean;
  markDelivered(taskId: string): void;
}

/** In-memory store for the current process; persistence can be added by the platform layer. */
export function createNotificationStateStore(): NotificationStateStore {
  const delivered = new Set<string>();
  return {
    has: (taskId) => delivered.has(taskId),
    markDelivered: (taskId) => delivered.add(taskId),
  };
}
