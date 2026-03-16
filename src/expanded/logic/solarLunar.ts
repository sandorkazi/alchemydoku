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

import type { AlchemicalId } from '../../types';
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
