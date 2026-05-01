import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { PageLayout, PageSection } from '@/app/pagePrimitives';
import { getAuthErrorMessage } from '@/features/auth/authClient';
import { useAuth } from '@/features/auth/AuthContext';
import { loadSyncPreview, useSync, type SyncPreview } from '@/features/sync';
import { LOCAL_ONLY_BOUNDARY_LABELS, USER_SYNC_BOUNDARY_LABELS } from '@/lib/supabase/syncBoundaries';

const EMPTY_SYNC_PREVIEW: SyncPreview = {
  dailyItems: [],
  bookmarks: [],
  notes: [],
};

function getSyncStatusLabel(status: ReturnType<typeof useSync>['status']): string {
  switch (status) {
    case 'syncing':
      return 'Syncing…';
    case 'synced':
      return 'Synced';
    case 'retry-needed':
      return 'Retry needed';
    default:
      return 'Local only';
  }
}

export function AccountPage() {
  const location = useLocation();
  const { lastMagicLinkUrl, mode, requestMagicLink, signOut, status, user } = useAuth();
  const { errorMessage, lastSyncedAt, retrySync, status: syncStatus } = useSync();
  const [email, setEmail] = useState('reader@example.test');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncPreview, setSyncPreview] = useState<SyncPreview>(EMPTY_SYNC_PREVIEW);

  const authErrorCode = new URLSearchParams(location.search).get('auth-error');
  const authErrorMessage = getAuthErrorMessage(authErrorCode);
  const accountStatusLabel = status === 'signed_in' ? 'Signed in' : status === 'loading' ? 'Checking account…' : 'On this device only';

  useEffect(() => {
    let isMounted = true;

    void loadSyncPreview()
      .then((preview) => {
        if (isMounted) {
          setSyncPreview(preview);
        }
      })
      .catch(() => {
        if (isMounted) {
          setSyncPreview(EMPTY_SYNC_PREVIEW);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [lastSyncedAt, status]);

  return (
    <PageLayout
      description="Sign in if you want your reading progress, notes, and settings to follow you across devices. You can keep reading without an account."
      eyebrow="Settings"
      title="Account & Sync"
    >
      <PageSection
        description="Reading, the timer, and your saved library stay available even when you keep this app on one device only."
        title="Account status"
      >
        <div className="detail-card account-status-card">
          <p className="field-label">Status</p>
          <p className="account-status-copy" data-testid="account-status">
            {accountStatusLabel}
          </p>
          <p className="support-copy">
            {status === 'signed_in' && user
              ? `Signed in as ${user.email}.`
              : 'You are using this app without an account, and everything stays on this device.'}
          </p>
          <div className="button-row">
            <Link className="secondary-button button-inline" to="/settings">
              Back to settings
            </Link>
            {status === 'signed_in' ? (
              <button
                className="secondary-button button-inline"
                data-testid="sign-out-button"
                onClick={() => {
                  void signOut();
                  setFeedbackMessage('Signed out. Your reading now stays on this device.');
                }}
                type="button"
              >
                Sign out
              </button>
            ) : null}
          </div>
          {feedbackMessage ? <p className="support-copy">{feedbackMessage}</p> : null}
          {authErrorMessage ? (
            <p className="surface-error" data-testid="auth-error" role="alert">
              {authErrorMessage}
            </p>
          ) : null}
        </div>
      </PageSection>

      <PageSection
        description="Use your email address if you want optional sign-in and sync. If a sign-in link appears here, you can finish without leaving the app."
        title="Sign in with email"
      >
        {status === 'signed_in' ? (
          <div className="detail-card">
            <h3>You’re signed in on this device</h3>
            <p>Sign out above if you want to return to device-only reading.</p>
          </div>
        ) : (
          <form
            className="settings-form"
            onSubmit={(event) => {
              event.preventDefault();
              setIsSubmitting(true);
              setFeedbackMessage(null);

              void requestMagicLink(email)
                .then((result) => {
                  setFeedbackMessage(result.message);
                })
                .catch((error: unknown) => {
                  setFeedbackMessage(error instanceof Error ? error.message : 'Unable to prepare the sign-in link right now.');
                })
                .finally(() => {
                  setIsSubmitting(false);
                });
            }}
          >
            <label className="field-card" htmlFor="email-magic-link-input">
              <span className="field-label">Email address</span>
              <span className="field-help">Enter an email address for the optional sign-in link. You can keep using the app without signing in.</span>
              <input
                className="field-input"
                data-testid="email-magic-link-input"
                id="email-magic-link-input"
                onChange={(event) => {
                  setEmail(event.target.value);
                }}
                required
                type="email"
                value={email}
              />
            </label>

            <div className="field-card field-card--toggle">
              <span className="field-label">How sign-in works</span>
              <p className="field-help">
                {mode === 'test'
                  ? 'Your sign-in link will appear here after you request it.'
                  : 'We will send a sign-in link to your email.'}
              </p>
              <button
                className="primary-button"
                data-testid="email-magic-link-submit"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? 'Preparing link…' : 'Send magic link'}
              </button>
            </div>
          </form>
        )}

        {feedbackMessage ? <p className="support-copy">{feedbackMessage}</p> : null}

        {mode === 'test' && lastMagicLinkUrl && status !== 'signed_in' ? (
          <div className="detail-card">
            <h3>Finish sign-in here</h3>
            <p>Use this one-time link to sign in and return to your account settings.</p>
            <div className="button-row">
              <a className="primary-button button-inline" data-testid="email-magic-link-test-link" href={lastMagicLinkUrl}>
                Use sign-in link
              </a>
            </div>
          </div>
        ) : null}
      </PageSection>

      <PageSection
        description="Only your personal reading state syncs. Bundled content and other shared source material stay out of your account."
        title="What syncs"
      >
        <div className="detail-grid">
          <div className="detail-card">
            <h3>Syncs with your account</h3>
            <ul className="reader-list">
              {USER_SYNC_BOUNDARY_LABELS.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          </div>

          <div className="detail-card">
            <h3>Stays out of sync</h3>
            <ul className="reader-list">
              {LOCAL_ONLY_BOUNDARY_LABELS.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          </div>
        </div>
      </PageSection>

      <PageSection
        description="This app uses Supabase to process synced account data when you choose to sign in."
        title="Sync backend"
      >
        <div className="detail-grid">
          <div className="detail-card">
            <h3>Where synced data is processed</h3>
            <p>When sync is enabled, personal reading-state data is processed through the app’s Supabase project, including the tables used for progress, bookmarks, notes, practice history, downloads, and settings.</p>
          </div>
          <div className="detail-card">
            <h3>Controller and processor roles</h3>
            <p>The app owner acts as the operator for synced personal data. Supabase acts as the hosting and database service provider for that synced data. Privacy and deletion requests may be sent to <a href="mailto:totjo@odinhalvorson.com">totjo@odinhalvorson.com</a>.</p>
          </div>
        </div>
      </PageSection>

      <PageSection
        description="Check whether sync is current and see a quick preview of the personal items attached to this device."
        title="Sync status"
      >
        <div className="detail-grid">
          <div className="detail-card">
            <h3>Current status</h3>
            <p data-testid="sync-status">{getSyncStatusLabel(syncStatus)}</p>
            {lastSyncedAt ? <p className="support-copy">Last updated {new Date(lastSyncedAt).toLocaleString()}.</p> : null}
            {errorMessage ? (
              <p className="surface-error" data-testid="sync-error" role="alert">
                {errorMessage}
              </p>
            ) : null}
            {status === 'signed_in' ? (
              <div className="button-row">
                <button
                  className="secondary-button button-inline"
                  data-testid="sync-retry"
                  onClick={() => {
                    void retrySync();
                  }}
                  type="button"
                >
                  Try again
                </button>
              </div>
            ) : null}
          </div>

          <div className="detail-card">
            <h3>Saved items preview</h3>
            <p data-testid="sync-daily-count">Days completed: {syncPreview.dailyItems.length}</p>
            <p data-testid="sync-bookmark-count">Bookmarks: {syncPreview.bookmarks.length}</p>
            <p data-testid="sync-note-count">Notes: {syncPreview.notes.length}</p>
            <ul className="reader-list" data-testid="sync-preview-list">
              {syncPreview.dailyItems.map((item) => (
                <li data-testid="sync-preview-daily-item" key={item.id}>
                  Completed day: {item.label}
                </li>
              ))}
              {syncPreview.bookmarks.map((bookmark) => (
                <li data-testid="sync-preview-bookmark" key={bookmark.id}>
                  Bookmark: {bookmark.label}
                </li>
              ))}
              {syncPreview.notes.map((note) => (
                <li data-testid="sync-preview-note" key={note.id}>
                  Note: {note.bodyMarkdown}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </PageSection>
    </PageLayout>
  );
}
