# 0006. Custom user documents

## Status
Accepted

## Context
Readers may have preferred personal or third-party texts that are not part of the Order's canon. The Holocron needs a way to store and read these locally without mixing them into doctrine or supplemental content governance.

## Decision
- A new `DocumentAuthorityClass` value `custom` represents user-imported documents stored on the device.
- `ContentOrigin` gains a `user` origin for these records. They live in the existing `documents` Dexie table alongside bundled and synced content but are never re-seeded by content bootstrap.
- Custom documents are device-local and included in the user-data export for backup and migration. They are not part of cloud sync or `UserSyncProfile`.
- Custom documents support the full reader surface (bookmarks, notes, progress, font/theme controls, personalization overlay) because all of that state keys off `documentId`.
- Personalization of custom documents is display-only and must not be persisted as source text, consistent with ADR 0005.
- Governance rules in `content/policy/content-authority.json` apply to canon and published source text. User-imported custom documents are outside that governance scope.
- New content classes require this ADR and a corresponding update to the presentation and search plumbing.

## Consequences
- Users can keep preferred readings in one device-local library without forking canon content authority.
- A clear badge ("My Doc"), distinct theme color, and dedicated "My documents" lane prevent confusion with canon or supplemental text.
- Migration relies on the data export. Cloud sync remains decoupled from user-generated content.
