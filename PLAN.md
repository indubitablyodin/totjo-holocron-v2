# PLAN: Implement Roadmap Phase 1 - Priority 1 Quick Wins

Generated: 2025-05-07
Updated: 2025-05-07

## Task Summary

Implement Priority 1 (Top 10 Quick Wins) from `.vibe-work/roadmap.md` to enhance study, practice, navigation, accessibility, and performance.

## User Goal

- Improve content discoverability (search, cross-references, glossary)
- Enhance practice tracking (meditation journal)
- Improve navigation UX (breadcrumbs, back-to-top)
- Ensure accessibility compliance (screen reader, color contrast)
- Optimize performance (service worker, lazy loading)

## Non-Goals

- Priority 2+ items (offline-first, additional features)
- Social features or server-dependent functionality
- Complete redesign or major architecture changes
- New external dependencies

## Assumptions

- All features must work offline-first
- All data stored locally (IndexedDB, localStorage)
- No server intermediary beyond GitHub Pages hosting
- Existing test patterns will be followed
- All 76 existing unit tests must continue to pass
- New features require unit tests per AGENTS.md

## Repository Context

- React 19.2.0 + TypeScript 5.9.3 + Vite 7.1.12
- Global CSS in `src/styles.css` with CSS custom properties
- Content in `content/canon/`, `content/supplemental/`, `content/policy/`
- IndexedDB via Dexie at `src/lib/db/appDb.ts`
- Service worker at `src/sw.ts` via vite-plugin-pwa
- Testing: vitest (76 unit tests), Playwright (e2e)
- Routing: react-router-dom v7

## Relevant Files

| Category | Files/Directories |
|----------|------------------|
| **Content** | `content/canon/`, `content/supplemental/`, `content/policy/` |
| **Pages** | `src/features/library/`, `src/features/reader/`, `src/features/practice/` |
| **Components** | `src/app/AppShell.tsx`, `src/app/pagePrimitives.tsx` |
| **Data** | `src/lib/db/appDb.ts`, `src/lib/db/bootstrap.ts` |
| **Service Worker** | `src/sw.ts`, `vite.config.ts` |
| **Styles** | `src/styles.css` |
| **Tests** | `src/**/*.test.{ts,tsx}`, `tests/e2e/*.spec.ts` |

## Build/Test Commands

```bash
# Standard validation (minimum for all chunks)
pnpm lint && pnpm typecheck

# Full validation (for chunks with new features)
pnpm lint && pnpm typecheck && pnpm test

# Dev server for visual testing
pnpm dev
```

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Search performance on large content | Medium | Index content for fast search |
| Cross-reference data accuracy | Medium | Generate links from content analysis |
| Service worker cache conflicts | Low | Test caching strategy in dev |
| Accessibility regressions | Low | Test with screen reader, color contrast tools |
| Test failures | Medium | Ensure all 76 existing tests pass + new tests |

---

## Plan Chunks

### Phase 1: Navigation & UX (2 chunks)

#### Chunk 1: Breadcrumbs (NU-001)
- **Goal:** Show navigation path (e.g., Library → Supplemental → Knight's Code)
- **Files:** `src/features/reader/DoctrinePage.tsx`, `src/features/library/LibraryDocumentPage.tsx`, `src/app/pagePrimitives.tsx`
- **Changes:**
  - Create reusable `Breadcrumb` component in `src/app/`
  - Extract path segments from route matching
  - Map authority class and slug to display names
  - Style breadcrumbs consistently with existing design
- **Acceptance Criteria:**
  - [ ] Breadcrumbs appear on all doctrine, supplemental, and sermon pages
  - [ ] Breadcrumb links navigate to the respective section
  - [ ] Current page is not a link (just text)
- **Tests:** Visual inspection, existing tests pass
- **Validation:** `pnpm lint && pnpm typecheck`
- **Status:** completed
- **Depends on:** None

#### Chunk 2: Back-to-top button (NU-002)
- **Goal:** Floating button appears on long pages, scrolls to top smoothly
- **Files:** New `src/app/BackToTopButton.tsx`, `src/styles.css`, `src/app/AppShell.tsx`
- **Changes:**
  - Create `BackToTopButton` component with scroll detection
  - Show button when scrollY > viewport height
  - Click scrolls to top with `{ behavior: 'smooth', top: 0 }`
  - Style button to match existing design language
  - Add to `AppShell.tsx` in shell-layout
- **Acceptance Criteria:**
  - [x] Button appears when scrolling down
  - [x] Button disappears at top of page
  - [x] Click scrolls smoothly to top
- **Tests:** Visual inspection, all 76 existing tests pass
- **Validation:** `pnpm lint && pnpm typecheck`
- **Status:** completed
- **Depends on:** None

### Phase 2: Accessibility (2 chunks)

#### Chunk 3: Color contrast audit (AC-002)
- **Goal:** Ensure all text meets WCAG AA contrast ratios (4.5:1)
- **Files:** `src/styles.css`
- **Changes:**
  - Audit color variables: `--color-text`, `--color-text-muted`, `--color-text-soft`
  - Audit against `--color-background`, `--color-surface`, `--color-surface-soft`
  - Adjust color values in both `:root` (light) and `:root[data-theme='dark']` blocks
  - Verify in both light and dark themes
- **Acceptance Criteria:**
  - [ ] All text/background combinations meet 4.5:1 contrast
  - [ ] Dark theme colors also pass contrast check
  - [ ] No visual regression in existing UI
- **Tests:** Visual inspection with color contrast checker tool
- **Validation:** `pnpm lint && pnpm typecheck`
- **Status:** pending
- **Depends on:** None

#### Chunk 4: Screen reader optimization - Navigation (AC-001)
- **Goal:** Ensure navigation elements have proper ARIA labels
- **Files:** `src/app/AppShell.tsx`, `src/app/AppRoutes.tsx`
- **Changes:**
  - Add `aria-current="page"` to active nav links
  - Add `aria-label` to nav icons for context
  - Add `aria-expanded` to collapsible sections
  - Verify `aria-hidden` usage on decorative elements
- **Acceptance Criteria:**
  - [ ] Active navigation item announced by screen readers
  - [ ] Icon-only buttons have accessible labels
  - [ ] All interactive elements have keyboard focus indicators
- **Tests:** Screen reader testing (VoiceOver/NVDA)
- **Validation:** `pnpm lint && pnpm typecheck`
- **Status:** pending
- **Depends on:** None

#### Chunk 5: Screen reader optimization - Forms & Actions (AC-001b)
- **Goal:** Ensure form elements and action buttons have proper ARIA
- **Files:** `src/features/settings/SettingsPanels.tsx`, `src/features/library/LibraryPage.tsx`
- **Changes:**
  - Add `aria-label` or associated `<label>` to all form inputs
  - Ensure buttons have descriptive text or `aria-label`
  - Add `role` attributes where semantic HTML insufficient
- **Acceptance Criteria:**
  - [ ] All form fields have accessible labels
  - [ ] All buttons have accessible names
  - [ ] Form validation errors are announced
- **Tests:** Screen reader testing
- **Validation:** `pnpm lint && pnpm typecheck`
- **Status:** pending
- **Depends on:** Chunk 4

### Phase 3: Performance & Technical (2 chunks)

#### Chunk 6: Lazy loading (PT-002)
- **Goal:** Defer offscreen content and images for faster initial load
- **Files:** `src/features/reader/DoctrinePage.tsx`, `src/features/library/LibraryDocumentPage.tsx`
- **Changes:**
  - Add `loading="lazy"` to all `<img>` elements
  - Implement lazy rendering for long document lists using IntersectionObserver
- **Acceptance Criteria:**
  - [ ] Images have loading="lazy" attribute
  - [ ] Long lists render progressively
- **Tests:** Existing tests pass
- **Validation:** `pnpm lint && pnpm typecheck`
- **Status:** pending
- **Depends on:** None

#### Chunk 7: Service worker caching (PT-001)
- **Goal:** Verify and improve caching of all bundled content
- **Files:** `src/sw.ts`, `vite.config.ts`
- **Changes:**
  - Audit current Workbox precaching configuration
  - Ensure all content JSON files are in precache manifest
  - Verify content marking (hash, version) for cache busting
  - Test offline access to all bundled texts
- **Acceptance Criteria:**
  - [ ] All bundled content cached on first load
  - [ ] Offline access works for doctrine, supplemental, policy content
  - [ ] Cache updates on new content versions
- **Tests:** Offline mode testing in browser dev tools
- **Validation:** `pnpm build`
- **Status:** pending
- **Depends on:** None

### Phase 4: Study & Content (4 chunks)

#### Chunk 8: Glossary data (SC-003)
- **Goal:** Create glossary term definitions
- **Files:** New `src/lib/content/glossary.ts`
- **Changes:**
  - Create glossary data structure: `{ term: string, definition: string, partOfSpeech?: string }[]`
  - Include key Jedi terms: Force, Jedi, Code, Tenets, etc.
  - Export as `GLOSSARY_TERMS` constant
- **Acceptance Criteria:**
  - [ ] Glossary contains at least 20 key terms
  - [ ] Each term has definition and optional part of speech
  - [ ] Data is typed and exported
- **Tests:** New test for glossary data structure
- **Validation:** `pnpm lint && pnpm typecheck && pnpm test`
- **Status:** pending
- **Depends on:** None

#### Chunk 9: Glossary popup component (SC-003)
- **Goal:** Create popup component for term definitions
- **Files:** New `src/features/reader/GlossaryPopup.tsx`
- **Changes:**
  - Create component that wraps text with term detection
  - Replace glossary terms with clickable spans
  - Show definition in tooltip/popup on hover/focus
  - Style popup to match existing design
- **Acceptance Criteria:**
  - [ ] Glossary terms are highlighted in text
  - [ ] Hover/focus shows definition
  - [ ] Popup is keyboard accessible
- **Tests:** New tests for popup rendering and interaction
- **Validation:** `pnpm lint && pnpm typecheck && pnpm test`
- **Status:** pending
- **Depends on:** Chunk 8 (Glossary data)

#### Chunk 10: Search page UI (SC-001a)
- **Goal:** Create search page with input and results display
- **Files:** New `src/features/search/SearchPage.tsx`, `src/app/AppRoutes.tsx`
- **Changes:**
  - Create search route at `/search`
  - Add search input with debounced search
  - Display results list with title, excerpt, scope
  - Add navigation link to search in header
- **Acceptance Criteria:**
  - [ ] Search page accessible via navigation
  - [ ] Search input debounces properly
  - [ ] Results display with relevant info
- **Tests:** New tests for search page rendering
- **Validation:** `pnpm lint && pnpm typecheck && pnpm test`
- **Status:** pending
- **Depends on:** None

#### Chunk 11: Search content indexing (SC-001b)
- **Goal:** Index all bundled content for fast search
- **Files:** New `src/features/search/searchIndex.ts`, `src/lib/content/index.ts`
- **Changes:**
  - Create search index at build time or runtime
  - Index all content from `content/canon/`, `content/supplemental/`
  - Include title, summary, bodyMarkdown in index
  - Store index in memory or IndexedDB
- **Acceptance Criteria:**
  - [ ] All bundled content is indexed
  - [ ] Search returns results in <100ms
  - [ ] Index updates when content changes
- **Tests:** New tests for search indexing
- **Validation:** `pnpm lint && pnpm typecheck && pnpm test`
- **Status:** pending
- **Depends on:** Chunk 10 (Search page UI)

#### Chunk 12: Search highlighting (SC-001c)
- **Goal:** Highlight search matches in results
- **Files:** `src/features/search/SearchPage.tsx`, `src/features/search/SearchResult.tsx`
- **Changes:**
  - Highlight matching terms in result excerpts
  - Use `<mark>` tags or styled spans for highlights
  - Ensure highlights are accessible
- **Acceptance Criteria:**
  - [ ] Matching terms are visually highlighted
  - [ ] Multiple matches in same excerpt all highlighted
  - [ ] Highlights don't break screen reader pronunciation
- **Tests:** New tests for highlighting logic
- **Validation:** `pnpm lint && pnpm typecheck && pnpm test`
- **Status:** pending
- **Depends on:** Chunk 11 (Search content indexing)

#### Chunk 13: Cross-reference links (SC-002)
- **Goal:** Link related concepts across texts
- **Files:** New `src/lib/content/crossReferences.ts`, `src/features/reader/DoctrinePage.tsx`
- **Changes:**
  - Create cross-reference mapping: `{ term: string, related: { docId: string, blockId: string, excerpt: string }[] }`
  - Integrate with glossary popup or separate link rendering
  - Style cross-reference links distinctly
- **Acceptance Criteria:**
  - [ ] Related terms have visible cross-reference indicators
  - [ ] Clicking navigates to related passage
  - [ ] Cross-references are bidirectional where applicable
- **Tests:** New tests for cross-reference rendering
- **Validation:** `pnpm lint && pnpm typecheck && pnpm test`
- **Status:** pending
- **Depends on:** Chunk 9 (Glossary popup shares infrastructure)

### Phase 5: Practice & Meditation (3 chunks)

#### Chunk 14: Meditation journal schema (PM-001a)
- **Goal:** Add meditation session schema to IndexedDB
- **Files:** `src/lib/db/appDb.ts`
- **Changes:**
  - Add `meditationSessions` table to Dexie schema
  - Define type: `{ id, date, durationSeconds, moodTag, notes, createdAt, updatedAt }`
  - Add mood tag type: `'calm' | 'focused' | 'distracted' | 'restless' | 'peaceful'`
- **Acceptance Criteria:**
  - [ ] Schema added and migrated
  - [ ] Type definitions exported
  - [ ] CRUD operations available
- **Tests:** New tests for schema and CRUD operations
- **Validation:** `pnpm lint && pnpm typecheck && pnpm test`
- **Status:** pending
- **Depends on:** None

#### Chunk 15: Meditation journal UI (PM-001b)
- **Goal:** Create journal page with session list and display
- **Files:** New `src/features/practice/MeditationJournal.tsx`, `src/app/AppRoutes.tsx`
- **Changes:**
  - Create journal route at `/practice/journal`
  - Display list of meditation sessions
  - Show session details: date, duration, mood, notes
  - Sort by date descending
- **Acceptance Criteria:**
  - [ ] Journal page accessible via navigation
  - [ ] Sessions display with all fields
  - [ ] List is sorted chronologically
- **Tests:** New tests for journal page rendering
- **Validation:** `pnpm lint && pnpm typecheck && pnpm test`
- **Status:** pending
- **Depends on:** Chunk 14 (Meditation journal schema)

#### Chunk 16: Meditation session creation UI (PM-001c)
- **Goal:** Add session creation/edit UI with mood tags
- **Files:** `src/features/practice/MeditationJournal.tsx`, new `src/features/practice/MeditationSessionForm.tsx`
- **Changes:**
  - Create form for new meditation session
  - Duration input (minutes/seconds)
  - Mood tag selector (radio or select)
  - Notes textarea
  - Save button with validation
- **Acceptance Criteria:**
  - [ ] Form has all required fields
  - [ ] Duration input validates correctly
  - [ ] Mood tags are selectable
  - [ ] Sessions save to IndexedDB
  - [ ] Form clears after save
- **Tests:** New tests for form interaction and saving
- **Validation:** `pnpm lint && pnpm typecheck && pnpm test`
- **Status:** pending
- **Depends on:** Chunk 15 (Meditation journal UI)

---

## Acceptance Criteria Summary

### All Chunks
- [ ] All existing 76 tests pass
- [ ] Lint passes
- [ ] Typecheck passes
- [ ] No new warnings/errors

### New Feature Chunks (8-16)
- [ ] New tests added and passing
- [ ] Feature works as described
- [ ] No regressions in existing functionality

---

## Validation Commands

**After each chunk:**
```bash
pnpm lint && pnpm typecheck
```

**After new feature chunks (8-16):**
```bash
pnpm lint && pnpm typecheck && pnpm test
```

**After UI changes:**
```bash
pnpm dev  # Visual testing
```

---

## Execution Ledger

| Date | Chunk | Action | Result | Notes |
|------|-------|--------|--------|-------|
| 2025-05-07 | 1 | Implemented breadcrumbs component and integration | ✅ Pass | Created Breadcrumb.tsx, added to PageLayout and CompactReaderShell, integrated in DoctrinePage and LibraryDocumentPage |
| 2025-05-07 | 2 | Implemented BackToTopButton component and integration | ✅ Pass | Created BackToTopButton.tsx, added CSS styles, integrated in AppShell.tsx |

---

## Oracle Review Log

| Date | Mode | Chunk | Verdict | Notes |
|------|------|-------|---------|-------|
| 2025-05-07 | PLAN_REVIEW | All | FAIL | Chunks too large, vague scope, inconsistent validation |
| 2025-05-07 | PLAN_REVIEW | All | PASS | Fixed: split large chunks, specific file scopes, standardized validation |
| 2025-05-07 | CHUNK_REVIEW | 1 | PASS | Breadcrumb component created and integrated, all tests pass |
| 2025-05-07 | CHUNK_REVIEW | 2 | PASS | BackToTopButton component created with scroll detection, styled, integrated in AppShell |

---

## Definition of Done

- All 16 chunks implemented
- All per-chunk acceptance criteria met
- All 76 existing unit tests pass
- All new tests pass
- Lint and typecheck pass
- Full validation sequence passes
- Oracle FINAL_REVIEW passes
