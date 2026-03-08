const BASE_URL = import.meta.env.VITE_API_URL ?? '';

// ThumbRack-specific base (uses VITE_API_URL or falls back to localhost:5021)
const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5021';

/** Error thrown when an API request receives a non-2xx HTTP response. */
class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options?: RequestInit & { signal?: AbortSignal }
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, options);
  if (!res.ok) {
    throw new ApiError(res.status, `Request failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Typed HTTP request helpers for the AppyStack template.
 * All methods throw ApiError on non-2xx responses.
 */
export const api = {
  /** Send a GET request and return the parsed JSON response. */
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal }),
  /** Send a POST request with a JSON body and return the parsed JSON response. */
  post: <T>(path: string, body: unknown, signal?: AbortSignal) =>
    request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
      signal,
    }),
};

export { ApiError };

// ---------------------------------------------------------------------------
// ThumbRack API helpers
// ---------------------------------------------------------------------------

import type {
  FolderResponse,
  RenameRequest,
  RenameResponse,
  ReorderRequest,
  ManifestData,
} from '@appystack/shared';

// Server wraps all responses in { status: 'ok', data: T, timestamp }
interface ApiEnvelope<T> {
  status: string;
  data: T;
  timestamp: string;
}

async function thumbRequest<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = (await res.json()) as { error?: string; message?: string };
      if (body.error) message = body.error;
      else if (body.message) message = body.message;
    } catch {
      // ignore parse errors — use status text
    }
    throw new ApiError(res.status, message);
  }
  const envelope = (await res.json()) as ApiEnvelope<T>;
  return envelope.data;
}

/** Fetch all images in a folder, split into sorted / unsorted / excluded buckets. */
export async function fetchFolder(path: string): Promise<FolderResponse> {
  return thumbRequest<FolderResponse>(`${BASE}/api/folder?path=${encodeURIComponent(path)}`);
}

/** Rename a single image to a new numeric prefix. */
export async function renameImage(req: RenameRequest): Promise<RenameResponse> {
  return thumbRequest<RenameResponse>(`${BASE}/api/rename`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
}

/** Reorder the full sorted set of images. */
export async function reorderImages(req: ReorderRequest): Promise<RenameResponse> {
  return thumbRequest<RenameResponse>(`${BASE}/api/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
}

/** Fetch the manifest for a folder. */
export async function fetchManifest(dir: string): Promise<ManifestData> {
  return thumbRequest<ManifestData>(`${BASE}/api/manifest?dir=${encodeURIComponent(dir)}`);
}

/** Save the manifest for a folder. */
export async function saveManifest(dir: string, data: ManifestData): Promise<void> {
  await thumbRequest<unknown>(`${BASE}/api/manifest?dir=${encodeURIComponent(dir)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

/** Regenerate the manifest for a folder. */
export async function regenerateManifest(
  dir: string
): Promise<{ success: boolean; manifest: ManifestData }> {
  return thumbRequest<{ success: boolean; manifest: ManifestData }>(
    `${BASE}/api/manifest/regenerate?dir=${encodeURIComponent(dir)}`,
    { method: 'POST' }
  );
}

/** Build the full URL for an image given its base64url-encoded path. */
export function imageUrl(encodedPath: string): string {
  return `${BASE}/api/images/${encodedPath}`;
}
