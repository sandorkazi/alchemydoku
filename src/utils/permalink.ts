/**
 * Permalink utilities — encode/decode puzzle IDs in the URL hash so that
 * a shared link opens the correct puzzle directly.
 *
 * URL scheme:
 *   Base mode:     <origin><pathname>#puzzle=<puzzleId>
 *   Expanded mode: <origin><pathname>#puzzle=<puzzleId>&mode=expanded
 *
 * The origin+pathname already reflects which deployment the user is on
 * (main vs. preview), so links are automatically self-aware.
 */

/** Parse the current URL hash for a puzzle permalink. Returns null if absent. */
export function parsePermalink(): { puzzleId: string; mode: 'base' | 'expanded' } | null {
  const hash = window.location.hash.slice(1);
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const puzzleId = params.get('puzzle');
  if (!puzzleId) return null;
  return {
    puzzleId: decodeURIComponent(puzzleId),
    mode: params.get('mode') === 'expanded' ? 'expanded' : 'base',
  };
}

/** Build the full permalink URL for the given puzzle without side-effects. */
export function buildPermalink(puzzleId: string, mode: 'base' | 'expanded'): string {
  const hash = mode === 'expanded'
    ? `#puzzle=${encodeURIComponent(puzzleId)}&mode=expanded`
    : `#puzzle=${encodeURIComponent(puzzleId)}`;
  return window.location.origin + window.location.pathname + hash;
}

/**
 * Update the address bar to the permalink (no reload) and copy it to the
 * clipboard.  Returns the URL that was copied.
 */
export function applyPermalink(puzzleId: string, mode: 'base' | 'expanded'): string {
  const url = buildPermalink(puzzleId, mode);
  const hash = url.slice(url.indexOf('#'));
  history.replaceState(null, '', hash);
  navigator.clipboard.writeText(url).catch(() => {/* silent — user can copy from address bar */});
  return url;
}
