export function setAnnouncementAppBadge(count: number): void {
  try {
    if ('setAppBadge' in navigator && count > 0) {
      void navigator.setAppBadge(count);
    }
  } catch {
    // Unsupported browser — badge is progressive enhancement.
  }
}

export function clearAnnouncementAppBadge(): void {
  try {
    if ('clearAppBadge' in navigator) {
      void navigator.clearAppBadge();
    }
  } catch {
    // Unsupported browser — badge is progressive enhancement.
  }
}
