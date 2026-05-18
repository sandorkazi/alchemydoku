/**
 * Permalink utilities — encode/decode puzzle IDs in the URL hash so that
 * a shared link opens the correct puzzle directly.
 *
 * URL scheme:
 *   Base mode:     <origin><pathname>#puzzle=<puzzleId>[&shuffle=<hash>]
 *   Expanded mode: <origin><pathname>#puzzle=<puzzleId>&mode=expanded[&shuffle=<hash>]
 *
 * The shuffle hash encodes the displayMap permutation as a Lehmer index
 * (0–40319) in base36 (max 3 chars).  Index 0 (identity permutation) is
 * omitted from the URL.
 */

import type { DisplayMap } from './solverStorage';

// ─── Permutation helpers (private) ───────────────────────────────────────────

const FACT = [5040, 720, 120, 24, 6, 2, 1]; // 7! … 1!

function permToIndex(perm: number[]): number {
  const remaining = [0, 1, 2, 3, 4, 5, 6, 7];
  let idx = 0;
  for (let i = 0; i < 7; i++) {
    const pos = remaining.indexOf(perm[i] - 1);
    remaining.splice(pos, 1);
    idx += pos * FACT[i];
  }
  return idx;
}

function indexToPerm(idx: number): number[] {
  const remaining = [0, 1, 2, 3, 4, 5, 6, 7];
  const perm: number[] = [];
  for (let i = 0; i < 7; i++) {
    const pos = Math.floor(idx / FACT[i]);
    idx %= FACT[i];
    perm.push(remaining[pos] + 1);
    remaining.splice(pos, 1);
  }
  perm.push(remaining[0] + 1);
  return perm;
}

// ─── Public hash helpers ──────────────────────────────────────────────────────

/** Convert a DisplayMap to a URL-safe base36 hash.  Returns null for identity (index 0). */
export function displayMapToHash(map: DisplayMap): string | null {
  const perm = [1, 2, 3, 4, 5, 6, 7, 8].map(i => map[i] ?? i);
  const idx = permToIndex(perm);
  return idx === 0 ? null : idx.toString(36);
}

/** Convert a base36 hash back to a DisplayMap.  Returns null if invalid. */
export function hashToDisplayMap(hash: string): DisplayMap | null {
  const idx = parseInt(hash, 36);
  if (isNaN(idx) || idx < 0 || idx > 40319) return null;
  const perm = indexToPerm(idx);
  const map: DisplayMap = {};
  for (let i = 0; i < 8; i++) map[i + 1] = perm[i];
  return map;
}

// ─── Permalink functions ──────────────────────────────────────────────────────

/** Parse the current URL hash for a puzzle permalink. Returns null if absent. */
export function parsePermalink(): {
  puzzleId: string;
  mode: 'base' | 'expanded';
  shuffleHash?: string;
} | null {
  const hash = window.location.hash.slice(1);
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const puzzleId = params.get('puzzle');
  if (!puzzleId) return null;
  const shuffleHash = params.get('shuffle') ?? undefined;
  return {
    puzzleId: decodeURIComponent(puzzleId),
    mode: params.get('mode') === 'expanded' ? 'expanded' : 'base',
    ...(shuffleHash ? { shuffleHash } : {}),
  };
}

/** Build the full permalink URL for the given puzzle without side-effects. */
export function buildPermalink(
  puzzleId: string,
  mode: 'base' | 'expanded',
  shuffleHash?: string | null,
): string {
  let hash = `#puzzle=${encodeURIComponent(puzzleId)}`;
  if (mode === 'expanded') hash += '&mode=expanded';
  if (shuffleHash) hash += `&shuffle=${shuffleHash}`;
  return window.location.origin + window.location.pathname + hash;
}

/**
 * Update the address bar to the permalink (no reload) and copy it to the
 * clipboard.  Pass the current displayMap to include the shuffle hash.
 * Returns the URL that was copied.
 */
export function applyPermalink(
  puzzleId: string,
  mode: 'base' | 'expanded',
  displayMap?: DisplayMap,
): string {
  const shuffleHash = displayMap ? displayMapToHash(displayMap) : null;
  const url = buildPermalink(puzzleId, mode, shuffleHash);
  const hash = url.slice(url.indexOf('#'));
  history.replaceState(null, '', hash);
  navigator.clipboard.writeText(url).catch(() => {/* silent — user can copy from address bar */});
  return url;
}
