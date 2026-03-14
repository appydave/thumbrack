import { useState } from 'react';
import type { FolderImage } from '@appystack/shared';
import { useFolderContext } from '../contexts/FolderContext.js';
import { imageUrl } from '../utils/api.js';

function EmptyState() {
  return (
    <div data-testid="preview-empty" className="preview-empty">
      <span className="preview-empty-label">Select an image to preview</span>
    </div>
  );
}

interface ImageDisplayProps {
  image: FolderImage;
}

function ImageDisplay({ image }: ImageDisplayProps) {
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

  return (
    <img
      src={imageUrl(image.encodedPath)}
      alt={image.filename}
      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
      onError={() => setHasError(true)}
    />
  );
}

export function PreviewPane() {
  const { selected } = useFolderContext();

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
          <div className="preview-image-wrap" style={{ flex: 1, minHeight: 0, width: '100%' }}>
            <ImageDisplay image={selected} />
          </div>
          <div className="preview-meta">
            <span data-testid="preview-filename" className="preview-filename">
              {selected.filename}
            </span>
            <span data-testid="preview-filepath" className="preview-filepath">
              {selected.path}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export default PreviewPane;
