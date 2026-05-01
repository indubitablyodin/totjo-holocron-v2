# 0005. Text personalization stays in the display layer

## Status
Accepted

## Context
The product supports inline personalized wording, but canon must remain recoverable and immutable at rest.

## Decision
- Apply text personalization only as a presentation-layer transform.
- Store original source text unchanged.
- Always provide a clear way to return to original wording.
- Never treat personalized output as canonical, supplemental, or sermon source text.
- Do not persist personalized text into bundled content, synced sermon payloads, or governance registries.

## Consequences
- Later personalization code must transform rendered text, not source files.
- Export, sync, and cache flows must preserve original stored wording.
- Validation and documentation can reject any design that stores personalized source text.
