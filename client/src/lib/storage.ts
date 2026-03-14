export const STORAGE_KEYS = {
  sidebarSize: 'thumbrack:sidebarSize',
  recentFolders: 'thumbrack:recentFolders',
  previewZoom: 'thumbrack:previewZoom',
} as const;

export function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota exceeded — ignore
  }
}
