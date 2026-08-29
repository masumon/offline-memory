import type { SQLiteDatabase } from 'expo-sqlite';
import type { Memory } from '../types/memory-model';
import type { Task } from '../types/task-model';
import { getMemory } from './memory-repository';
import { getTask } from './task-repository';

// Explicit task ↔ memory links. Rows are stored canonically — the task is always the
// "from" side, the memory always the "to" side — so each direction is one indexed read.
// Local-only, like everything else; links travel in the backup.

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Link a task and a memory. Idempotent — a repeat call is a no-op. */
export async function linkTaskMemory(db: SQLiteDatabase, taskId: string, memoryId: string): Promise<void> {
  if (!taskId || !memoryId) throw new Error('A task and a memory are required to link');
  await db.runAsync(
    `INSERT INTO relations (id, from_type, from_id, to_type, to_id, created_at)
     VALUES (?, 'TASK', ?, 'MEMORY', ?, ?)
     ON CONFLICT(from_type, from_id, to_type, to_id) DO NOTHING`,
    createId(), taskId, memoryId, new Date().toISOString(),
  );
}

export async function unlinkTaskMemory(db: SQLiteDatabase, taskId: string, memoryId: string): Promise<void> {
  await db.runAsync(
    `DELETE FROM relations WHERE from_type = 'TASK' AND from_id = ? AND to_type = 'MEMORY' AND to_id = ?`,
    taskId, memoryId,
  );
}

/** Memories explicitly linked to a task, newest link first. */
export async function listLinkedMemories(db: SQLiteDatabase, taskId: string): Promise<Memory[]> {
  const rows = await db.getAllAsync<{ to_id: string }>(
    `SELECT to_id FROM relations WHERE from_type = 'TASK' AND from_id = ? ORDER BY created_at DESC`, taskId,
  );
  const out: Memory[] = [];
  for (const row of rows) {
    const memory = await getMemory(db, row.to_id);
    if (memory) out.push(memory);
  }
  return out;
}

/** Tasks explicitly linked to a memory, newest link first. */
export async function listLinkedTasks(db: SQLiteDatabase, memoryId: string): Promise<Task[]> {
  const rows = await db.getAllAsync<{ from_id: string }>(
    `SELECT from_id FROM relations WHERE to_type = 'MEMORY' AND to_id = ? ORDER BY created_at DESC`, memoryId,
  );
  const out: Task[] = [];
  for (const row of rows) {
    const task = await getTask(db, row.from_id);
    if (task) out.push(task);
  }
  return out;
}
