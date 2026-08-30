import type { SQLiteDatabase } from 'expo-sqlite';
import type { TurnPlan } from '../src/ai/planner';
import { runPlan } from '../src/services/agent-runner';
import * as executor from '../src/services/ai-action-executor';

jest.mock('../src/services/ai-action-executor');

const db = {} as SQLiteDatabase;

const step = (id: number, action: unknown, status: 'READY' | 'NEEDS_INPUT' = 'READY') =>
  ({ id, text: `step ${id}`, status, action, nlp: {} } as unknown as TurnPlan['steps'][number]);

const plan = (steps: TurnPlan['steps']): TurnPlan => ({
  multi: true,
  steps,
  readyCount: steps.filter((s) => s.status === 'READY').length,
});

beforeEach(() => jest.clearAllMocks());

describe('agent runner', () => {
  it('runs every ready step in order and reports COMPLETED', async () => {
    jest.mocked(executor.executeAiAction)
      .mockResolvedValueOnce({ type: 'TASK_CREATED', task: { id: 't1' } } as never)
      .mockResolvedValueOnce({ type: 'MEMORY_CREATED', memory: { id: 'm1' } } as never);

    const run = await runPlan(db, plan([
      step(0, { type: 'CREATE_TASK', taskText: 'a' }),
      step(1, { type: 'CREATE_MEMORY', content: 'b' }),
    ]));

    expect(run.status).toBe('COMPLETED');
    expect(run.outcomes.map((o) => o.state)).toEqual(['DONE', 'DONE']);
    expect(run.results).toHaveLength(2);
    expect(executor.executeAiAction).toHaveBeenCalledTimes(2);
  });

  it('continues past a failing step and reports PARTIAL', async () => {
    jest.mocked(executor.executeAiAction)
      .mockRejectedValueOnce(new Error('Referenced task was not found'))
      .mockResolvedValueOnce({ type: 'MEMORY_CREATED', memory: { id: 'm1' } } as never);

    const run = await runPlan(db, plan([
      step(0, { type: 'COMPLETE_TASK', taskText: 'ghost' }),
      step(1, { type: 'CREATE_MEMORY', content: 'b' }),
    ]));

    expect(run.status).toBe('PARTIAL');
    expect(run.outcomes[0]?.state).toBe('FAILED');
    expect(run.outcomes[0]?.note).toContain('not found');
    expect(run.outcomes[1]?.state).toBe('DONE');
  });

  it('verifies the result type against the tool and fails a mismatch', async () => {
    jest.mocked(executor.executeAiAction).mockResolvedValueOnce({ type: 'MEMORIES_FOUND', memories: [] } as never);

    const run = await runPlan(db, plan([step(0, { type: 'CREATE_TASK', taskText: 'a' })]));

    expect(run.status).toBe('FAILED');
    expect(run.outcomes[0]?.state).toBe('FAILED');
    expect(run.outcomes[0]?.note).toBe('unexpected-result');
  });

  it('skips a not-ready step without calling the executor', async () => {
    jest.mocked(executor.executeAiAction).mockResolvedValueOnce({ type: 'TASK_CREATED', task: { id: 't1' } } as never);

    const run = await runPlan(db, plan([
      step(0, { type: 'CLARIFY', reason: 'MISSING_TASK_REFERENCE' }, 'NEEDS_INPUT'),
      step(1, { type: 'CREATE_TASK', taskText: 'a' }),
    ]));

    expect(run.outcomes[0]?.state).toBe('SKIPPED');
    expect(run.outcomes[1]?.state).toBe('DONE');
    expect(run.status).toBe('COMPLETED'); // only ran steps count toward status
    expect(executor.executeAiAction).toHaveBeenCalledTimes(1);
  });
});
