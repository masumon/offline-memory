# Local AI boundary

This directory contains deterministic, fully offline intelligence.

## Implemented in M3

- `nlp/normalize.ts` — Unicode normalization, Bengali digit conversion, tokenization
- `nlp/intent.ts` — deterministic bilingual intent classification
- `nlp/entities.ts` — local date, time, task, and memory entity extraction
- `nlp/index.ts` — pure parser facade

## Implemented in M4

- `orchestrator/types.ts` — validated action/status contracts
- `orchestrator/index.ts` — pure NLP-to-action orchestration

The orchestrator only produces application actions. It does not open SQLite, call repositories, mutate Zustand state, call networks, or invoke external LLMs.

## Planned next layers

- `context/` — local conversational/task context
- `rules/` — deterministic business and productivity rules
- `planning/` — priority and schedule scoring

The local AI layer must remain fully offline and must not mutate persistence directly.
