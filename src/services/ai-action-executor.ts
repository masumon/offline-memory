import type { SQLiteDatabase } from 'expo-sqlite';
import type { OrchestratedAction } from '../ai/orchestrator';
import { addMemory, findMemories } from './memory-service';
import { addTask, completeTask, editTask, findTasksByExactTitle, listTasks, rescheduleTask, searchTasks } from './task-service';
import type { Memory } from '../types/memory-model';
import type { Task } from '../types/task-model';

export type ActionExecutionResult =
  | { type: 'TASK_CREATED'; task: Task }
  | { type: 'TASK_COMPLETED'; task: Task }
  | { type: 'TASKS_LISTED'; tasks: Task[] }
  | { type: 'TASK_RESCHEDULED'; task: Task }
  | { type: 'MEMORY_CREATED'; memory: Memory }
  | { type: 'MEMORIES_FOUND'; memories: Memory[] };

/** Raised when a task reference matches more than one active task — the caller
 * should ask the user which one they meant instead of silently failing. */
export class AmbiguousTaskError extends Error {
  constructor(public candidates: Task[], public actionType: 'COMPLETE_TASK' | 'RESCHEDULE_TASK') {
    super('Referenced task is ambiguous');
    this.name = 'AmbiguousTaskError';
  }
}

const CLOSED = new Set(['COMPLETED', 'ARCHIVED', 'CANCELLED']);

function buildDueAt(action: Extract<OrchestratedAction, { type: 'CREATE_TASK' | 'RESCHEDULE_TASK' }>, preserveTimeFrom?: string | null): string | null {
  if (action.dueMinutes !== undefined && !action.dueDate) throw new Error('A due date is required when a task time is supplied');
  if (!action.dueDate) return null;
  let minutes = action.dueMinutes;
  if (minutes === undefined && preserveTimeFrom) {
    const match = preserveTimeFrom.match(/T(\d{2}):(\d{2})/u);
    if (match) minutes = Number(match[1]) * 60 + Number(match[2]);
  }
  if (minutes === undefined) return null;
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 1439) throw new Error('Task due time must be between 00:00 and 23:59');
  return `${action.dueDate}T${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:00`;
}

async function findTaskByReference(
  db: SQLiteDatabase,
  reference: string,
  actionType: 'COMPLETE_TASK' | 'RESCHEDULE_TASK',
): Promise<Task> {
  // Exact title wins outright; otherwise fall back to a fuzzy search so a user does
  // not have to reproduce the stored title verbatim.
  const exact = (await findTasksByExactTitle(db, reference)).filter((task) => !CLOSED.has(task.status));
  if (exact.length === 1) return exact[0]!;
  if (exact.length > 1) throw new AmbiguousTaskError(exact.slice(0, 5), actionType);

  const fuzzy = (await searchTasks(db, reference, 20)).filter((task) => !CLOSED.has(task.status));
  if (fuzzy.length === 0) throw new Error('Referenced task was not found');
  if (fuzzy.length === 1) return fuzzy[0]!;
  throw new AmbiguousTaskError(fuzzy.slice(0, 5), actionType);
}

export async function executeAiAction(db: SQLiteDatabase, action: Exclude<OrchestratedAction, { type: 'CLARIFY' }>): Promise<ActionExecutionResult> {
  switch (action.type) {
    case 'CREATE_TASK': {
      const task = await addTask(db, { title: action.taskText, dueAt: buildDueAt(action), plannedDate: action.dueDate ?? null });
      return { type: 'TASK_CREATED', task };
    }
    case 'COMPLETE_TASK': {
      const target = await findTaskByReference(db, action.taskText, 'COMPLETE_TASK'); const task = await completeTask(db, target.id);
      if (!task) throw new Error('Task disappeared before completion');
      return { type: 'TASK_COMPLETED', task };
    }
    case 'LIST_TASKS': return { type: 'TASKS_LISTED', tasks: await listTasks(db) };
    case 'RESCHEDULE_TASK': {
      const target = await findTaskByReference(db, action.taskText, 'RESCHEDULE_TASK'); const dueAt = buildDueAt(action, target.dueAt);
      if (dueAt) { const task = await rescheduleTask(db, target.id, dueAt); if (!task) throw new Error('Task disappeared before rescheduling'); return { type: 'TASK_RESCHEDULED', task }; }
      if (!action.dueDate) throw new Error('A schedule is required to reschedule a task');
      const task = await editTask(db, target.id, { status: 'PLANNED', dueAt: null, plannedDate: action.dueDate });
      if (!task) throw new Error('Task disappeared before rescheduling');
      return { type: 'TASK_RESCHEDULED', task };
    }
    case 'CREATE_MEMORY': return { type: 'MEMORY_CREATED', memory: await addMemory(db, { content: action.content }) };
    case 'SEARCH_MEMORY': return { type: 'MEMORIES_FOUND', memories: await findMemories(db, action.query) };
  }
}

/** Resolve a previously-ambiguous COMPLETE/RESCHEDULE against the task the user picked. */
export async function executeAiActionOnTask(
  db: SQLiteDatabase,
  action: Extract<OrchestratedAction, { type: 'COMPLETE_TASK' | 'RESCHEDULE_TASK' }>,
  taskId: string,
): Promise<ActionExecutionResult> {
  if (action.type === 'COMPLETE_TASK') {
    const task = await completeTask(db, taskId);
    if (!task) throw new Error('Task was not found');
    return { type: 'TASK_COMPLETED', task };
  }
  const dueAt = buildDueAt(action);
  if (dueAt) {
    const task = await rescheduleTask(db, taskId, dueAt);
    if (!task) throw new Error('Task was not found');
    return { type: 'TASK_RESCHEDULED', task };
  }
  if (!action.dueDate) throw new Error('A schedule is required to reschedule a task');
  const task = await editTask(db, taskId, { status: 'PLANNED', dueAt: null, plannedDate: action.dueDate });
  if (!task) throw new Error('Task was not found');
  return { type: 'TASK_RESCHEDULED', task };
}
