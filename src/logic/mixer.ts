import { ALCHEMICALS } from '../data/alchemicals';
import { isDirectOpposite } from './alchemicals';
import type { AlchemicalId, IngredientId, Assignment, PotionResult, Color } from '../types';

const COLORS: Color[] = ['R', 'G', 'B'];

/**
 * Mix two alchemicals together and return the potion result.
 *
 * Algorithm (from 00-game-rules.md §3.2):
 *   1. If all sign-bits are opposite → Neutral
 *   2. Find the unique colour where signs MATCH and sizes DIFFER → that is the result
 *
 * This function is pure and has no side effects.
 */
export function mix(a: AlchemicalId, b: AlchemicalId): PotionResult {
  if (isDirectOpposite(a, b)) {
    return { type: 'neutral' };
  }

  const alchA = ALCHEMICALS[a];
  const alchB = ALCHEMICALS[b];

  for (const color of COLORS) {
    const aspectA = alchA[color];
    const aspectB = alchB[color];
    if (aspectA.sign === aspectB.sign && aspectA.size !== aspectB.size) {
      return { type: 'potion', color, sign: aspectA.sign };
    }
  }

  // Should never happen for valid inputs — the alchemical set guarantees exactly
  // one resolving aspect for every non-opposite pair.
  throw new Error(`No resolving aspect found for alchemicals ${a} (${alchA.code}) and ${b} (${alchB.code})`);
}

/**
 * Mix two ingredients given a complete world assignment.
 * Convenience wrapper around mix().
 */
export function mixIngredients(
  assignment: Assignment,
  i1: IngredientId,
  i2: IngredientId
): PotionResult {
  return mix(assignment[i1], assignment[i2]);
}

/**
 * Deep equality check for two PotionResults.
 */
export function potionResultsEqual(a: PotionResult, b: PotionResult): boolean {
  if (a.type !== b.type) return false;
  if (a.type === 'neutral') return true;
  if (b.type === 'neutral') return true;
  return a.color === b.color && a.sign === b.sign;
}

/**
 * Human-readable string for a potion result. e.g. "G+" or "Neutral"
 */
export function potionToString(p: PotionResult): string {
  if (p.type === 'neutral') return 'Neutral';
  return `${p.color}${p.sign}`;
}
