import { describe, it, expect } from 'vitest';
import { mix, potionToString } from '../../src/logic/mixer';
import { isDirectOpposite } from '../../src/logic/alchemicals';
import type { AlchemicalId } from '../../src/types';

const ALL_IDS: AlchemicalId[] = [1, 2, 3, 4, 5, 6, 7, 8];

describe('isDirectOpposite', () => {
  it('returns true for all 4 opposite pairs', () => {
    expect(isDirectOpposite(1, 2)).toBe(true);
    expect(isDirectOpposite(3, 4)).toBe(true);
    expect(isDirectOpposite(5, 6)).toBe(true);
    expect(isDirectOpposite(7, 8)).toBe(true);
  });

  it('is symmetric', () => {
    expect(isDirectOpposite(2, 1)).toBe(true);
    expect(isDirectOpposite(4, 3)).toBe(true);
  });

  it('returns false for non-opposite pairs', () => {
    expect(isDirectOpposite(1, 3)).toBe(false);
    expect(isDirectOpposite(1, 7)).toBe(false);
    expect(isDirectOpposite(2, 5)).toBe(false);
  });
});

describe('mix', () => {
  // ── Neutral (all 4 opposite pairs) ─────────────────────────────────────────
  describe('Neutral results', () => {
    it('npN + pnP = Neutral', () => expect(mix(1, 2)).toEqual({ type: 'neutral' }));
    it('pNn + nPp = Neutral', () => expect(mix(3, 4)).toEqual({ type: 'neutral' }));
    it('Nnp + Ppn = Neutral', () => expect(mix(5, 6)).toEqual({ type: 'neutral' }));
    it('NNN + PPP = Neutral', () => expect(mix(7, 8)).toEqual({ type: 'neutral' }));
  });

  // ── R− ─────────────────────────────────────────────────────────────────────
  describe('R− results', () => {
    it('npN + Nnp = R−', () => expect(mix(1, 5)).toEqual({ type: 'potion', color: 'R', sign: '-' }));
    it('npN + NNN = R−', () => expect(mix(1, 7)).toEqual({ type: 'potion', color: 'R', sign: '-' }));
    it('nPp + Nnp = R−', () => expect(mix(4, 5)).toEqual({ type: 'potion', color: 'R', sign: '-' }));
    it('nPp + NNN = R−', () => expect(mix(4, 7)).toEqual({ type: 'potion', color: 'R', sign: '-' }));
  });

  // ── R+ ─────────────────────────────────────────────────────────────────────
  describe('R+ results', () => {
    it('pnP + Ppn = R+', () => expect(mix(2, 6)).toEqual({ type: 'potion', color: 'R', sign: '+' }));
    it('pnP + PPP = R+', () => expect(mix(2, 8)).toEqual({ type: 'potion', color: 'R', sign: '+' }));
    it('pNn + Ppn = R+', () => expect(mix(3, 6)).toEqual({ type: 'potion', color: 'R', sign: '+' }));
    it('pNn + PPP = R+', () => expect(mix(3, 8)).toEqual({ type: 'potion', color: 'R', sign: '+' }));
  });

  // ── G+ ─────────────────────────────────────────────────────────────────────
  describe('G+ results', () => {
    it('npN + nPp = G+', () => expect(mix(1, 4)).toEqual({ type: 'potion', color: 'G', sign: '+' }));
    it('npN + PPP = G+', () => expect(mix(1, 8)).toEqual({ type: 'potion', color: 'G', sign: '+' }));
    it('nPp + Ppn = G+', () => expect(mix(4, 6)).toEqual({ type: 'potion', color: 'G', sign: '+' }));
    it('Ppn + PPP = G+', () => expect(mix(6, 8)).toEqual({ type: 'potion', color: 'G', sign: '+' }));
  });

  // ── G− ─────────────────────────────────────────────────────────────────────
  describe('G− results', () => {
    it('pnP + pNn = G−', () => expect(mix(2, 3)).toEqual({ type: 'potion', color: 'G', sign: '-' }));
    it('pnP + NNN = G−', () => expect(mix(2, 7)).toEqual({ type: 'potion', color: 'G', sign: '-' }));
    it('pNn + Nnp = G−', () => expect(mix(3, 5)).toEqual({ type: 'potion', color: 'G', sign: '-' }));
    it('Nnp + NNN = G−', () => expect(mix(5, 7)).toEqual({ type: 'potion', color: 'G', sign: '-' }));
  });

  // ── B+ ─────────────────────────────────────────────────────────────────────
  describe('B+ results', () => {
    it('pnP + nPp = B+', () => expect(mix(2, 4)).toEqual({ type: 'potion', color: 'B', sign: '+' }));
    it('pnP + Nnp = B+', () => expect(mix(2, 5)).toEqual({ type: 'potion', color: 'B', sign: '+' }));
    it('nPp + PPP = B+', () => expect(mix(4, 8)).toEqual({ type: 'potion', color: 'B', sign: '+' }));
    it('Nnp + PPP = B+', () => expect(mix(5, 8)).toEqual({ type: 'potion', color: 'B', sign: '+' }));
  });

  // ── B− ─────────────────────────────────────────────────────────────────────
  describe('B− results', () => {
    it('npN + pNn = B−', () => expect(mix(1, 3)).toEqual({ type: 'potion', color: 'B', sign: '-' }));
    it('npN + Ppn = B−', () => expect(mix(1, 6)).toEqual({ type: 'potion', color: 'B', sign: '-' }));
    it('pNn + NNN = B−', () => expect(mix(3, 7)).toEqual({ type: 'potion', color: 'B', sign: '-' }));
    it('Ppn + NNN = B−', () => expect(mix(6, 7)).toEqual({ type: 'potion', color: 'B', sign: '-' }));
  });

  // ── Meta properties ─────────────────────────────────────────────────────────
  it('is commutative for all pairs', () => {
    for (let i = 0; i < ALL_IDS.length; i++) {
      for (let j = i + 1; j < ALL_IDS.length; j++) {
        const a = ALL_IDS[i], b = ALL_IDS[j];
        const ab = mix(a, b);
        const ba = mix(b, a);
        expect(ab).toEqual(ba);
      }
    }
  });

  it('each of the 7 outcomes is produced by exactly 4 pairs', () => {
    const counts = new Map<string, number>();
    for (let i = 0; i < ALL_IDS.length; i++) {
      for (let j = i + 1; j < ALL_IDS.length; j++) {
        const r = mix(ALL_IDS[i], ALL_IDS[j]);
        const key = r.type === 'neutral' ? 'neutral' : `${r.color}${r.sign}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    expect(counts.size).toBe(7);
    for (const [, count] of counts) {
      expect(count).toBe(4);
    }
  });
});

describe('potionToString', () => {
  it('formats potions correctly', () => {
    expect(potionToString({ type: 'potion', color: 'R', sign: '+' })).toBe('R+');
    expect(potionToString({ type: 'potion', color: 'G', sign: '-' })).toBe('G-');
    expect(potionToString({ type: 'neutral' })).toBe('Neutral');
  });
});
