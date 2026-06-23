# User Data Export Architecture

## Why export matters

User notes, bookmarks, practice history, and settings are user-owned.  
Export ensures that users never feel locked in or at risk of losing their personal reflections.

## Primary export format: Markdown

Markdown is chosen for:
- Readability — opens in any text editor
- Portability — can be imported into Obsidian, Notion, or similar tools
- Durability — no special software required to read it

## Secondary future export format: JSON

JSON is reserved for a future restore/import path.  
Markdown is the primary human-readable format. JSON is the canonical machine-readable format for round-trip fidelity.

## Data included

| Data | Source | Included |
|---|---|---|
| Notes | IndexedDB notes table | ✅ |
| Bookmarks | IndexedDB bookmarks table | ✅ |
| Practice/meditation history | IndexedDB practiceHistory table | ✅ |
| Timer defaults | localStorage timerPreferences | ✅ |
| Reader settings (theme, font, contrast) | localStorage readingSettings | ✅ |
| Saved sermon metadata | IndexedDB downloads table | ✅ |
| Export timestamp | Generated at export time | ✅ |
| App version | Build-time constant | ✅ |

## Data not included

| Data | Reason |
|---|---|
| Bundled doctrine/supplemental text | Public content, not user-owned |
| Remote sermon bodies | Not user-created unless explicitly saved |
| Synced sermon index | Public content, not user-owned |

## Privacy

- Export happens entirely on-device
- No network request is made
- No account is required
- No data leaves the browser

## Proposed filename

```
totjo-holocron-export-YYYY-MM-DD.md
```

## Proposed Markdown structure

```markdown
# TOTJO Holocron Export

Exported: 2026-06-23
App version: 0.1.0-rc.1

## Notes

### Note on document title

Source: Jedi Believe
Route: /library/doctrine/jedi-believe
Created: 2026-06-01
Updated: 2026-06-15

Note body markdown content preserved here.

## Bookmarks

- [Jedi Believe](/library/doctrine/jedi-believe) — My bookmark label — 2026-06-01

## Practice History

| Date | Practice | Duration | Notes |
|---|---|---|---|
| 2026-06-22 | meditation | 300 sec | Completed |

## Settings

- Timer default: 15 min
- Cue mode: start-end
- Sound profile: default-gong
- Record history: true
- Theme: dark
- Font scale: standard
- Contrast: standard
```

## Future restore/import design

- JSON export should be canonical for import
- Markdown export should be human-readable and Obsidian-friendly
- Import is not required for v0.1.0

## Implementation

The exporter lives in `src/features/settings/exportUserData.ts`.  

### Pure functions

- `collectUserDataExport(database, storage)` — reads all sources and returns a structured object
- `formatUserDataMarkdown(data)` — formats the object into Markdown
- `createExportFilename()` — returns `totjo-holocron-export-YYYY-MM-DD.md`

### Browser download

1. Generate `Blob` with type `text/markdown;charset=utf-8`
2. Create object URL via `URL.createObjectURL`
3. Trigger download via a temporary `<a>` element
4. Revoke object URL afterward
