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
  it('odd IDs (1, 3, 5, 7) are solar', () => {
    for (const id of [1, 3, 5, 7] as const) {
      expect(isSolar(id)).toBe(true);
    }
  });

  it('even IDs (2, 4, 6, 8) are lunar', () => {
    for (const id of [2, 4, 6, 8] as const) {
      expect(isSolar(id)).toBe(false);
    }
  });

  it('solarLunarOf returns "solar" for odd IDs and "lunar" for even IDs', () => {
    expect(solarLunarOf(1)).toBe('solar');
    expect(solarLunarOf(2)).toBe('lunar');
    expect(solarLunarOf(7)).toBe('solar');
    expect(solarLunarOf(8)).toBe('lunar');
  });

  it('SOLAR_ALCH_IDS and LUNAR_ALCH_IDS together cover all 8 alchemicals with no overlap', () => {
    expect(SOLAR_ALCH_IDS.length + LUNAR_ALCH_IDS.length).toBe(8);
    const all = new Set([...SOLAR_ALCH_IDS, ...LUNAR_ALCH_IDS]);
    expect(all.size).toBe(8);
    for (const id of SOLAR_ALCH_IDS) expect(isSolar(id)).toBe(true);
    for (const id of LUNAR_ALCH_IDS) expect(isSolar(id)).toBe(false);
  });
});

describe('solar/lunar: ID-based rule vs minus-count rule', () => {
  /**
   * Two ways to classify alchemicals as solar/lunar:
   *
   *   A) ID rule (implemented):  odd alchId  → solar, even alchId  → lunar
   *   B) Minus-count rule:        even #minus → solar, odd  #minus → lunar
   *                               (solar = 0 minuses, lunar = 1)
   *
   * Alchemical minus counts from SIGN_TABLE (R,G,B aspects):
   *   1 npN  R-, G+, B-  → 2 minuses  (even → solar by count; odd ID  → solar)  agree
   *   2 pnP  R+, G-, B+  → 1 minus   (odd  → lunar by count; even ID → lunar)  agree
   *   3 pNn  R+, G-, B-  → 2 minuses  (even → solar by count; odd ID  → solar)  agree
   *   4 nPp  R-, G+, B+  → 1 minus   (odd  → lunar by count; even ID → lunar)  agree
   *   5 Nnp  R-, G-, B+  → 2 minuses  (even → solar by count; odd ID  → solar)  agree
   *   6 Ppn  R+, G+, B-  → 1 minus   (odd  → lunar by count; even ID → lunar)  agree
   *   7 NNN  R-, G-, B-  → 3 minuses  (odd  → lunar by count; odd ID  → solar)  DIVERGE
   *   8 PPP  R+, G+, B+  → 0 minuses  (even → solar by count; even ID → lunar)  DIVERGE
   *
   * The implementation uses rule A (ID-based).
   */

  it('alchemicals 1–6: ID rule and minus-count rule agree', () => {
    for (const id of [1, 2, 3, 4, 5, 6] as const) {
      const solarByCount = minusCount(id) % 2 === 0;
      expect(isSolar(id)).toBe(solarByCount);
    }
  });

  it('alch 7 (NNN, 3 minuses): implementation says SOLAR (odd ID) but minus-count says lunar', () => {
    expect(minusCount(7)).toBe(3);    // 3 minuses → odd → lunar by minus-count
    expect(isSolar(7)).toBe(true);    // odd ID → solar by ID rule (implementation)
  });

  it('alch 8 (PPP, 0 minuses): implementation says LUNAR (even ID) but minus-count says solar', () => {
    expect(minusCount(8)).toBe(0);    // 0 minuses → even → solar by minus-count
    expect(isSolar(8)).toBe(false);   // even ID → lunar by ID rule (implementation)
  });
});
