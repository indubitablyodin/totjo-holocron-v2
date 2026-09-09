import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { PageLayout, PageSection } from '@/app/pagePrimitives';
import { appDb } from '@/lib/db';

import type { MyDocumentRecord, MyDocumentValidationResult } from './myDocuments';
import {
  addMyDocument,
  deleteMyDocument,
  listMyDocuments,
  parseProjectFile,
  validateMyDocumentInput,
} from './myDocuments';

type FormState = {
  title: string;
  summary: string;
  author: string;
  tags: string;
  bodyMarkdown: string;
};

const INITIAL_FORM: FormState = {
  title: '',
  summary: '',
  author: '',
  tags: '',
  bodyMarkdown: '',
};

function formatError(input: MyDocumentValidationResult): string | null {
  if (input.ok) {
    return null;
  }

  return input.errors.join(' ');
}

export function MyDocumentsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<MyDocumentRecord[]>([]);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFormExpanded, setIsFormExpanded] = useState(false);

  const refresh = useCallback(async () => {
    setDocuments(await listMyDocuments(appDb));
  }, []);

  useEffect(() => {
    let isMounted = true;

    void listMyDocuments(appDb).then((nextDocuments) => {
      if (isMounted) {
        setDocuments(nextDocuments);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const isFormValid = useMemo(
    () => validateMyDocumentInput({ ...form, author: form.author || null, tags: form.tags.split(',').map((tag) => tag.trim()) }).ok,
    [form],
  );

  const handleFieldChange = useCallback((field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  }, []);

  const applyResult = useCallback(
    (result: MyDocumentValidationResult, successMessage: string) => {
      if (result.ok) {
        setErrorMessage(null);
        setStatusMessage(successMessage);
        setForm(INITIAL_FORM);
        setIsFormExpanded(false);
        void refresh();
        return;
      }

      setStatusMessage(null);
      setErrorMessage(formatError(result));
    },
    [refresh],
  );

  const handlePasteSubmit = useCallback(async () => {
    const tags = form.tags.split(',').map((tag) => tag.trim());
    const result = await addMyDocument(appDb, {
      title: form.title,
      summary: form.summary,
      author: form.author,
      tags,
      bodyMarkdown: form.bodyMarkdown,
    });
    applyResult(result, 'Document added to your library.');
  }, [applyResult, form]);

  const handleFileSelected = useCallback(
    async (file: File | undefined) => {
      if (!file) {
        return;
      }

      setErrorMessage(null);
      setStatusMessage('Reading file…');

      const result = await parseProjectFile(file);

      if (!result.ok) {
        setStatusMessage(null);
        setErrorMessage(formatError(result));
        return;
      }

      setForm({
        title: result.input.title,
        summary: result.input.summary,
        author: result.input.author ?? '',
        tags: result.input.tags.join(', '),
        bodyMarkdown: result.input.bodyMarkdown,
      });
      setIsFormExpanded(true);
      setStatusMessage('File loaded. Review the fields and add it below.');
    },
    [],
  );

  const handleDelete = useCallback(
    async (document: MyDocumentRecord) => {
      if (!window.confirm(`Delete “${document.title}”? Bookmarks and notes for it will be removed.`)) {
        return;
      }

      await deleteMyDocument(appDb, document.id);
      setStatusMessage('Document deleted.');
      void refresh();
    },
    [refresh],
  );

  return (
    <PageLayout
      description="Keep preferred or personal readings that are not part of the Order's canon."
      eyebrow="Library"
      title="My Documents"
    >
      <PageSection description="Paste text or upload a Markdown, text, or JSON file. Documents are stored on this device." title="Add a document">
        <input
          accept=".md,.markdown,.txt,.json,text/markdown,text/plain,application/json"
          className="visually-hidden"
          data-testid="my-documents-file-input"
          onChange={(event) => {
            void handleFileSelected(event.target.files?.[0]);
          }}
          ref={fileInputRef}
          type="file"
        />

        <div className="document-actions">
          <button
            className="secondary-button"
            data-testid="my-documents-import-button"
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            Import a file
          </button>

          <button
            aria-expanded={isFormExpanded}
            className="secondary-button"
            data-testid="my-documents-form-toggle"
            onClick={() => {
              setIsFormExpanded((current) => !current);
            }}
            type="button"
          >
            {isFormExpanded ? 'Cancel' : 'Write one'}
          </button>
        </div>

        {isFormExpanded ? (
          <form
            className="settings-form"
            data-testid="my-documents-form"
            onSubmit={(event) => {
              event.preventDefault();
              void handlePasteSubmit();
            }}
          >
          <label className="field-card" htmlFor="my-documents-title">
            <span className="field-label">Title</span>
            <input
              className="field-input"
              data-testid="my-documents-title"
              id="my-documents-title"
              onChange={(event) => handleFieldChange('title', event.target.value)}
              placeholder="Document title"
              type="text"
              value={form.title}
            />
          </label>

          <label className="field-card" htmlFor="my-documents-summary">
            <span className="field-label">Summary</span>
            <input
              className="field-input"
              data-testid="my-documents-summary"
              id="my-documents-summary"
              onChange={(event) => handleFieldChange('summary', event.target.value)}
              placeholder="Short description (optional)"
              type="text"
              value={form.summary}
            />
          </label>

          <label className="field-card" htmlFor="my-documents-author">
            <span className="field-label">Author</span>
            <input
              className="field-input"
              data-testid="my-documents-author"
              id="my-documents-author"
              onChange={(event) => handleFieldChange('author', event.target.value)}
              placeholder="Author (optional)"
              type="text"
              value={form.author}
            />
          </label>

          <label className="field-card" htmlFor="my-documents-tags">
            <span className="field-label">Tags</span>
            <input
              className="field-input"
              data-testid="my-documents-tags"
              id="my-documents-tags"
              onChange={(event) => handleFieldChange('tags', event.target.value)}
              placeholder="Comma-separated tags (optional)"
              type="text"
              value={form.tags}
            />
          </label>

          <label className="field-card" htmlFor="my-documents-body">
            <span className="field-label">Body</span>
            <textarea
              className="field-input"
              data-testid="my-documents-body"
              id="my-documents-body"
              onChange={(event) => handleFieldChange('bodyMarkdown', event.target.value)}
              placeholder="Paste or write your document in Markdown."
              rows={10}
              value={form.bodyMarkdown}
            />
          </label>

          <div className="document-actions">
            <button className="primary-button" data-testid="my-documents-save" disabled={!isFormValid} type="submit">
              Add to My Documents
            </button>
          </div>
        </form>
        ) : null}

        {statusMessage ? (
          <p className="support-copy" data-testid="my-documents-status" role="status">
            {statusMessage}
          </p>
        ) : null}

        {errorMessage ? (
          <p className="surface-error" data-testid="my-documents-error" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </PageSection>

      <PageSection description="Preferred and personal documents stored on this device." title="Your documents">
        {documents.length === 0 ? (
          <p className="support-copy" data-testid="my-documents-empty">
            No custom documents yet. Add one above to get started.
          </p>
        ) : (
          <ul className="history-list" data-testid="my-documents-list">
            {documents.map((document) => (
              <li className="detail-card" data-testid={`my-document-card-${document.slug}`} key={document.id}>
                <div className="guided-audio-row">
                  <div className="guided-audio-info">
                    <h3>
                      <Link to={`/library/mydocs/${document.slug}`}>{document.title}</Link>
                    </h3>
                    {document.summary ? <p className="support-copy">{document.summary}</p> : null}
                  </div>
                  <div className="guided-audio-actions">
                    <button
                      className="secondary-button button-inline"
                      data-testid={`my-document-delete-${document.slug}`}
                      onClick={() => void handleDelete(document)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PageSection>
    </PageLayout>
  );
}