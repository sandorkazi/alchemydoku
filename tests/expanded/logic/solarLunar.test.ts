import { describe, it, expect } from 'vitest';
import {
  isSolar, solarLunarOf, SOLAR_ALCH_IDS, LUNAR_ALCH_IDS,
} from '../../../src/expanded/logic/solarLunar';
import { SIGN_TABLE } from '../../../src/logic/worldPack';

/** Number of minus-sign aspects for a 1-indexed alchemical ID. */
function minusCount(alchId: number): number {
  const a0 = alchId - 1;
  let count = 0;
  for (let ci = 0; ci < 3; ci++) {
    if (SIGN_TABLE[a0 * 3 + ci] === 0) count++; // 0 = negative = minus
  }
  return count;
}

describe('isSolar / solarLunarOf', () => {
  it('IDs 1, 3, 5, 8 (0 or 2 negatives) are solar', () => {
    for (const id of [1, 3, 5, 8] as const) {
      expect(isSolar(id)).toBe(true);
    }
  });

  it('IDs 2, 4, 6, 7 (1 or 3 negatives) are lunar', () => {
    for (const id of [2, 4, 6, 7] as const) {
      expect(isSolar(id)).toBe(false);
    }
  });

  it('solarLunarOf: ID 7 (NNN) is lunar, ID 8 (PPP) is solar', () => {
    expect(solarLunarOf(1)).toBe('solar');
    expect(solarLunarOf(2)).toBe('lunar');
    expect(solarLunarOf(7)).toBe('lunar');
    expect(solarLunarOf(8)).toBe('solar');
  });

  it('SOLAR_ALCH_IDS and LUNAR_ALCH_IDS together cover all 8 alchemicals with no overlap', () => {
    expect(SOLAR_ALCH_IDS.length + LUNAR_ALCH_IDS.length).toBe(8);
    const all = new Set([...SOLAR_ALCH_IDS, ...LUNAR_ALCH_IDS]);
    expect(all.size).toBe(8);
    for (const id of SOLAR_ALCH_IDS) expect(isSolar(id)).toBe(true);
    for (const id of LUNAR_ALCH_IDS) expect(isSolar(id)).toBe(false);
  });
});

describe('solar/lunar: minus-count rule', () => {
  /**
   * Rule: even number of negative aspects (0 or 2) = Solar,
   *       odd number (1 or 3) = Lunar.
   *
   * Alchemical minus counts from SIGN_TABLE (R,G,B aspects):
   *   1 npN  R-, G+, B-  → 2 minuses → solar
   *   2 pnP  R+, G-, B+  → 1 minus  → lunar
   *   3 pNn  R+, G-, B-  → 2 minuses → solar
   *   4 nPp  R-, G+, B+  → 1 minus  → lunar
   *   5 Nnp  R-, G-, B+  → 2 minuses → solar
   *   6 Ppn  R+, G+, B-  → 1 minus  → lunar
   *   7 NNN  R-, G-, B-  → 3 minuses → lunar  (exception to odd/even ID pattern)
   *   8 PPP  R+, G+, B+  → 0 minuses → solar  (exception to odd/even ID pattern)
   */

  it('all 8 alchemicals: isSolar matches minus-count rule', () => {
    for (const id of [1, 2, 3, 4, 5, 6, 7, 8] as const) {
      const solarByCount = minusCount(id) % 2 === 0;
      expect(isSolar(id)).toBe(solarByCount);
    }
  });

  it('alch 7 (NNN): 3 minuses → lunar', () => {
    expect(minusCount(7)).toBe(3);
    expect(isSolar(7)).toBe(false);
  });

  it('alch 8 (PPP): 0 minuses → solar', () => {
    expect(minusCount(8)).toBe(0);
    expect(isSolar(8)).toBe(true);
  });
});
