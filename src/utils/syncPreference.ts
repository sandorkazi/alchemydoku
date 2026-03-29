/**
 * User's sync preference — persisted in localStorage.
 * 'google' → auto-connect Google Drive on page load.
 * 'local'  → browser cache only (no auto-connect).
 * null     → not yet chosen (show the setup banner).
 */

export type SyncPref = 'google' | 'local';

const SYNC_PREF_KEY = 'alch-sync-pref';

export function loadSyncPref(): SyncPref | null {
  try {
    const v = localStorage.getItem(SYNC_PREF_KEY);
    if (v === 'google' || v === 'local') return v;
    return null;
  } catch { return null; }
}

export function saveSyncPref(p: SyncPref): void {
  try { localStorage.setItem(SYNC_PREF_KEY, p); } catch { /* ignore */ }
}

/** Returns true if there is any existing puzzle progress in this browser. */
export function hasLocalProgress(): boolean {
  try {
    const base = localStorage.getItem('alch-completed-base');
    if (base && (JSON.parse(base) as string[]).length > 0) return true;
    const exp = localStorage.getItem('alch-exp-completed');
    if (exp && (JSON.parse(exp) as string[]).length > 0) return true;
    return false;
  } catch { return false; }
}
