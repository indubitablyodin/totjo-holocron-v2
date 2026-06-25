# Browser Support and Progressive Enhancement

## Principle

Holocron is baseline-first and enhancement-friendly.  
The app should work as a normal web app before it works as an installed PWA.  
Advanced APIs are optional improvements, not requirements.

---

## Baseline feature tier

These must work without Chromium-only APIs:

- App shell loads and navigates
- Doctrine and supplemental reading
- Cached and saved sermon reading
- Library search
- Notes
- Bookmarks
- Meditation timer
- Timer settings
- Reader settings
- In-app announcements
- Announcement dismissal
- Remote announcement fetch
- Markdown export via Blob download
- JSON backup via Blob download
- Future JSON restore via file input

---

## Enhanced feature tier

These improve the experience where supported:

| Feature | API | Browsers |
|---|---|---|
| Install as standalone PWA | `beforeinstallprompt`, manifest | Chromium, Firefox, Safari |
| Persistent storage request | `navigator.storage.persist()` | Chromium, Firefox |
| App icon badge | `navigator.setAppBadge()` | Chromium |
| Direct save-to-file picker | `window.showSaveFilePicker()` | Chromium |
| Background sync | `SyncManager` | Chromium |
| Web Push | `PushManager` + service worker | Chromium, Firefox |
| Share target | Web Share Target API | Chromium, Safari |
| File handling | `file_handlers` manifest | Chromium |

---

## Browser-specific expectations

### Chromium (Chrome, Edge, Brave, Opera)

- Best support for advanced PWA APIs.
- Most reliable for app badging, file system picker, persistent storage, and background sync.
- Baseline app shell, timer, search, notes, export all work.
- Enhanced features are available.

### Safari / WebKit (macOS, iOS)

- Important for iOS — the only browser engine allowed on iPhone.
- Baseline app must work here.
- Storage, install behavior, and offline behavior should be manually tested.
- Do not assume app badging or File System Access.
- Blob download and file input restore are the cross-browser fallback paths.

### Firefox

- Baseline app must work.
- Installed PWA behavior varies by platform.
- Do not assume app badging or File System Access.
- Persistent storage request is available on some platforms.

---

## Data safety policy

Core backup must be browser-independent.

### Cross-browser baseline

- Markdown export via Blob download
- JSON backup via Blob download
- JSON restore via file input (`<input type="file" accept=".json">`)
- Visible backup freshness reminders

### Progressive enhancement

- Persistent storage request if `navigator.storage.persist` exists
- Direct save-to-file if `window.showSaveFilePicker` exists
- Storage estimate if `navigator.storage.estimate` exists

### Data safety cannot depend on

- File System Access API (Chromium-only)
- Background Sync API
- Web Push API
- Any other Chromium-only feature

---

## Runtime detection

Use feature detection rather than browser sniffing:

```
if (navigator.storage && navigator.storage.persist) {
  // Show "Protect data on this device" button
}

if ('setAppBadge' in navigator) {
  // Enable app icon badge
}

if ('showSaveFilePicker' in window) {
  // Offer "Save As..." file picker
}
```

If a feature is unsupported:
- Hide or disable the optional UI
- Provide a silent fallback (Blob download instead of file picker)
- Do not show alarming error messages for optional features
- In Settings or help contexts, show "Not supported by this browser" calmly

---

## UI copy rules

### Use

- "Available in this browser" for enhancements
- "Export JSON Backup" and "Export Markdown" as universal safety paths
- "Persistent storage granted" / "Persistent storage not granted"

### Avoid

- "Install required"
- "Chrome required"
- "Persistent storage guaranteed"
- "This browser is not supported"

---

## Testing matrix

Manual smoke matrix:

| Browser | OS | Routes to test |
|---|---|---|
| Chromium (desktop) | macOS / Windows / Linux | /daily, /library, /library/sermons, /timer, /settings |
| Firefox (desktop) | macOS / Windows / Linux | Same |
| Safari (desktop) | macOS | Same |
| Safari (mobile) | iOS | Same, at 320px viewport |
| Chrome (mobile) | Android | Same |
| Firefox (mobile) | Android | Same |

### Feature checks

- Storage status and protect-data button
- Export Markdown (Blob download)
- Export JSON (Blob download)
- Remote announcement fetch
- Offline app shell after caching
- Saved sermon reading
- Backup freshness hint in Settings

---

## Decision record

| Decision | Rationale |
|---|---|
| Holocron will not require Chromium | Baseline must work in Safari and Firefox |
| Chromium-only APIs are progressive enhancements | Enhanced features improve experience but are never required |
| Data safety must use browser-standard download and upload flows | Blob download and file input work in every modern browser |
| Future social and decentralized features must preserve this baseline-first model | Core reading, study, and data safety cannot depend on platform-specific APIs |
| Export is the user-owned backup path | Browser storage is useful but not permanent; export is the durable safety net |
