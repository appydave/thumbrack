import { useState, useRef, useCallback, useEffect, type FormEvent } from 'react';
import { useFolderContext } from '../contexts/FolderContext.js';
import { useToast } from '../contexts/ToastContext.js';
import { regenerateManifest } from '../utils/api.js';
import { useRecentFolders } from '../hooks/useRecentFolders.js';
import { useClickOutside } from '../hooks/useClickOutside.js';
import { KebabMenu } from '../components/KebabMenu.js';
import SortedPane from '../components/SortedPane.js';
import UnsortedPane from '../components/UnsortedPane.js';
import ExcludedPane from '../components/ExcludedPane.js';
import PreviewPane from '../components/PreviewPane.js';

// ---------------------------------------------------------------------------
// Size preset types and constants
// ---------------------------------------------------------------------------

export type SidebarSize = 'S' | 'M' | 'L';

const SIDEBAR_WIDTHS: Record<SidebarSize, string> = {
  S: '180px',
  M: '288px',
  L: '420px',
};

const STORAGE_KEY = 'thumbrack:sidebarSize';
const LAST_DIR_KEY = 'thumbrack:lastDir';

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
  } catch (_e) {
    // ignore storage write errors
  }
}

export default function ThumbRackApp() {
  const { dir, loading, error, loadFolder, reload } = useFolderContext();
  const { addToast } = useToast();
  const [inputValue, setInputValue] = useState('~/Downloads');
  const [regenerating, setRegenerating] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sidebarSize, setSidebarSize] = useState<SidebarSize>(() =>
    readStorage<SidebarSize>(STORAGE_KEY, 'L')
  );

  const { recentFolders, addRecentFolder } = useRecentFolders();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const didRestoreRef = useRef(false);

  const closeDropdown = useCallback(() => setDropdownOpen(false), []);
  useClickOutside(dropdownRef, closeDropdown);

  function handleSizeChange(size: SidebarSize) {
    setSidebarSize(size);
    writeStorage(STORAGE_KEY, size);
  }

  async function handleLoadPath(path: string) {
    const trimmed = path.trim();
    if (!trimmed) return;
    setInputValue(trimmed);
    await loadFolder(trimmed);
    addRecentFolder(trimmed);
    writeStorage(LAST_DIR_KEY, trimmed);
  }

  // Restore last folder on mount (once only)
  useEffect(() => {
    if (didRestoreRef.current) return;
    didRestoreRef.current = true;
    const savedDir = readStorage<string | null>(LAST_DIR_KEY, null);
    if (savedDir) {
      void handleLoadPath(savedDir);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleLoad(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void handleLoadPath(inputValue);
  }

  function handleRecentSelect(path: string) {
    setDropdownOpen(false);
    void handleLoadPath(path);
  }

  function handleDropdownKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      setDropdownOpen(false);
    }
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

  const kebabItems = [
    {
      label: 'Regenerate Manifest',
      description: 'Rebuilds .thumbrack.json from scratch',
      onClick: () => {
        if (!dir || regenerating) return;
        void handleRegenerate();
      },
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <header className="app-header">
        <span className="brand-mark">ThumbRack</span>

        <form onSubmit={handleLoad} style={{ flex: 1, display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative', flex: 1, display: 'flex' }}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Paste folder path…"
              aria-label="Directory path"
              className="path-input"
              style={{ flex: 1 }}
            />
            <div
              ref={dropdownRef}
              style={{ position: 'relative' }}
              onKeyDown={handleDropdownKeyDown}
            >
              <button
                type="button"
                onClick={() => setDropdownOpen((prev) => !prev)}
                aria-label="Show recent folders"
                aria-expanded={dropdownOpen}
                className="btn-recent-toggle"
                style={{ height: '100%', padding: '0 8px' }}
              >
                ▼
              </button>
              {dropdownOpen && recentFolders.length > 0 && (
                <ul
                  role="listbox"
                  aria-label="Recent folders"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    zIndex: 100,
                    minWidth: '280px',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border-2)',
                    borderRadius: '6px',
                    listStyle: 'none',
                    margin: 0,
                    padding: '4px 0',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  }}
                >
                  {recentFolders.map((folder) => (
                    <li key={folder} role="option" aria-selected={false}>
                      <button
                        type="button"
                        onClick={() => handleRecentSelect(folder)}
                        style={{
                          display: 'block',
                          width: '100%',
                          textAlign: 'left',
                          padding: '6px 12px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '12px',
                          color: 'var(--text-2)',
                          fontFamily: 'var(--font-mono)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {folder}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-load">
            {loading ? 'Loading…' : 'Load'}
          </button>
        </form>

        <KebabMenu items={kebabItems} />
      </header>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Sidebar */}
        <aside
          className="app-sidebar"
          data-sidebar-size={sidebarSize}
          style={{ width: SIDEBAR_WIDTHS[sidebarSize] }}
        >
          {/* Size toggle */}
          <div className="sidebar-size-controls" aria-label="Sidebar size">
            {(['S', 'M', 'L'] as SidebarSize[]).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => handleSizeChange(size)}
                className={`sidebar-size-btn${sidebarSize === size ? ' active' : ''}`}
                aria-pressed={sidebarSize === size}
                aria-label={`Size ${size}`}
              >
                {size}
              </button>
            ))}
          </div>

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
