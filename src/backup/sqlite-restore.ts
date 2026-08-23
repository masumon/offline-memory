import type { SQLiteDatabase } from 'expo-sqlite';
import { DATABASE_VERSION } from '../database';
import { parseM7BackupDocument } from './m7-format';

interface BackupRow { [key: string]: unknown }

function rows(data: Record<string, unknown>, key: string): BackupRow[] {
  const value = data[key];
  if (!Array.isArray(value) || value.some((row) => !row || typeof row !== 'object' || Array.isArray(row))) {
    throw new Error(`Backup field ${key} must be an array of objects`);
  }
  return value as BackupRow[];
}

function requiredString(row: BackupRow, key: string): string {
  const value = row[key];
  if (typeof value !== 'string' || value.length === 0) throw new Error(`Backup ${key} must be a non-empty string`);
  return value;
}

function optionalString(row: BackupRow, key: string): string | null {
  const value = row[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') throw new Error(`Backup ${key} must be a string or null`);
  return value;
}

function requiredNumber(row: BackupRow, key: string): number {
  const value = row[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Backup ${key} must be a finite number`);
  return value;
}

export async function restoreSQLiteBackupData(db: SQLiteDatabase, input: unknown): Promise<void> {
  const backup = parseM7BackupDocument(input);
  const schemaVersion = backup.data.schemaVersion;
  if (typeof schemaVersion !== 'number' || schemaVersion !== DATABASE_VERSION) {
    throw new Error(`Unsupported database schema version: ${String(schemaVersion)}`);
  }

  const appMetadata = rows(backup.data, 'appMetadata');
  const tasks = rows(backup.data, 'tasks');
  const subtasks = rows(backup.data, 'subtasks');
  const memories = rows(backup.data, 'memories');
  const notificationDeliveries = rows(backup.data, 'notificationDeliveries');

  const taskIds = new Set(tasks.map((row) => requiredString(row, 'id')));
  const subtaskIds = new Set<string>();
  for (const row of subtasks) {
    const id = requiredString(row, 'id');
    if (subtaskIds.has(id)) throw new Error(`Duplicate subtask id: ${id}`);
    subtaskIds.add(id);
    const taskId = requiredString(row, 'task_id');
    if (!taskIds.has(taskId)) throw new Error(`Subtask references missing task: ${taskId}`);
  }

  const memoryIds = new Set<string>();
  for (const row of memories) {
    const id = requiredString(row, 'id');
    if (memoryIds.has(id)) throw new Error(`Duplicate memory id: ${id}`);
    memoryIds.add(id);
    requiredString(row, 'content');
    requiredNumber(row, 'importance');
  }

  for (const row of notificationDeliveries) {
    const taskId = requiredString(row, 'task_id');
    if (!taskIds.has(taskId)) throw new Error(`Notification references missing task: ${taskId}`);
    requiredString(row, 'due_at');
    requiredString(row, 'delivered_at');
  }

  for (const row of tasks) {
    requiredString(row, 'id');
    requiredString(row, 'title');
    requiredString(row, 'status');
    requiredString(row, 'priority');
    requiredString(row, 'created_at');
    requiredString(row, 'updated_at');
  }

  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM notification_deliveries');
    await db.runAsync('DELETE FROM subtasks');
    await db.runAsync('DELETE FROM memories');
    await db.runAsync('DELETE FROM tasks');
    await db.runAsync('DELETE FROM app_metadata');

    for (const row of tasks) {
      await db.runAsync(
        'INSERT INTO tasks (id,title,notes,status,priority,due_at,completed_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)',
        requiredString(row, 'id'), requiredString(row, 'title'), optionalString(row, 'notes'), requiredString(row, 'status'),
        requiredString(row, 'priority'), optionalString(row, 'due_at'), optionalString(row, 'completed_at'),
        requiredString(row, 'created_at'), requiredString(row, 'updated_at'),
      );
    }

    for (const row of subtasks) {
      await db.runAsync(
        'INSERT INTO subtasks (id,task_id,title,completed,position,created_at,updated_at) VALUES (?,?,?,?,?,?,?)',
        requiredString(row, 'id'), requiredString(row, 'task_id'), requiredString(row, 'title'), requiredNumber(row, 'completed'),
        requiredNumber(row, 'position'), requiredString(row, 'created_at'), requiredString(row, 'updated_at'),
      );
    }

    for (const row of memories) {
      await db.runAsync(
        'INSERT INTO memories (id,title,content,kind,source,tags_json,importance,archived,created_at,updated_at,last_accessed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
        requiredString(row, 'id'), optionalString(row, 'title'), requiredString(row, 'content'), requiredString(row, 'kind'),
        requiredString(row, 'source'), requiredString(row, 'tags_json'), requiredNumber(row, 'importance'),
        requiredNumber(row, 'archived'), requiredString(row, 'created_at'), requiredString(row, 'updated_at'), optionalString(row, 'last_accessed_at'),
      );
    }

    for (const row of notificationDeliveries) {
      await db.runAsync(
        'INSERT INTO notification_deliveries (task_id,due_at,delivered_at) VALUES (?,?,?)',
        requiredString(row, 'task_id'), requiredString(row, 'due_at'), requiredString(row, 'delivered_at'),
      );
    }

    for (const row of appMetadata) {
      await db.runAsync(
        'INSERT INTO app_metadata (key,value,updated_at) VALUES (?,?,?)',
        requiredString(row, 'key'), requiredString(row, 'value'), requiredString(row, 'updated_at'),
      );
    }
  });
}
