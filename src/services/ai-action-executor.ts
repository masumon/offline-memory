import type { SQLiteDatabase } from 'expo-sqlite';
import type { OrchestratedAction } from '../ai/orchestrator';
import { addMemory, findMemories } from './memory-service';
import { addTask, completeTask, listTasks, rescheduleTask } from './task-service';
import type { Memory } from '../types/memory-model';
import type { Task } from '../types/task-model';

export type ActionExecutionResult =
  | { type: 'TASK_CREATED'; task: Task }
  | { type: 'TASK_COMPLETED'; task: Task }
  | { type: 'TASKS_LISTED'; tasks: Task[] }
  | { type: 'TASK_RESCHEDULED'; task: Task }
  | { type: 'MEMORY_CREATED'; memory: Memory }
  | { type: 'MEMORIES_FOUND'; memories: Memory[] };

function normalizeReference(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function buildDueAt(action: Extract<OrchestratedAction, { type: 'CREATE_TASK' | 'RESCHEDULE_TASK' }>): string | null {
  if (!action.dueDate && action.dueMinutes === undefined) return null;
  if (!action.dueDate) throw new Error('A due date is required when a task time is supplied');

  const minutes = action.dueMinutes ?? 0;
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 1439) {
    throw new Error('Task due time must be between 00:00 and 23:59');
  }

  return `${action.dueDate}T${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:00`;
}

async function findTaskByReference(db: SQLiteDatabase, reference: string): Promise<Task> {
  const target = normalizeReference(reference);
  const tasks = await listTasks(db, { limit: 500 });
  const exact = tasks.filter((task) => normalizeReference(task.title) === target);
  if (exact.length === 0) throw new Error('Referenced task was not found');
  if (exact.length > 1) throw new Error('Referenced task is ambiguous');
  return exact[0];
}

/**
 * Application boundary for deterministic AI actions.
 * The AI/orchestrator layer never opens SQLite or mutates persistence directly.
 */
export async function executeAiAction(
  db: SQLiteDatabase,
  action: Exclude<OrchestratedAction, { type: 'CLARIFY' }>,
): Promise<ActionExecutionResult> {
  switch (action.type) {
    case 'CREATE_TASK': {
      const task = await addTask(db, {
        title: action.taskText,
        dueAt: buildDueAt(action),
      });
      return { type: 'TASK_CREATED', task };
    }
    case 'COMPLETE_TASK': {
      const target = await findTaskByReference(db, action.taskText);
      const task = await completeTask(db, target.id);
      if (!task) throw new Error('Task disappeared before completion');
      return { type: 'TASK_COMPLETED', task };
    }
    case 'LIST_TASKS':
      return { type: 'TASKS_LISTED', tasks: await listTasks(db) };
    case 'RESCHEDULE_TASK': {
      const target = await findTaskByReference(db, action.taskText);
      const dueAt = buildDueAt(action);
      if (!dueAt) throw new Error('A schedule is required to reschedule a task');
      const task = await rescheduleTask(db, target.id, dueAt);
      if (!task) throw new Error('Task disappeared before rescheduling');
      return { type: 'TASK_RESCHEDULED', task };
    }
    case 'CREATE_MEMORY':
      return { type: 'MEMORY_CREATED', memory: await addMemory(db, { content: action.content }) };
    case 'SEARCH_MEMORY':
      return { type: 'MEMORIES_FOUND', memories: await findMemories(db, action.query) };
  }
}
