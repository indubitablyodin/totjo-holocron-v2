# Reference-App Architecture Lessons

## Core Decision

- **Keep React/Vite/Dexie** — do not switch frameworks.
- **Do not fork an external app** — extract architectural patterns only.
- **PWAs with JSON content corpora, local-first storage, and a reader/study UI** are the relevant reference class.

---

## What Holocron Should Borrow From SuttaCentral

SuttaCentral separates its app shell, text corpus data, search/indexing, and the reader UI into distinct layers.

1. **Content/app/search separation** — content data lives independently from the app shell and from search indexes. This lets us update doctrine without redeploying the app.
2. **One corpus, many views** — the same document can be shown in a reader, a search result snippet, or a practice card without duplicating the data shape.
3. **Offline-first text serving** — the app should serve its bundled content from local storage, not require a network round-trip for every page load.

---

## What Holocron Should Borrow From Sefaria

Sefaria treats texts as structured study objects with explicit references, section hierarchies, and source attribution.

4. **Structured texts with sections** — each document is a list of ordered sections, not a flat blob of markdown. This lets the reader, search, and practice layers all use the same section-aware API.
5. **Text relationships** — documents can reference, quote, support, or contrast other documents. This enables study paths: "start with the Code, then read the 16 Teachings, which references the 21 Maxims."
6. **Source paths** — every piece of content traces back to an authority class and a source URL. This is critical for a religious/philosophical study app where provenance matters.

---

## What Holocron Should Borrow From Ezra Bible App

Ezra is a local-first topical study Bible app with tags, notes, and durable database-backed settings.

7. **Topical study via tags** — documents and sections can be tagged. Users can browse by topic, not just by document list.
8. **Notes attached to content** — user notes reference document IDs and section IDs, so they survive content re-imports.
9. **Database-backed settings** — user preferences (theme, font scale, timer defaults) are stored in IndexedDB, not just localStorage, so they survive cache clears.
10. **Local persistence with migrations** — the database schema has versioned migrations that protect user data during upgrades.

---

## What Holocron Should Borrow From Logseq

Logseq is a privacy-first, local-first knowledge management tool that treats user content as first-class data.

11. **User-owned study state** — bookmarks, notes, highlights, and reading progress are owned by the user and stored separately from the content corpus.
12. **Local-first** — no login required to read, bookmark, or take notes. Sync is optional, not mandatory.
13. **Searchable personal notes** — user notes are indexed alongside content so a single search finds both.

---

## What Holocron Should NOT Borrow

14. **Heavy server architecture** — no Python/Flask backend, no ArangoDB. A static PWA with Dexie is sufficient.
15. **Framework rewrites** — no migration to another framework. React + Vite + Dexie stays.
16. **Complicated desktop-native assumptions** — no Electron, no native modules, no file-system access requirements.
17. **Giant nav hierarchies** — no sidebar trees, no breadcrumb trails, no nested navigation lists.
18. **Login walls** — no account requirement for core reading and study features.
19. **Over-engineered search** — no Elasticsearch or external search service. Dexie full-text or in-memory filtering for the current corpus size.

---

## Anti-Patterns to Avoid

| Anti-pattern | Why |
|---|---|
| Giant branded shell header | Wastes vertical space; the content is the brand |
| Wheel / circular nav | Confusing, inaccessible, duplicates flat nav |
| Breadcrumb trees on detail pages | Adds clutter; active nav + page title is sufficient |
| Pyramid headings ("Library > Read > What you can read") | Redundant; one concise heading is enough |
| Cards inside cards | Increases visual complexity without adding information |
| Icon-only controls without accessible names | Fails WCAG; screen readers cannot identify the control |
| Fixed-height buttons | Clip text at larger font sizes; use min-height + padding |
| Tiny font sizes for controls (< 1rem) | Hard to read at default size, worse at zoom |
| Text squeezing in nav (`flex: 1` on many items) | Causes overlap at narrow widths; use scroll instead |
| Hiding focus outlines | Makes keyboard navigation impossible |
| Decorative gradients/pseudo-elements | Add visual noise; use structural color instead |
| Uppercase + excessive letter-spacing on labels | Reduces readability, especially at small sizes |
