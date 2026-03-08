/**
 * expanded/logic/worldSetExpanded.ts
 *
 * World-set filter functions for expanded clue types.
 * Delegates base clue types to the original worldSet module.
 */

import { filterByClue, applyClues } from '../../logic/worldSet';
import { WORLD_DATA, SIGN_TABLE, COLOR_INDEX, filterWorlds } from '../../logic/worldPack';
import { deduceMixingResult } from '../../logic/deducer';
import { isSolar } from './solarLunar';
import type { WorldSet } from '../../types';
import type {
  AnyClue, ExpandedClue,
  BookClue, EncyclopediaClue, EncyclopediaUncertainClue,
  DebunkApprenticeClue, DebunkMasterClue,
} from '../types';

// ─── Individual expanded filters ─────────────────────────────────────────────

function filterByBook(worlds: WorldSet, clue: BookClue): WorldSet {
  const si       = clue.ingredient - 1;
  const wantSolar = clue.result === 'solar';
  return filterWorlds(worlds, w => {
    const alch0 = WORLD_DATA[w * 8 + si];
    return isSolar((alch0 + 1) as Parameters<typeof isSolar>[0]) === wantSolar;
  });
}

function filterByEncyclopedia(worlds: WorldSet, clue: EncyclopediaClue): WorldSet {
  const ci = COLOR_INDEX[clue.aspect];
  return filterWorlds(worlds, w =>
    clue.entries.every(e => {
      const wantSign = e.sign === '+' ? 1 : 0;
      return SIGN_TABLE[WORLD_DATA[w * 8 + (e.ingredient - 1)] * 3 + ci] === wantSign;
    })
  );
}

function filterByEncyclopediaUncertain(worlds: WorldSet, clue: EncyclopediaUncertainClue): WorldSet {
  const ci = COLOR_INDEX[clue.aspect];
  return filterWorlds(worlds, w => {
    const correct = clue.entries.filter(e => {
      const wantSign = e.sign === '+' ? 1 : 0;
      return SIGN_TABLE[WORLD_DATA[w * 8 + (e.ingredient - 1)] * 3 + ci] === wantSign;
    }).length;
    return correct >= 3;
  });
}

/**
 * Apprentice debunk: the revealed sign IS the truth — filter exactly like an
 * aspect clue. (Success/failure only affects board state, not the fact itself.)
 */
function filterByDebunkApprentice(worlds: WorldSet, clue: DebunkApprenticeClue): WorldSet {
  const ci       = COLOR_INDEX[clue.aspect];
  const wantSign = clue.sign === '+' ? 1 : 0;
  const si       = clue.ingredient - 1;
  return filterWorlds(worlds, w =>
    SIGN_TABLE[WORLD_DATA[w * 8 + si] * 3 + ci] === wantSign
  );
}

/**
 * Master debunk: only filter if successful (result was verified true).
 * The claimed_result is then a real mixing result we can constrain on.
 * If not successful, no world information is extractable.
 */
function filterByDebunkMaster(worlds: WorldSet, clue: DebunkMasterClue): WorldSet {
  if (!clue.successful) return worlds;
  // Apply the verified mixing result as a constraint by checking all worlds
  // and keeping only those where that mix produces that result.
  return filterWorlds(worlds, w => {
    // Build a single-world WorldSet and test
    const single = new Uint16Array([w]) as WorldSet;
    const result = deduceMixingResult(single, clue.ingredient1, clue.ingredient2);
    if (!result) return false;
    const cr = clue.claimed_result;
    if (cr.type === 'neutral') return result.type === 'neutral';
    return result.type !== 'neutral' && result.color === cr.color && result.sign === cr.sign;
  });
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

function isExpandedClue(clue: AnyClue): clue is ExpandedClue {
  return clue.kind === 'book'
    || clue.kind === 'encyclopedia'
    || clue.kind === 'encyclopedia_uncertain'
    || clue.kind === 'debunk_apprentice'
    || clue.kind === 'debunk_master';
}

export function filterByAnyClue(worlds: WorldSet, clue: AnyClue): WorldSet {
  if (!isExpandedClue(clue)) {
    return filterByClue(worlds, clue as Parameters<typeof filterByClue>[1]);
  }
  switch (clue.kind) {
    case 'book':                   return filterByBook(worlds, clue);
    case 'encyclopedia':           return filterByEncyclopedia(worlds, clue);
    case 'encyclopedia_uncertain': return filterByEncyclopediaUncertain(worlds, clue);
    case 'debunk_apprentice':      return filterByDebunkApprentice(worlds, clue);
    case 'debunk_master':          return filterByDebunkMaster(worlds, clue);
  }
}

export function applyAnyClues(worlds: WorldSet, clues: AnyClue[]): WorldSet {
  return clues.reduce<WorldSet>((ws, clue) => filterByAnyClue(ws, clue), worlds);
}

// Re-export base helpers so callers only need this module
export { applyClues, filterByClue };
