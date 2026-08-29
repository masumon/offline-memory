import type { SQLiteDatabase } from 'expo-sqlite';

export interface SQLiteBackupData {
  appMetadata: Record<string, unknown>[];
  appPreferences: Record<string, unknown>[];
  tasks: Record<string, unknown>[];
  subtasks: Record<string, unknown>[];
  memories: Record<string, unknown>[];
  notificationDeliveries: Record<string, unknown>[];
  relations: Record<string, unknown>[];
  schemaVersion: number;
}

export async function readSQLiteBackupData(db: SQLiteDatabase): Promise<SQLiteBackupData> {
  const [appMetadata, appPreferences, tasks, subtasks, memories, notificationDeliveries, relations, versionRow] = await Promise.all([
    db.getAllAsync<Record<string, unknown>>('SELECT key, value, updated_at FROM app_metadata ORDER BY key ASC'),
    db.getAllAsync<Record<string, unknown>>('SELECT key, value FROM app_preferences ORDER BY key ASC'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM tasks ORDER BY id ASC'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM subtasks ORDER BY task_id ASC, position ASC, id ASC'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM memories ORDER BY id ASC'),
    db.getAllAsync<Record<string, unknown>>('SELECT task_id, due_at, delivered_at FROM notification_deliveries ORDER BY task_id ASC, due_at ASC'),
    Promise.resolve(db.getAllAsync<Record<string, unknown>>('SELECT id, from_type, from_id, to_type, to_id, created_at FROM relations ORDER BY id ASC')).catch(() => []),
    db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;'),
  ]);
  return { appMetadata, appPreferences, tasks, subtasks, memories, notificationDeliveries, relations: relations ?? [], schemaVersion: versionRow?.user_version ?? 0 };
}
