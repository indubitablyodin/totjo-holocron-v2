export const APP_VERSION = 'v0.1.3';
export const GITHUB_REPO = 'indubitablyodin/totjo-holocron-v2';
export const GITHUB_BUG_REPORT_URL = `https://github.com/${GITHUB_REPO}/issues/new?template=bug_report.md&title=Bug%3A%20&labels=bug`;
export const GITHUB_RELEASE_URL = `https://github.com/${GITHUB_REPO}/releases/tag/v0.1.3`;

export type FeedbackContext = {
  version: string;
  route: string;
  themePreference: string | null;
  resolvedTheme: string | null;
  viewport: string;
  userAgent: string;
  displayMode: string;
};

export function getFeedbackContext(): FeedbackContext {
  const themeEl = document.documentElement;
  const isStandalone = typeof window.matchMedia === 'function'
    && window.matchMedia('(display-mode: standalone)').matches;
  return {
    version: APP_VERSION,
    route: window.location.hash || window.location.pathname,
    themePreference: themeEl.dataset.themePreference ?? null,
    resolvedTheme: themeEl.dataset.theme ?? null,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    userAgent: navigator.userAgent,
    displayMode: isStandalone ? 'standalone' : 'browser',
  };
}

function escapeTableCell(text: string): string {
  return text.replace(/\|/g, '\\|');
}

export function createGitHubBugReportUrl(context: FeedbackContext): string {
  const body = [
    '## App/browser details',
    '',
    '| Field | Value |',
    '|-------|-------|',
    `| Version | ${escapeTableCell(context.version)} |`,
    `| Route | ${escapeTableCell(context.route)} |`,
    `| Theme preference | ${escapeTableCell(context.themePreference ?? 'not set')} |`,
    `| Resolved theme | ${escapeTableCell(context.resolvedTheme ?? 'not set')} |`,
    `| Viewport | ${escapeTableCell(context.viewport)} |`,
    `| Display mode | ${escapeTableCell(context.displayMode)} |`,
    `| User agent | ${escapeTableCell(context.userAgent)} |`,
    '',
    '<!-- Please remove any details you do not want to share. -->',
    '',
    '## What happened?',
    '',
    '## What did you expect?',
    '',
    '## Where in the app?',
    '',
    '## Screenshots',
  ].join('\n');

  const params = new URLSearchParams({
    template: 'bug_report.md',
    title: 'Bug: ',
    labels: 'bug',
    body,
  });

  return `https://github.com/${GITHUB_REPO}/issues/new?${params.toString()}`;
}
