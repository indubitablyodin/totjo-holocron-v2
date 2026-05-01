# Mobile-first IA and copy contract

## Status
Accepted for Task 1 of the mobile-first UX revision plan.

## Purpose
Lock the information architecture, shell wording, and control placement rules before shell implementation begins.

This contract supersedes `.sisyphus/plans/totjo-holocron-pwa.md` only for:
- shell and navigation information architecture
- settings information architecture
- reader and timer surface UX structure
- user-facing copy and labels
- responsive and mobile QA expectations tied to those surfaces

It does not change the app's functional scope, content governance, route ownership, or existing feature set.

## Locked top-level destinations
The app shell uses exactly four top-level destinations:

| Label | Primary route | Purpose |
| --- | --- | --- |
| Today | `/daily` | Open the current day’s guided practice and completion flow. |
| Read | `/library` | Browse doctrine, supplemental reading, sermons, and reader entry points. |
| Timer | `/timer` | Start and manage meditation sessions. |
| Settings | `/settings` | Manage durable defaults, account access, and app-wide preferences. |

No additional top-level destinations are allowed. `Home`, `Search`, `Admin`, `Notifications`, and `Profile` stay out of the primary navigation.

## Route mapping
The existing route map stays intact. This revision changes presentation and wording only.

| Top-level label | Route(s) covered by the label | Notes |
| --- | --- | --- |
| Today | `/daily` | `/` may still redirect here or to the current default route during implementation, but the visible destination label is locked to `Today`. |
| Read | `/library`, `/library/doctrine/:slug`, `/library/supplemental/:slug`, `/library/sermons`, `/library/sermons/:slug` | Reader and archive routes stay inside the Read destination. |
| Timer | `/timer` | Timer remains a single top-level destination. |
| Settings | `/settings`, `/settings/account` | Account remains inside Settings, not in primary navigation. |
| Utility route, no top-level label | `/auth/callback` | Routing support only. This route never appears in primary navigation. |

## Navigation adaptation rules
### Phone, under 768 px
- Use a bottom navigation bar anchored to the safe area.
- Show all four destinations at once.
- Keep labels visible at all times. Icons may support labels, but never replace them.
- Treat the active route as a single tap target with clear selected state.
- Keep install and offline status outside the bottom nav so primary destinations stay stable.

### Tablet, 768 px to 1023 px
- Keep the same four destinations and labels.
- Bottom navigation may remain the default if the layout still behaves like a touch-first canvas.
- A navigation rail is allowed only if all four labels remain visible without hover.
- Do not split destinations between a rail and overflow menu.

### Desktop, 1024 px and up
- Adapt to a left rail or sidebar if it improves scanability.
- Keep the same four labels, in the same order: Today, Read, Timer, Settings.
- Labels remain visible. No icon-only rail.
- Install and offline status may live in the header or rail support area, but they must stay secondary to route navigation.

## Control placement matrix
Durable defaults belong in Settings. Session-level and page-level actions belong on the reader or timer surface where the person needs them.

| Control or setting | Default home | Surface placement rule | Reason |
| --- | --- | --- | --- |
| Theme | Settings | Global default only | It affects the whole app and should persist across routes. |
| Type size | Settings | Global default, with optional quick reader adjustment later mirroring the same setting | It is a durable reading preference, not a one-page action. |
| Contrast | Settings | Global default, with optional quick reader adjustment later mirroring the same setting | It applies across reading surfaces and should not be buried in a one-off panel. |
| Pronoun preference | Settings | Global default only | It is a durable display preference and must never rewrite stored source text. |
| Reset reading defaults | Settings | Global settings action only | Reset is global and should not appear in the reader. |
| Default cue sound | Settings | Global default only | It seeds future timer sessions. |
| Record practice history by default | Settings | Global default only | It changes timer session behavior across the app. |
| Reset timer defaults | Settings | Global settings action only | Reset is global. |
| Account access | Settings | Settings index and account subpage only | Account remains inside Settings IA. |
| Install action | Global shell | Header or shell support area only | Install is app-wide, not route-specific. |
| Offline status | Global shell | Global banner or shell status area only | Connectivity affects the full app. |
| Reader page navigation between doctrine documents | Read surface | Reader-local navigation | It is contextual to the current reading flow. |
| Reader personalization toggle for the current page | Read surface | Reader-local control | It changes how the active page is rendered. |
| Reader view mode, such as side by side or single column | Read surface | Reader-local control | It is a page-level reading mode. |
| Bookmark, save offline, note, or quick reading actions added later | Read surface | Reader-local action row or panel | They are contextual reading actions, not durable app defaults. |
| Start, pause, resume, and reset timer session | Timer surface | Timer-local primary controls | They operate on the active session. |
| Current timer duration and interval edits | Timer surface | Timer-local controls | They shape the active session. |
| Cue playback state and last cue message | Timer surface | Timer-local status | It belongs with the active timer session. |

## Copy inventory
This inventory locks the exact replacement strings for shell labels, section titles, and primary actions affected by the IA revision.

### Shell labels and shell support copy
| Location | Current string | Locked string |
| --- | --- | --- |
| Primary nav label for `/library` | Library | Read |
| Primary nav label for `/daily` | Daily | Today |
| Primary nav label for `/timer` | Timer | Timer |
| Primary nav label for `/settings` | Settings | Settings |
| Install button in shell header | Install app | Install on this device |
| Offline banner | You are offline. The cached shell remains available for reading and settings. | You’re offline. Reading and settings still work with saved content. |
| App shell subtitle | A calm, installable reading shell for doctrine, daily practice, and meditation. | Read doctrine, keep up with today’s practice, and start a timer from one calm home. |

### Top-level route titles and section titles
| Route or surface | Current string | Locked string |
| --- | --- | --- |
| `/library` page title | Library | Read |
| `/library` eyebrow | Study library | Reading library |
| `/library` section title | Available shelves | What you can read |
| `/library` section title | Browse texts | Find a reading |
| `/library` section title | Sermon archive | Sermons |
| `/library` section title | Reading environment | Reading defaults |
| `/daily` page title | Daily | Today |
| `/daily` section title | Today’s practice | Today’s practice |
| `/daily` section title | Rollover policy | How today resets |
| `/timer` page title | Timer | Timer |
| `/timer` section title | Session controls | Start a session |
| `/timer` section title | Resilience and history | Session history |
| `/settings` page title | Settings | Settings |
| `/settings` eyebrow | App settings | Settings |
| `/settings` section title | Reading preferences | Reading & display |
| `/settings` section title | Meditation timer defaults | Timer defaults |
| `/settings` section title | Bundled audio rights | Audio & rights |
| `/settings` section title | Device readiness | App access |
| `/settings` section title | Account | Account & sync |

### Primary actions and route-entry CTAs
| Location | Current string | Locked string |
| --- | --- | --- |
| `/library` sermon archive CTA | Browse sermons | Open sermons |
| `/daily` completion CTA | Mark complete | Mark today complete |
| `/settings` account CTA | Manage account | Open account settings |
| `/settings` reading reset CTA | Reset reading settings | Reset reading defaults |
| `/settings` timer reset CTA | Reset timer defaults | Reset timer defaults |
| `/timer` start CTA | Start | Start timer |
| `/timer` pause CTA | Pause | Pause timer |
| `/timer` resume CTA | Resume | Resume timer |
| `/timer` reset CTA | Reset | Reset session |

## Legacy term mapping
Implementation-facing terms from the current shell stay out of user-facing UI copy.

| Legacy term | Use instead |
| --- | --- |
| route scaffold | destination, route, or page, depending on context |
| reading shell | app, reading space, or reading layout, depending on context |
| stable cross-route framework | app-wide settings |
| install affordance | install action |
| offline surface | offline banner or offline status |

## Guardrails for later tasks
- Do not add or expose new top-level destinations.
- Do not move account out of Settings.
- Do not bury frequent reader or timer controls inside Settings when they belong on the active surface.
- Do not replace visible labels with icon-only navigation.
- Do not reintroduce implementation-facing copy in the shell, settings, reader, or timer UX.

## Verification commands
Run these exact commands from the repository root.

```bash
grep -nE "Today|Read|Timer|Settings|Control placement matrix" docs/ux/mobile-first-ia-contract.md > .sisyphus/evidence/task-1-mobile-ia.txt
```

```bash
grep -nE "route scaffold|destination, route, or page|Library \| Read|Daily \| Today" docs/ux/mobile-first-ia-contract.md > .sisyphus/evidence/task-1-copy-inventory.txt
```
