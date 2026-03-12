import {
  WORLD_DATA, SIGN_TABLE, SIZE_TABLE, MIX_TABLE,
  COLOR_INDEX, INDEX_COLOR, MIX_RESULTS, encodePotionResult,
} from './worldPack';
import type { AlchemicalId, IngredientId, WorldSet, PotionResult, Color, Sign } from '../types';

const INGREDIENT_IDS = [1, 2, 3, 4, 5, 6, 7, 8] as IngredientId[];

// ─── Mixing result deduction ──────────────────────────────────────────────────

export function deduceMixingResult(worlds: WorldSet, i1: IngredientId, i2: IngredientId): PotionResult | null {
  if (worlds.length === 0) return null;
  const s1 = i1 - 1, s2 = i2 - 1;
  const first = MIX_TABLE[WORLD_DATA[worlds[0] * 8 + s1] * 8 + WORLD_DATA[worlds[0] * 8 + s2]];
  for (let i = 1; i < worlds.length; i++) {
    const w = worlds[i];
    if (MIX_TABLE[WORLD_DATA[w * 8 + s1] * 8 + WORLD_DATA[w * 8 + s2]] !== first) return null;
  }
  return MIX_RESULTS[first];
}

export function getPossibleResults(worlds: WorldSet, i1: IngredientId, i2: IngredientId): PotionResult[] {
  const s1 = i1 - 1, s2 = i2 - 1;
  let seen = 0;
  for (let i = 0; i < worlds.length; i++) {
    const w = worlds[i];
    seen |= 1 << MIX_TABLE[WORLD_DATA[w * 8 + s1] * 8 + WORLD_DATA[w * 8 + s2]];
    if (seen === 0b1111111) break;
  }
  const results: PotionResult[] = [];
  for (let code = 0; code <= 6; code++) {
    if (seen & (1 << code)) results.push(MIX_RESULTS[code]);
  }
  return results;
}

// ─── Alchemical deduction ─────────────────────────────────────────────────────

export function deduceAlchemical(worlds: WorldSet, ingredient: IngredientId): AlchemicalId | null {
  if (worlds.length === 0) return null;
  const si = ingredient - 1;
  const first = WORLD_DATA[worlds[0] * 8 + si];
  for (let i = 1; i < worlds.length; i++) {
    if (WORLD_DATA[worlds[i] * 8 + si] !== first) return null;
  }
  return (first + 1) as AlchemicalId;
}

export function getPossibleAlchemicals(worlds: WorldSet, ingredient: IngredientId): AlchemicalId[] {
  const si = ingredient - 1;
  let seen = 0;
  for (let i = 0; i < worlds.length; i++) {
    seen |= 1 << WORLD_DATA[worlds[i] * 8 + si];
    if (seen === 0xFF) break;
  }
  const result: AlchemicalId[] = [];
  for (let a0 = 0; a0 < 8; a0++) {
    if (seen & (1 << a0)) result.push((a0 + 1) as AlchemicalId);
  }
  return result;
}

// ─── Aspect deduction ─────────────────────────────────────────────────────────

type AspectDeduction = { sign: Sign; size: 'S' | 'L' } | { sign: Sign; size: null } | null;

export function deduceAspect(worlds: WorldSet, ingredient: IngredientId, color: Color): AspectDeduction {
  if (worlds.length === 0) return null;
  const si = ingredient - 1;
  const ci = COLOR_INDEX[color];
  const firstA0   = WORLD_DATA[worlds[0] * 8 + si];
  const firstSign = SIGN_TABLE[firstA0 * 3 + ci];
  const firstSize = SIZE_TABLE[firstA0 * 3 + ci];
  let signFixed = true, sizeFixed = true;
  for (let i = 1; i < worlds.length; i++) {
    const a0 = WORLD_DATA[worlds[i] * 8 + si];
    if (SIGN_TABLE[a0 * 3 + ci] !== firstSign) { signFixed = false; if (!sizeFixed) return null; }
    if (SIZE_TABLE[a0 * 3 + ci] !== firstSize) { sizeFixed = false; if (!signFixed) return null; }
  }
  if (!signFixed) return null;
  return { sign: firstSign === 1 ? '+' : '-', size: sizeFixed ? (firstSize === 1 ? 'L' : 'S') : null };
}

// ─── Full deduction scan ──────────────────────────────────────────────────────

export type DeductionReport = {
  confirmedAlchemicals: Partial<Record<IngredientId, AlchemicalId>>;
  confirmedAspects: Partial<Record<IngredientId, Partial<Record<Color, AspectDeduction>>>>;
  worldCount: number;
};

export function buildDeductionReport(worlds: WorldSet): DeductionReport {
  const report: DeductionReport = { confirmedAlchemicals: {}, confirmedAspects: {}, worldCount: worlds.length };
  for (const ing of INGREDIENT_IDS) {
    const alch = deduceAlchemical(worlds, ing);
    if (alch !== null) report.confirmedAlchemicals[ing] = alch;
    const byColor: Partial<Record<Color, AspectDeduction>> = {};
    let any = false;
    for (const color of ['R', 'G', 'B'] as Color[]) {
      const a = deduceAspect(worlds, ing, color);
      if (a !== null) { byColor[color] = a; any = true; }
    }
    if (any) report.confirmedAspects[ing] = byColor;
  }
  return report;
}

// ─── Eliminated cells ─────────────────────────────────────────────────────────

export function getEliminatedCells(worlds: WorldSet): Set<string> {
  const possible = new Uint8Array(8);
  for (let i = 0; i < worlds.length; i++) {
    const base = worlds[i] * 8;
    for (let s = 0; s < 8; s++) possible[s] |= 1 << WORLD_DATA[base + s];
    let full = true;
    for (let s = 0; s < 8; s++) { if (possible[s] !== 0xFF) { full = false; break; } }
    if (full) break;
  }
  const eliminated = new Set<string>();
  for (let s = 0; s < 8; s++) {
    for (let a0 = 0; a0 < 8; a0++) {
      if (!(possible[s] & (1 << a0))) eliminated.add(`${s + 1}-${a0 + 1}`);
    }
  }
  return eliminated;
}

// ─── Neutral-partner deduction ────────────────────────────────────────────────

/**
 * Returns the unique ingredient whose alchemical is the direct opposite of
 * `ingredient`'s in every remaining world (i.e. they always mix to neutral).
 * Returns null if no single ingredient is always the neutral partner.
 */
export function deduceNeutralPartner(worlds: WorldSet, ingredient: IngredientId): IngredientId | null {
  if (worlds.length === 0) return null;
  const si = ingredient - 1;
  for (let s2 = 0; s2 < 8; s2++) {
    if (s2 === si) continue;
    let allNeutral = true;
    for (let i = 0; i < worlds.length; i++) {
      const w = worlds[i];
      if (MIX_TABLE[WORLD_DATA[w * 8 + si] * 8 + WORLD_DATA[w * 8 + s2]] !== 0) {
        allNeutral = false;
        break;
      }
    }
    if (allNeutral) return (s2 + 1) as IngredientId;
  }
  return null;
}

// ─── Ingredient potion profile ────────────────────────────────────────────────

/**
 * Returns all potions P where there is some partner Y such that
 * mixing ingredient with Y is certainly P (= deduceMixingResult returns P).
 */
export function getIngredientPotionProfile(worlds: WorldSet, ingredient: IngredientId): PotionResult[] {
  const si = ingredient - 1;
  const seen = new Set<number>();
  for (let s2 = 0; s2 < 8; s2++) {
    if (s2 === si) continue;
    const result = deduceMixingResult(worlds, ingredient, (s2 + 1) as IngredientId);
    if (result !== null) seen.add(encodePotionResult(result));
  }
  const results: PotionResult[] = [];
  if (seen.has(0)) results.push(MIX_RESULTS[0]);
  for (let c = 1; c <= 6; c++) {
    if (seen.has(c)) results.push(MIX_RESULTS[c]);
  }
  return results;
}

// ─── Group possible potions ───────────────────────────────────────────────────

/**
 * Returns all potions P where there is some pair (i, j) in the group such that
 * mixing i with j is certainly P.
 */
export function getGroupPossiblePotions(worlds: WorldSet, ingredients: IngredientId[]): PotionResult[] {
  const seen = new Set<number>();
  for (let a = 0; a < ingredients.length; a++) {
    for (let b = a + 1; b < ingredients.length; b++) {
      const result = deduceMixingResult(worlds, ingredients[a], ingredients[b]);
      if (result !== null) seen.add(encodePotionResult(result));
    }
  }
  const results: PotionResult[] = [];
  if (seen.has(0)) results.push(MIX_RESULTS[0]);
  for (let c = 1; c <= 6; c++) {
    if (seen.has(c)) results.push(MIX_RESULTS[c]);
  }
  return results;
}

// ─── Most informative mix ─────────────────────────────────────────────────────

/**
 * Returns the partner ingredient (≠ ingredient) that maximises the Shannon
 * entropy of the mix-result distribution across all remaining worlds.
 * Ties are broken by lower slot index.
 * Returns null if worlds is empty.
 */
export function getMostInformativeMix(worlds: WorldSet, ingredient: IngredientId): IngredientId | null {
  if (worlds.length === 0) return null;
  const si = ingredient - 1;
  const entropies: { entropy: number; s2: number }[] = [];

  for (let s2 = 0; s2 < 8; s2++) {
    if (s2 === si) continue;
    const counts = new Float64Array(7);
    for (let i = 0; i < worlds.length; i++) {
      const w = worlds[i];
      counts[MIX_TABLE[WORLD_DATA[w * 8 + si] * 8 + WORLD_DATA[w * 8 + s2]]]++;
    }
    let entropy = 0;
    const n = worlds.length;
    for (let code = 0; code <= 6; code++) {
      if (counts[code] > 0) {
        const p = counts[code] / n;
        entropy -= p * Math.log2(p);
      }
    }
    entropies.push({ entropy, s2 });
  }
  entropies.sort((a, b) => b.entropy - a.entropy);
  if (entropies.length === 0) return null;
  // Require unique best partner (no ties within epsilon)
  if (entropies.length > 1 && Math.abs(entropies[1].entropy - entropies[0].entropy) < 1e-9) return null;
  return (entropies[0].s2 + 1) as IngredientId;
}

// ─── Guaranteed non-producers ─────────────────────────────────────────────────

/**
 * Returns ingredients that produce `potion` in NO world with ANY partner.
 */
export function getGuaranteedNonProducers(worlds: WorldSet, potion: PotionResult): IngredientId[] {
  if (worlds.length === 0) return [];
  const targetCode = encodePotionResult(potion);

  const nonProducers: IngredientId[] = [];
  for (let si = 0; si < 8; si++) {
    let canProduce = false;
    outer: for (let sj = 0; sj < 8; sj++) {
      if (sj === si) continue;
      for (let i = 0; i < worlds.length; i++) {
        const w = worlds[i];
        if (MIX_TABLE[WORLD_DATA[w * 8 + si] * 8 + WORLD_DATA[w * 8 + sj]] === targetCode) {
          canProduce = true;
          break outer;
        }
      }
    }
    if (!canProduce) nonProducers.push((si + 1) as IngredientId);
  }
  return nonProducers;
}

// ─── Safe-publish deduction ───────────────────────────────────────────────────

export function deduceUncertainAspect(worlds: WorldSet, ingredient: IngredientId): Color | null {
  if (worlds.length === 0) return null;
  const si = ingredient - 1;
  const signsSeen = new Uint8Array(3);
  for (let i = 0; i < worlds.length; i++) {
    const a0 = WORLD_DATA[worlds[i] * 8 + si];
    for (let ci = 0; ci < 3; ci++) signsSeen[ci] |= 1 << SIGN_TABLE[a0 * 3 + ci];
    if (signsSeen[0] === 3 && signsSeen[1] === 3 && signsSeen[2] === 3) break;
  }
  const uncertain: Color[] = [];
  for (let ci = 0; ci < 3; ci++) {
    if (signsSeen[ci] === 3) uncertain.push(INDEX_COLOR[ci]);
  }
  return uncertain.length === 1 ? uncertain[0] : null;
}
