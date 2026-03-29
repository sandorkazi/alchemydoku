import { useState, useRef, useEffect } from 'react';
import { useDrive } from '../contexts/DriveContext';
import { loadSyncPref, saveSyncPref, hasLocalProgress } from '../utils/syncPreference';
import { uploadSaveFile } from '../utils/saveFileTransfer';

/**
 * Shown once on first visit (when no sync preference is saved yet).
 * Lets the user choose how to persist their progress: Google Drive,
 * upload a previous save file, or browser cache only.
 */
export function SaveSetupBanner() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const { authStatus, signIn } = useDrive();

  const [show, setShow] = useState(() => loadSyncPref() === null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [uploadState, setUploadState] = useState<'idle' | 'done' | 'error'>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const hasProgress = hasLocalProgress();

  // Dismiss if Drive context completes sign-in externally
  useEffect(() => {
    if (authStatus === 'signed-in') setShow(false);
  }, [authStatus]);

  if (!show) return null;

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    try {
      await uploadSaveFile(file);
      setUploadState('done');
      saveSyncPref('local');
      setTimeout(() => setShow(false), 1000);
    } catch (err) {
      setUploadState('error');
      setUploadError(err instanceof Error ? err.message : 'Failed to load save file.');
    }
    // Reset the input so the same file can be re-selected after an error
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleGoogleSignIn() {
    setIsSigningIn(true);
    try {
      await signIn(); // DriveContext saves syncPref='google' on success
      setShow(false);
    } catch {
      // sign-in cancelled or failed — stay on banner
    } finally {
      setIsSigningIn(false);
    }
  }

  function handleBrowserOnly() {
    saveSyncPref('local');
    setShow(false);
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
      <div>
        <p className="font-semibold text-gray-900 text-sm">💾 How would you like to save your progress?</p>
        {hasProgress ? (
          <p className="text-xs text-gray-500 mt-0.5">You already have progress saved in this browser.</p>
        ) : (
          <p className="text-xs text-gray-500 mt-0.5">Choose a save method — you can change this later in ⚙️ Settings.</p>
        )}
      </div>

      {/* Upload a previous save file */}
      <div>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="sr-only"
          onChange={handleUpload}
        />
        {uploadState === 'done' ? (
          <div className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-green-200 bg-green-50">
            <span className="text-lg shrink-0">✓</span>
            <p className="text-sm font-medium text-green-700">Save file restored</p>
          </div>
        ) : (
          <button
            onClick={() => { setUploadState('idle'); setUploadError(null); fileRef.current?.click(); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-200 bg-white
              hover:border-amber-300 hover:bg-amber-50 transition-colors text-left
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <span className="text-lg shrink-0">📂</span>
            <div>
              <p className="text-sm font-medium text-gray-800">Upload a previous save file</p>
              <p className="text-xs text-gray-400">Restore progress from a downloaded backup</p>
            </div>
          </button>
        )}
        {uploadState === 'error' && uploadError && (
          <p className="text-xs text-red-500 mt-1 px-1">{uploadError}</p>
        )}
      </div>

      {/* Google Drive sync */}
      {clientId && (
        <button
          onClick={handleGoogleSignIn}
          disabled={isSigningIn}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-200 bg-white
            hover:border-amber-300 hover:bg-amber-50 transition-colors text-left disabled:opacity-60
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <span className="text-lg shrink-0">⛅</span>
          <div>
            <p className="text-sm font-medium text-gray-800">
              {isSigningIn ? 'Signing in…' : 'Sign in with Google'}
            </p>
            <p className="text-xs text-gray-400">Sync progress automatically across devices</p>
          </div>
        </button>
      )}

      {/* Browser cache only */}
      <button
        onClick={handleBrowserOnly}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-200 bg-white
          hover:border-gray-300 hover:bg-gray-50 transition-colors text-left
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
      >
        <span className="text-lg shrink-0">🗄️</span>
        <div>
          <p className="text-sm font-medium text-gray-800">Use browser cache</p>
          <p className="text-xs text-gray-400">Keep progress locally in this browser only</p>
        </div>
      </button>
    </div>
  );
}
