/**
 * expanded/logic/solarLunar.ts
 *
 * Solar/Lunar classification of alchemicals.
 *
 * Rule: count negative aspects.
 *   0 negatives → Solar   (PPP)
 *   1 negative  → Lunar   (pnP, nPp, Ppn)
 *   2 negatives → Solar   (npN, pNn, Nnp)
 *   3 negatives → Lunar   (NNN)
 *
 * "Two negatives cancel each other" — even count = Solar, odd = Lunar.
 */

import { ALCHEMICALS } from '../../data/alchemicals';
import type { AlchemicalId } from '../../types';
import type { SolarLunar } from '../types';

export function isSolar(alchId: AlchemicalId): boolean {
  const alch = ALCHEMICALS[alchId];
  const neg = [alch.R.sign, alch.G.sign, alch.B.sign].filter(s => s === '-').length;
  return neg % 2 === 0;
}

export function solarLunarOf(alchId: AlchemicalId): SolarLunar {
  return isSolar(alchId) ? 'solar' : 'lunar';
}

/**
 * Pre-computed sets (derived, not authoritative data — always recomputable).
 * Solar: 1(npN,2neg), 3(pNn,2neg), 5(Nnp,2neg), 8(PPP,0neg)
 * Lunar: 2(pnP,1neg), 4(nPp,1neg), 6(Ppn,1neg), 7(NNN,3neg)
 */
export const SOLAR_ALCH_IDS: AlchemicalId[] = [1, 3, 5, 8];
export const LUNAR_ALCH_IDS: AlchemicalId[] = [2, 4, 6, 7];
