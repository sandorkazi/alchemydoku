/**
 * expanded/logic/solarLunar.ts
 *
 * Solar/Lunar classification of alchemicals.
 *
 * Rule: odd alchemical ID = Solar, even = Lunar.
 *
 * Solar: {1, 3, 5, 7}
 * Lunar: {2, 4, 6, 8}
 */

import type { AlchemicalId } from '../../types';
import type { SolarLunar } from '../types';

export function isSolar(alchId: AlchemicalId): boolean {
  return alchId % 2 === 1;
}

export function solarLunarOf(alchId: AlchemicalId): SolarLunar {
  return isSolar(alchId) ? 'solar' : 'lunar';
}

export const SOLAR_ALCH_IDS: AlchemicalId[] = [1, 3, 5, 7];
export const LUNAR_ALCH_IDS: AlchemicalId[] = [2, 4, 6, 8];
