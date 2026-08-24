import type { SQLiteDatabase } from 'expo-sqlite';
import type { CreateTaskInput, Task, UpdateTaskInput } from '../types/task-model';
import type { TaskStatus } from '../types';
import { createTask, deleteTask, findTasksByExactTitle, getTask, listTasks, searchTasks, updateTask } from './task-repository';

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
  return date.toISOString().slice(0, 10);
}

function validatePlannedDate(value: string | null | undefined): string | null | undefined {
  if (value === undefined || value === null || value === '') return value;
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) throw new Error('Planned date must use YYYY-MM-DD format');
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error('Planned date must be a valid calendar date');
  }
  return value;
}

function validateDueAt(value: string | null | undefined): string | null | undefined {
  if (value === undefined || value === null || value === '') return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('Due date/time must be a valid date and time');
  return value;
}

export async function addTask(db: SQLiteDatabase, input: CreateTaskInput): Promise<Task> {
  const dueAt = validateDueAt(input.dueAt);
  const plannedDate = input.plannedDate !== undefined
    ? validatePlannedDate(input.plannedDate)
    : dueAt
      ? dateKeyFromIso(dueAt)
      : null;
  return createTask(db, { ...input, dueAt, plannedDate });
}

export async function editTask(db: SQLiteDatabase, id: string, input: UpdateTaskInput): Promise<Task | null> {
  if (input.status) {
    const current = await getTask(db, id);
    if (!current) return null;
    if (current.status !== input.status && !ALLOWED_TRANSITIONS[current.status].includes(input.status)) {
      throw new Error(`Invalid task status transition: ${current.status} -> ${input.status}`);
    }
  }
  const dueAt = input.dueAt !== undefined ? validateDueAt(input.dueAt) : undefined;
  const plannedDate = input.plannedDate !== undefined
    ? validatePlannedDate(input.plannedDate)
    : dueAt !== undefined && dueAt !== null
      ? dateKeyFromIso(dueAt)
      : undefined;
  return updateTask(db, id, { ...input, dueAt, plannedDate });
}

export async function completeTask(db: SQLiteDatabase, id: string): Promise<Task | null> {
  return editTask(db, id, { status: 'COMPLETED' });
}

export async function rescheduleTask(db: SQLiteDatabase, id: string, dueAt: string): Promise<Task | null> {
  if (!dueAt) throw new Error('A due date is required to reschedule a task');
  return editTask(db, id, { status: 'RESCHEDULED', dueAt });
}

export async function removeTask(db: SQLiteDatabase, id: string): Promise<boolean> { return deleteTask(db, id); }

export { findTasksByExactTitle, getTask, listTasks, searchTasks, ALLOWED_TRANSITIONS };