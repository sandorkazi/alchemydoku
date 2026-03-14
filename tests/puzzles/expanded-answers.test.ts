import { describe, it, expect } from 'vitest';
import { ALL_EXPANDED_PUZZLES } from '../../src/expanded/data/puzzlesIndex';
import { getExpandedPuzzleWorlds, computeExpandedAnswer } from '../../src/expanded/puzzles/schemaExpanded';
import type { AnyQuestion } from '../../src/expanded/types';

// Debunk planning questions return null by design — skip them.
const SKIP_KINDS = new Set<AnyQuestion['kind']>([
  'debunk_min_steps',
  'debunk_apprentice_plan',
  'debunk_conflict_only',
]);

describe('expanded puzzle integrity', () => {
  for (const puzzle of ALL_EXPANDED_PUZZLES) {
    it(puzzle.id, () => {
      const worlds = getExpandedPuzzleWorlds(puzzle);

      expect(worlds.length, 'clues must be consistent (no contradiction)').toBeGreaterThan(0);

      for (let i = 0; i < puzzle.questions.length; i++) {
        const q = puzzle.questions[i];
        if (SKIP_KINDS.has(q.kind)) continue;
        const answer = computeExpandedAnswer(worlds, q, puzzle);
        expect(
          answer,
          `question[${i}] (${q.kind}) must be uniquely answerable from the clues`,
        ).not.toBeNull();
      }
    });
  }
});
