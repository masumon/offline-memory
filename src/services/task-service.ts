import type { SQLiteDatabase } from 'expo-sqlite';
import type { CreateTaskInput, Task, UpdateTaskInput } from '../types/task-model';
import type { TaskStatus } from '../types';
import { createTask, deleteTask, findTasksByExactTitle, getTask, listTasks, updateTask } from './task-repository';

const ALLOWED_TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
  INBOX: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ARCHIVED'],
  PLANNED: ['IN_PROGRESS', 'COMPLETED', 'RESCHEDULED', 'CANCELLED', 'ARCHIVED'],
  IN_PROGRESS: ['COMPLETED', 'RESCHEDULED', 'CANCELLED', 'ARCHIVED'],
  COMPLETED: ['ARCHIVED', 'IN_PROGRESS'],
  RESCHEDULED: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ARCHIVED'],
  ARCHIVED: [],
  CANCELLED: ['INBOX', 'ARCHIVED'],
};

export async function addTask(db: SQLiteDatabase, input: CreateTaskInput): Promise<Task> {
  return createTask(db, input);
}

export async function editTask(
  db: SQLiteDatabase,
  id: string,
  input: UpdateTaskInput,
): Promise<Task | null> {
  if (input.status) {
    const current = await getTask(db, id);
    if (!current) return null;
    if (current.status !== input.status && !ALLOWED_TRANSITIONS[current.status].includes(input.status)) {
      throw new Error(`Invalid task status transition: ${current.status} -> ${input.status}`);
    }
  }
  return updateTask(db, id, input);
}

export async function completeTask(db: SQLiteDatabase, id: string): Promise<Task | null> {
  return editTask(db, id, { status: 'COMPLETED' });
}

export async function rescheduleTask(
  db: SQLiteDatabase,
  id: string,
  dueAt: string,
): Promise<Task | null> {
  if (!dueAt) throw new Error('A due date is required to reschedule a task');
  return editTask(db, id, { status: 'RESCHEDULED', dueAt });
}

export async function removeTask(db: SQLiteDatabase, id: string): Promise<boolean> {
  return deleteTask(db, id);
}

export { findTasksByExactTitle, getTask, listTasks, ALLOWED_TRANSITIONS };
