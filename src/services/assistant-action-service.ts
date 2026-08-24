import type { SQLiteDatabase } from 'expo-sqlite';
import type { OrchestratedAction } from '../ai/orchestrator';
import { executeAiAction, type ActionExecutionResult } from './ai-action-executor';

export type AssistantExecutionResult =
  | { type: 'TASK_CREATED'; message: string; task: ActionExecutionResult extends infer T ? Extract<T, { type: 'TASK_CREATED' }>['task'] : never }
  | { type: 'TASK_COMPLETED'; message: string; task: ActionExecutionResult extends infer T ? Extract<T, { type: 'TASK_COMPLETED' }>['task'] : never }
  | { type: 'TASK_LIST'; message: string; tasks: ActionExecutionResult extends infer T ? Extract<T, { type: 'TASKS_LISTED' }>['tasks'] : never }
  | { type: 'TASK_RESCHEDULED'; message: string; task: ActionExecutionResult extends infer T ? Extract<T, { type: 'TASK_RESCHEDULED' }>['task'] : never }
  | { type: 'MEMORY_CREATED'; message: string; memory: ActionExecutionResult extends infer T ? Extract<T, { type: 'MEMORY_CREATED' }>['memory'] : never }
  | { type: 'MEMORY_SEARCH'; message: string; memories: ActionExecutionResult extends infer T ? Extract<T, { type: 'MEMORIES_FOUND' }>['memories'] : never };

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
