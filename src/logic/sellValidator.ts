import { potionResultsEqual } from './mixer';
import type { PotionResult } from '../types';

/**
 * Determines whether a sell is successful given the adventurer's tier requirement.
 *
 * Tier rules (from 00-game-rules.md §4):
 *   weak:    always success
 *   average: correct colour (sign may be wrong); Neutral only matches Neutral
 *   strong:  exact match (colour + sign)
 */
export function isSellSuccess(
  claimed: PotionResult,
  actual: PotionResult,
  tier: 'weak' | 'average' | 'strong'
): boolean {
  switch (tier) {
    case 'weak':
      return true;

    case 'average':
      if (claimed.type !== actual.type) return false;
      if (claimed.type === 'neutral') return true;
      // Both are potions — check colour only
      return (claimed as Extract<PotionResult, { type: 'potion' }>).color ===
             (actual  as Extract<PotionResult, { type: 'potion' }>).color;

    case 'strong':
      return potionResultsEqual(claimed, actual);
  }
}
