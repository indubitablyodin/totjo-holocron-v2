# PLAN: My documents (user-preferred, non-canon documents)

## Goal

Let users import their own texts into the Holocron as a distinct, device-local
"custom" document class: visible in a dedicated "My documents" lane, readable in
the existing reader (bookmarks/notes/progress/controls/personalization), and
included in the user-data export backup. Not cloud-synced.

## Decisions

- Dedicated `authorityClass: 'custom'` + `origin: 'user'`; no DB schema migration.
- Import via file upload (`.md`, `.txt`, `.json`) and paste-text form.
- Device-local, exported in `collectUserDataExport`.
- Full reader parity via existing `LibraryDocumentPage`.

## File changes

1. `src/lib/content/types.ts` — done.
2. `src/features/myDocuments/myDocuments.ts` — done.
3. `src/features/myDocuments/MyDocumentsPage.tsx` — done.
4. `src/features/myDocuments/myDocuments.test.ts` — done (14 tests).
5. `src/features/library/libraryPresentation.ts` — done.
6. `src/app/AppRoutes.tsx` — done.
7. `src/features/library/LibraryPage.tsx` — done.
8. `src/features/library/LibrarySectionLinks.tsx` — done.
9. `src/lib/db/bootstrap.ts` — done.
10. `src/features/library/librarySearchTypes.ts` + `searchHolocron.ts` — done.
11. `src/content/contentTypes.ts` — done.
12. `src/app/AppShell.tsx` — done.
13. `src/features/settings/exportUserData.ts` — done.
14. `src/styles.css` — done.
15. `src/features/settings/SettingsPanels.tsx` — done.
16. `docs/adr/0006-custom-user-documents.md` — done.
17. `PLAN.md` — this file, all chunks complete.
18. `tests/e2e/my-documents.spec.ts` — done (8 tests); added `tests/e2e/base.ts`
    to stub the external announcements endpoint for hermetic networkidle waits.

## Validation

- `pnpm lint` — baseline 23 problems (22 errors, 1 warning), no new from feature.
- `pnpm typecheck` — clean.
- `pnpm test` — 275 passed (275).
- `pnpm build` — succeeds (51 precached entries).
- `pnpm test:e2e` — 79 passed, 5 skipped, 0 failed.