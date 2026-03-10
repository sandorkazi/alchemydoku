import {
  createContext, useContext, useState, useCallback, useEffect, useRef,
  type ReactNode,
} from 'react';
import {
  initAuth, requestToken, signOut as driveSignOut, isSignedIn,
  fetchUserInfo, loadFromDrive, saveToDrive, snapshotLocal, mergeIntoLocal,
  type DriveUser,
} from '../services/googleDrive';

// ─── Types ───────────────────────────────────────────────────────────────────

export type AuthStatus =
  | 'idle'        // not yet attempted
  | 'loading'     // GIS loading / token request in flight
  | 'signed-in'
  | 'signed-out'
  | 'error';

export type SyncStatus =
  | 'idle'
  | 'syncing'
  | 'success'
  | 'error';

interface DriveContextValue {
  authStatus:  AuthStatus;
  syncStatus:  SyncStatus;
  user:        DriveUser | null;
  lastSynced:  Date | null;
  errorMsg:    string | null;

  signIn():    Promise<void>;
  signOut():   void;
  syncNow():   Promise<void>;
  /** Call after a puzzle is completed to auto-upload. */
  onPuzzleComplete(): void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const DriveContext = createContext<DriveContextValue | null>(null);

export function useDrive(): DriveContextValue {
  const ctx = useContext(DriveContext);
  if (!ctx) throw new Error('useDrive must be used inside <DriveProvider>');
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function DriveProvider({ children }: { children: ReactNode }) {
  const [authStatus,  setAuthStatus]  = useState<AuthStatus>('idle');
  const [syncStatus,  setSyncStatus]  = useState<SyncStatus>('idle');
  const [user,        setUser]        = useState<DriveUser | null>(null);
  const [lastSynced,  setLastSynced]  = useState<Date | null>(null);
  const [errorMsg,    setErrorMsg]    = useState<string | null>(null);

  // Debounce auto-sync (don't spam on rapid completions)
  const syncTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Init GIS on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
    if (!clientId) {
      // No client ID configured — Drive sync silently unavailable
      setAuthStatus('signed-out');
      return;
    }
    initAuth().catch(() => {
      // GIS failed to load (e.g. ad blocker) — degrade gracefully
      setAuthStatus('signed-out');
    });
    setAuthStatus('signed-out');
  }, []);

  // ── Sign in ────────────────────────────────────────────────────────────────
  const signIn = useCallback(async () => {
    setAuthStatus('loading');
    setErrorMsg(null);
    try {
      await requestToken('select_account');

      // Fetch user profile
      const profile = await fetchUserInfo();
      setUser(profile);
      setAuthStatus('signed-in');

      // Download cloud save and merge into localStorage
      setSyncStatus('syncing');
      try {
        const cloud = await loadFromDrive();
        if (cloud) mergeIntoLocal(cloud);
        // Upload a fresh snapshot (so cloud is up-to-date with any new local data)
        await saveToDrive(snapshotLocal());
        setLastSynced(new Date());
        setSyncStatus('success');
      } catch (err) {
        // Sync failure shouldn't block the sign-in success
        console.warn('[Drive] Sync on sign-in failed:', err);
        setSyncStatus('error');
        setErrorMsg('Signed in, but sync failed. Your local progress is safe.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign-in failed';
      // "popup_closed_by_user" is not an error — just cancelled
      if (!msg.includes('popup_closed') && !msg.includes('access_denied')) {
        setErrorMsg(msg);
        setAuthStatus('error');
      } else {
        setAuthStatus('signed-out');
      }
    }
  }, []);

  // ── Sign out ───────────────────────────────────────────────────────────────
  const signOut = useCallback(() => {
    driveSignOut();
    setAuthStatus('signed-out');
    setSyncStatus('idle');
    setUser(null);
    setLastSynced(null);
    setErrorMsg(null);
  }, []);

  // ── Sync ──────────────────────────────────────────────────────────────────
  const syncNow = useCallback(async () => {
    if (!isSignedIn()) return;
    setSyncStatus('syncing');
    setErrorMsg(null);
    try {
      await saveToDrive(snapshotLocal());
      setLastSynced(new Date());
      setSyncStatus('success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      setErrorMsg(msg);
      setSyncStatus('error');
    }
  }, []);

  // ── Auto-sync on puzzle complete ──────────────────────────────────────────
  const onPuzzleComplete = useCallback(() => {
    if (!isSignedIn()) return;
    if (syncTimeout.current) clearTimeout(syncTimeout.current);
    syncTimeout.current = setTimeout(() => {
      syncNow().catch(() => {});
    }, 800); // small delay so localStorage is written first
  }, [syncNow]);

  const value: DriveContextValue = {
    authStatus, syncStatus, user, lastSynced, errorMsg,
    signIn, signOut, syncNow, onPuzzleComplete,
  };

  return (
    <DriveContext.Provider value={value}>
      {children}
    </DriveContext.Provider>
  );
}
