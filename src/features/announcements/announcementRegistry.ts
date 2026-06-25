import type { Announcement } from './announcementTypes';

export const BUNDLED_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'welcome-totjo-holocron',
    version: 1,
    kind: 'app',
    priority: 'normal',
    placement: 'banner',
    title: 'Welcome to TOTJO Holocron',
    body: 'A local-first study and practice companion. Meditate, read, search, and reflect. Everything stays on this device.',
    action: { label: 'Start meditating', href: '/daily' },
    publishedAt: '2026-06-22T00:00:00.000Z',
    dismissible: true,
  },
  {
    id: 'sermons-available',
    version: 1,
    kind: 'sermon',
    priority: 'low',
    placement: 'badge',
    title: 'New sermons available',
    body: 'Fresh TOTJO sermons are ready to read. Sync from the Sermons tab.',
    action: { label: 'Open sermons', href: '/library/sermons' },
    publishedAt: '2026-06-22T00:00:00.000Z',
    dismissible: true,
  },
];
