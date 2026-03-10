/**
 * Google Drive integration for Alchemydoku save sync.
 *
 * Uses GIS (Google Identity Services) implicit token flow — no backend needed.
 * Saves to drive.appDataFolder so the file is invisible to the user in Drive UI.
 *
 * Setup: set VITE_GOOGLE_CLIENT_ID in your .env (see README for Google Cloud steps).
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SaveData {
  version: 1;
  savedAt: string;
  base: ModeSave;
  expanded: ModeSave;
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

const DRIVE_FILES_URL  = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const USERINFO_URL     = 'https://www.googleapis.com/oauth2/v3/userinfo';
const SCOPES = [
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');
const SAVE_FILE_NAME = 'alchemydoku-save.json';

// ─── Internal state ──────────────────────────────────────────────────────────

let tokenClient: TokenClient | null = null;
let accessToken: string | null = null;
let tokenExpiresAt: number = 0;
let pendingResolve: ((t: string) => void) | null = null;
let pendingReject:  ((e: Error)   => void) | null = null;

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
  accessToken    = null;
  tokenExpiresAt = 0;
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

async function findSaveFileId(): Promise<string | null> {
  const token = await getToken();
  const url = `${DRIVE_FILES_URL}?spaces=appDataFolder&q=name='${SAVE_FILE_NAME}'&fields=files(id,modifiedTime)&pageSize=1`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Drive list ${res.status}`);
  const data = await res.json() as { files: { id: string; modifiedTime: string }[] };
  return data.files?.[0]?.id ?? null;
}

async function downloadFile(fileId: string): Promise<SaveData> {
  const token = await getToken();
  const res = await fetch(`${DRIVE_FILES_URL}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Drive download ${res.status}`);
  return await res.json() as SaveData;
}

async function uploadFile(fileId: string | null, data: SaveData): Promise<string> {
  const token = await getToken();
  const metadata = fileId
    ? {}
    : { name: SAVE_FILE_NAME, parents: ['appDataFolder'] };

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

// ─── Public API ───────────────────────────────────────────────────────────────

/** Load save from Drive. Returns null if no save file exists yet. */
export async function loadFromDrive(): Promise<SaveData | null> {
  const fileId = await findSaveFileId();
  if (!fileId) return null;
  return downloadFile(fileId);
}

/** Upload save to Drive (create or overwrite). Returns the file ID. */
export async function saveToDrive(data: SaveData): Promise<string> {
  const fileId = await findSaveFileId();
  return uploadFile(fileId, data);
}

// ─── LocalStorage snapshot helpers ────────────────────────────────────────────
// These mirror the localStorage keys used in App.tsx and ExpandedHome.tsx

export function snapshotLocal(): SaveData {
  function getCompleted(mode: 'base' | 'expanded'): string[] {
    try {
      const raw = localStorage.getItem(`alch-completed-${mode}`);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch { return []; }
  }
  function getLastPuzzle(mode: 'base' | 'expanded'): string | null {
    try { return localStorage.getItem(`alch-last-puzzle-${mode}`); } catch { return null; }
  }
  function getFreePlay(mode: 'base' | 'expanded'): boolean {
    try { return localStorage.getItem(`alch-freeplay-${mode}`) === '1'; } catch { return false; }
  }

  return {
    version: 1,
    savedAt: new Date().toISOString(),
    base: {
      completed:  getCompleted('base'),
      lastPuzzle: getLastPuzzle('base'),
      freePlay:   getFreePlay('base'),
    },
    expanded: {
      completed:  getCompleted('expanded'),
      lastPuzzle: getLastPuzzle('expanded'),
      freePlay:   getFreePlay('expanded'),
    },
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
      const raw = localStorage.getItem(`alch-completed-${mode}`);
      const local: string[] = raw ? JSON.parse(raw) : [];
      const merged = Array.from(new Set([...local, ...cloudIds]));
      if (merged.length !== local.length) {
        localStorage.setItem(`alch-completed-${mode}`, JSON.stringify(merged));
      }
    } catch { /* ignore */ }
  }

  mergeCompleted('base',     cloud.base.completed);
  mergeCompleted('expanded', cloud.expanded.completed);

  // Only set lastPuzzle if local has none (first sign-in on new device)
  if (cloud.base.lastPuzzle && !localStorage.getItem('alch-last-puzzle-base')) {
    localStorage.setItem('alch-last-puzzle-base', cloud.base.lastPuzzle);
  }
  if (cloud.expanded.lastPuzzle && !localStorage.getItem('alch-last-puzzle-expanded')) {
    localStorage.setItem('alch-last-puzzle-expanded', cloud.expanded.lastPuzzle);
  }

  window.dispatchEvent(new CustomEvent('alch-cloud-sync'));
}
