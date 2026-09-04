import { resolveContext } from '../context';
import type { OrchestrationContext } from '../context';
import { parseLocalNlp } from '../nlp';
import type { NlpIntent } from '../nlp/types';
import type { OrchestratedAction, OrchestratorResult } from './types';

export * from './types';

function clarifyAction(reason: Extract<OrchestratedAction, { type: 'CLARIFY' }>['reason']): OrchestratedAction {
  return { type: 'CLARIFY', reason };
}

function hasTaskReference(value: string | undefined): value is string {
  const trimmed = value?.trim();
  return Boolean(trimmed && trimmed.length >= 10 && !/(?:reschedule|move|postpone|delay|পিছ|পরে কর|দাও)$/u.test(trimmed));
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
      if (entities.time && !entities.date) {
        return { status: 'NEEDS_INPUT', action: clarifyAction('MISSING_SCHEDULE') };
      }
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
      if (!context.lastTaskText && !hasTaskReference(resolved.taskText)) {
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
      return {
        status: 'READY',
        action: { type: 'CREATE_MEMORY', content: entities.memoryText, tags: entities.tags?.length ? entities.tags : undefined },
      };

    case 'SEARCH_MEMORY':
      // An empty string is a deliberate "list everything" request; only `undefined` means
      // we genuinely have nothing to search for.
      if (resolved.memoryQuery === undefined) return { status: 'NEEDS_INPUT', action: clarifyAction('MISSING_QUERY') };
      return { status: 'READY', action: { type: 'SEARCH_MEMORY', query: resolved.memoryQuery } };

    case 'ANSWER_QUESTION': {
      const question = entities.question?.trim();
      let keywords = entities.keywords ?? [];
      // A terse follow-up ("আর ভিসারটা?") carries too few words to retrieve on its own —
      // fold in the previous question's topic so the attribute (e.g. "মেয়াদ") is kept.
      if (keywords.length < 3 && context.lastKeywords?.length) {
        keywords = [...new Set([...keywords, ...context.lastKeywords])].slice(0, 6);
      }
      if (!question || keywords.length === 0) {
        return { status: 'NEEDS_INPUT', action: clarifyAction('MISSING_QUESTION') };
      }
      return { status: 'READY', action: { type: 'ANSWER_QUESTION', question, keywords } };
    }

    case 'HELP':
      return { status: 'READY', action: { type: 'SHOW_HELP' } };

    case 'SMALL_TALK':
      return { status: 'READY', action: { type: 'SMALL_TALK', text: entities.question ?? '' } };

    case 'UNKNOWN':
    default: {
      // Last-chance recovery: a personal-lookup phrasing that carried no question mark
      // and no explicit verb ("আমার ওয়াইফাই পাসওয়ার্ড দাও", "my passport number") is
      // still almost certainly a request to recall a saved fact. Route it to the
      // answering pipeline (which has its own strong guardrails and will say
      // "nothing saved" if it truly finds nothing) rather than dead-ending the user.
      const q = entities.question?.trim();
      let keywords = entities.keywords ?? [];
      if (keywords.length < 3 && context.lastKeywords?.length) {
        keywords = [...new Set([...keywords, ...context.lastKeywords])].slice(0, 6);
      }
      const lookupShape =
        !!q &&
        keywords.length > 0 &&
        /(?:^|[\s("'।,])(?:আমার|আমাদের|মোর|my|our|mine)(?![\p{L}\p{M}])|(?<![\p{L}\p{M}])(?:দাও|দেখাও|বল(?:ো|েন|ুন)?|জানাও|মনে\s*করিয়ে|বের\s*কর|কোথায়|কী|কি|কত|show|tell|give|find)(?![\p{L}\p{M}])/u.test(
          q,
        );
      if (lookupShape) {
        return { status: 'READY', action: { type: 'ANSWER_QUESTION', question: q, keywords } };
      }
      return { status: 'UNSUPPORTED', action: clarifyAction('UNKNOWN_INTENT') };
    }
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
