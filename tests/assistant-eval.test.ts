import { evaluateIntents, evaluatePlans, evaluateAssistant } from '../src/ai/eval';

describe('assistant evaluation harness', () => {
  it('routes the fixed intent set with ≥ 95% accuracy', () => {
    const report = evaluateIntents();
    if (report.failures.length) {
      // Surface exactly what regressed.
      console.error('intent eval failures:', report.failures);
    }
    expect(report.accuracy).toBeGreaterThanOrEqual(0.95);
  });

  it('extracts the expected keywords for every answerable question', () => {
    const report = evaluateIntents();
    expect(report.failures.filter((f) => f.field === 'keywords')).toEqual([]);
  });

  it('detects multi-step plans exactly on the fixed set', () => {
    const report = evaluatePlans();
    if (report.failures.length) console.error('plan eval failures:', report.failures);
    expect(report.failures).toEqual([]);
  });

  it('the combined self-check passes', () => {
    expect(evaluateAssistant().ok).toBe(true);
  });
});
