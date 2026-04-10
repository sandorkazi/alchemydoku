import { useState, useRef, useEffect } from 'react';
import { useDrive } from '../contexts/DriveContext';

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Animated cloud icon with sync/success/error state */
function CloudIcon({ status }: { status: 'idle' | 'syncing' | 'success' | 'error' }) {
  if (status === 'syncing') {
    return (
      <span
        className="inline-block text-base leading-none"
        style={{ animation: 'alch-spin 1s linear infinite', display: 'inline-block' }}
        title="Syncing…"
      >
        ↻
      </span>
    );
  }
  if (status === 'success') return <span className="text-green-500 text-sm" title="Saved to cloud">✓</span>;
  if (status === 'error')   return <span className="text-red-400 text-sm"   title="Sync error">!</span>;
  return <span className="text-gray-400 text-sm" title="Cloud save">⛅</span>;
}

/** User avatar circle — shows Google profile photo or initials fallback */
function Avatar({ user }: { user: { name: string; picture: string } }) {
  const [imgError, setImgError] = useState(false);
  const initials = user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  if (user.picture && !imgError) {
    return (
      <img
        src={user.picture}
        alt={user.name}
        className="w-6 h-6 rounded-full object-cover border border-gray-200"
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <div className="w-6 h-6 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-xs font-bold text-amber-700 leading-none">
      {initials}
    </div>
  );
}

/** Last-synced time, formatted as "X min ago" or a short time */
function LastSyncedLabel({ date }: { date: Date }) {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return <span>just now</span>;
  if (diffMin < 60) return <span>{diffMin}m ago</span>;
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return <span>{h}:{m}</span>;
}

/** Storage mode toggle row shown inside the signed-in dropdown */
function StorageModeRow({
  driveMode,
  isMigrating,
  onToggle,
}: {
  driveMode: 'hidden' | 'visible';
  isMigrating: boolean;
  onToggle: () => void;
}) {
  const label = driveMode === 'hidden' ? 'Private (app-only folder)' : 'My Drive / AlchemySudoku';
  const btnLabel = isMigrating ? 'Moving…' : driveMode === 'hidden' ? 'Make visible' : 'Make private';
  return (
    <div className="px-4 py-2.5 border-b border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium">Storage location</p>
          <p className="text-xs text-gray-400">{label}</p>
        </div>
        <button
          onClick={onToggle}
          disabled={isMigrating}
          className="text-xs text-amber-600 hover:text-amber-800 font-medium disabled:opacity-40 whitespace-nowrap ml-2"
        >
          {btnLabel}
        </button>
      </div>
      {driveMode === 'visible' && (
        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
          File visible in your Google Drive under <strong>My Drive › AlchemySudoku</strong>.
        </p>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * Small cloud-save widget that sits in the app header.
 *
 * Unsigned: shows a subtle "Save to cloud" button.
 * Signed in: shows avatar + sync status + dropdown with sync/sign-out.
 */
export function DriveSync() {
  const { authStatus, syncStatus, user, savedUser, lastSynced, errorMsg, driveMode, isMigrating, signIn, signOut, syncNow, setDriveMode } = useDrive();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (!dropdownRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  // Feature not available (no client ID configured)
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  if (!clientId) return null;

  // ── Loading state ─────────────────────────────────────────────────────────
  if (authStatus === 'loading') {
    return (
      <button
        disabled
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-gray-400 bg-gray-50 border border-gray-200 cursor-wait"
      >
        {savedUser && <Avatar user={savedUser} />}
        <CloudIcon status="syncing" />
        <span>{savedUser ? 'Reconnecting…' : 'Signing in…'}</span>
      </button>
    );
  }

  // ── Signed out / error — known previous user: show "Reconnect" ───────────
  if (authStatus !== 'signed-in' && savedUser) {
    return (
      <button
        onClick={() => signIn()}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-gray-500 bg-white border border-gray-200 hover:border-amber-300 hover:text-amber-700 hover:bg-amber-50 transition-colors shadow-sm"
        title={`Reconnect as ${savedUser.name} to resume cloud sync`}
      >
        <div className="relative shrink-0">
          <Avatar user={savedUser} />
          <span className="absolute -top-1 -right-1 flex h-3 w-3 pointer-events-none">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500 text-white text-[7px] font-bold items-center justify-center leading-none">!</span>
          </span>
        </div>
        <CloudIcon status={authStatus === 'error' ? 'error' : 'idle'} />
        <span>Reconnect</span>
      </button>
    );
  }

  // ── Signed out / error — first time ───────────────────────────────────────
  if (authStatus !== 'signed-in') {
    return (
      <button
        onClick={() => signIn()}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-gray-500 bg-white border border-gray-200 hover:border-amber-300 hover:text-amber-700 hover:bg-amber-50 transition-colors shadow-sm"
        title={errorMsg ?? 'Sync your progress with Google Drive'}
      >
        <CloudIcon status={authStatus === 'error' ? 'error' : 'idle'} />
        <span>Cloud save</span>
      </button>
    );
  }

  // ── Signed in ─────────────────────────────────────────────────────────────
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-xs bg-white border border-gray-200 hover:border-amber-300 hover:bg-amber-50 transition-colors shadow-sm"
        title="Cloud save"
      >
        {user && <Avatar user={user} />}
        <CloudIcon status={syncStatus} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-2xl border border-gray-200 shadow-lg z-50 overflow-hidden">
          {/* User info */}
          {user && (
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2.5">
              <Avatar user={user} />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{user.name}</p>
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
              </div>
            </div>
          )}

          {/* Sync status row */}
          <div className="px-4 py-2.5 flex items-center justify-between border-b border-gray-100">
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <CloudIcon status={syncStatus} />
              {syncStatus === 'syncing' && <span>Syncing…</span>}
              {syncStatus === 'success' && lastSynced && (
                <span className="text-green-600">Saved · <LastSyncedLabel date={lastSynced} /></span>
              )}
              {syncStatus === 'error' && (
                <span className="text-red-500">Sync failed</span>
              )}
              {syncStatus === 'idle' && (
                <span>Not synced yet</span>
              )}
            </div>
            <button
              onClick={() => { syncNow(); setOpen(false); }}
              disabled={syncStatus === 'syncing'}
              className="text-xs text-amber-600 hover:text-amber-800 font-medium disabled:opacity-40"
            >
              Sync
            </button>
          </div>

          {/* Storage mode row */}
          <StorageModeRow
            driveMode={driveMode}
            isMigrating={isMigrating}
            onToggle={() => setDriveMode(driveMode === 'hidden' ? 'visible' : 'hidden')}
          />

          {/* Error message if any */}
          {errorMsg && (
            <div className="px-4 py-2 text-xs text-red-500 border-b border-gray-100 bg-red-50">
              {errorMsg}
            </div>
          )}

          {/* Info note */}
          <div className="px-4 py-2.5 border-b border-gray-100">
            <p className="text-xs text-gray-400 leading-relaxed">
              {driveMode === 'hidden'
                ? 'Progress saves to a private file in your Google Drive — only this app can see it.'
                : 'Progress saves to My Drive / AlchemySudoku — visible and manageable in Google Drive.'}
            </p>
          </div>

          {/* Sign out */}
          <button
            onClick={() => { signOut(); setOpen(false); }}
            className="w-full text-left px-4 py-2.5 text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
