/**
 * worldSet.ts — clue filtering over the packed world representation.
 *
 * WorldSet = Uint16Array of world indices.
 * All filters operate on indices into WORLD_DATA (see worldPack.ts).
 */

import {
  WORLD_DATA, FULL_INDICES, SIGN_TABLE, SIZE_TABLE, MIX_TABLE,
  COLOR_INDEX, encodePotionResult, filterWorlds,
} from './worldPack';
import type {
  WorldSet, Clue, MixingClue, AspectClue, FullAssignmentClue, SellClue, DebunkClue,
} from '../types';

// ─── World generation ─────────────────────────────────────────────────────────

/**
 * Returns the full set of all 40,320 possible worlds.
 * FULL_INDICES is pre-computed at module load — this call is free.
 */
export function generateAllWorlds(): WorldSet {
  return FULL_INDICES;
}

/** No-op: kept for API compatibility. FULL_INDICES is always valid. */
export function clearWorldCache(): void { /* no-op */ }

// ─── Filter functions ─────────────────────────────────────────────────────────

export function filterByAspect(worlds: WorldSet, clue: AspectClue): WorldSet {
  const ci   = COLOR_INDEX[clue.color];
  const sign = clue.sign === '+' ? 1 : 0;
  const si   = clue.ingredient - 1;
  return filterWorlds(worlds, w => SIGN_TABLE[WORLD_DATA[w * 8 + si] * 3 + ci] === sign);
}

export function filterByAssignment(worlds: WorldSet, clue: FullAssignmentClue): WorldSet {
  const si = clue.ingredient - 1;
  const a0 = clue.alchemical - 1;
  return filterWorlds(worlds, w => WORLD_DATA[w * 8 + si] === a0);
}

export function filterByMixing(worlds: WorldSet, clue: MixingClue): WorldSet {
  const s1       = clue.ingredient1 - 1;
  const s2       = clue.ingredient2 - 1;
  const expected = encodePotionResult(clue.result);
  return filterWorlds(worlds, w =>
    MIX_TABLE[WORLD_DATA[w * 8 + s1] * 8 + WORLD_DATA[w * 8 + s2]] === expected
  );
}

export function filterBySell(worlds: WorldSet, clue: SellClue): WorldSet {
  const s1 = clue.ingredient1 - 1;
  const s2 = clue.ingredient2 - 1;
  const ci          = COLOR_INDEX[clue.claimedResult.color];
  const claimedSign = clue.claimedResult.sign === '+' ? 1 : 0;
  const claimedCode = ci * 2 + (claimedSign === 1 ? 1 : 2);

  return filterWorlds(worlds, w => {
    const actual = MIX_TABLE[WORLD_DATA[w * 8 + s1] * 8 + WORLD_DATA[w * 8 + s2]];
    switch (clue.sellResult) {
      case 'total_match':
        return actual === claimedCode;
      case 'neutral':
        return actual === 0;
      case 'sign_ok': {
        if (actual === 0 || actual === claimedCode) return false;
        // Odd codes (1,3,5) = positive; even non-zero (2,4,6) = negative
        const actualSign = actual % 2 === 1 ? 1 : 0;
        const actualColor = (actual - 1) >> 1; // 0,0,1,1,2,2
        return actualSign === claimedSign && actualColor !== ci;
      }
      case 'opposite': {
        if (actual === 0) return false;
        const actualSign = actual % 2 === 1 ? 1 : 0;
        return actualSign !== claimedSign;
      }
    }
  });
}

export function filterByDebunk(worlds: WorldSet, clue: DebunkClue): WorldSet {
  if (clue.variant === 'apprentice') {
    const ci   = COLOR_INDEX[clue.color];
    const sign = clue.sign === '+' ? 1 : 0;
    const si   = clue.ingredient - 1;
    return filterWorlds(worlds, w => SIGN_TABLE[WORLD_DATA[w * 8 + si] * 3 + ci] === sign);
  }

  const s1      = clue.ingredient1 - 1;
  const s2      = clue.ingredient2 - 1;
  const claimed = encodePotionResult(clue.claimedPotion);

  if (clue.outcome === 'success') {
    return filterWorlds(worlds, w =>
      MIX_TABLE[WORLD_DATA[w * 8 + s1] * 8 + WORLD_DATA[w * 8 + s2]] === claimed
    );
  } else {
    return filterWorlds(worlds, w =>
      MIX_TABLE[WORLD_DATA[w * 8 + s1] * 8 + WORLD_DATA[w * 8 + s2]] !== claimed
    );
  }
}

/** Apply a single clue. */
export function filterByClue(worlds: WorldSet, clue: Clue): WorldSet {
  switch (clue.kind) {
    case 'mixing':     return filterByMixing(worlds, clue);
    case 'aspect':     return filterByAspect(worlds, clue);
    case 'assignment': return filterByAssignment(worlds, clue);
    case 'sell':       return filterBySell(worlds, clue);
    case 'debunk':     return filterByDebunk(worlds, clue);
  }
}

/** Apply a list of clues sequentially. */
export function applyClues(worlds: WorldSet, clues: Clue[]): WorldSet {
  return clues.reduce<WorldSet>((ws, clue) => filterByClue(ws, clue), worlds);
}
