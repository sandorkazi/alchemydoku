/**
 * worldPack.ts — compact world representation
 *
 * Instead of 40,320 JS heap objects (Record<IngredientId, AlchemicalId>),
 * all worlds are stored in a single contiguous Uint8Array.
 *
 * Layout:
 *   WORLD_DATA[w * 8 + (slot - 1)] = alch0   (0-indexed alchemical, actual id = alch0 + 1)
 *
 * WorldSet = Uint16Array of world indices (each 0–40319).
 * Memory: 40320 × 8 bytes = 320KB (vs ~4MB+ for JS objects).
 *
 * Precomputed lookup tables eliminate repeated ALCHEMICALS object traversal:
 *   SIGN_TABLE[(alch0) * 3 + colorIdx]  → 1 = '+', 0 = '-'
 *   SIZE_TABLE[(alch0) * 3 + colorIdx]  → 1 = 'L', 0 = 'S'
 *   MIX_TABLE[(a0) * 8 + (b0)]          → mix result code (see MIX_RESULTS)
 *
 * Mix result codes:
 *   0 = neutral
 *   1 = R+,  2 = R-
 *   3 = G+,  4 = G-
 *   5 = B+,  6 = B-
 */

import { ALCHEMICALS } from '../data/alchemicals';
import type { AlchemicalId, IngredientId, Assignment, Color, PotionResult } from '../types';

// ─── Color index ──────────────────────────────────────────────────────────────

export const COLOR_INDEX: Record<Color, number> = { R: 0, G: 1, B: 2 };
export const INDEX_COLOR: Color[] = ['R', 'G', 'B'];

// ─── Sign / size lookup tables ────────────────────────────────────────────────

export const SIGN_TABLE = new Uint8Array(24); // [alch0 * 3 + ci] → 1=pos, 0=neg
export const SIZE_TABLE = new Uint8Array(24); // [alch0 * 3 + ci] → 1=L, 0=S

for (let a = 1; a <= 8; a++) {
  for (const [c, ci] of [['R', 0], ['G', 1], ['B', 2]] as [Color, number][]) {
    SIGN_TABLE[(a - 1) * 3 + ci] = ALCHEMICALS[a as AlchemicalId][c].sign === '+' ? 1 : 0;
    SIZE_TABLE[(a - 1) * 3 + ci] = ALCHEMICALS[a as AlchemicalId][c].size === 'L' ? 1 : 0;
  }
}

// ─── Mix result table ─────────────────────────────────────────────────────────

export const MIX_TABLE = new Uint8Array(64); // [a0 * 8 + b0] → result code 0–6

for (let a0 = 0; a0 < 8; a0++) {
  for (let b0 = 0; b0 < 8; b0++) {
    const isOpp =
      SIGN_TABLE[a0 * 3]     !== SIGN_TABLE[b0 * 3]     &&
      SIGN_TABLE[a0 * 3 + 1] !== SIGN_TABLE[b0 * 3 + 1] &&
      SIGN_TABLE[a0 * 3 + 2] !== SIGN_TABLE[b0 * 3 + 2];

    if (isOpp) {
      MIX_TABLE[a0 * 8 + b0] = 0; // neutral
    } else {
      for (let ci = 0; ci < 3; ci++) {
        if (SIGN_TABLE[a0 * 3 + ci] === SIGN_TABLE[b0 * 3 + ci] &&
            SIZE_TABLE[a0 * 3 + ci] !== SIZE_TABLE[b0 * 3 + ci]) {
          // code: R+=1,R-=2, G+=3,G-=4, B+=5,B-=6
          MIX_TABLE[a0 * 8 + b0] = ci * 2 + (SIGN_TABLE[a0 * 3 + ci] === 1 ? 1 : 2);
          break;
        }
      }
    }
  }
}

/** Decode a mix result code into a PotionResult object. */
export const MIX_RESULTS: PotionResult[] = [
  { type: 'neutral' },
  { type: 'potion', color: 'R', sign: '+' },
  { type: 'potion', color: 'R', sign: '-' },
  { type: 'potion', color: 'G', sign: '+' },
  { type: 'potion', color: 'G', sign: '-' },
  { type: 'potion', color: 'B', sign: '+' },
  { type: 'potion', color: 'B', sign: '-' },
];

/** Encode a PotionResult into its mix result code. */
export function encodePotionResult(r: PotionResult): number {
  if (r.type === 'neutral') return 0;
  const ci = COLOR_INDEX[r.color];
  return ci * 2 + (r.sign === '+' ? 1 : 2);
}

// ─── Flat world storage ───────────────────────────────────────────────────────

/** All 40,320 worlds stored flat: WORLD_DATA[worldIdx * 8 + slot0] = alch0 */
export const WORLD_DATA = new Uint8Array(40320 * 8);
/** Pre-allocated full index set [0 .. 40319] */
export const FULL_INDICES = new Uint16Array(40320);

// Generate all permutations without heap allocation
;(function generateAll() {
  let wi = 0;
  const cur  = new Uint8Array(8);
  const used = new Uint8Array(8);

  function recurse(depth: number): void {
    if (depth === 8) {
      WORLD_DATA.set(cur, wi * 8);
      FULL_INDICES[wi] = wi;
      wi++;
      return;
    }
    for (let a0 = 0; a0 < 8; a0++) {
      if (!used[a0]) {
        cur[depth] = a0;
        used[a0] = 1;
        recurse(depth + 1);
        used[a0] = 0;
      }
    }
  }

  recurse(0);
})();

// ─── Scratch buffer (reused across filter calls — safe because JS is single-threaded) ─

const _scratch = new Uint16Array(40320);

/** Fast filter: write survivors into scratch, copy to exact-size result. */
export function filterWorlds(
  worlds: Uint16Array,
  test: (w: number) => boolean,
): Uint16Array {
  let n = 0;
  for (let i = 0; i < worlds.length; i++) {
    if (test(worlds[i])) _scratch[n++] = worlds[i];
  }
  return _scratch.slice(0, n);
}

// ─── Per-world access helpers ─────────────────────────────────────────────────

/** Alchemical id (1-8) for world w, ingredient slot s (1-8). */
export function worldAlch(w: number, s: number): AlchemicalId {
  return (WORLD_DATA[w * 8 + s - 1] + 1) as AlchemicalId;
}

/** Mix result code for two ingredient slots in world w. */
export function worldMix(w: number, s1: number, s2: number): number {
  return MIX_TABLE[WORLD_DATA[w * 8 + s1 - 1] * 8 + WORLD_DATA[w * 8 + s2 - 1]];
}

/** Convert a world index to an Assignment object (for compatibility / debug). */
export function worldToAssignment(w: number): Assignment {
  const a = {} as Assignment;
  for (let s = 1; s <= 8; s++) {
    a[s as IngredientId] = (WORLD_DATA[w * 8 + s - 1] + 1) as AlchemicalId;
  }
  return a;
}
