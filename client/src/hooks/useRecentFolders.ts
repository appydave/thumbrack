import { useState, useCallback } from 'react';

export const RECENT_KEY = 'thumbrack:recentFolders';

export function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function saveRecent(path: string): string[] {
  const current = loadRecent().filter((p) => p !== path); // deduplicate
  const updated = [path, ...current].slice(0, 5); // max 5, most-recent first
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  return updated;
}

export interface UseRecentFoldersReturn {
  recentFolders: string[];
  addRecentFolder: (path: string) => void;
}

export function useRecentFolders(): UseRecentFoldersReturn {
  const [recentFolders, setRecentFolders] = useState<string[]>(() => loadRecent());

  const addRecentFolder = useCallback((path: string) => {
    const updated = saveRecent(path);
    setRecentFolders(updated);
  }, []);

  return { recentFolders, addRecentFolder };
}
