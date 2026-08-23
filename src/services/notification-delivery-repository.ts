import type { SQLiteDatabase } from 'expo-sqlite';

export async function hasNotificationBeenDelivered(
  db: SQLiteDatabase,
  taskId: string,
  dueAt: string,
): Promise<boolean> {
  const row = await db.getFirstAsync<{ task_id: string }>(
    'SELECT task_id FROM notification_deliveries WHERE task_id = ? AND due_at = ? LIMIT 1',
    taskId,
    dueAt,
  );
  return Boolean(row);
}

export async function markNotificationDelivered(
  db: SQLiteDatabase,
  taskId: string,
  dueAt: string,
  deliveredAt = new Date().toISOString(),
): Promise<void> {
  await db.runAsync(
    `INSERT OR IGNORE INTO notification_deliveries (task_id, due_at, delivered_at)
     VALUES (?, ?, ?)`,
    taskId,
    dueAt,
    deliveredAt,
  );
}
