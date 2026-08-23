# Local AI boundary

This directory contains deterministic, fully offline intelligence.

## Implemented in M3

- `nlp/normalize.ts` — Unicode normalization, Bengali digit conversion, tokenization
- `nlp/intent.ts` — deterministic bilingual intent classification
- `nlp/entities.ts` — local date, time, task, and memory entity extraction
- `nlp/index.ts` — pure parser facade

## Planned next layers

- `context/` — local conversational/task context
- `rules/` — deterministic business and productivity rules
- `planning/` — priority and schedule scoring
- `orchestrator/` — validated action orchestration

The local AI layer must not call external LLM APIs or mutate persistence directly.
