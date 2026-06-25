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

## JSON Backup format

JSON backup is available from Settings > User Data > Export JSON Backup.  
The file uses schemaVersion 1 and includes notes, bookmarks, practice history, downloads, timer preferences, reader settings, dismissed announcements, and cached remote announcement metadata.

Filename: `totjo-holocron-backup-YYYY-MM-DD.json`

See `src/features/settings/backupUserData.ts` for the full type definition.

## JSON Restore Design

Restore is not yet implemented. This section documents the design for future implementation.

### Principles

- Restore is user-initiated only. No automatic restore.
- Restore begins with a browser file picker or drag-and-drop.
- The app validates `schemaVersion` before reading records.
- The app shows a preview before applying changes.
- Default mode is **merge**, not replace.
- Existing notes are never overwritten without confirmation.
- Destructive "replace all" mode is not included in the first version.

### Preview screen

The restore preview should show:

- Notes to add
- Notes to update (matched by id or documentId + body)
- Bookmarks to add
- Practice records to add
- Settings to import
- Records skipped (duplicates, invalid, or unsupported schema)
- "Export a safety backup before restoring" prompt

### Merge rules

- Duplicate detection uses stable record ids where available.
- For notes without matching id, fallback comparison uses `documentId` + `bodyMarkdown` + timestamps.
- Newer `updatedAt` wins when content conflicts.
- Bookmarks are linked by `documentId`; if the referenced document is no longer in the local database, the bookmark is imported as a reference-only entry.
- Practice history records are appended; existing records are never modified.
- Settings (timer defaults, reader settings) are imported as new defaults; the previous settings are saved to a backup key before overwriting.

### Safety

- Restore exports a safety backup before applying changes.
- Restore must never import remote code, arbitrary HTML, or executable content.
- Future schema versions are rejected unless explicitly supported.
- An import report is generated after restore showing what was added, updated, skipped.

### File picker

- Uses `<input type="file" accept=".json">`.
- Only JSON files with `schemaVersion: 1` are accepted.
- If `window.showOpenFilePicker` is available, it may be used as a progressive enhancement.

## Backup freshness

The app tracks the last successful export or backup in localStorage.

- After a Markdown export or JSON backup succeeds, the current timestamp and format are saved.
- Settings > User Data shows a hint based on how recent the backup is:
  - "No backup recorded on this device yet."
  - "Last backup: June 24, 2026. Keep exporting periodically."
  - "Last backup: May 1, 2026. Consider exporting a fresh backup."
- No popup or modal is shown. The hint only appears in Settings.
- The status is updated after each successful export or backup.

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
