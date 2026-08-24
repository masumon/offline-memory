import type { SQLiteDatabase } from 'expo-sqlite';
import type { OrchestratedAction } from '../ai/orchestrator';
import { executeAiAction, type ActionExecutionResult } from './ai-action-executor';
import type { Memory } from '../types/memory-model';
import type { Task } from '../types/task-model';

type ExtractTask<T extends ActionExecutionResult['type']> = Extract<ActionExecutionResult, { type: T }>;

export type AssistantExecutionResult =
  | { type: 'TASK_CREATED'; message: string; task: ExtractTask<'TASK_CREATED'>['task'] }
  | { type: 'TASK_COMPLETED'; message: string; task: ExtractTask<'TASK_COMPLETED'>['task'] }
  | { type: 'TASK_LIST'; message: string; tasks: ExtractTask<'TASKS_LISTED'>['tasks'] }
  | { type: 'TASK_RESCHEDULED'; message: string; task: ExtractTask<'TASK_RESCHEDULED'>['task'] }
  | { type: 'MEMORY_CREATED'; message: string; memory: ExtractTask<'MEMORY_CREATED'>['memory'] }
  | { type: 'MEMORY_SEARCH'; message: string; memories: ExtractTask<'MEMORIES_FOUND'>['memories'] };

export async function executeAssistantAction(
  db: SQLiteDatabase,
  action: Exclude<OrchestratedAction, { type: 'CLARIFY' }>,
): Promise<AssistantExecutionResult> {
  const result = await executeAiAction(db, action);
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
}

export type { Memory, Task };
