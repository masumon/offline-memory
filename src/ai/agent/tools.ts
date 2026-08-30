import type { OrchestratedAction } from '../orchestrator';
import type { ActionExecutionResult } from '../../services/ai-action-executor';

// The assistant's "tools" — the closed set of things the agent is allowed to do on the
// user's device. Every executable action maps to exactly one tool. Keeping this as an
// explicit table (rather than an open-ended function bus) is a guardrail: the planner
// can only ever produce these, and the runner can verify each result against the tool's
// declared `expect` type.

export type ToolName = Exclude<OrchestratedAction['type'], 'CLARIFY'>;

export interface ToolSpec {
  name: ToolName;
  /** Whether this tool changes stored data (used for confirm / index-refresh decisions). */
  mutates: boolean;
  /** The `ActionExecutionResult.type` a successful run must return. */
  expect: ActionExecutionResult['type'];
  label: { bn: string; en: string };
}

export const TOOLS: Record<ToolName, ToolSpec> = {
  CREATE_TASK: { name: 'CREATE_TASK', mutates: true, expect: 'TASK_CREATED', label: { bn: 'টাস্ক তৈরি', en: 'Create task' } },
  COMPLETE_TASK: { name: 'COMPLETE_TASK', mutates: true, expect: 'TASK_COMPLETED', label: { bn: 'টাস্ক সম্পন্ন', en: 'Complete task' } },
  LIST_TASKS: { name: 'LIST_TASKS', mutates: false, expect: 'TASKS_LISTED', label: { bn: 'টাস্ক তালিকা', en: 'List tasks' } },
  RESCHEDULE_TASK: { name: 'RESCHEDULE_TASK', mutates: true, expect: 'TASK_RESCHEDULED', label: { bn: 'সময় পরিবর্তন', en: 'Reschedule task' } },
  CREATE_MEMORY: { name: 'CREATE_MEMORY', mutates: true, expect: 'MEMORY_CREATED', label: { bn: 'মেমোরি সংরক্ষণ', en: 'Save memory' } },
  SEARCH_MEMORY: { name: 'SEARCH_MEMORY', mutates: false, expect: 'MEMORIES_FOUND', label: { bn: 'মেমোরি খোঁজা', en: 'Search memory' } },
  ANSWER_QUESTION: { name: 'ANSWER_QUESTION', mutates: false, expect: 'QUESTION_ANSWERED', label: { bn: 'উত্তর দেওয়া', en: 'Answer question' } },
  SHOW_HELP: { name: 'SHOW_HELP', mutates: false, expect: 'HELP_SHOWN', label: { bn: 'সাহায্য', en: 'Help' } },
  SMALL_TALK: { name: 'SMALL_TALK', mutates: false, expect: 'SMALL_TALK_REPLY', label: { bn: 'কথা', en: 'Chat' } },
};

export function toolFor(action: OrchestratedAction): ToolSpec | null {
  return action.type === 'CLARIFY' ? null : TOOLS[action.type];
}

/** One-line, human-readable description of what a step will do. */
export function describeAction(action: OrchestratedAction, bn: boolean): string {
  switch (action.type) {
    case 'CREATE_TASK':
      return (bn ? 'টাস্ক: ' : 'Task: ') + action.taskText + (action.dueDate ? ` · ${action.dueDate}` : '');
    case 'COMPLETE_TASK':
      return (bn ? 'সম্পন্ন: ' : 'Complete: ') + action.taskText;
    case 'LIST_TASKS':
      return bn ? 'সব টাস্ক দেখাও' : 'Show all tasks';
    case 'RESCHEDULE_TASK':
      return (bn ? 'সময় পরিবর্তন: ' : 'Reschedule: ') + action.taskText + (action.dueDate ? ` → ${action.dueDate}` : '');
    case 'CREATE_MEMORY':
      return (bn ? 'মেমোরি: ' : 'Memory: ') + action.content;
    case 'SEARCH_MEMORY':
      return (bn ? 'খোঁজো: ' : 'Search: ') + action.query;
    case 'ANSWER_QUESTION':
      return (bn ? 'উত্তর: ' : 'Answer: ') + action.question;
    case 'SHOW_HELP':
      return bn ? 'সাহায্য দেখানো' : 'Show help';
    case 'SMALL_TALK':
      return bn ? 'কথা বলা' : 'Chat';
    case 'CLARIFY':
      return bn ? 'আরও তথ্য দরকার' : 'Needs more detail';
  }
}
