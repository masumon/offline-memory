import type { SQLiteDatabase } from 'expo-sqlite';
import type { CreateTaskInput, Task, UpdateTaskInput } from '../types/task-model';
import type { TaskPriority, TaskStatus } from '../types';

interface TaskRow {
  id: string; title: string; notes: string | null; status: TaskStatus; priority: TaskPriority;
  due_at: string | null; planned_date: string | null; completed_at: string | null; created_at: string; updated_at: string;
}

function toTask(row: TaskRow): Task {
  return { id: row.id, title: row.title, notes: row.notes, status: row.status, priority: row.priority,
    dueAt: row.due_at, plannedDate: row.planned_date, completedAt: row.completed_at,
    createdAt: row.created_at, updatedAt: row.updated_at };
}

function createId(): string { return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`; }

const SELECT = `SELECT id, title, notes, status, priority, due_at, planned_date, completed_at, created_at, updated_at FROM tasks`;

export async function createTask(db: SQLiteDatabase, input: CreateTaskInput): Promise<Task> {
  const title = input.title.trim();
  if (!title) throw new Error('Task title is required');
  const now = new Date().toISOString();
  const id = createId();
  const status = input.status ?? (input.dueAt ? 'PLANNED' : 'INBOX');
  const priority = input.priority ?? 'MEDIUM';
  await db.runAsync(
    `INSERT INTO tasks (id,title,notes,status,priority,due_at,planned_date,completed_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,NULL,?,?)`,
    id, title, input.notes ?? null, status, priority, input.dueAt ?? null, input.plannedDate ?? null, now, now,
  );
  const task = await getTask(db, id);
  if (!task) throw new Error('Task could not be created');
  return task;
}

export async function getTask(db: SQLiteDatabase, id: string): Promise<Task | null> {
  const row = await db.getFirstAsync<TaskRow>(`${SELECT} WHERE id = ? LIMIT 1`, id);
  return row ? toTask(row) : null;
}

export async function findTasksByExactTitle(db: SQLiteDatabase, title: string): Promise<Task[]> {
  const normalized = title.trim();
  if (!normalized) return [];
  const rows = await db.getAllAsync<TaskRow>(`${SELECT} WHERE LOWER(TRIM(title)) = LOWER(TRIM(?)) ORDER BY created_at DESC`, normalized);
  return rows.map(toTask);
}

export async function findDueTasks(db: SQLiteDatabase, fromIso: string, toIso: string, limit = 500): Promise<Task[]> {
  const safeLimit = Math.max(1, Math.min(Math.floor(limit), 500));
  const rows = await db.getAllAsync<TaskRow>(`${SELECT}
    WHERE status IN (?, ?) AND due_at IS NOT NULL AND due_at >= ? AND due_at <= ?
    ORDER BY due_at ASC, created_at DESC LIMIT ?`, 'PLANNED', 'RESCHEDULED', fromIso, toIso, safeLimit);
  return rows.map(toTask);
}

export async function listTasks(db: SQLiteDatabase, options: { status?: TaskStatus; limit?: number } = {}): Promise<Task[]> {
  const limit = Math.max(1, Math.min(options.limit ?? 100, 500));
  const rows = options.status
    ? await db.getAllAsync<TaskRow>(`${SELECT} WHERE status = ? ORDER BY CASE WHEN due_at IS NULL THEN 1 ELSE 0 END, due_at ASC, created_at DESC LIMIT ?`, options.status, limit)
    : await db.getAllAsync<TaskRow>(`${SELECT} ORDER BY CASE WHEN due_at IS NULL THEN 1 ELSE 0 END, due_at ASC, created_at DESC LIMIT ?`, limit);
  return rows.map(toTask);
}

export async function updateTask(db: SQLiteDatabase, id: string, input: UpdateTaskInput): Promise<Task | null> {
  const current = await getTask(db, id);
  if (!current) return null;
  const nextTitle = input.title === undefined ? current.title : input.title.trim();
  if (!nextTitle) throw new Error('Task title is required');
  const nextStatus = input.status ?? current.status;
  const completedAt = nextStatus === 'COMPLETED' ? current.completedAt ?? new Date().toISOString() : null;
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE tasks SET title=?, notes=?, status=?, priority=?, due_at=?, planned_date=?, completed_at=?, updated_at=? WHERE id=?`,
    nextTitle,
    input.notes === undefined ? current.notes : input.notes,
    nextStatus,
    input.priority ?? current.priority,
    input.dueAt === undefined ? current.dueAt : input.dueAt,
    input.plannedDate === undefined ? current.plannedDate : input.plannedDate,
    completedAt,
    now,
    id,
  );
  return getTask(db, id);
}

export async function deleteTask(db: SQLiteDatabase, id: string): Promise<boolean> {
  return (await db.runAsync('DELETE FROM tasks WHERE id = ?', id)).changes > 0;
}

export { toTask };
