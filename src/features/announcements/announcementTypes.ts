export type AnnouncementKind =
  | 'totjo'
  | 'sermon'
  | 'doctrine'
  | 'event'
  | 'app'
  | 'practice';

export type AnnouncementPriority = 'low' | 'normal' | 'high' | 'urgent';

export type AnnouncementPlacement = 'badge' | 'banner' | 'modal' | 'card';

export type AnnouncementAction = {
  label: string;
  href: string;
  external?: boolean;
};

export type Announcement = {
  id: string;
  version: number;
  kind: AnnouncementKind;
  priority: AnnouncementPriority;
  placement: AnnouncementPlacement;
  title: string;
  body: string;
  action?: AnnouncementAction;
  publishedAt: string;
  expiresAt?: string;
  startsAt?: string;
  dismissible: boolean;
};

export type DismissedRecord = {
  version: number;
  dismissedAt: string;
};

export type DismissedMap = Record<string, DismissedRecord>;

export function isAnnouncementActive(announcement: Announcement, now: Date): boolean {
  if (announcement.expiresAt && new Date(announcement.expiresAt) < now) {
    return false;
  }

  if (announcement.startsAt && new Date(announcement.startsAt) > now) {
    return false;
  }

  return true;
}

export function isAnnouncementDismissed(announcement: Announcement, dismissedMap: DismissedMap): boolean {
  const record = dismissedMap[announcement.id];

  if (!record) {
    return false;
  }

  return record.version >= announcement.version;
}

export function getVisibleAnnouncements(
  announcements: Announcement[],
  dismissedMap: DismissedMap,
  now: Date,
): Announcement[] {
  return announcements.filter(
    (a) => isAnnouncementActive(a, now) && !isAnnouncementDismissed(a, dismissedMap),
  );
}

const PRIORITY_RANK: Record<AnnouncementPriority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export function selectPrimaryAnnouncement(visible: Announcement[]): Announcement | null {
  if (visible.length === 0) {
    return null;
  }

  return [...visible].sort((left, right) => {
    const leftRank = PRIORITY_RANK[left.priority] ?? 99;
    const rightRank = PRIORITY_RANK[right.priority] ?? 99;

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return right.publishedAt.localeCompare(left.publishedAt);
  })[0];
}
