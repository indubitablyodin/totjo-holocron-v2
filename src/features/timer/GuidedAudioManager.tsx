import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { PageLayout, PageSection } from '@/app/pagePrimitives';
import {
  deleteAudioFile,
  formatDuration,
  formatFileSize,
  getAudioFilesTotalSize,
  getStorageEstimate,
  listAudioFiles,
  renameAudioFile,
  requestPersistentStorage,
  uploadAudioFile,
} from '@/features/timer/audioFileManager';
import { loadTimerPreferences, saveTimerPreferences } from '@/features/timer/timerPreferences';
import type { AudioFileRecord } from '@/lib/content';

type UploadStatus = {
  state: 'idle' | 'uploading' | 'success' | 'error';
  message: string;
};

function AudioPreview({ file }: { file: AudioFileRecord }) {
  const objectUrl = useMemo(() => {
    if (!(file.blob instanceof Blob)) {
      return null;
    }

    return URL.createObjectURL(file.blob);
  }, [file.blob]);

  useEffect(() => {
    if (!objectUrl) {
      return;
    }

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  if (!objectUrl) {
    return null;
  }

  return <audio className="guided-audio-player" controls preload="none" src={objectUrl} />;
}

export function GuidedAudioManager() {
  const [audioFiles, setAudioFiles] = useState<AudioFileRecord[]>([]);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({ state: 'idle', message: '' });
  const [storageInfo, setStorageInfo] = useState<string | null>(null);
  const [persistent, setPersistent] = useState<boolean | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refresh = useCallback(async () => {
    const files = await listAudioFiles();
    setAudioFiles(files);

    const [totalSize, estimate] = await Promise.all([getAudioFilesTotalSize(), getStorageEstimate()]);

    if (estimate && estimate.quota > 0) {
      const used = estimate.used ?? totalSize;
      const percent = estimate.quota > 0 ? Math.round((used / estimate.quota) * 100) : 0;
      setStorageInfo(`${formatFileSize(used)} of ${formatFileSize(estimate.quota)} used (${percent}%)`);
    } else {
      setStorageInfo(null);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    void listAudioFiles().then((files) => {
      if (isMounted) {
        setAudioFiles(files);
      }
    });

    void Promise.all([getAudioFilesTotalSize(), getStorageEstimate()]).then(([totalSize, estimate]) => {
      if (!isMounted) return;

      if (estimate && estimate.quota > 0) {
        const used = estimate.used ?? totalSize;
        const percent = estimate.quota > 0 ? Math.round((used / estimate.quota) * 100) : 0;
        setStorageInfo(`${formatFileSize(used)} of ${formatFileSize(estimate.quota)} used (${percent}%)`);
      } else {
        setStorageInfo(null);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleFileSelected = async (file: File | undefined) => {
    if (!file) return;

    setUploadStatus({ state: 'uploading', message: 'Starting upload…' });

    try {
      const result = await uploadAudioFile({
        file,
        onProgress: (message) => {
          setUploadStatus((currentStatus) =>
            currentStatus.state === 'uploading' ? { state: 'uploading', message } : currentStatus,
          );
        },
      });

      void requestPersistentStorage().then(setPersistent);

      const compressionNote =
        result.compressed && result.storedSize < result.originalSize
          ? `Compressed ${formatFileSize(result.originalSize)} to ${formatFileSize(result.storedSize)} (${Math.round(
              (1 - result.storedSize / result.originalSize) * 100,
            )}% smaller).`
          : '';

      setUploadStatus({
        state: 'success',
        message: `Added "${result.record.name}". ${compressionNote}`.trim(),
      });
      await refresh();

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed.';
      setUploadStatus({ state: 'error', message });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) {
      return;
    }

    await deleteAudioFile(id);

    const preferences = loadTimerPreferences();

    if (preferences.defaultGuidedAudioFileId === id) {
      saveTimerPreferences({ ...preferences, defaultGuidedAudioFileId: null });
    }

    await refresh();
    setUploadStatus({ state: 'idle', message: '' });
  };

  const handleRename = async (id: string) => {
    const trimmed = editingName.trim();
    if (trimmed.length === 0) return;

    await renameAudioFile(id, trimmed);
    await refresh();
    setEditingId(null);
    setEditingName('');
  };

  return (
    <PageLayout
      description="Upload audio guides for guided meditation sessions."
      eyebrow="Meditation"
      title="Guided Audio"
    >
      <PageSection description="Add audio files to use with guided meditation sessions." title="Upload an audio file">
        <input
          accept="audio/*,.mp3,.wav,.flac,.aiff,.ogg,.m4a"
          className="visually-hidden"
          data-testid="guided-audio-upload-input"
          onChange={(event) => {
            void handleFileSelected(event.target.files?.[0]);
          }}
          ref={fileInputRef}
          type="file"
        />

        <button
          className="primary-button"
          data-testid="guided-audio-upload-button"
          disabled={uploadStatus.state === 'uploading'}
          onClick={() => fileInputRef.current?.click()}
          type="button"
        >
          {uploadStatus.state === 'uploading' ? 'Processing…' : 'Upload audio file'}
        </button>

        <p className="support-copy">WAV files are automatically compressed to MP3 to save space. Other audio formats are stored as-is.</p>

        {uploadStatus.state !== 'idle' ? (
          <p
            className={uploadStatus.state === 'error' ? 'support-copy support-copy--error' : 'support-copy'}
            data-testid="guided-audio-upload-status"
            role="status"
          >
            {uploadStatus.message}
          </p>
        ) : null}

        {storageInfo ? (
          <p className="support-copy" data-testid="guided-audio-storage">
            Storage: {storageInfo}
            {persistent === true ? ' · Persistent (protected from browser cleanup)' : ''}
          </p>
        ) : null}
      </PageSection>

      <PageSection
        description="Audio files stored on this device for guided meditation."
        title="Your audio files"
      >
        {audioFiles.length === 0 ? (
          <p className="support-copy" data-testid="guided-audio-empty">
            No audio files yet. Upload one above to get started.
          </p>
        ) : (
          <ul className="history-list" data-testid="guided-audio-list">
            {audioFiles.map((file) => (
              <li className="detail-card" key={file.id}>
                <div className="guided-audio-row">
                  <div className="guided-audio-info">
                    {editingId === file.id ? (
                      <div className="guided-audio-edit">
                        <input
                          autoFocus
                          className="field-input"
                          onChange={(event) => setEditingName(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              void handleRename(file.id);
                            }
                            if (event.key === 'Escape') {
                              setEditingId(null);
                            }
                          }}
                          value={editingName}
                        />
                        <div className="guided-audio-actions">
                          <button className="secondary-button button-inline" onClick={() => void handleRename(file.id)} type="button">
                            Save
                          </button>
                          <button
                            className="secondary-button button-inline"
                            onClick={() => setEditingId(null)}
                            type="button"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h3>{file.name}</h3>
                        <p className="support-copy">
                          {formatDuration(file.durationSeconds)} · {formatFileSize(file.sizeBytes)}
                        </p>
                        <AudioPreview file={file} />
                      </>
                    )}
                  </div>

                  <div className="guided-audio-actions">
                    <button
                      className="secondary-button button-inline"
                      disabled={editingId === file.id}
                      onClick={() => {
                        setEditingId(file.id);
                        setEditingName(file.name);
                      }}
                      type="button"
                    >
                      Rename
                    </button>
                    <button
                      className="secondary-button button-inline"
                      data-testid={`guided-audio-delete-${file.name}`}
                      onClick={() => void handleDelete(file.id, file.name)}
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

export default GuidedAudioManager;
