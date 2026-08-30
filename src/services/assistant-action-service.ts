import type { SQLiteDatabase } from 'expo-sqlite';
import type { OrchestratedAction } from '../ai/orchestrator';
import type { Memory } from '../types/memory-model';
import type { Task } from '../types/task-model';
import { AmbiguousTaskError, executeAiAction, executeAiActionOnTask, type ActionExecutionContext, type ActionExecutionResult } from './ai-action-executor';
import type { AnswerResult } from './question-answering-service';
import type { HelpTopic } from '../ai/assistant/conversation';

export type PendingTaskChoice = Extract<OrchestratedAction, { type: 'COMPLETE_TASK' | 'RESCHEDULE_TASK' }>;

export type AssistantExecutionResult =
  | { type: 'TASK_CREATED'; message: string; task: Task }
  | { type: 'TASK_COMPLETED'; message: string; task: Task }
  | { type: 'TASK_LIST'; message: string; tasks: Task[] }
  | { type: 'TASK_RESCHEDULED'; message: string; task: Task }
  | { type: 'MEMORY_CREATED'; message: string; memory: Memory }
  | { type: 'MEMORY_SEARCH'; message: string; memories: Memory[] }
  | { type: 'ANSWER'; message: string; answer: AnswerResult }
  | { type: 'HELP'; message: string; intro: string; topics: HelpTopic[]; outro: string }
  | { type: 'SMALL_TALK'; message: string }
  | { type: 'NEEDS_TASK_CHOICE'; message: string; candidates: Task[]; pending: PendingTaskChoice };

function present(result: ActionExecutionResult): AssistantExecutionResult {
  switch (result.type) {
    case 'TASK_CREATED': return { type: 'TASK_CREATED', message: 'Task created locally.', task: result.task };
    case 'TASK_COMPLETED': return { type: 'TASK_COMPLETED', message: 'Task completed locally.', task: result.task };
    case 'TASKS_LISTED': return { type: 'TASK_LIST', message: `${result.tasks.length} task(s) found locally.`, tasks: result.tasks };
    case 'TASK_RESCHEDULED': return { type: 'TASK_RESCHEDULED', message: 'Task rescheduled locally.', task: result.task };
    case 'MEMORY_CREATED': return { type: 'MEMORY_CREATED', message: 'Memory saved locally.', memory: result.memory };
    case 'MEMORIES_FOUND': return { type: 'MEMORY_SEARCH', message: `${result.memories.length} memory result(s) found locally.`, memories: result.memories };
    case 'QUESTION_ANSWERED': return { type: 'ANSWER', message: result.answer.text, answer: result.answer };
    case 'HELP_SHOWN': return { type: 'HELP', message: result.intro, intro: result.intro, topics: result.topics, outro: result.outro };
    case 'SMALL_TALK_REPLY': return { type: 'SMALL_TALK', message: result.message };
  }
}

export async function executeAssistantAction(
  db: SQLiteDatabase,
  action: Exclude<OrchestratedAction, { type: 'CLARIFY' }>,
  ctx: ActionExecutionContext = {},
): Promise<AssistantExecutionResult> {
  try {
    return present(await executeAiAction(db, action, ctx));
  } catch (error) {
    // A reference that matches several tasks is not a failure — surface the choices.
    if (error instanceof AmbiguousTaskError && (action.type === 'COMPLETE_TASK' || action.type === 'RESCHEDULE_TASK')) {
      return { type: 'NEEDS_TASK_CHOICE', message: 'Which task did you mean?', candidates: error.candidates, pending: action };
    }
    throw error;
  }
}

/** Run a pending COMPLETE/RESCHEDULE against the task the user picked from the choice list. */
export async function resolveAssistantTaskChoice(
  db: SQLiteDatabase,
  pending: PendingTaskChoice,
  taskId: string,
): Promise<AssistantExecutionResult> {
  return present(await executeAiActionOnTask(db, pending, taskId));
}

export type { Memory, Task };
