import { useState, type FormEvent } from 'react';
import { useFolderContext } from '../contexts/FolderContext.js';
import { useToast } from '../contexts/ToastContext.js';
import { regenerateManifest } from '../utils/api.js';
import SortedPane from '../components/SortedPane.js';
import UnsortedPane from '../components/UnsortedPane.js';
import ExcludedPane from '../components/ExcludedPane.js';
import PreviewPane from '../components/PreviewPane.js';

export default function ThumbRackApp() {
  const { dir, loading, error, loadFolder, reload } = useFolderContext();
  const { addToast } = useToast();
  const [inputValue, setInputValue] = useState('');
  const [regenerating, setRegenerating] = useState(false);

  function handleLoad(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const path = inputValue.trim();
    if (!path) return;
    void loadFolder(path);
  }

  async function handleRegenerate() {
    if (!dir) return;
    setRegenerating(true);
    try {
      await regenerateManifest(dir);
      await reload();
      addToast('Manifest regenerated', 'success');
    } catch {
      addToast('Failed to regenerate manifest', 'error');
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* ── Header ── */}
      <header className="app-header">
        <span className="brand-mark">ThumbRack</span>

        <form onSubmit={handleLoad} style={{ flex: 1, display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Paste folder path…"
            aria-label="Directory path"
            className="path-input"
          />
          <button
            type="submit"
            disabled={loading}
            className="btn-load"
          >
            {loading ? 'Loading…' : 'Load'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => void handleRegenerate()}
          disabled={!dir || regenerating}
          className="btn-regen"
          aria-label="Regenerate manifest"
        >
          {regenerating ? 'Regenerating…' : 'Regenerate'}
        </button>
      </header>

      {/* ── Body ── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Sidebar */}
        <aside className="app-sidebar">
          {loading && (
            <div data-testid="loading-spinner" className="loading-state">
              <span className="spin">⟳</span>
              Loading folder…
            </div>
          )}

          {!loading && error && (
            <div data-testid="error-message" role="alert" className="sidebar-error">
              {error}
            </div>
          )}

          {!loading && !error && !dir && (
            <div data-testid="empty-state" className="sidebar-empty">
              No folder loaded
            </div>
          )}

          {!loading && dir && (
            <>
              <SortedPane />
              <UnsortedPane />
              <ExcludedPane />
            </>
          )}
        </aside>

        {/* Preview */}
        <main className="preview-pane" style={{ flex: 1 }}>
          <PreviewPane />
        </main>
      </div>
    </div>
  );
}
