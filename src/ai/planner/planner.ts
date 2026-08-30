import { normalizeText } from '../nlp/normalize';
import { orchestrate, type OrchestratedAction, type OrchestratorResult } from '../orchestrator';
import type { OrchestrationContext } from '../context';
import { updateContext } from '../context';

// The planning layer. It turns one natural-language instruction — possibly a compound
// one ("mark the meeting done, then remind me to send the report tomorrow") — into an
// ordered list of validated steps. It is pure: no database, no side effects. The agent
// runner executes the plan; this module only decides *what* the steps are.

export interface PlanStep {
  id: number;
  /** The sub-instruction this step came from. */
  text: string;
  status: OrchestratorResult['status'];
  action: OrchestratedAction;
  nlp: OrchestratorResult['nlp'];
}

export interface TurnPlan {
  /** True when there are ≥2 executable steps — the caller should show a plan, not a single card. */
  multi: boolean;
  steps: PlanStep[];
  readyCount: number;
}

const MAX_STEPS = 8;

// Planner-local step separators — a superset of the NLP lexicon's (adds bare "and" /
// "আর" / "ও"), so a spoken run of chores splits the way a person means it. Kept here so
// the shared multi-parse used elsewhere is untouched.
const PLAN_SEPARATORS =
  /\s*(?:,|;|।|&|\band then\b|\bafter that\b|\bthen\b|\band also\b|\balso\b|\band\b|\bও তারপর\b|\bতারপর\b|\bএরপর\b|\bএবং\b|\bআর\b|\bও\b)\s*/giu;
const LEADING_CONNECTIVE = /^(?:and|also|then|next|আর|ও|এবং|তারপর|এরপর)\s+/iu;

function splitSteps(input: string): string[] {
  const normalized = normalizeText(input);
  const parts = normalized
    .split(PLAN_SEPARATORS)
    .map((p) => p.trim().replace(LEADING_CONNECTIVE, '').trim())
    .filter((p) => p.length >= 3);
  return parts.length ? parts.slice(0, MAX_STEPS) : [normalized];
}

/** Two READY steps whose action + key fields are identical → keep the first only. */
function actionKey(action: OrchestratedAction): string {
  return JSON.stringify(action);
}

/**
 * Build an ordered, validated plan for `input`. Context threads forward between steps
 * (so "…then reschedule it to Friday" can resolve "it" from the previous step).
 */
export function planTurn(
  input: string,
  now = new Date(),
  context: OrchestrationContext = {},
): TurnPlan {
  const pieces = splitSteps(input);

  // Single piece → a normal one-action turn; never surface a "plan".
  if (pieces.length < 2) {
    const only = orchestrate(input, now, context);
    return {
      multi: false,
      readyCount: only.status === 'READY' ? 1 : 0,
      steps: [{ id: 0, text: pieces[0] ?? input.trim(), status: only.status, action: only.action, nlp: only.nlp }],
    };
  }

  const steps: PlanStep[] = [];
  const seen = new Set<string>();
  let ctx = context;
  let id = 0;
  for (const piece of pieces) {
    const result = orchestrate(piece, now, ctx);
    if (result.status === 'READY') {
      const key = actionKey(result.action);
      if (seen.has(key)) continue;
      seen.add(key);
      ctx = updateContext(result.nlp.intent, result.nlp.entities, ctx);
    }
    steps.push({ id: id++, text: piece, status: result.status, action: result.action, nlp: result.nlp });
  }

  const readyCount = steps.filter((s) => s.status === 'READY').length;
  return { multi: readyCount >= 2, steps, readyCount };
}
