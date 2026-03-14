// TODO: Extend these interfaces for your project

export interface FolderImage {
  filename: string; // e.g. "01-ecamm-title.png"
  path: string; // absolute path on disk
  number: number | null; // parsed prefix, null if unsorted
  label: string; // filename without the NN- prefix
  encodedPath: string; // Buffer.from(path).toString('base64url')
}

export interface FolderResponse {
  dir: string;
  sorted: FolderImage[];
  unsorted: FolderImage[];
  excluded: FolderImage[];
}

export interface ManifestData {
  excluded: string[]; // filenames to exclude
  lastViewed: string | null;
  groupBoundaries?: string[]; // filenames that have a divider rendered BEFORE them
}

/** Request body for renaming a single file to a new number. */
export interface RenameRequest {
  dir: string;
  filename: string; // current filename e.g. "05-some-image.png"
  newNumber: number; // 1–99
}

/** Request body for reordering a full set of files. */
export interface ReorderRequest {
  dir: string;
  order: string[]; // full list of sorted filenames in desired new order (1-indexed from position 0)
}

/** Response returned by both rename and reorder endpoints. */
export interface RenameResponse {
  success: boolean;
  renamedFiles: Array<{ from: string; to: string }>;
}

/** Response wrapper for all API endpoints. */
export interface ApiResponse<T = unknown> {
  status: 'ok' | 'error';
  data?: T;
  error?: string;
  timestamp: string;
}

/** Response shape for the /health endpoint data payload. */
export interface HealthResponse {
  status: 'ok';
}

/** Server metadata returned by the /api/info endpoint. */
export interface ServerInfo {
  nodeVersion: string;
  environment: string;
  port: number;
  clientUrl: string;
  uptime: number;
}

/** Socket.io events emitted from server to client. */
export interface ServerToClientEvents {
  'server:pong': (data: { message: string; timestamp: string }) => void;
}

/** Socket.io events emitted from client to server. */
export interface ClientToServerEvents {
  'client:ping': () => void;
}
