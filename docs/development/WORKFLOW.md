# Development workflow

## Branches

- `main` — stable integration branch
- `feature/*` — isolated implementation work

## Required checks before integration

1. TypeScript typecheck
2. ESLint
3. Jest tests
4. Android smoke test when native code or device behavior changes

## Safety rules

- Do not delete user data during migrations.
- Do not introduce network requirements into offline core features.
- Do not expose secrets in source control.
- Do not let AI actions bypass application validation.
- Prefer additive, reversible changes.
