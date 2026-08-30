import type { SQLiteDatabase } from 'expo-sqlite';
import type { TurnPlan } from '../ai/planner/planner';
import { toolFor } from '../ai/agent/tools';
import { recordAssistantTurn } from '../ai/assistant/trace';
import { executeAiAction, type ActionExecutionContext, type ActionExecutionResult } from './ai-action-executor';
import { resetSemanticMemoryIndex } from './semantic-memory-service';

// The agent runner: executes a validated multi-step plan, one step at a time, on the
// device. It never plans — it only runs what the planner produced. Each step is:
//   run → verify (result type matches the tool's declared expectation) → record.
// A failed step does not abort the plan; the rest still run (best-effort), and the
// overall status reflects what actually happened.

export type StepState = 'DONE' | 'FAILED' | 'SKIPPED';

export interface StepOutcome {
  id: number;
  text: string;
  state: StepState;
  resultType?: ActionExecutionResult['type'];
  note?: string;
}

export interface PlanRun {
  status: 'COMPLETED' | 'PARTIAL' | 'FAILED';
  outcomes: StepOutcome[];
  results: ActionExecutionResult[];
}

export async function runPlan(
  db: SQLiteDatabase,
  plan: TurnPlan,
  ctx: ActionExecutionContext = {},
): Promise<PlanRun> {
  const startedAt = Date.now();
  const outcomes: StepOutcome[] = [];
  const results: ActionExecutionResult[] = [];
  let mutatedMemory = false;

  for (const step of plan.steps) {
    if (step.status !== 'READY' || step.action.type === 'CLARIFY') {
      outcomes.push({ id: step.id, text: step.text, state: 'SKIPPED', note: step.status });
      continue;
    }
    const tool = toolFor(step.action);
    try {
      const result = await executeAiAction(db, step.action, ctx);
      results.push(result);
      if (tool && result.type !== tool.expect) {
        outcomes.push({ id: step.id, text: step.text, state: 'FAILED', resultType: result.type, note: 'unexpected-result' });
        continue;
      }
      if (tool?.mutates && (step.action.type === 'CREATE_MEMORY')) mutatedMemory = true;
      outcomes.push({ id: step.id, text: step.text, state: 'DONE', resultType: result.type });
    } catch (error) {
      outcomes.push({
        id: step.id,
        text: step.text,
        state: 'FAILED',
        note: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Keep semantic recall consistent with what the plan just wrote.
  if (mutatedMemory) resetSemanticMemoryIndex();

  const ran = outcomes.filter((o) => o.state !== 'SKIPPED');
  const done = ran.filter((o) => o.state === 'DONE').length;
  const status: PlanRun['status'] =
    done === 0 ? 'FAILED' : done === ran.length ? 'COMPLETED' : 'PARTIAL';

  recordAssistantTurn({
    at: new Date().toISOString(),
    input: plan.steps.map((s) => s.text).join(' | '),
    source: 'text',
    intent: 'PLAN',
    confidence: plan.readyCount / Math.max(1, plan.steps.length),
    status,
    actionType: 'RUN_PLAN',
    outcome: `${done}/${ran.length} done`,
    durationMs: Date.now() - startedAt,
    detail: outcomes.map((o) => `#${o.id} ${o.state}${o.note ? ` (${o.note})` : ''}`),
  });

  return { status, outcomes, results };
}
