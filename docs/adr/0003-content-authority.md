# 0003. Content authority model and source-of-truth rules

## Status
Accepted

## Context
The app brings together public doctrine, public supplemental texts, and synced sermons. Without a formal authority model, later reading flows could blur their roles and provenance.

## Decision
- Define three authority classes only: `canonical`, `supplemental`, and `sermon`.
- Treat doctrine sourced from public TOTJO doctrine pages as `canonical` when provenance and approval status are recorded.
- Treat public bonus texts such as Knight's Code as `supplemental` for companion study rather than bundled doctrine.
- Treat sermons as a separate class with their own approval and provenance tracking.
- Require every shippable text asset to record source URL, attribution, provenance status, and approval status.
- Keep machine-readable source-of-truth rules in `content/policy/content-authority.json`.

## Consequences
- UI and validation logic must keep Knight's Code in the supplemental reading collection.
- Later importers and readers must read authority from the registry, not from route names or display copy.
- New content classes require a new ADR and registry update.
