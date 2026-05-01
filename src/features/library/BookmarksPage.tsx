import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { PageLayout, PageSection } from '@/app/pagePrimitives';
import { appDb } from '@/lib/db';

import { getLibraryDocumentHref, isLibraryDocument } from './libraryPresentation';

type BookmarkItem = {
  id: string;
  label: string;
  href: string;
  title: string;
  type: 'bookmark' | 'saved-sermon';
};

type NoteItem = {
  id: string;
  href: string;
  title: string;
  preview: string;
};

function createNotePreview(value: string) {
  const preview = value.replace(/\s+/g, ' ').trim();
  return preview.length > 180 ? `${preview.slice(0, 177)}...` : preview;
}

export function BookmarksPage() {
  const [items, setItems] = useState<BookmarkItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);

  useEffect(() => {
    let isMounted = true;

    void Promise.all([appDb.documents.toArray(), appDb.bookmarks.toArray(), appDb.downloads.toArray(), appDb.notes.toArray()]).then(([documents, bookmarks, downloads, notes]) => {
      if (!isMounted) {
        return;
      }

      const documentMap = new Map(documents.map((document) => [document.id, document]));
      const bookmarkItems = bookmarks
        .map((bookmark) => {
          const document = documentMap.get(bookmark.documentId);

          if (!document) {
            return null;
          }

          const href =
            document.authorityClass === 'sermon'
              ? `/library/sermons/${document.slug}`
              : isLibraryDocument(document)
                ? getLibraryDocumentHref(document)
                : `/library/doctrine/${document.slug}`;

          return {
            id: bookmark.id,
            label: bookmark.label,
            href,
            title: document.title,
            type: 'bookmark' as const,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      const savedSermonItems = downloads
        .filter((download) => download.status === 'ready' && download.id.startsWith('sermon-download:'))
        .map((download) => {
          const document = documentMap.get(download.documentId);

          if (!document || document.authorityClass !== 'sermon') {
            return null;
          }

          return {
            id: `saved-sermon:${document.id}`,
            label: `Saved sermon: ${document.title}`,
            href: `/library/sermons/${document.slug}`,
            title: document.title,
            type: 'saved-sermon' as const,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      const dedupedItems = new Map<string, BookmarkItem>();

      [...bookmarkItems, ...savedSermonItems].forEach((item) => {
        dedupedItems.set(item.id, item);
      });

      setItems(Array.from(dedupedItems.values()).sort((left, right) => left.title.localeCompare(right.title)));
      setNotes(
        notes
          .map((note) => {
            const document = documentMap.get(note.documentId);

            if (!document) {
              return null;
            }

            return {
              id: note.id,
              href:
                document.authorityClass === 'sermon'
                  ? `/library/sermons/${document.slug}`
                  : isLibraryDocument(document)
                    ? getLibraryDocumentHref(document)
                    : `/library/doctrine/${document.slug}`,
              title: document.title,
              preview: createNotePreview(note.bodyMarkdown),
            };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null)
          .sort((left, right) => left.title.localeCompare(right.title)),
      );
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const savedSermons = items.filter((item) => item.type === 'saved-sermon');
  const bookmarks = items.filter((item) => item.type === 'bookmark');

  return (
    <PageLayout
      description="Open your saved sermons, bookmarks, and notes."
      eyebrow="Reading library"
      title="Bookmarks"
    >
      <PageSection description="Saved sermons show up here." title="Saved sermons">
        {savedSermons.length > 0 ? (
          <div className="library-grid" role="list">
            {savedSermons.map((item) => (
              <article className="library-card library-card--sermon" key={item.id} role="listitem">
                <h3 className="library-card__title">
                  <Link className="library-card__link" to={item.href}>
                    {item.title}
                  </Link>
                </h3>
                <p className="library-card__summary">Saved on this device for offline reading.</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="support-copy">No saved sermons yet.</p>
        )}
      </PageSection>

      <PageSection description="Saved reading markers show up here." title="Bookmarks">
        {bookmarks.length > 0 ? (
          <div className="library-grid" role="list">
            {bookmarks.map((item) => (
              <article className="library-card" key={item.id} role="listitem">
                <h3 className="library-card__title">
                  <Link className="library-card__link" to={item.href}>
                    {item.title}
                  </Link>
                </h3>
                <p className="library-card__summary">{item.label}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="support-copy">No bookmarks saved yet.</p>
        )}
      </PageSection>

      <PageSection description="Saved notes show up here." title="Notes">
        {notes.length > 0 ? (
          <div className="library-grid" role="list">
            {notes.map((item) => (
              <article className="library-card" key={item.id} role="listitem">
                <h3 className="library-card__title">
                  <Link className="library-card__link" to={item.href}>
                    {item.title}
                  </Link>
                </h3>
                <p className="library-card__summary">{item.preview}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="support-copy">No notes saved yet.</p>
        )}
      </PageSection>
    </PageLayout>
  );
}
