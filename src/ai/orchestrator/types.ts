import type { NlpResult } from '../nlp/types';

export type OrchestratorStatus = 'READY' | 'NEEDS_INPUT' | 'UNSUPPORTED';

export type OrchestratedAction =
  | {
      type: 'CREATE_TASK';
      taskText: string;
      dueDate?: string;
      dueMinutes?: number;
    }
  | {
      type: 'COMPLETE_TASK';
      taskText?: string;
    }
  | {
      type: 'LIST_TASKS';
    }
  | {
      type: 'RESCHEDULE_TASK';
      taskText?: string;
      dueDate?: string;
      dueMinutes?: number;
    }
  | {
      type: 'CREATE_MEMORY';
      content: string;
    }
  | {
      type: 'SEARCH_MEMORY';
      query: string;
    }
  | {
      type: 'CLARIFY';
      reason:
        | 'UNKNOWN_INTENT'
        | 'MISSING_TASK_TEXT'
        | 'MISSING_TASK_REFERENCE'
        | 'MISSING_MEMORY_TEXT'
        | 'MISSING_QUERY';
    };

export interface OrchestratorResult {
  status: OrchestratorStatus;
  action: OrchestratedAction;
  nlp: NlpResult;
}
