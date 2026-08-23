# Local AI boundary

This directory is reserved for deterministic, fully offline intelligence.

Planned modules:

- `nlp/` — normalization and language processing
- `intent/` — intent classification
- `entities/` — entity extraction
- `date/` — natural-language date parsing
- `time/` — natural-language time parsing
- `context/` — local conversational/task context
- `rules/` — deterministic business and productivity rules
- `planning/` — priority and schedule scoring
- `orchestrator/` — validated action orchestration

The local AI layer must not call external LLM APIs or mutate persistence directly.
