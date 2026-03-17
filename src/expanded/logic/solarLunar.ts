/**
 * expanded/logic/solarLunar.ts
 *
 * Solar/Lunar classification of alchemicals.
 *
 * Rule: 0 or 2 negative aspects = Solar; 1 or 3 = Lunar.
 *
 * Solar: {1, 3, 5, 8}  (npN, pNn, Nnp, PPP)
 * Lunar: {2, 4, 6, 7}  (pnP, nPp, Ppn, NNN)
 *
 * IDs 1–6 happen to match the odd/even pattern; IDs 7 (NNN, 3 negatives)
 * and 8 (PPP, 0 negatives) are the exceptions.
 */

import { WORLD_DATA } from '../../logic/worldPack';
import type { AlchemicalId, IngredientId, WorldSet } from '../../types';
import type { SolarLunar } from '../types';

export const SOLAR_ALCH_IDS: AlchemicalId[] = [1, 3, 5, 8];
export const LUNAR_ALCH_IDS: AlchemicalId[] = [2, 4, 6, 7];

const _SOLAR_SET = new Set<AlchemicalId>(SOLAR_ALCH_IDS);

export function isSolar(alchId: AlchemicalId): boolean {
  return _SOLAR_SET.has(alchId);
}

export function solarLunarOf(alchId: AlchemicalId): SolarLunar {
  return isSolar(alchId) ? 'solar' : 'lunar';
}

/**
 * Returns the IngredientId (1-based slot) whose solar/lunar classification
 * provides the maximum Shannon entropy across the remaining worlds.
 * Returns null if no worlds, if best entropy is 0, or if there is a tie.
 */
export function getMostInformativeBook(worlds: WorldSet): IngredientId | null {
  if (worlds.length === 0) return null;
  const n = worlds.length;
  const entropies: { entropy: number; s: number }[] = [];
  for (let s = 0; s < 8; s++) {
    let solarCount = 0;
    for (let i = 0; i < n; i++) {
      if (isSolar((WORLD_DATA[worlds[i] * 8 + s] + 1) as AlchemicalId)) solarCount++;
    }
    const p = solarCount / n;
    const entropy = (p > 0 && p < 1) ? -p * Math.log2(p) - (1 - p) * Math.log2(1 - p) : 0;
    entropies.push({ entropy, s });
  }
  entropies.sort((a, b) => b.entropy - a.entropy);
  if (entropies[0].entropy <= 0) return null;
  if (entropies.length > 1 && Math.abs(entropies[1].entropy - entropies[0].entropy) < 1e-9) return null;
  return (entropies[0].s + 1) as IngredientId;
}
