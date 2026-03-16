/**
 * Google Drive integration for Alchemy Sudoku Training save sync.
 *
 * Uses GIS (Google Identity Services) implicit token flow — no backend needed.
 * Default: saves to drive.appDataFolder (invisible to user in Drive UI).
 * Optional: saves to My Drive/AlchemySudoku/ (visible, manageable by user).
 *
 * Setup: set VITE_GOOGLE_CLIENT_ID in your .env (see README for Google Cloud steps).
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type DriveMode = 'hidden' | 'visible';

export interface SaveData {
  version: 1;
  savedAt: string;
  base: ModeSave;
  expanded: ModeSave;
  seenRelease?: string;
}

export interface ModeSave {
  completed: string[];   // puzzle IDs
  lastPuzzle: string | null;
  freePlay: boolean;
}

export interface DriveUser {
  name: string;
  email: string;
  picture: string;
}

// ─── GIS global type declarations ────────────────────────────────────────────

interface TokenResponse {
  access_token: string;
  expires_in: number;
  error?: string;
}

interface TokenClient {
  requestAccessToken(overrideConfig?: { prompt?: string }): void;
}

interface TokenClientConfig {
  client_id: string;
  scope: string;
  callback: (response: TokenResponse) => void;
  error_callback?: (error: { type: string; message?: string }) => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: TokenClientConfig): TokenClient;
          revoke(token: string, callback: () => void): void;
        };
      };
    };
  }
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SAVED_USER_KEY   = 'alch-drive-user';
const DRIVE_FILES_URL  = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const USERINFO_URL     = 'https://www.googleapis.com/oauth2/v3/userinfo';
const SCOPES = [
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/drive.file',   // needed for visible folder
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');
const SAVE_FILE_NAME        = 'alchemy-sudoku-save.json';
const VISIBLE_FOLDER_NAME   = 'AlchemySudoku';
const DRIVE_MIME_FOLDER     = 'application/vnd.google-apps.folder';

// ─── Internal state ──────────────────────────────────────────────────────────

let tokenClient:      TokenClient | null = null;
let accessToken:      string | null = null;
let tokenExpiresAt:   number = 0;
let pendingResolve:   ((t: string) => void) | null = null;
let pendingReject:    ((e: Error)   => void) | null = null;
let visibleFolderId:  string | null = null;

// ─── Script loading ───────────────────────────────────────────────────────────

let gisLoaded = false;
function loadGIS(): Promise<void> {
  if (gisLoaded || window.google?.accounts?.oauth2) {
    gisLoaded = true;
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => { gisLoaded = true; resolve(); };
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function initAuth(): Promise<void> {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  if (!clientId) throw new Error('VITE_GOOGLE_CLIENT_ID is not set');

  await loadGIS();

  tokenClient = window.google!.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SCOPES,
    callback: (resp) => {
      if (resp.error || !resp.access_token) {
        const err = new Error(resp.error ?? 'Token request failed');
        pendingReject?.(err);
        pendingResolve = null;
        pendingReject  = null;
        return;
      }
      accessToken    = resp.access_token;
      tokenExpiresAt = Date.now() + (resp.expires_in - 60) * 1000;
      pendingResolve?.(accessToken);
      pendingResolve = null;
      pendingReject  = null;
    },
    error_callback: (err) => {
      pendingReject?.(new Error(err.message ?? err.type));
      pendingResolve = null;
      pendingReject  = null;
    },
  });
}

/** Opens the Google sign-in popup and returns an access token. */
export function requestToken(prompt: '' | 'consent' | 'select_account' = ''): Promise<string> {
  if (!tokenClient) return Promise.reject(new Error('Auth not initialised'));
  return new Promise((resolve, reject) => {
    pendingResolve = resolve;
    pendingReject  = reject;
    tokenClient!.requestAccessToken({ prompt });
  });
}

/** Returns a valid token, re-requesting silently if expired. */
async function getToken(): Promise<string> {
  if (accessToken && Date.now() < tokenExpiresAt) return accessToken;
  return requestToken('');
}

export function signOut(): void {
  if (accessToken) {
    window.google?.accounts.oauth2.revoke(accessToken, () => {});
  }
  accessToken      = null;
  tokenExpiresAt   = 0;
  visibleFolderId  = null;
  try { localStorage.removeItem(SAVED_USER_KEY); } catch { /* ignore */ }
}

export function saveUserToStorage(user: DriveUser): void {
  try { localStorage.setItem(SAVED_USER_KEY, JSON.stringify(user)); } catch { /* ignore */ }
}

export function loadUserFromStorage(): DriveUser | null {
  try {
    const raw = localStorage.getItem(SAVED_USER_KEY);
    return raw ? JSON.parse(raw) as DriveUser : null;
  } catch { return null; }
}

export function isSignedIn(): boolean {
  return !!accessToken && Date.now() < tokenExpiresAt;
}

// ─── User info ────────────────────────────────────────────────────────────────

export async function fetchUserInfo(): Promise<DriveUser> {
  const token = await getToken();
  const res = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Userinfo ${res.status}`);
  const data = await res.json() as { name: string; email: string; picture: string };
  return { name: data.name, email: data.email, picture: data.picture };
}

// ─── Drive helpers ────────────────────────────────────────────────────────────

async function getOrCreateVisibleFolder(): Promise<string> {
  if (visibleFolderId) return visibleFolderId;
  const token = await getToken();

  // Search for existing folder in Drive root
  const q = encodeURIComponent(`name='${VISIBLE_FOLDER_NAME}' and mimeType='${DRIVE_MIME_FOLDER}' and 'root' in parents and trashed=false`);
  const listUrl = `${DRIVE_FILES_URL}?spaces=drive&q=${q}&fields=files(id)&pageSize=1`;
  const listRes = await fetch(listUrl, { headers: { Authorization: `Bearer ${token}` } });
  if (!listRes.ok) throw new Error(`Drive folder list ${listRes.status}`);
  const listData = await listRes.json() as { files: { id: string }[] };

  if (listData.files?.[0]?.id) {
    visibleFolderId = listData.files[0].id;
    return visibleFolderId;
  }

  // Create folder
  const createRes = await fetch(DRIVE_FILES_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: VISIBLE_FOLDER_NAME, mimeType: DRIVE_MIME_FOLDER }),
  });
  if (!createRes.ok) throw new Error(`Drive folder create ${createRes.status}`);
  const created = await createRes.json() as { id: string };
  visibleFolderId = created.id;
  return visibleFolderId;
}

async function findSaveFileId(mode: DriveMode = 'hidden'): Promise<string | null> {
  const token = await getToken();
  if (mode === 'hidden') {
    const url = `${DRIVE_FILES_URL}?spaces=appDataFolder&q=name='${SAVE_FILE_NAME}'&fields=files(id,modifiedTime)&pageSize=1`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Drive list ${res.status}`);
    const data = await res.json() as { files: { id: string; modifiedTime: string }[] };
    return data.files?.[0]?.id ?? null;
  } else {
    const folderId = await getOrCreateVisibleFolder();
    const q = encodeURIComponent(`name='${SAVE_FILE_NAME}' and '${folderId}' in parents and trashed=false`);
    const url = `${DRIVE_FILES_URL}?spaces=drive&q=${q}&fields=files(id,modifiedTime)&pageSize=1`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Drive list ${res.status}`);
    const data = await res.json() as { files: { id: string; modifiedTime: string }[] };
    return data.files?.[0]?.id ?? null;
  }
}

async function downloadFile(fileId: string): Promise<SaveData> {
  const token = await getToken();
  const res = await fetch(`${DRIVE_FILES_URL}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Drive download ${res.status}`);
  return await res.json() as SaveData;
}

async function uploadFile(fileId: string | null, data: SaveData, parentId: string = 'appDataFolder'): Promise<string> {
  const token = await getToken();
  const metadata = fileId
    ? {}
    : { name: SAVE_FILE_NAME, parents: [parentId] };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file',     new Blob([JSON.stringify(data)],     { type: 'application/json' }));

  const url = fileId
    ? `${DRIVE_UPLOAD_URL}/${fileId}?uploadType=multipart`
    : `${DRIVE_UPLOAD_URL}?uploadType=multipart`;
  const method = fileId ? 'PATCH' : 'POST';

  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Drive upload ${res.status}`);
  const result = await res.json() as { id: string };
  return result.id;
}

async function deleteFile(fileId: string): Promise<void> {
  const token = await getToken();
  const res = await fetch(`${DRIVE_FILES_URL}/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  // 404 means already gone — not an error
  if (!res.ok && res.status !== 404) throw new Error(`Drive delete ${res.status}`);
}

function mergeSaveData(a: SaveData, b: SaveData): SaveData {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    base: {
      completed:  Array.from(new Set([...a.base.completed, ...b.base.completed])),
      lastPuzzle: a.base.lastPuzzle ?? b.base.lastPuzzle,
      freePlay:   a.base.freePlay || b.base.freePlay,
    },
    expanded: {
      completed:  Array.from(new Set([...a.expanded.completed, ...b.expanded.completed])),
      lastPuzzle: a.expanded.lastPuzzle ?? b.expanded.lastPuzzle,
      freePlay:   a.expanded.freePlay || b.expanded.freePlay,
    },
    seenRelease: a.seenRelease && b.seenRelease
      ? (a.seenRelease >= b.seenRelease ? a.seenRelease : b.seenRelease)
      : (a.seenRelease ?? b.seenRelease),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Load save from Drive. Returns null if no save file exists yet. */
export async function loadFromDrive(mode: DriveMode = 'hidden'): Promise<SaveData | null> {
  const fileId = await findSaveFileId(mode);
  if (!fileId) return null;
  return downloadFile(fileId);
}

/** Upload save to Drive (create or overwrite). Returns the file ID. */
export async function saveToDrive(data: SaveData, mode: DriveMode = 'hidden'): Promise<string> {
  const fileId = await findSaveFileId(mode);
  const parentId = mode === 'visible' ? await getOrCreateVisibleFolder() : 'appDataFolder';
  return uploadFile(fileId, data, parentId);
}

/**
 * Migrate save data between storage locations.
 * Reads both locations, merges, writes to new location, deletes from old.
 */
export async function migrateStorage(fromMode: DriveMode, toMode: DriveMode): Promise<void> {
  if (fromMode === toMode) return;

  const [fromSave, toSave] = await Promise.all([
    loadFromDrive(fromMode).catch(() => null),
    loadFromDrive(toMode).catch(() => null),
  ]);

  const merged = fromSave && toSave
    ? mergeSaveData(fromSave, toSave)
    : (fromSave ?? toSave ?? snapshotLocal());

  await saveToDrive(merged, toMode);

  // Delete old file — non-fatal
  try {
    const oldId = await findSaveFileId(fromMode);
    if (oldId) await deleteFile(oldId);
  } catch { /* ignore */ }
}

// ─── LocalStorage snapshot helpers ────────────────────────────────────────────
// These mirror the localStorage keys used in App.tsx and ExpandedHome.tsx

// Keys used by each game mode (ExpandedHome uses different keys than base App.tsx)
const KEYS = {
  base:     { completed: 'alch-completed-base',  lastPuzzle: 'alch-last-puzzle-base' },
  expanded: { completed: 'alch-exp-completed',   lastPuzzle: 'alch-exp-last' },
} as const;

export function snapshotLocal(): SaveData {
  function getCompleted(mode: 'base' | 'expanded'): string[] {
    try {
      const raw = localStorage.getItem(KEYS[mode].completed);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch { return []; }
  }
  function getLastPuzzle(mode: 'base' | 'expanded'): string | null {
    try { return localStorage.getItem(KEYS[mode].lastPuzzle); } catch { return null; }
  }

  return {
    version: 1,
    savedAt: new Date().toISOString(),
    base: {
      completed:  getCompleted('base'),
      lastPuzzle: getLastPuzzle('base'),
      freePlay:   false,
    },
    expanded: {
      completed:  getCompleted('expanded'),
      lastPuzzle: getLastPuzzle('expanded'),
      freePlay:   false,
    },
    seenRelease: localStorage.getItem('alch-seen-release') ?? undefined,
  };
}

/**
 * Merge cloud save INTO localStorage.
 * Strategy: completed = union (never un-complete). Others: keep local value.
 * Dispatches 'alch-cloud-sync' so React components can re-read localStorage.
 */
export function mergeIntoLocal(cloud: SaveData): void {
  function mergeCompleted(mode: 'base' | 'expanded', cloudIds: string[]) {
    try {
      const key = KEYS[mode].completed;
      const raw = localStorage.getItem(key);
      const local: string[] = raw ? JSON.parse(raw) : [];
      const merged = Array.from(new Set([...local, ...cloudIds]));
      if (merged.length !== local.length) {
        localStorage.setItem(key, JSON.stringify(merged));
      }
    } catch { /* ignore */ }
  }

  mergeCompleted('base',     cloud.base.completed);
  mergeCompleted('expanded', cloud.expanded.completed);

  // Only set lastPuzzle if local has none (first sign-in on new device)
  if (cloud.base.lastPuzzle && !localStorage.getItem(KEYS.base.lastPuzzle)) {
    localStorage.setItem(KEYS.base.lastPuzzle, cloud.base.lastPuzzle);
  }
  if (cloud.expanded.lastPuzzle && !localStorage.getItem(KEYS.expanded.lastPuzzle)) {
    localStorage.setItem(KEYS.expanded.lastPuzzle, cloud.expanded.lastPuzzle);
  }

  const cloudSeen = cloud.seenRelease;
  const localSeen = localStorage.getItem('alch-seen-release');
  if (cloudSeen && (!localSeen || cloudSeen > localSeen)) {
    localStorage.setItem('alch-seen-release', cloudSeen);
  }

  window.dispatchEvent(new CustomEvent('alch-cloud-sync'));
}
