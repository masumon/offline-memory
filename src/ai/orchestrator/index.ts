import { resolveContext } from '../context';
import type { OrchestrationContext } from '../context';
import { parseLocalNlp } from '../nlp';
import type { NlpIntent } from '../nlp/types';
import type { OrchestratedAction, OrchestratorResult } from './types';

export * from './types';

function clarifyAction(reason: Extract<OrchestratedAction, { type: 'CLARIFY' }>['reason']): OrchestratedAction {
  return { type: 'CLARIFY', reason };
}

function actionForIntent(
  intent: NlpIntent,
  entities: ReturnType<typeof parseLocalNlp>['entities'],
  context: OrchestrationContext,
): {
  status: OrchestratorResult['status'];
  action: OrchestratedAction;
} {
  const resolved = resolveContext(entities, context);

  switch (intent) {
    case 'CREATE_TASK':
      if (!entities.taskText) return { status: 'NEEDS_INPUT', action: clarifyAction('MISSING_TASK_TEXT') };
      if (entities.time && !entities.date) return { status: 'NEEDS_INPUT', action: clarifyAction('MISSING_SCHEDULE') };
      return {
        status: 'READY',
        action: {
          type: 'CREATE_TASK',
          taskText: entities.taskText,
          dueDate: entities.date?.isoDate,
          dueMinutes: entities.time?.minutes,
        },
      };

    case 'COMPLETE_TASK':
      if (!resolved.taskText) {
        return { status: 'NEEDS_INPUT', action: clarifyAction('MISSING_TASK_REFERENCE') };
      }
      return {
        status: 'READY',
        action: { type: 'COMPLETE_TASK', taskText: resolved.taskText },
      };

    case 'LIST_TASKS':
      return { status: 'READY', action: { type: 'LIST_TASKS' } };

    case 'RESCHEDULE_TASK':
      if (!resolved.taskText) {
        return { status: 'NEEDS_INPUT', action: clarifyAction('MISSING_TASK_REFERENCE') };
      }
      if (!entities.date && !entities.time) {
        return { status: 'NEEDS_INPUT', action: clarifyAction('MISSING_SCHEDULE') };
      }
      if (entities.time && !entities.date) {
        return { status: 'NEEDS_INPUT', action: clarifyAction('MISSING_SCHEDULE') };
      }
      return {
        status: 'READY',
        action: {
          type: 'RESCHEDULE_TASK',
          taskText: resolved.taskText,
          dueDate: entities.date?.isoDate,
          dueMinutes: entities.time?.minutes,
        },
      };

    case 'CREATE_MEMORY':
      if (!entities.memoryText) return { status: 'NEEDS_INPUT', action: clarifyAction('MISSING_MEMORY_TEXT') };
      return { status: 'READY', action: { type: 'CREATE_MEMORY', content: entities.memoryText } };

    case 'SEARCH_MEMORY':
      if (!resolved.memoryQuery) return { status: 'NEEDS_INPUT', action: clarifyAction('MISSING_QUERY') };
      return { status: 'READY', action: { type: 'SEARCH_MEMORY', query: resolved.memoryQuery } };

    case 'UNKNOWN':
    default:
      return { status: 'UNSUPPORTED', action: clarifyAction('UNKNOWN_INTENT') };
  }
}

/**
 * Converts deterministic local NLP output into a validated application action.
 * This layer is pure: it never opens SQLite, calls a repository, or mutates state.
 */
export function orchestrate(
  input: string,
  now = new Date(),
  context: OrchestrationContext = {},
): OrchestratorResult {
  const nlp = parseLocalNlp(input, now);
  const { status, action } = actionForIntent(nlp.intent, nlp.entities, context);
  return { status, action, nlp };
}
