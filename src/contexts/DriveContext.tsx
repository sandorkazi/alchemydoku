import {
  createContext, useContext, useState, useCallback, useEffect, useRef,
  type ReactNode,
} from 'react';
import {
  initAuth, requestToken, signOut as driveSignOut, isSignedIn,
  fetchUserInfo, loadFromDrive, saveToDrive, snapshotLocal, mergeIntoLocal,
  migrateStorage, saveUserToStorage, loadUserFromStorage,
  type DriveUser, type DriveMode,
} from '../services/googleDrive';

// ─── Drive mode localStorage ──────────────────────────────────────────────────

const DRIVE_MODE_KEY = 'alch-drive-mode';
function loadDriveMode(): DriveMode {
  return localStorage.getItem(DRIVE_MODE_KEY) === 'visible' ? 'visible' : 'hidden';
}
function saveDriveMode(m: DriveMode) {
  localStorage.setItem(DRIVE_MODE_KEY, m);
}

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
  /** Previously-authenticated user loaded from localStorage — shown in the reconnect UI. */
  savedUser:   DriveUser | null;
  lastSynced:  Date | null;
  errorMsg:    string | null;
  driveMode:   DriveMode;
  isMigrating: boolean;

  signIn():                       Promise<void>;
  signOut():                      void;
  syncNow():                      Promise<void>;
  setDriveMode(m: DriveMode):     Promise<void>;
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
  const [savedUser,   setSavedUser]   = useState<DriveUser | null>(() => loadUserFromStorage());
  const [lastSynced,  setLastSynced]  = useState<Date | null>(null);
  const [errorMsg,    setErrorMsg]    = useState<string | null>(null);
  const [driveMode,   setDriveModeState] = useState<DriveMode>(loadDriveMode);
  const [isMigrating, setIsMigrating] = useState(false);

  // Debounce auto-sync (don't spam on rapid completions)
  const syncTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Init GIS on mount — attempt silent session restore ────────────────────
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
    if (!clientId) {
      setAuthStatus('signed-out');
      return;
    }

    const savedUser = loadUserFromStorage();
    if (savedUser) setAuthStatus('loading');

    initAuth().then(async () => {
      if (!savedUser) { setAuthStatus('signed-out'); return; }
      // Attempt silent token restore — prompt:'' never shows a popup
      try {
        await requestToken('');
        const profile = await fetchUserInfo();
        setUser(profile);
        setSavedUser(profile);
        saveUserToStorage(profile);
        setAuthStatus('signed-in');
        setSyncStatus('syncing');
        try {
          const cloud = await loadFromDrive(driveMode);
          if (cloud) mergeIntoLocal(cloud);
          await saveToDrive(snapshotLocal(), driveMode);
          setLastSynced(new Date());
          setSyncStatus('success');
        } catch {
          setSyncStatus('error');
        }
      } catch {
        // Silent restore failed (session expired or revoked) — sign out quietly
        setAuthStatus('signed-out');
      }
    }).catch(() => {
      setAuthStatus('signed-out');
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sign in ────────────────────────────────────────────────────────────────
  const signIn = useCallback(async () => {
    setAuthStatus('loading');
    setErrorMsg(null);
    try {
      await requestToken('select_account');

      // Fetch user profile
      const profile = await fetchUserInfo();
      setUser(profile);
      setSavedUser(profile);
      saveUserToStorage(profile);
      setAuthStatus('signed-in');

      // Download cloud save and merge into localStorage
      setSyncStatus('syncing');
      try {
        const cloud = await loadFromDrive(driveMode);
        if (cloud) mergeIntoLocal(cloud);
        // Upload a fresh snapshot (so cloud is up-to-date with any new local data)
        await saveToDrive(snapshotLocal(), driveMode);
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
  }, [driveMode]);

  // ── Sign out ───────────────────────────────────────────────────────────────
  const signOut = useCallback(() => {
    driveSignOut();
    setAuthStatus('signed-out');
    setSyncStatus('idle');
    setUser(null);
    setSavedUser(null);
    setLastSynced(null);
    setErrorMsg(null);
  }, []);

  // ── Sync ──────────────────────────────────────────────────────────────────
  const syncNow = useCallback(async () => {
    if (!isSignedIn()) return;
    setSyncStatus('syncing');
    setErrorMsg(null);
    try {
      // Always download first so we never overwrite Drive with a subset of its data.
      // This is safe even for rapid calls: mergeIntoLocal is idempotent (union only grows).
      const cloud = await loadFromDrive(driveMode);
      if (cloud) mergeIntoLocal(cloud);
      await saveToDrive(snapshotLocal(), driveMode);
      setLastSynced(new Date());
      setSyncStatus('success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      setErrorMsg(msg);
      setSyncStatus('error');
    }
  }, [driveMode]);

  // ── Auto-sync on puzzle complete ──────────────────────────────────────────
  const onPuzzleComplete = useCallback(() => {
    if (!isSignedIn()) return;
    if (syncTimeout.current) clearTimeout(syncTimeout.current);
    syncTimeout.current = setTimeout(() => {
      syncNow().catch(() => {});
    }, 800); // small delay so localStorage is written first
  }, [syncNow]);

  // ── Set drive mode (with migration) ──────────────────────────────────────
  const setDriveMode = useCallback(async (newMode: DriveMode) => {
    if (newMode === driveMode) return;
    setIsMigrating(true);
    setErrorMsg(null);
    try {
      if (isSignedIn()) await migrateStorage(driveMode, newMode);
      saveDriveMode(newMode);
      setDriveModeState(newMode);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Migration failed');
    } finally {
      setIsMigrating(false);
    }
  }, [driveMode]);

  const value: DriveContextValue = {
    authStatus, syncStatus, user, savedUser, lastSynced, errorMsg, driveMode, isMigrating,
    signIn, signOut, syncNow, setDriveMode, onPuzzleComplete,
  };

  return (
    <DriveContext.Provider value={value}>
      {children}
    </DriveContext.Provider>
  );
}
