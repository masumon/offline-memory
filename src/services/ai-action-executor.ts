import type { SQLiteDatabase } from 'expo-sqlite';
import type { OrchestratedAction } from '../ai/orchestrator';
import { addMemory, findMemories } from './memory-service';
import { addTask, completeTask, editTask, findTasksByExactTitle, listTasks, rescheduleTask } from './task-service';
import type { Memory } from '../types/memory-model';
import type { Task } from '../types/task-model';

export type ActionExecutionResult =
  | { type: 'TASK_CREATED'; task: Task }
  | { type: 'TASK_COMPLETED'; task: Task }
  | { type: 'TASKS_LISTED'; tasks: Task[] }
  | { type: 'TASK_RESCHEDULED'; task: Task }
  | { type: 'MEMORY_CREATED'; memory: Memory }
  | { type: 'MEMORIES_FOUND'; memories: Memory[] };

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

async function findTaskByReference(db: SQLiteDatabase, reference: string): Promise<Task> {
  const matches = await findTasksByExactTitle(db, reference);
  if (matches.length === 0) throw new Error('Referenced task was not found');
  if (matches.length > 1) throw new Error('Referenced task is ambiguous');
  const [match] = matches;
  if (!match) throw new Error('Referenced task was not found');
  return match;
}

export async function executeAiAction(db: SQLiteDatabase, action: Exclude<OrchestratedAction, { type: 'CLARIFY' }>): Promise<ActionExecutionResult> {
  switch (action.type) {
    case 'CREATE_TASK': {
      const task = await addTask(db, { title: action.taskText, dueAt: buildDueAt(action), plannedDate: action.dueDate ?? null });
      return { type: 'TASK_CREATED', task };
    }
    case 'COMPLETE_TASK': {
      const target = await findTaskByReference(db, action.taskText); const task = await completeTask(db, target.id);
      if (!task) throw new Error('Task disappeared before completion');
      return { type: 'TASK_COMPLETED', task };
    }
    case 'LIST_TASKS': return { type: 'TASKS_LISTED', tasks: await listTasks(db) };
    case 'RESCHEDULE_TASK': {
      const target = await findTaskByReference(db, action.taskText); const dueAt = buildDueAt(action, target.dueAt);
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
