# Announcements

## How bundled announcements work

Bundled announcements live in `src/features/announcements/announcementRegistry.ts`.
They are hard-coded TypeScript objects that ship with the app.
They are always available and do not require network access.

## How remote feed works

The app can fetch announcements from a remote JSON feed.
By default, the feed URL is `/announcements.json` (same-origin).

The actual feed URL is resolved at runtime in this order:

1. `public/runtime-config.json` — if present and valid, its `announcementsFeedUrl` is used.
2. `VITE_ANNOUNCEMENTS_FEED_URL` environment variable — fallback if runtime config is absent.
3. `/announcements.json` — final fallback if neither runtime config nor env var are available.

The current runtime config points to:
```
https://syndicatedpillbug.github.io/totjo-holocron-announcements/announcements.json
```

On startup:
1. Bundled announcements are loaded immediately.
2. Cached remote announcements from previous fetches are loaded from `localStorage`.
3. `public/runtime-config.json` is fetched to resolve the feed URL.
4. All announcements are merged (remote higher version wins).
5. A background fetch for the resolved feed URL starts.
6. If the fetch succeeds and validates, the new announcements replace the cached ones.
7. If the fetch fails (offline, missing file, network error), the app continues with
   bundled + previously cached announcements. No error is shown.

## Publishing without redeploying the app

The announcement feed is hosted at a separate static URL so new announcements can be published
without rebuilding or redeploying the app.

The feed repository is at:
```
https://github.com/SyndicatedPillbug/totjo-holocron-announcements
```

### Publishing workflow

1. Clone or open the `totjo-holocron-announcements` repository.
2. Edit `announcements.json`.
3. Use a new `id` for new announcements.
4. Bump `version` to re-show a dismissed announcement.
5. Validate the feed:
   The feed repo includes its own validator:
   ```sh
   node scripts/validate.mjs
   ```
   Or use the app repo's standalone checker:
   ```sh
   node scripts/check-announcements-feed.mjs path/to/announcements.json
   ```
   From the app repo:
   ```sh
   pnpm check:announcements path/to/announcements.json
   ```
6. Commit and push the feed repository.
7. The static host serves the updated JSON.
8. Installed apps fetch the feed the next time they open.

No app rebuild or redeploy is required after the feed URL is configured in `runtime-config.json`.

### Feed repo validation workflow

The feed repo has a local validation script (`scripts/validate.mjs`) and a staged GitHub Actions workflow (`.github/workflows/validate-announcements.yml`).

The workflow file is not yet pushed to the feed repo because the current git token lacks the required `workflow` scope. To enable automated CI validation:

1. Create a [classic personal access token](https://github.com/settings/tokens) with the `workflow` scope.
2. Clone the feed repo or navigate to it:
   ```sh
   gh repo clone SyndicatedPillbug/totjo-holocron-announcements
   cd totjo-holocron-announcements
   ```
3. Restore and push the workflow file:
   ```sh
   git show 73a3aae:.github/workflows/validate-announcements.yml > .github/workflows/validate-announcements.yml
   git add .github/workflows/validate-announcements.yml
   git commit -m "ci: validate announcements feed on push"
   git remote set-url origin https://<YOUR_PAT>@github.com/SyndicatedPillbug/totjo-holocron-announcements.git
   git push origin main
   ```
4. After push, the workflow runs on every subsequent push that changes `announcements.json`.

### Operator runbook

**To publish a new announcement:**

1. Open the feed repository: `SyndicatedPillbug/totjo-holocron-announcements`
2. Edit `announcements.json`.
3. Add or update a block in the `announcements` array.
4. Validate with the main app's checker:
   ```sh
   pnpm check:announcements path/to/announcements.json
   ```
   Or download and check the remote URL:
   ```sh
   curl -sSf https://syndicatedpillbug.github.io/totjo-holocron-announcements/announcements.json -o /tmp/check.json
   pnpm check:announcements /tmp/check.json
   ```
5. Commit and push.
6. Wait for GitHub Pages to deploy (usually 1–2 minutes).
7. Open the app and verify the new announcement appears.

### Failure modes

| Condition | Behavior |
|---|---|
| Feed URL unreachable | Silent — bundled + cached announcements are used |
| Feed serves invalid JSON | Parsed/validated; invalid entries skipped; feed-level schema error drops the whole feed |
| Feed is empty array | No announcements from that source; bundled announcements still present |
| Feed has expired/stale entries | `expiresAt` hides them; `updatedAt` is informational |
| Network offline at startup | Cached remote announcements from previous fetch are used |
| Dismissed announcement version unchanged | Stays hidden |
| Dismissed announcement version bumped | Reappears |

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
