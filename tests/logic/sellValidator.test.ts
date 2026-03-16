import { describe, it, expect } from 'vitest';
import { isSellSuccess } from '../../src/logic/sellValidator';
import type { PotionResult } from '../../src/types';

const neutral: PotionResult = { type: 'neutral' };
const rPlus:   PotionResult = { type: 'potion', color: 'R', sign: '+' };
const rMinus:  PotionResult = { type: 'potion', color: 'R', sign: '-' };
const gPlus:   PotionResult = { type: 'potion', color: 'G', sign: '+' };
const gMinus:  PotionResult = { type: 'potion', color: 'G', sign: '-' };
const bPlus:   PotionResult = { type: 'potion', color: 'B', sign: '+' };
const bMinus:  PotionResult = { type: 'potion', color: 'B', sign: '-' };

describe('isSellSuccess — weak tier', () => {
  it('always returns true regardless of claimed vs actual', () => {
    expect(isSellSuccess(rPlus,  neutral, 'weak')).toBe(true);
    expect(isSellSuccess(neutral, rPlus,  'weak')).toBe(true);
    expect(isSellSuccess(rPlus,  gMinus,  'weak')).toBe(true);
    expect(isSellSuccess(neutral, neutral,'weak')).toBe(true);
    expect(isSellSuccess(bMinus, rPlus,   'weak')).toBe(true);
  });
});

describe('isSellSuccess — strong tier', () => {
  it('succeeds on exact potion match (colour + sign)', () => {
    expect(isSellSuccess(rPlus,  rPlus,  'strong')).toBe(true);
    expect(isSellSuccess(rMinus, rMinus, 'strong')).toBe(true);
    expect(isSellSuccess(gPlus,  gPlus,  'strong')).toBe(true);
    expect(isSellSuccess(bMinus, bMinus, 'strong')).toBe(true);
  });

  it('succeeds on neutral vs neutral', () => {
    expect(isSellSuccess(neutral, neutral, 'strong')).toBe(true);
  });

  it('fails when sign differs', () => {
    expect(isSellSuccess(rPlus,  rMinus, 'strong')).toBe(false);
    expect(isSellSuccess(gMinus, gPlus,  'strong')).toBe(false);
  });

  it('fails when colour differs', () => {
    expect(isSellSuccess(rPlus, gPlus, 'strong')).toBe(false);
    expect(isSellSuccess(rPlus, bPlus, 'strong')).toBe(false);
  });

  it('fails on type mismatch: potion vs neutral', () => {
    expect(isSellSuccess(rPlus,   neutral, 'strong')).toBe(false);
    expect(isSellSuccess(neutral, rPlus,   'strong')).toBe(false);
  });
});

describe('isSellSuccess — average tier', () => {
  it('neutral vs neutral succeeds', () => {
    expect(isSellSuccess(neutral, neutral, 'average')).toBe(true);
  });

  it('fails on type mismatch in either direction', () => {
    expect(isSellSuccess(rPlus,   neutral, 'average')).toBe(false);
    expect(isSellSuccess(neutral, rPlus,   'average')).toBe(false);
  });

  it('same colour succeeds regardless of sign', () => {
    expect(isSellSuccess(rPlus,  rMinus, 'average')).toBe(true);
    expect(isSellSuccess(rMinus, rPlus,  'average')).toBe(true);
    expect(isSellSuccess(gPlus,  gMinus, 'average')).toBe(true);
    expect(isSellSuccess(bMinus, bPlus,  'average')).toBe(true);
    // exact match also succeeds
    expect(isSellSuccess(rPlus,  rPlus,  'average')).toBe(true);
  });

  it('fails when colour differs', () => {
    expect(isSellSuccess(rPlus, gPlus,  'average')).toBe(false);
    expect(isSellSuccess(rPlus, bMinus, 'average')).toBe(false);
    expect(isSellSuccess(gPlus, bPlus,  'average')).toBe(false);
  });
});
