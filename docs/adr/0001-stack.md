# 0001. Stack and governance baseline

## Status
Accepted

## Context
TOTJO Holocron is a greenfield TypeScript web app. Task 1 needs the stack decision recorded before any feature work so later tasks inherit one source of truth for tooling, testing, offline behavior, and policy enforcement.

## Decision
- Build V1 as a PWA-first web app.
- Use pnpm, Vite, React, TypeScript, React Router, Dexie, Supabase, Vitest, Playwright, and GitHub Actions as the baseline stack.
- Keep content governance files in-repo under `docs/adr/` and `content/policy/`.
- Treat public TOTJO text pages as allowed V1 source material when attribution, provenance, and approval status are recorded.
- Treat member-only or private TOTJO material as out of scope for V1.

## Consequences
- Later tasks must match this stack unless a new ADR replaces it.
- Governance and provenance checks become part of normal local validation.
- Audio release remains blocked until explicit open-source license data is recorded.
