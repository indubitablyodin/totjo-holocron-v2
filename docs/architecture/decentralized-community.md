# Decentralized Community Architecture

## Problem statement

TOTJO community activity currently depends on external platforms such as the TOTJO website, forums, and increasingly Discord. Discord is convenient for real-time conversation, but it is a centralized walled garden controlled by a third party. Losing access, archive history, search, identity, or moderation control would be a serious community risk.

Holocron should become a durable, local-first, user-owned, federation-ready companion rather than another walled garden. It should complement existing community spaces with a reliable offline-first knowledge base, not recreate Discord inside the app.

## Core principles

- **Local-first private data.** Notes, bookmarks, practice history, and settings stay on the user's device unless explicitly exported or shared.
- **User-owned export and backup.** Markdown export exists now; JSON export with import/restore capability is the next step.
- **No central storage of private notes by default.** Private user data is not synced to any server unless the user explicitly chooses to share or publish.
- **Public community content can be fetched, cached, and federated.** Announcements, sermons, doctrine, and public study content are fetched from static feeds and cached locally.
- **Sharing must be explicit.** No automatic transmission of private data. Sharing is opt-in and deliberate.
- **Social features must be opt-in.** No timeline, no feed, no notifications without user consent.
- **Durable teachings are more important than real-time chatter.** Doctrine, sermons, and study materials outrank ephemeral messages. The app should prioritize reading, meditation, and practice over notifications.
- **The app should degrade gracefully offline.** All core features — reading, timer, search, notes — work without network.
- **Federation should extend community reach without forcing platform lock-in.** If a user leaves a specific platform, their private data remains intact on their device.

## Data boundary

### Private local data (stays on device unless exported)

- Notes
- Bookmarks
- Private reflections
- Practice/meditation history
- Timer and reader settings
- Drafts
- Private study sheets
- Dismissed announcement state

### Public or community data (can be fetched, cached, shared)

- Announcements (bundled + remote feed)
- Sermons (index + saved bodies)
- Doctrine and supplemental texts
- Events
- Public study prompts
- Public study collections
- Optional public reflections in later phases

**Rule:** Private local data stays on the device unless the user explicitly exports, shares, submits, or publishes it. No private data is transmitted in the default app operation.

---

## Near-term model (v0.1.0–v0.2.0)

| Capability | Status |
|---|---|
| Bundled announcements | ✅ Implemented |
| Remote static announcements feed | ✅ Implemented |
| Local dismissal state | ✅ Implemented |
| Cached sermon/content indexes | ✅ Implemented |
| Markdown export | ✅ Implemented |
| JSON backup/restore | ⬜ Not yet implemented |
| No accounts required | ✅ Core design decision |

This phase already delivers a fully functional local-first app. No account, no login, no central server dependency.

---

## Medium-term model (v0.3.0–v0.5.0)

Planned capabilities:

- Static remote feeds for announcements and content updates
- Content feed validation (schema check, safe href, version-aware merge)
- Local cache of fetched feeds
- App icon badge via Badging API when supported
- Web Share API for exporting notes and bookmarks
- Export or share selected notes as Markdown
- Optional submission links for questions or reflections (external forms, not in-app posting)

**Principle:** All medium-term features remain optional. The app continues to work fully offline.

---

## Long-term federation options

### ActivityPub

Best suited for:
- Public announcements, sermons, and public posts
- Public study collections
- Federated TOTJO actor that broadcasts new content
- Compatible with the existing Fediverse (Mastodon, Lemmy, etc.)

Requires:
- Server-side actor, inbox, outbox concepts
- Public content only
- Not suitable for private notes by default

### Matrix

Best suited for:
- Real-time chat, rooms, and Discord-like communication
- Moderation, governance, and user reporting tooling
- Bridge to existing TOTJO chat spaces

Risks:
- Heavier moderation and governance responsibility
- Real-time expectations conflict with the app's focused study model
- Consider bridge or link-out rather than rebuilding chat inside Holocron

### AT Protocol

Best suited for:
- Portable social identities and content repositories
- Used by Bluesky
- Interesting for future portability consideration

Decision: Watch, but do not depend on it yet.

### Solid / personal data stores

Best suited for:
- User-owned personal data pods
- Philosophically aligned with the local-first model
- Possible future BYO storage model

Decision: Not needed for the current app. The local-first Dexie + localStorage model is simpler and more private.

---

## Proposed phased roadmap

### Phase 1 — Current (v0.1.0)

- In-app announcements from bundled registry
- Remote static announcements feed (JSON)
- Local announcement dismissal state
- Markdown user-data export
- App icon badge when supported

### Phase 2 — Content sharing

- Share selected note or reflection as Markdown (via Web Share or clipboard)
- Source-sheet-style public and private study collections
- Static public community feed for content updates
- Extended app badge support

### Phase 3 — Optional submission

- Optional "send reflection" or "ask a question" workflow
- Links to external forms or community spaces
- Clear privacy copy explaining data handling
- User retains local copy of any submitted content

### Phase 4 — ActivityPub federation

- ActivityPub-compatible public TOTJO actor and feed
- Public announcements and sermons federate outward to the Fediverse
- Holocron consumes the public actor or feed
- No private note federation
- Announcement feed can serve as a bridge to ActivityPub

### Phase 5 — Optional community layer (governance-dependent)

- Only with a moderation policy, community guidelines, and admin tooling
- Possible Matrix bridge for chat, ActivityPub for public posts
- Avoid centralized private-data hosting

---

## Moderation and governance warning

Social features create moderation obligations:

- Public posting requires abuse controls, block and report tools, admin workflows, and community guidelines
- Decentralized systems still need moderation — a federated space without governance can become toxic quickly
- Do not launch public comments, profiles, or social feeds without governance
- The current local-first, no-accounts model avoids these obligations

---

## Architecture implications for current work

The current architecture already aligns with the long-term vision:

- **Announcement IDs** should be stable and globally unique (they are — `id` is a string and versioned)
- **Announcement format** should resemble future federated objects (it does — `kind`, `priority`, `publishedAt`, `action`, `expiresAt`)
- **Dismissal and read state** remain local (stored in `localStorage`)
- **Links and actions** are validated and safe (internal paths and `https://` only)
- **Content is plain text** — never arbitrary HTML or unsanitized Markdown
- **Exports are central to trust** — Markdown export exists now; JSON with import/restore is next

The announcement system's static JSON feed can serve as the starting point for a future ActivityPub-compatible public feed. The `id`, `publishedAt`, and action schema pattern can map to ActivityPub objects with minimal transformation.

---

## Decision record

| Decision | Rationale |
|---|---|
| Holocron will remain local-first | Private data stays on device; no login or server dependency |
| Announcements start as bundled + static feed | Simplest reliable model; no server infrastructure needed |
| Web Push is future, not v0.1.0 | Requires notification permission, service worker push, and server |
| ActivityPub is future, not v0.2.0 | Requires server-side infrastructure and governance |
| Private user notes will not be synced to a central server | Core design principle; export is the user-owned backup path |
| Social features require governance before implementation | Moderation, reporting, and guidelines are prerequisites |
| Matrix chat may be linked out rather than built in | Reduces moderation burden and keeps the app focused on study |
