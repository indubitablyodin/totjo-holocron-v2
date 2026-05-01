# 0004. Local-first sync and account authority model

## Status
Accepted

## Context
The product supports anonymous local use and an optional account upgrade. Governance must state what can sync and what remains authoritative locally.

## Decision
- Anonymous use stays local by default.
- Optional account sync applies only to user-owned state such as progress, notes, bookmarks, settings, and downloads metadata.
- Doctrine, supplemental, and sermon source text remains governed by in-repo content provenance records, not by user accounts.
- On account upgrade, merge local user-owned state into remote state with deterministic conflict rules defined in later implementation tasks.
- Sync must never rewrite stored source text based on personalized display choices.
- Supabase remains the default remote sync backend. A client build may opt into `VITE_SYNC_REMOTE_MODE=api` to use a same-origin `/api/sync/profile` proxy, but the browser client must only send the existing Supabase access token and `UserSyncProfile` payloads. Any NocoDB token, MCP endpoint, or service/admin secret belongs only behind that trusted API boundary.

## Consequences
- Source-of-truth content governance stays independent of user-state sync.
- Users can move their personal state across devices without changing content authority.
- Later sync work must document deterministic merge behavior before release.
