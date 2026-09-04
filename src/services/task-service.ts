import type { SQLiteDatabase } from 'expo-sqlite';
import type { CreateTaskInput, Task, TaskRecurrence, UpdateTaskInput } from '../types/task-model';
import { TASK_RECURRENCES } from '../types/task-model';
import type { TaskStatus } from '../types';
import { createTask, deleteTask, findTasksByExactTitle, getTask, listTasks, searchTasks, updateTask } from './task-repository';
import { bangladeshDateKey } from '../i18n/date-time';

const ALLOWED_TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
  INBOX: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ARCHIVED'],
  PLANNED: ['IN_PROGRESS', 'COMPLETED', 'RESCHEDULED', 'CANCELLED', 'ARCHIVED'],
  IN_PROGRESS: ['COMPLETED', 'RESCHEDULED', 'CANCELLED', 'ARCHIVED'],
  COMPLETED: ['ARCHIVED', 'IN_PROGRESS'],
  RESCHEDULED: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ARCHIVED'],
  ARCHIVED: [],
  CANCELLED: ['INBOX', 'ARCHIVED'],
};

function dateKeyFromIso(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('A valid due date is required');
  // Use the Asia/Dhaka calendar day, not the UTC slice — otherwise a task due
  // 00:00–05:59 local lands on the previous day's plan.
  return bangladeshDateKey(date);
}

function validatePlannedDate(value: string | null | undefined): string | null | undefined {
  if (value === undefined || value === null) return value;
  if (value === '') return null;
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) throw new Error('Planned date must use YYYY-MM-DD format');
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error('Planned date must be a valid calendar date');
  }
  return value;
}

function validateDueAt(value: string | null | undefined): string | null | undefined {
  if (value === undefined || value === null) return value;
  if (value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('Due date/time must be a valid date and time');
  // Canonicalise to a full UTC ISO string. Some entry paths (the local assistant) build
  // a naive "YYYY-MM-DDTHH:MM:00" with no zone; storing mixed formats broke string-based
  // scheduler comparisons and the notification de-dup key.
  return date.toISOString();
}

export async function addTask(db: SQLiteDatabase, input: CreateTaskInput): Promise<Task> {
  const dueAt = validateDueAt(input.dueAt);
  const plannedDate = input.plannedDate !== undefined
    ? validatePlannedDate(input.plannedDate)
    : dueAt
      ? dateKeyFromIso(dueAt)
      : null;
  const recurrence = validateRecurrence(input.recurrence) ?? null;
  return createTask(db, { ...input, dueAt, plannedDate, recurrence });
}

export async function editTask(db: SQLiteDatabase, id: string, input: UpdateTaskInput): Promise<Task | null> {
  let before: Task | null = null;
  if (input.status) {
    before = await getTask(db, id);
    if (!before) return null;
    if (before.status !== input.status && !ALLOWED_TRANSITIONS[before.status].includes(input.status)) {
      throw new Error(`Invalid task status transition: ${before.status} -> ${input.status}`);
    }
  }
  const dueAt = input.dueAt !== undefined ? validateDueAt(input.dueAt) : undefined;
  const plannedDate = input.plannedDate !== undefined
    ? validatePlannedDate(input.plannedDate)
    : dueAt !== undefined && dueAt !== null
      ? dateKeyFromIso(dueAt)
      : undefined;
  const recurrence = validateRecurrence(input.recurrence);
  const updated = await updateTask(db, id, { ...input, dueAt, plannedDate, recurrence });
  // A recurring task spawns its next occurrence the moment it is completed, regardless
  // of which surface completed it (Home checkbox, detail, editor, assistant).
  if (updated && input.status === 'COMPLETED' && before && before.status !== 'COMPLETED' && before.recurrence && before.dueAt) {
    await createTask(db, {
      title: before.title,
      notes: before.notes,
      priority: before.priority,
      dueAt: advanceRecurrence(before.dueAt, before.recurrence),
      recurrence: before.recurrence,
      status: 'PLANNED',
    });
  }
  return updated;
}

function validateRecurrence(value: TaskRecurrence | null | undefined): TaskRecurrence | null | undefined {
  if (value === undefined || value === null) return value;
  if (!TASK_RECURRENCES.includes(value)) throw new Error(`Unsupported recurrence: ${value}`);
  return value;
}

/** Advance a due timestamp by one recurrence step, preserving the time-of-day. */
export function advanceRecurrence(iso: string, rule: TaskRecurrence, from = new Date(iso)): string {
  const next = new Date(from);
  if (rule === 'DAILY') next.setDate(next.getDate() + 1);
  else if (rule === 'WEEKLY') next.setDate(next.getDate() + 7);
  else if (rule === 'MONTHLY') {
    // Clamp to the last day of the target month so Jan 31 → Feb 28, not "Mar 3".
    const day = next.getDate();
    next.setDate(1);
    next.setMonth(next.getMonth() + 1);
    const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(day, lastDay));
  }
  else if (rule === 'WEEKDAYS') { do { next.setDate(next.getDate() + 1); } while (next.getDay() === 0 || next.getDay() === 6); }
  return next.toISOString();
}

export async function completeTask(db: SQLiteDatabase, id: string): Promise<Task | null> {
  return editTask(db, id, { status: 'COMPLETED' });
}

/**
 * "Skip this one" — move a recurring task to its next occurrence without completing
 * it or spawning a duplicate. No-op (returns null) for a one-off task or one with no
 * due date, since there is no next occurrence to jump to.
 */
export async function skipRecurrence(db: SQLiteDatabase, id: string): Promise<Task | null> {
  const task = await getTask(db, id);
  if (!task || !task.recurrence || !task.dueAt) return null;
  return editTask(db, id, { dueAt: advanceRecurrence(task.dueAt, task.recurrence) });
}

export async function rescheduleTask(db: SQLiteDatabase, id: string, dueAt: string): Promise<Task | null> {
  if (!dueAt) throw new Error('A due date is required to reschedule a task');
  return editTask(db, id, { status: 'RESCHEDULED', dueAt });
}

export async function removeTask(db: SQLiteDatabase, id: string): Promise<boolean> { return deleteTask(db, id); }

export { findTasksByExactTitle, getTask, listTasks, searchTasks, ALLOWED_TRANSITIONS };