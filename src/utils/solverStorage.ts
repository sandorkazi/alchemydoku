/**
 * Shared utilities used by both SolverContext and ExpandedSolverContext.
 * Pure functions — no React, no context imports.
 */

import type { CellState } from '../types';
import { SAVE_VERSION } from './saveProgress';

// ─── Display map ──────────────────────────────────────────────────────────────

/** slot (1-8) → display ingredient id (1-8), randomised per session */
export type DisplayMap = Record<number, number>;

function randomShuffle(arr: number[]): number[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function makeDisplayMap(): DisplayMap {
  const shuffled = randomShuffle([1, 2, 3, 4, 5, 6, 7, 8]);
  const map: DisplayMap = {};
  for (let i = 0; i < 8; i++) map[i + 1] = shuffled[i];
  return map;
}

export function loadDisplayMap(key: string): DisplayMap | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as DisplayMap) : null;
  } catch { return null; }
}

export function saveDisplayMap(key: string, map: DisplayMap): void {
  try { localStorage.setItem(key, JSON.stringify(map)); } catch { /* ignore */ }
}

// ─── Grid state ───────────────────────────────────────────────────────────────

export type GridState = Record<number, Record<number, CellState>>;

export function emptyGrid(): GridState {
  const g: GridState = {};
  for (let i = 1; i <= 8; i++) {
    g[i] = {};
    for (let a = 1; a <= 8; a++) g[i][a] = 'unknown';
  }
  return g;
}

// ─── Unified localStorage merge-write ─────────────────────────────────────────

/**
 * Read-merge-write a per-puzzle entry into a unified save-file object in
 * localStorage.  Other puzzles' entries are preserved.
 */
export function mergeIntoUnifiedStore(
  storeKey: string,
  puzzleId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  progress: Record<string, any>,
): void {
  try {
    const raw  = localStorage.getItem(storeKey);
    const file = raw ? JSON.parse(raw) : { version: SAVE_VERSION, exportedAt: '', puzzles: {} };
    file.puzzles[puzzleId] = progress;
    localStorage.setItem(storeKey, JSON.stringify(file));
  } catch { /* ignore */ }
}
