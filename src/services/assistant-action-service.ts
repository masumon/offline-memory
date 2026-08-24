import type { SQLiteDatabase } from 'expo-sqlite';
import type { OrchestratedAction } from '../ai/orchestrator';
import type { Memory } from '../types/memory-model';
import type { Task } from '../types/task-model';
import { addMemory, findMemories } from './memory-service';
import { addTask, completeTask, findTasksByExactTitle, listTasks, rescheduleTask } from './task-service';
import { executeAiAction, type ActionExecutionResult } from './ai-action-executor';

function dueIso(date: string | undefined, minutes: number | undefined): string | null {
  if (!date) return null;
  const value = new Date(`${date}T00:00:00`);
  if (Number.isNaN(value.getTime())) throw new Error('Unable to resolve the requested date');
  if (minutes !== undefined) value.setMinutes(minutes);
  return value.toISOString();
}

async function resolveTask(db: SQLiteDatabase, title: string): Promise<Task> {
  const matches = (await findTasksByExactTitle(db, title)).filter((task) => task.status !== 'ARCHIVED' && task.status !== 'CANCELLED');
  if (matches.length === 0) throw new Error(`No active task found with title: ${title}`);
  if (matches.length > 1) throw new Error(`Multiple active tasks match: ${title}`);
  const task = matches[0];
  if (!task) throw new Error(`No active task found with title: ${title}`);
  return task;
}

export type AssistantExecutionResult =
  | { type: 'TASK_CREATED'; message: string; task: Task }
  | { type: 'TASK_COMPLETED'; message: string; task: Task }
  | { type: 'TASK_LIST'; message: string; tasks: Task[] }
  | { type: 'TASK_RESCHEDULED'; message: string; task: Task }
  | { type: 'MEMORY_CREATED'; message: string; memory: Memory }
  | { type: 'MEMORY_SEARCH'; message: string; memories: Memory[] };

export async function executeAssistantAction(
  db: SQLiteDatabase,
  action: Exclude<OrchestratedAction, { type: 'CLARIFY' }>,
): Promise<AssistantExecutionResult> {
  try {
    const result = (await executeAiAction(db, action)) as ActionExecutionResult;
    switch (result.type) {
      case 'TASK_CREATED':
        return { type: 'TASK_CREATED', message: 'Task created locally.', task: result.task };
      case 'TASK_COMPLETED':
        return { type: 'TASK_COMPLETED', message: 'Task completed locally.', task: result.task };
      case 'TASKS_LISTED':
        return { type: 'TASK_LIST', message: `${result.tasks.length} task(s) found locally.`, tasks: result.tasks };
      case 'TASK_RESCHEDULED':
        return { type: 'TASK_RESCHEDULED', message: 'Task rescheduled locally.', task: result.task };
      case 'MEMORY_CREATED':
        return { type: 'MEMORY_CREATED', message: 'Memory saved locally.', memory: result.memory };
      case 'MEMORIES_FOUND':
        return { type: 'MEMORY_SEARCH', message: `${result.memories.length} memory result(s) found locally.`, memories: result.memories };
    }
  } catch (error) {
    switch (action.type) {
      case 'CREATE_TASK': {
        const task = await addTask(db, { title: action.taskText, dueAt: dueIso(action.dueDate, action.dueMinutes) });
        return { type: 'TASK_CREATED', message: 'Task created locally.', task };
      }
      case 'COMPLETE_TASK': {
        const task = await resolveTask(db, action.taskText);
        const completed = await completeTask(db, task.id);
        if (!completed) throw error;
        return { type: 'TASK_COMPLETED', message: 'Task completed locally.', task: completed };
      }
      case 'LIST_TASKS': {
        const tasks = await listTasks(db, { limit: 100 });
        return { type: 'TASK_LIST', message: `${tasks.length} task(s) found locally.`, tasks };
      }
      case 'RESCHEDULE_TASK': {
        const task = await resolveTask(db, action.taskText);
        const dueAt = dueIso(action.dueDate, action.dueMinutes);
        if (!dueAt) throw new Error('A valid schedule is required');
        const updated = await rescheduleTask(db, task.id, dueAt);
        if (!updated) throw new Error('Task could not be rescheduled');
        return { type: 'TASK_RESCHEDULED', message: 'Task rescheduled locally.', task: updated };
      }
      case 'CREATE_MEMORY': {
        const memory = await addMemory(db, { content: action.content, kind: 'NOTE', source: 'USER', importance: 3 });
        return { type: 'MEMORY_CREATED', message: 'Memory saved locally.', memory };
      }
      case 'SEARCH_MEMORY': {
        const memories = await findMemories(db, action.query);
        return { type: 'MEMORY_SEARCH', message: `${memories.length} memory result(s) found locally.`, memories };
      }
    }
  }
}

export type { Memory, Task };
