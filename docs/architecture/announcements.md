# Announcements

## How bundled announcements work

Bundled announcements live in `src/features/announcements/announcementRegistry.ts`.
They are hard-coded TypeScript objects that ship with the app.
They are always available and do not require network access.

## How remote feed works

The app can fetch announcements from a remote JSON feed.
By default, the feed URL is `/announcements.json` (same-origin).
You can override this with the `VITE_ANNOUNCEMENTS_FEED_URL` environment variable.

On startup:
1. Bundled announcements are loaded immediately.
2. Cached remote announcements from previous fetches are loaded from `localStorage`.
3. All announcements are merged (remote higher version wins).
4. A background fetch for `/announcements.json` starts.
5. If the fetch succeeds and validates, the new announcements replace the cached ones.
6. If the fetch fails (offline, missing file, network error), the app continues with
   bundled + previously cached announcements. No error is shown.

## How to publish a new announcement

Create or edit `public/announcements.json` in the repo root.

```json
{
  "schemaVersion": 1,
  "updatedAt": "2026-06-24T00:00:00.000Z",
  "announcements": [
    {
      "id": "my-unique-announcement-id",
      "version": 1,
      "kind": "totjo",
      "priority": "normal",
      "placement": "badge",
      "title": "Short title",
      "body": "Plain text body. No HTML.",
      "action": {
        "label": "Open",
        "href": "/library/sermons"
      },
      "publishedAt": "2026-06-24T00:00:00.000Z",
      "expiresAt": "2026-07-24T00:00:00.000Z",
      "dismissible": true
    }
  ]
}
```

## Fields

| Field | Required | Type | Description |
|---|---|---|---|
| `id` | yes | string | Unique identifier. |
| `version` | yes | integer ≥1 | Bump to re-show a dismissed announcement. |
| `kind` | yes | enum | `totjo`, `sermon`, `doctrine`, `event`, `app`, `practice` |
| `priority` | yes | enum | `low`, `normal`, `high`, `urgent` |
| `placement` | yes | enum | `badge`, `banner`, `modal`, `card` |
| `title` | yes | string | Plain text title. |
| `body` | yes | string | Plain text body. |
| `action.label` | no | string | Button label. |
| `action.href` | no | string | Internal path (`/library/sermons`) or `https://` URL. |
| `action.external` | no | boolean | Opens in new tab when true. |
| `publishedAt` | yes | ISO 8601 | When the announcement becomes relevant. |
| `expiresAt` | no | ISO 8601 | Hide after this date. |
| `startsAt` | no | ISO 8601 | Show only after this date. |
| `dismissible` | no | boolean | Default `true`. `false` means user cannot dismiss. |

## Authoring workflow

1. Edit `public/announcements.json`.
2. Use a new `id` for new announcements.
3. Bump `version` to re-show a previously dismissed announcement.
4. Keep `body` as plain text — no HTML.
5. Use internal paths (starting with `/`) or `https://` URLs for action links.
6. Run validation:
   ```sh
   pnpm check:announcements
   ```
7. Commit and deploy.
8. Installed apps fetch the feed the next time they open.

## Validation

```sh
pnpm check:announcements
```

This reads `public/announcements.json` and validates every entry against the same rules
the app parser uses. It reports accepted and rejected entries with reasons for each rejection.

The script exits with code 0 for a valid feed and code 1 for a fatal schema error.

## Priority guidance

| Priority | When to use | UI behavior |
|---|---|---|
| `low` | Passive notices, tips | Badge only, no auto-show |
| `normal` | New content, app updates | Badge only, no auto-show |
| `high` | Important TOTJO updates | Auto-shows as modal on next app open |
| `urgent` | Rare critical notices | Auto-shows as modal |

## Placement guidance

| Placement | When to use |
|---|---|
| `badge` | Standard undismissed announcement indicator |
| `banner` | Non-modal banner at top of main content |
| `modal` | Dialog that requires attention (not recommended for casual use) |
| `card` | Dashboard card for positive content recommendation |

## Safe link rules

- Internal paths starting with `/` are allowed.
- `https://` URLs are allowed and rendered with `rel="noopener noreferrer"`.
- `http://`, `javascript:`, `data:`, `blob:`, and other schemes are rejected.
- The feed parser rejects entries with unsafe action hrefs silently.

## Version bump rule

If a user dismisses an announcement, it stays hidden until the `version` field increases.
Bump the version number when the content changes materially.
A version bump re-shows the announcement even to users who previously dismissed it.

## Offline behavior

- Bundled announcements are always available offline.
- Successfully fetched remote announcements are cached in `localStorage`.
- If the device is offline at startup, the app uses bundled + cached remote announcements.
- If the device comes online while the app is open, no automatic refetch occurs.
  Refetch happens on next full app open or page reload.

## Why this is not Web Push yet

Web Push requires:
- Notification permission
- A service worker push event handler
- A server-side push infrastructure
- Platform-specific UX requirements

The current announcement system works offline, requires no permissions,
and does not need a server. It is the foundation on which push notifications
can be added later if desired.

## Future path to Badging API and Web Push

1. ✅ In-app announcement feed (current)
2. ⬜ App badge using Badging API (current — implemented)
3. ⬜ Service worker push event → wake app → check feed → show notification
4. ⬜ Optional OS notification permission request
5. ⬜ Notification click → open announcement href in app
