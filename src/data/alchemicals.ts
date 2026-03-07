import type { AlchemicalId, Alchemical } from '../types';

/**
 * The 8 canonical alchemicals.
 * Code notation: n=small−, p=small+, N=large−, P=large+
 * Order: [R, G, B]
 *
 * Source: 00-game-rules.md §2
 * Verified by exhaustive mixing-table derivation.
 */
export const ALCHEMICALS: Record<AlchemicalId, Alchemical> = {
  1: { id: 1, code: 'npN', R: { sign: '-', size: 'S' }, G: { sign: '+', size: 'S' }, B: { sign: '-', size: 'L' } },
  2: { id: 2, code: 'pnP', R: { sign: '+', size: 'S' }, G: { sign: '-', size: 'S' }, B: { sign: '+', size: 'L' } },
  3: { id: 3, code: 'pNn', R: { sign: '+', size: 'S' }, G: { sign: '-', size: 'L' }, B: { sign: '-', size: 'S' } },
  4: { id: 4, code: 'nPp', R: { sign: '-', size: 'S' }, G: { sign: '+', size: 'L' }, B: { sign: '+', size: 'S' } },
  5: { id: 5, code: 'Nnp', R: { sign: '-', size: 'L' }, G: { sign: '-', size: 'S' }, B: { sign: '+', size: 'S' } },
  6: { id: 6, code: 'Ppn', R: { sign: '+', size: 'L' }, G: { sign: '+', size: 'S' }, B: { sign: '-', size: 'S' } },
  7: { id: 7, code: 'NNN', R: { sign: '-', size: 'L' }, G: { sign: '-', size: 'L' }, B: { sign: '-', size: 'L' } },
  8: { id: 8, code: 'PPP', R: { sign: '+', size: 'L' }, G: { sign: '+', size: 'L' }, B: { sign: '+', size: 'L' } },
};

export const ALCHEMICAL_IDS: AlchemicalId[] = [1, 2, 3, 4, 5, 6, 7, 8];

/**
 * The 4 direct-opposite pairs (all sign-bits flipped).
 * Mixing two direct-opposite alchemicals always produces Neutral.
 */
export const OPPOSITE_PAIRS: [AlchemicalId, AlchemicalId][] = [
  [1, 2], // npN ↔ pnP
  [3, 4], // pNn ↔ nPp
  [5, 6], // Nnp ↔ Ppn
  [7, 8], // NNN ↔ PPP
];
