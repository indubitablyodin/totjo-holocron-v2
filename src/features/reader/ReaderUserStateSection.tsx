import { useEffect, useMemo, useState } from 'react';

import { appDb, type HolocronDatabase } from '@/lib/db';

import { loadReaderUserState, saveReaderBookmark, saveReaderNote, type ReaderUserState } from './readerUserState';

type ReaderUserStateSectionProps = {
  documentId: string;
  documentTitle: string;
  database?: HolocronDatabase;
  panel?: 'bookmark' | 'note';
  variant?: 'compact' | 'section';
};

type SectionState = ReaderUserState & {
  status: 'loading' | 'ready' | 'error';
  documentId: string;
};

function createDefaultBookmarkLabel(documentTitle: string) {
  return `${documentTitle}, return here`;
}

export function ReaderUserStateSection({
  documentId,
  documentTitle,
  database = appDb,
  panel,
  variant = 'section',
}: ReaderUserStateSectionProps) {
  const defaultBookmarkLabel = useMemo(() => createDefaultBookmarkLabel(documentTitle), [documentTitle]);
  const [sectionState, setSectionState] = useState<SectionState>({
    status: 'loading',
    documentId,
    bookmark: null,
    note: null,
  });
  const [bookmarkLabel, setBookmarkLabel] = useState(defaultBookmarkLabel);
  const [noteBody, setNoteBody] = useState('');
  const [bookmarkFeedback, setBookmarkFeedback] = useState<string | null>(null);
  const [noteFeedback, setNoteFeedback] = useState<string | null>(null);
  const [isSavingBookmark, setIsSavingBookmark] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void loadReaderUserState(documentId, database)
      .then((userState) => {
        if (!isMounted) {
          return;
        }

        setSectionState({
          status: 'ready',
          documentId,
          ...userState,
        });
        setBookmarkLabel(userState.bookmark?.label ?? createDefaultBookmarkLabel(documentTitle));
        setNoteBody(userState.note?.bodyMarkdown ?? '');
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setSectionState({
          status: 'error',
          documentId,
          bookmark: null,
          note: null,
        });
      });

    return () => {
      isMounted = false;
    };
  }, [database, documentId, documentTitle]);

  const resolvedSectionState =
    sectionState.documentId === documentId
      ? sectionState
      : {
          status: 'loading' as const,
          documentId,
          bookmark: null,
          note: null,
        };

  const resolvedBookmarkFeedback = resolvedSectionState.documentId === documentId ? bookmarkFeedback : null;
  const resolvedNoteFeedback = resolvedSectionState.documentId === documentId ? noteFeedback : null;

  const handleSaveBookmark = async () => {
    const normalizedLabel = bookmarkLabel.trim();

    if (!normalizedLabel || isSavingBookmark) {
      return;
    }

    setIsSavingBookmark(true);
    setBookmarkFeedback(null);

    try {
      const bookmark = await saveReaderBookmark(
        {
          documentId,
          label: normalizedLabel,
          existingBookmark: resolvedSectionState.bookmark,
        },
        database,
      );

      setSectionState({
        status: 'ready',
        documentId,
        bookmark,
        note: resolvedSectionState.note,
      });
      setBookmarkLabel(bookmark.label);
      setBookmarkFeedback('Bookmark saved for this page.');
    } catch {
      setBookmarkFeedback('Bookmark could not be saved right now.');
    } finally {
      setIsSavingBookmark(false);
    }
  };

  const handleSaveNote = async () => {
    const normalizedBody = noteBody.trim();

    if (!normalizedBody || isSavingNote) {
      return;
    }

    setIsSavingNote(true);
    setNoteFeedback(null);

    try {
      const note = await saveReaderNote(
        {
          documentId,
          bodyMarkdown: normalizedBody,
          existingNote: resolvedSectionState.note,
        },
        database,
      );

      setSectionState({
        status: 'ready',
        documentId,
        bookmark: resolvedSectionState.bookmark,
        note,
      });
      setNoteBody(note.bodyMarkdown);
      setNoteFeedback('Note saved for this page.');
    } catch {
      setNoteFeedback('Note could not be saved right now.');
    } finally {
      setIsSavingNote(false);
    }
  };

  const renderBookmarkPanel = () => (
    <div className="reader-panel-form">
      <label htmlFor="reader-bookmark-label-input">
        <span className="field-label">Bookmark label</span>
      </label>
        <p className="field-help">Bookmark this page.</p>
      <input
        className="field-input"
        data-testid="reader-bookmark-label-input"
        disabled={resolvedSectionState.status !== 'ready' || isSavingBookmark}
        id="reader-bookmark-label-input"
        onChange={(event) => {
          setBookmarkLabel(event.target.value);
        }}
        type="text"
        value={bookmarkLabel}
      />
      <div className="reader-panel-form__actions">
        <button
          className="secondary-button button-inline"
          data-testid="reader-bookmark-save"
          disabled={resolvedSectionState.status !== 'ready' || isSavingBookmark || bookmarkLabel.trim().length === 0}
          onClick={() => {
            void handleSaveBookmark();
          }}
          type="button"
        >
          {isSavingBookmark ? 'Saving bookmark…' : resolvedSectionState.bookmark ? 'Update bookmark' : 'Save bookmark'}
        </button>
      </div>
      <p className="support-copy" data-testid="reader-bookmark-status">
        {resolvedBookmarkFeedback ??
          (resolvedSectionState.bookmark
            ? `Saved bookmark: ${resolvedSectionState.bookmark.label}`
            : 'No bookmark on this page yet.')}
      </p>
      {resolvedSectionState.bookmark ? (
        <ul className="reader-list">
          <li data-testid="reader-bookmark-item">{resolvedSectionState.bookmark.label}</li>
        </ul>
      ) : null}
    </div>
  );

  const renderNotePanel = () => (
    <div className="reader-panel-form">
      <label htmlFor="reader-note-body-input">
        <span className="field-label">Reading note</span>
      </label>
      <p className="field-help">Write your note for this page.</p>
      <textarea
        className="field-input"
        data-testid="reader-note-body-input"
        disabled={resolvedSectionState.status !== 'ready' || isSavingNote}
        id="reader-note-body-input"
        onChange={(event) => {
          setNoteBody(event.target.value);
        }}
        rows={5}
        value={noteBody}
      />
      <div className="reader-panel-form__actions">
        <button
          className="secondary-button button-inline"
          data-testid="reader-note-save"
          disabled={resolvedSectionState.status !== 'ready' || isSavingNote || noteBody.trim().length === 0}
          onClick={() => {
            void handleSaveNote();
          }}
          type="button"
        >
          {isSavingNote ? 'Saving note…' : resolvedSectionState.note ? 'Update note' : 'Save note'}
        </button>
      </div>
      <p className="support-copy" data-testid="reader-note-status">
        {resolvedNoteFeedback ??
          (resolvedSectionState.note
            ? 'This page already has a saved note.'
            : 'No note on this page yet.')}
      </p>
      {resolvedSectionState.note ? (
        <ul className="reader-list">
          <li data-testid="reader-note-item">{resolvedSectionState.note.bodyMarkdown}</li>
        </ul>
      ) : null}
    </div>
  );

  if (variant === 'compact') {
    return (
      <div className="reader-user-state-panel">
        {resolvedSectionState.status === 'error' ? (
          <p className="surface-error" role="alert">
            Bookmarks and notes are unavailable right now.
          </p>
        ) : null}

        {panel === 'note' ? renderNotePanel() : renderBookmarkPanel()}
      </div>
    );
  }

  return (
    <div className="panel-toggle-block">
      <button
        aria-expanded={isExpanded}
        className="secondary-button button-inline"
        data-testid="reader-markers-toggle"
        onClick={() => {
          setIsExpanded((currentValue) => !currentValue);
        }}
        type="button"
      >
        {isExpanded ? 'Hide markers' : 'Open markers'}
      </button>

      {isExpanded ? (
        <div className="panel-toggle-body">
          {resolvedSectionState.status === 'error' ? (
          <p className="surface-error" role="alert">
            Bookmarks and notes are unavailable right now.
          </p>
          ) : null}

          <div className="settings-form">
            <div className="field-card">{renderBookmarkPanel()}</div>

            <div className="field-card">{renderNotePanel()}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
