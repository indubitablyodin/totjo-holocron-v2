export type RuntimeConfig = {
  schemaVersion: number;
  announcementsFeedUrl?: string;
};

export type ResolvedFeedUrl = {
  url: string;
  source: 'runtime-config' | 'env' | 'default';
};

function isHttpsOrSameOrigin(href: string): boolean {
  if (href.startsWith('/')) {
    return true;
  }

  try {
    const url = new URL(href);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateFeedUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return false;
  }

  return isHttpsOrSameOrigin(value.trim());
}

export function validateRuntimeConfig(value: unknown): RuntimeConfig | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (record.schemaVersion !== 1) {
    return null;
  }

  const config: RuntimeConfig = { schemaVersion: 1 };

  if (typeof record.announcementsFeedUrl === 'string' && record.announcementsFeedUrl.trim().length > 0) {
    if (isHttpsOrSameOrigin(record.announcementsFeedUrl.trim())) {
      config.announcementsFeedUrl = record.announcementsFeedUrl.trim();
    }
  }

  return config;
}

export function fetchRuntimeConfig(): Promise<RuntimeConfig | null> {
  return fetch('/runtime-config.json', { cache: 'no-store' })
    .then((response) => {
      if (!response.ok) {
        return null;
      }

      return response.json().then((data) => validateRuntimeConfig(data));
    })
    .catch(() => null);
}

export function resolveAnnouncementsFeedUrl(
  runtimeConfig: RuntimeConfig | null,
): ResolvedFeedUrl {
  if (runtimeConfig?.announcementsFeedUrl) {
    return { url: runtimeConfig.announcementsFeedUrl, source: 'runtime-config' };
  }

  try {
    const envUrl = import.meta.env.VITE_ANNOUNCEMENTS_FEED_URL as string | undefined;

    if (envUrl && validateFeedUrl(envUrl)) {
      return { url: envUrl, source: 'env' };
    }
  } catch {
    // import.meta.env not available in all environments.
  }

  return { url: '/announcements.json', source: 'default' };
}
