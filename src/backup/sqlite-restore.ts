import type { SQLiteDatabase } from 'expo-sqlite';
import { DATABASE_VERSION } from '../database';
import { parseM7BackupDocument } from './m7-format';

interface BackupRow { [key: string]: unknown }
const TASK_STATUSES = new Set(['INBOX', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'RESCHEDULED', 'ARCHIVED', 'CANCELLED']);
const PRIORITIES = new Set(['URGENT', 'HIGH', 'MEDIUM', 'LOW']);
const MEMORY_KINDS = new Set(['NOTE', 'FACT', 'PREFERENCE', 'EVENT', 'REFLECTION']);
const MEMORY_SOURCES = new Set(['USER', 'SYSTEM', 'IMPORTED']);

function rows(data: Record<string, unknown>, key: string): BackupRow[] {
  const value = data[key];
  if (!Array.isArray(value) || value.some((row) => !row || typeof row !== 'object' || Array.isArray(row))) throw new Error(`Backup field ${key} must be an array of objects`);
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
function uniqueId(row: BackupRow, key: string, seen: Set<string>): string {
  const id = requiredString(row, key);
  if (seen.has(id)) throw new Error(`Duplicate ${key}: ${id}`);
  seen.add(id);
  return id;
}
function validJsonArray(value: string): boolean {
  try { return Array.isArray(JSON.parse(value) as unknown); } catch { return false; }
}

export async function restoreSQLiteBackupData(db: SQLiteDatabase, input: unknown): Promise<void> {
  const backup = parseM7BackupDocument(input);
  const schemaVersion = backup.data.schemaVersion;
  if (typeof schemaVersion !== 'number' || schemaVersion < DATABASE_VERSION - 1 || schemaVersion > DATABASE_VERSION) {
    throw new Error(`Unsupported database schema version: ${String(schemaVersion)}`);
  }

  const appMetadata = rows(backup.data, 'appMetadata');
  const tasks = rows(backup.data, 'tasks');
  const subtasks = rows(backup.data, 'subtasks');
  const memories = rows(backup.data, 'memories');
  const notificationDeliveries = rows(backup.data, 'notificationDeliveries');

  const taskIds = new Set<string>();
  for (const row of tasks) {
    uniqueId(row, 'id', taskIds); requiredString(row, 'title');
    const status = requiredString(row, 'status'); if (!TASK_STATUSES.has(status)) throw new Error(`Unsupported task status: ${status}`);
    const priority = requiredString(row, 'priority'); if (!PRIORITIES.has(priority)) throw new Error(`Unsupported task priority: ${priority}`);
    if (schemaVersion >= 6) optionalString(row, 'planned_date');
    requiredString(row, 'created_at'); requiredString(row, 'updated_at');
  }

  const subtaskIds = new Set<string>();
  for (const row of subtasks) {
    uniqueId(row, 'id', subtaskIds); const taskId = requiredString(row, 'task_id');
    if (!taskIds.has(taskId)) throw new Error(`Subtask references missing task: ${taskId}`);
    requiredString(row, 'title'); const completed = requiredNumber(row, 'completed');
    if (![0, 1].includes(completed)) throw new Error('Backup completed must be 0 or 1');
    requiredNumber(row, 'position'); requiredString(row, 'created_at'); requiredString(row, 'updated_at');
  }

  const memoryIds = new Set<string>();
  for (const row of memories) {
    uniqueId(row, 'id', memoryIds); requiredString(row, 'content');
    const importance = requiredNumber(row, 'importance');
    if (!Number.isInteger(importance) || importance < 1 || importance > 5) throw new Error('Backup importance must be an integer from 1 to 5');
    const archived = requiredNumber(row, 'archived'); if (![0, 1].includes(archived)) throw new Error('Backup archived must be 0 or 1');
    const kind = requiredString(row, 'kind'); if (!MEMORY_KINDS.has(kind)) throw new Error(`Unsupported memory kind: ${kind}`);
    const source = requiredString(row, 'source'); if (!MEMORY_SOURCES.has(source)) throw new Error(`Unsupported memory source: ${source}`);
    const tags = requiredString(row, 'tags_json'); if (!validJsonArray(tags)) throw new Error('Backup tags_json must be a valid JSON array');
    requiredString(row, 'created_at'); requiredString(row, 'updated_at');
  }

  const notificationKeys = new Set<string>();
  for (const row of notificationDeliveries) {
    const taskId = requiredString(row, 'task_id'); if (!taskIds.has(taskId)) throw new Error(`Notification references missing task: ${taskId}`);
    const dueAt = requiredString(row, 'due_at'); const key = `${taskId}\u0000${dueAt}`;
    if (notificationKeys.has(key)) throw new Error(`Duplicate notification delivery: ${taskId} ${dueAt}`);
    notificationKeys.add(key); requiredString(row, 'delivered_at');
  }

  const metadataKeys = new Set<string>();
  for (const row of appMetadata) { uniqueId(row, 'key', metadataKeys); requiredString(row, 'value'); requiredString(row, 'updated_at'); }

  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM notification_deliveries');
    await db.runAsync('DELETE FROM subtasks');
    await db.runAsync('DELETE FROM memories');
    await db.runAsync('DELETE FROM tasks');
    await db.runAsync('DELETE FROM app_metadata');

    for (const row of tasks) {
      await db.runAsync(
        `INSERT INTO tasks (id,title,notes,status,priority,due_at,planned_date,completed_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        requiredString(row, 'id'), requiredString(row, 'title'), optionalString(row, 'notes'), requiredString(row, 'status'), requiredString(row, 'priority'),
        optionalString(row, 'due_at'), schemaVersion >= 6 ? optionalString(row, 'planned_date') : null, optionalString(row, 'completed_at'), requiredString(row, 'created_at'), requiredString(row, 'updated_at'),
      );
    }
    for (const row of subtasks) {
      await db.runAsync('INSERT INTO subtasks (id,task_id,title,completed,position,created_at,updated_at) VALUES (?,?,?,?,?,?,?)', requiredString(row, 'id'), requiredString(row, 'task_id'), requiredString(row, 'title'), requiredNumber(row, 'completed'), requiredNumber(row, 'position'), requiredString(row, 'created_at'), requiredString(row, 'updated_at'));
    }
    for (const row of memories) {
      await db.runAsync('INSERT INTO memories (id,title,content,kind,source,tags_json,importance,archived,created_at,updated_at,last_accessed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)', requiredString(row, 'id'), optionalString(row, 'title'), requiredString(row, 'content'), requiredString(row, 'kind'), requiredString(row, 'source'), requiredString(row, 'tags_json'), requiredNumber(row, 'importance'), requiredNumber(row, 'archived'), requiredString(row, 'created_at'), requiredString(row, 'updated_at'), optionalString(row, 'last_accessed_at'));
    }
    for (const row of notificationDeliveries) {
      await db.runAsync('INSERT INTO notification_deliveries (task_id,due_at,delivered_at) VALUES (?,?,?)', requiredString(row, 'task_id'), requiredString(row, 'due_at'), requiredString(row, 'delivered_at'));
    }
    for (const row of appMetadata) {
      await db.runAsync('INSERT INTO app_metadata (key,value,updated_at) VALUES (?,?,?)', requiredString(row, 'key'), requiredString(row, 'value'), requiredString(row, 'updated_at'));
    }
  });
}
