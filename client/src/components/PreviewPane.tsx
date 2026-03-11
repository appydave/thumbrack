import { useState } from 'react';
import type { FolderImage } from '@appystack/shared';
import { useFolderContext } from '../contexts/FolderContext.js';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5021';

type ZoomMode = 'fit' | 'fill' | 'actual';

const STORAGE_KEY = 'thumbrack:previewZoom';

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function imageUrl(encodedPath: string): string {
  return `${BASE}/api/images/${encodedPath}`;
}

function EmptyState() {
  return (
    <div data-testid="preview-empty" className="preview-empty">
      <span className="preview-empty-label">Select an image to preview</span>
    </div>
  );
}

interface ZoomToolbarProps {
  mode: ZoomMode;
  onChange: (mode: ZoomMode) => void;
}

function ZoomToolbar({ mode, onChange }: ZoomToolbarProps) {
  const modes: ZoomMode[] = ['fit', 'fill', 'actual'];
  const labels: Record<ZoomMode, string> = { fit: 'Fit', fill: 'Fill', actual: 'Actual' };

  return (
    <div data-testid="zoom-toolbar" className="preview-zoom-toolbar">
      {modes.map((m) => (
        <button
          key={m}
          data-testid={`zoom-btn-${m}`}
          aria-pressed={mode === m}
          onClick={() => onChange(m)}
          className={`preview-zoom-btn${mode === m ? ' preview-zoom-btn--active' : ''}`}
        >
          {labels[m]}
        </button>
      ))}
    </div>
  );
}

interface ImageDisplayProps {
  image: FolderImage;
  zoomMode: ZoomMode;
}

function ImageDisplay({ image, zoomMode }: ImageDisplayProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        data-testid="preview-error"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '200px',
          background: 'var(--surface-2)',
          borderRadius: 8,
          color: 'var(--text-3)',
          fontStyle: 'italic',
          fontFamily: 'var(--font-display)',
          fontSize: 14,
        }}
      >
        Image could not be loaded
      </div>
    );
  }

  const imgStyle: React.CSSProperties =
    zoomMode === 'fit'
      ? { objectFit: 'contain', width: '100%', height: '100%' }
      : zoomMode === 'fill'
        ? { objectFit: 'cover', width: '100%', height: '100%' }
        : { maxWidth: 'none', maxHeight: 'none', width: 'auto', height: 'auto' };

  return (
    <img
      src={imageUrl(image.encodedPath)}
      alt={image.filename}
      data-zoom={zoomMode}
      style={imgStyle}
      onError={() => setHasError(true)}
    />
  );
}

export function PreviewPane() {
  const { selected } = useFolderContext();
  const [zoomMode, setZoomMode] = useState<ZoomMode>(() =>
    readStorage<ZoomMode>(STORAGE_KEY, 'fit'),
  );

  function handleZoomChange(mode: ZoomMode) {
    setZoomMode(mode);
    writeStorage(STORAGE_KEY, mode);
  }

  const isActual = zoomMode === 'actual';

  return (
    <div
      data-testid="preview-pane"
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: selected === null ? 'center' : 'flex-start',
        padding: selected === null ? '24px' : '20px 24px 24px',
      }}
    >
      {selected === null ? (
        <EmptyState />
      ) : (
        <>
          <ZoomToolbar mode={zoomMode} onChange={handleZoomChange} />
          <div
            data-testid="preview-image-wrap"
            className="preview-image-wrap"
            style={{
              flex: 1,
              minHeight: 0,
              width: '100%',
              overflow: isActual ? 'auto' : 'hidden',
            }}
          >
            <ImageDisplay image={selected} zoomMode={zoomMode} />
          </div>
          <div className="preview-meta">
            <span
              data-testid="preview-filename"
              className="preview-filename"
            >
              {selected.filename}
            </span>
            <span
              data-testid="preview-filepath"
              className="preview-filepath"
            >
              {selected.path}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export default PreviewPane;
