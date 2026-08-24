import type { SQLiteDatabase } from 'expo-sqlite';
import { findTasksByExactTitle, listTasks, rescheduleTask, completeTask, addTask } from './task-service';
import { addMemory, findMemories } from './memory-service';
import type { OrchestratedAction } from '../ai/orchestrator/types';

function dueIso(date: string | undefined, minutes: number | undefined): string | null {
  if (!date) return null;
  const value = new Date(`${date}T00:00:00`);
  if (Number.isNaN(value.getTime())) throw new Error('Unable to resolve the requested date');
  if (minutes !== undefined) value.setMinutes(minutes);
  return value.toISOString();
}

async function resolveTask(db: SQLiteDatabase, title: string) {
  const matches = (await findTasksByExactTitle(db, title)).filter((task) => task.status !== 'ARCHIVED' && task.status !== 'CANCELLED');
  if (matches.length === 0) throw new Error(`No active task found with title: ${title}`);
  if (matches.length > 1) throw new Error(`Multiple active tasks match: ${title}`);
  return matches[0];
}

export type AssistantExecutionResult =
  | { type: 'TASK_CREATED'; taskId: string; message: string }
  | { type: 'TASK_COMPLETED'; taskId: string; message: string }
  | { type: 'TASK_RESCHEDULED'; taskId: string; message: string }
  | { type: 'TASK_LIST'; tasks: Awaited<ReturnType<typeof listTasks>>; message: string }
  | { type: 'MEMORY_CREATED'; memoryId: string; message: string }
  | { type: 'MEMORY_SEARCH'; memories: Awaited<ReturnType<typeof findMemories>>; message: string };

export async function executeAssistantAction(db: SQLiteDatabase, action: Exclude<OrchestratedAction, { type: 'CLARIFY' }>): Promise<AssistantExecutionResult> {
  switch (action.type) {
    case 'CREATE_TASK': {
      const task = await addTask(db, { title: action.taskText, dueAt: dueIso(action.dueDate, action.dueMinutes) });
      return { type: 'TASK_CREATED', taskId: task.id, message: 'Task created successfully.' };
    }
    case 'COMPLETE_TASK': {
      const task = await resolveTask(db, action.taskText);
      const completed = await completeTask(db, task.id);
      if (!completed) throw new Error('Task could not be completed');
      return { type: 'TASK_COMPLETED', taskId: completed.id, message: 'Task marked complete.' };
    }
    case 'LIST_TASKS': {
      const tasks = await listTasks(db, { limit: 100 });
      return { type: 'TASK_LIST', tasks, message: `${tasks.length} task${tasks.length === 1 ? '' : 's'} found.` };
    }
    case 'RESCHEDULE_TASK': {
      const task = await resolveTask(db, action.taskText);
      const dueAt = dueIso(action.dueDate, action.dueMinutes);
      if (!dueAt) throw new Error('A valid schedule is required');
      const updated = await rescheduleTask(db, task.id, dueAt);
      if (!updated) throw new Error('Task could not be rescheduled');
      return { type: 'TASK_RESCHEDULED', taskId: updated.id, message: 'Task rescheduled successfully.' };
    }
    case 'CREATE_MEMORY': {
      const memory = await addMemory(db, { content: action.content, kind: 'NOTE', source: 'USER', importance: 3 });
      return { type: 'MEMORY_CREATED', memoryId: memory.id, message: 'Memory saved successfully.' };
    }
    case 'SEARCH_MEMORY': {
      const memories = await findMemories(db, action.query);
      return { type: 'MEMORY_SEARCH', memories, message: `${memories.length} memor${memories.length === 1 ? 'y' : 'ies'} found.` };
    }
  }
}
