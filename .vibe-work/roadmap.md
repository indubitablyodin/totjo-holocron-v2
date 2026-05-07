# TOTJO Holocron v2 - Project Roadmap

*Offline-first study guide and practice companion for Jediism*

---

## 🎯 Priority Legend

- **P0 (Critical)** - Must have, blocks core functionality or accessibility
- **P1 (High)** - Top 10 Quick Wins - High impact, low-medium effort
- **P2 (Medium)** - Important improvements, moderate effort
- **P3 (Low)** - Nice to have, lower priority

---

## 🏆 Priority 1: Top 10 Quick Wins

These are the highest-impact, lowest-effort improvements that should be addressed first.

### Study & Content

| ID | Priority | Improvement | Description | Effort | Status |
|----|----------|-------------|-------------|--------|--------|
| SC-001 | P1 | **Search within documents** | Full-text search across all bundled doctrine, supplemental texts, and sermons with highlighting | Medium | ⬜ |
| SC-002 | P1 | **Cross-reference links** | Link related concepts across texts (e.g., "Force" in Code links to mentions in 16 Teachings) | Medium | ⬜ |
| SC-003 | P1 | **Glossary/Definition popups** | Tap on Jedi terms to see definitions from doctrine | Low | ⬜ |

### Practice & Meditation

| ID | Priority | Improvement | Description | Effort | Status |
|----|----------|-------------|-------------|--------|--------|
| PM-001 | P1 | **Meditation journal** | Track meditation sessions with notes, duration, mood tags (local storage) | Medium | ⬜ |

### Navigation & UX

| ID | Priority | Improvement | Description | Effort | Status |
|----|----------|-------------|-------------|--------|--------|
| NU-001 | P1 | **Breadcrumbs** | Show path: Library → Supplemental → Knight's Code | Low | ⬜ |
| NU-002 | P1 | **Back-to-top button** | Floating button for long scroll pages | Low | ⬜ |

### Accessibility

| ID | Priority | Improvement | Description | Effort | Status |
|----|----------|-------------|-------------|--------|--------|
| AC-001 | P1 | **Screen reader optimization** | Proper ARIA labels, semantic HTML, skip links | Medium | ⬜ |
| AC-002 | P1 | **Color contrast audit** | Ensure all text meets WCAG AA contrast ratios | Low | ⬜ |

### Performance & Technical

| ID | Priority | Improvement | Description | Effort | Status |
|----|----------|-------------|-------------|--------|--------|
| PT-001 | P1 | **Service worker caching** | Cache all bundled content for instant offline access | Medium | ⬜ |
| PT-002 | P1 | **Lazy loading** | Defer offscreen content/images | Low | ⬜ |

---

## 📱 Priority 2: Offline-First Capabilities

Ensuring the app works flawlessly without any network connection.

| ID | Priority | Improvement | Description | Effort | Status |
|----|----------|-------------|-------------|--------|--------|
| OF-001 | P2 | **Offline-first service worker** | Ensure all bundled content is cached and available immediately offline | Medium | ⬜ |
| OF-002 | P2 | **IndexedDB optimization** | Improve local storage performance for large libraries | Medium | ⬜ |
| OF-003 | P2 | **Background sync detection** | Show clear indicators when offline/online | Low | ⬜ |
| OF-004 | P2 | **Offline mode UI** | Visual indication of offline status with cached content info | Low | ⬜ |
| OF-005 | P2 | **Asset compression** | Optimize images, fonts for faster loading and less storage | Low | ⬜ |
| OF-006 | P2 | **Progressive loading** | Show text incrementally for large documents | Low | ⬜ |

---

## 📚 Study & Content Features

| ID | Priority | Improvement | Description | Effort | Status |
|----|----------|-------------|-------------|--------|--------|
| SC-004 | P2 | **Parallel reading view** | Side-by-side comparison of different formulations (e.g., "Yet" vs "There is no" Code) | Medium | ⬜ |
| SC-005 | P2 | **Reading progress tracking** | Track which texts user has read locally, with completion percentages | Medium | ⬜ |
| SC-006 | P2 | **Daily reading suggestions** | Suggest a text based on practice focus, reading history, or random | Low | ⬜ |
| SC-007 | P3 | **Text annotation** | Allow users to add personal notes to specific passages (stored locally) | Medium | ⬜ |
| SC-008 | P3 | **Highlight saving** | Save and review personal highlights (stored locally) | Medium | ⬜ |
| SC-009 | P3 | **Bookmark categories** | Organize saved content with user-defined tags | Medium | ⬜ |

---

## 🧘 Practice & Meditation Features

| ID | Priority | Improvement | Description | Effort | Status |
|----|----------|-------------|-------------|--------|--------|
| PM-002 | P2 | **Guided meditation scripts** | Structured meditation sessions with timers and prompts (bundled) | Medium | ⬜ |
| PM-003 | P2 | **Focus timer modes** | Different timer configurations (study, reflection, formal meditation) | Low | ⬜ |
| PM-004 | P2 | **Breathing exercises** | Guided breathing patterns with visual/audio cues (client-side) | Medium | ⬜ |
| PM-005 | P2 | **Mantra/affirmation library** | Collection of Jedi affirmations for practice (bundled content) | Low | ⬜ |
| PM-006 | P3 | **Posture guidance** | Visual guides for meditation postures (bundled images) | Low | ⬜ |
| PM-007 | P3 | **Session history analytics** | Insights into practice consistency, streak tracking (local) | Medium | ⬜ |
| PM-008 | P3 | **Practice reminders** | Local notifications for daily practice (browser API) | Medium | ⬜ |

---

## 🧭 Navigation & UX

| ID | Priority | Improvement | Description | Effort | Status |
|----|----------|-------------|-------------|--------|--------|
| NU-003 | P2 | **Quick navigation drawer** | Slide-out nav for fast access to all texts | Medium | ⬜ |
| NU-004 | P2 | **Swipe navigation** | Swipe left/right between adjacent texts | Medium | ⬜ |
| NU-005 | P3 | **Dark/light theme toggles per-text** | Override global theme for specific readings | Low | ⬜ |
| NU-006 | P3 | **Reading mode** | Distraction-free view with larger text, no chrome | Medium | ⬜ |
| NU-007 | P3 | **Table of contents** | Jump to sections within long documents | Medium | ⬜ |

---

## ♿ Accessibility

| ID | Priority | Improvement | Description | Effort | Status |
|----|----------|-------------|-------------|--------|--------|
| AC-003 | P2 | **Keyboard navigation** | Full keyboard support for all interactive elements | Medium | ⬜ |
| AC-004 | P2 | **High contrast mode** | Toggle for users with visual impairments | Medium | ⬜ |
| AC-005 | P3 | **Text size controls** | User-adjustable text scaling | Low | ⬜ |

---

## 🎨 Personalization

| ID | Priority | Improvement | Description | Effort | Status |
|----|----------|-------------|-------------|--------|--------|
| PS-001 | P2 | **Custom reading lists** | User-created collections of texts (local storage) | Medium | ⬜ |
| PS-002 | P2 | **Pronoun customization** | Expand beyond he/she/they | Low | ⬜ |
| PS-003 | P3 | **Theme color customization** | Custom accent colors (client-side only) | Medium | ⬜ |
| PS-004 | P3 | **Text spacing controls** | Adjust line height, letter spacing | Low | ⬜ |
| PS-005 | P3 | **Font selection** | Choose serif/sans-serif reading fonts | Low | ⬜ |

---

## 📊 Implementation Status

### Completed ✅
- None yet - this roadmap is newly created

### In Progress 🔄
- None currently

### Planned ⬜
- All items above

---

## 🎯 Current Focus

**Phase 1 (Next Sprint):** Priority 1 items (Top 10 Quick Wins)

**Phase 2 (Following Sprint):** Priority 2 offline-first capabilities + remaining P2 items

**Phase 3 (Future):** Priority 3 items

---

## 📝 Notes

- All features must work **offline-first** without any server dependency
- No social features, user accounts, or server-mediated functionality
- All data storage is local (IndexedDB, localStorage)
- All content is bundled or cached via service worker
- GitHub Pages is the only hosting requirement
