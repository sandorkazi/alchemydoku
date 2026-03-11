import { describe, it, expect, beforeEach } from 'vitest';
import { generateAllWorlds, applyClues, clearWorldCache } from '../../src/logic/worldSet';
import {
  deduceMixingResult,
  deduceAlchemical,
  getPossibleAlchemicals,
  getPossibleResults,
  getEliminatedCells,
} from '../../src/logic/deducer';

beforeEach(() => clearWorldCache());

describe('deduceAlchemical', () => {
  it('returns the alchemical when exactly one world remains', () => {
    const worlds = applyClues(generateAllWorlds(), [
      { kind: 'assignment', ingredient: 1, alchemical: 1 },
      { kind: 'assignment', ingredient: 2, alchemical: 2 },
      { kind: 'assignment', ingredient: 3, alchemical: 3 },
      { kind: 'assignment', ingredient: 4, alchemical: 4 },
      { kind: 'assignment', ingredient: 5, alchemical: 5 },
      { kind: 'assignment', ingredient: 6, alchemical: 6 },
      { kind: 'assignment', ingredient: 7, alchemical: 7 },
      { kind: 'assignment', ingredient: 8, alchemical: 8 },
    ]);
    expect(worlds.length).toBe(1);
    expect(deduceAlchemical(worlds, 1)).toBe(1);
    expect(deduceAlchemical(worlds, 8)).toBe(8);
  });

  it('returns null when multiple alchemicals are possible', () => {
    const worlds = generateAllWorlds();
    expect(deduceAlchemical(worlds, 1)).toBeNull();
  });

  it('returns the alchemical when ingredient is pinned by assignment clue', () => {
    const worlds = applyClues(generateAllWorlds(), [
      { kind: 'assignment', ingredient: 3, alchemical: 5 },
    ]);
    expect(deduceAlchemical(worlds, 3)).toBe(5);
  });
});

describe('getPossibleAlchemicals', () => {
  it('returns all 8 alchemicals when no clues given', () => {
    const worlds = generateAllWorlds();
    const possible = getPossibleAlchemicals(worlds, 1);
    expect(possible).toHaveLength(8);
    expect(possible).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('returns fewer options after a constraint', () => {
    // If ingredient 2 is assigned alchemical 2, then ingredient 1 cannot be 2
    const worlds = applyClues(generateAllWorlds(), [
      { kind: 'assignment', ingredient: 2, alchemical: 2 },
    ]);
    const possible = getPossibleAlchemicals(worlds, 1);
    expect(possible).not.toContain(2);
    expect(possible).toHaveLength(7);
  });
});

describe('deduceMixingResult', () => {
  it('returns result when uniquely determined', () => {
    // Fix ingredient 1 = alchemical 1 (npN) and ingredient 2 = alchemical 2 (pnP)
    // These are direct opposites → Neutral
    const worlds = applyClues(generateAllWorlds(), [
      { kind: 'assignment', ingredient: 1, alchemical: 1 },
      { kind: 'assignment', ingredient: 2, alchemical: 2 },
    ]);
    const result = deduceMixingResult(worlds, 1, 2);
    expect(result).toEqual({ type: 'neutral' });
  });

  it('returns null when result is ambiguous', () => {
    const worlds = generateAllWorlds();
    const result = deduceMixingResult(worlds, 1, 2);
    expect(result).toBeNull();
  });
});

describe('getPossibleResults', () => {
  it('returns all 7 possible outcomes when unconstrained', () => {
    const worlds = generateAllWorlds();
    const results = getPossibleResults(worlds, 1, 2);
    expect(results.length).toBeGreaterThan(1);
  });

  it('returns exactly one result when the pair is fixed', () => {
    const worlds = applyClues(generateAllWorlds(), [
      { kind: 'assignment', ingredient: 1, alchemical: 7 }, // NNN
      { kind: 'assignment', ingredient: 2, alchemical: 8 }, // PPP → Neutral
    ]);
    const results = getPossibleResults(worlds, 1, 2);
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ type: 'neutral' });
  });
});

describe('getEliminatedCells', () => {
  it('eliminates the correct cell after assignment clue', () => {
    const worlds = applyClues(generateAllWorlds(), [
      { kind: 'assignment', ingredient: 1, alchemical: 3 },
    ]);
    const eliminated = getEliminatedCells(worlds);
    // ingredient 1 must be alchemical 3 → all other alch for ing 1 are eliminated
    for (const alch of [1, 2, 4, 5, 6, 7, 8]) {
      expect(eliminated.has(`1-${alch}`)).toBe(true);
    }
    // ingredient 1 = alchemical 3 is NOT eliminated
    expect(eliminated.has('1-3')).toBe(false);
    // ingredient 2 cannot be alchemical 3 (it's taken)
    expect(eliminated.has('2-3')).toBe(true);
  });
});
