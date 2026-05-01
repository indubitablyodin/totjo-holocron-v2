# 0002. Offline policy and release guardrails

## Status
Accepted

## Context
The product promise is local-first, but not a fresh-install offline app. The plan already locks offline support to core reading, timer use, and approved audio after the first successful online load.

## Decision
- Promise offline support only after the first successful online load.
- Bundle core doctrine content with the app for offline reading.
- Do not promise the full sermon archive offline.
- Allow sermon text and audio offline only when they were explicitly downloaded or bundled with recorded provenance and approval status.
- Block release of doctrine, sermons, or sounds that lack recorded provenance or approval status.

## Consequences
- Product copy must avoid claiming full offline coverage for all remote content.
- Sync and caching work must respect the difference between bundled assets and downloaded assets.
- Missing provenance or approval data is a release blocker, not a warning.
