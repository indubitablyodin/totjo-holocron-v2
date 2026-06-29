import { describe, expect, it } from 'vitest';
import {
  APP_VERSION,
  GITHUB_BUG_REPORT_URL,
  GITHUB_RELEASE_URL,
  createGitHubBugReportUrl,
  type FeedbackContext,
} from './feedbackLinks';

const MOCK_CONTEXT: FeedbackContext = {
  version: 'v0.1.1',
  route: '#/settings',
  themePreference: 'system',
  resolvedTheme: 'light',
  viewport: '390x844',
  userAgent: 'TestAgent/1.0',
  displayMode: 'browser',
};

describe('feedbackLinks', () => {
  it('exports app version', () => {
    expect(APP_VERSION).toBe('v0.1.4');
  });

  it('exports GitHub bug report URL', () => {
    expect(GITHUB_BUG_REPORT_URL).toContain('github.com');
    expect(GITHUB_BUG_REPORT_URL).toContain('/issues/new');
    expect(GITHUB_BUG_REPORT_URL).toContain('template=bug_report.md');
    expect(GITHUB_BUG_REPORT_URL).toContain('labels=bug');
  });

  it('exports GitHub release URL', () => {
    expect(GITHUB_RELEASE_URL).toContain('github.com');
    expect(GITHUB_RELEASE_URL).toContain('releases/tag/v0.1.4');
  });

  it('createGitHubBugReportUrl starts with GitHub issues/new', () => {
    const url = createGitHubBugReportUrl(MOCK_CONTEXT);
    expect(url).toMatch(/^https:\/\/github\.com\/indubitablyodin\/totjo-holocron-v2\/issues\/new/);
  });

  it('createGitHubBugReportUrl includes template parameter', () => {
    const url = createGitHubBugReportUrl(MOCK_CONTEXT);
    expect(url).toContain('template=bug_report.md');
  });

  it('createGitHubBugReportUrl includes title parameter', () => {
    const url = createGitHubBugReportUrl(MOCK_CONTEXT);
    expect(url).toContain('title=Bug%3A+');
  });

  it('createGitHubBugReportUrl includes labels=bug', () => {
    const url = createGitHubBugReportUrl(MOCK_CONTEXT);
    expect(url).toContain('labels=bug');
  });

  it('createGitHubBugReportUrl includes app version in body', () => {
    const url = createGitHubBugReportUrl(MOCK_CONTEXT);
    expect(decodeURIComponent(url).replace(/\+/g, ' ')).toContain('v0.1.1');
  });

  it('createGitHubBugReportUrl includes route in body', () => {
    const url = createGitHubBugReportUrl(MOCK_CONTEXT);
    expect(decodeURIComponent(url).replace(/\+/g, ' ')).toContain('#/settings');
  });

  it('createGitHubBugReportUrl includes theme preference in body', () => {
    const url = createGitHubBugReportUrl(MOCK_CONTEXT);
    const decoded = decodeURIComponent(url).replace(/\+/g, ' ');
    expect(decoded).toContain('system');
    expect(decoded).toContain('light');
  });

  it('createGitHubBugReportUrl does not include forbidden private data keys', () => {
    const url = createGitHubBugReportUrl(MOCK_CONTEXT);
    const decoded = decodeURIComponent(url).replace(/\+/g, ' ');
    const forbidden = ['notes', 'bookmarks', 'practiceHistory', 'indexedDB', 'localStorage', 'backup'];
    for (const key of forbidden) {
      expect(decoded).not.toContain(key);
    }
  });
});
