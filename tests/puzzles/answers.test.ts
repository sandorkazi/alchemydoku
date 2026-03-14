import { describe, it, expect } from 'vitest';
import { ALL_PUZZLES } from '../../src/data/puzzles/index';
import { getPuzzleWorlds, computeAnswerFromWorlds } from '../../src/puzzles/schema';
import type { QuestionTarget } from '../../src/types';

// Debunk questions are validated externally (via debunk_answers); computeAnswerFromWorlds
// intentionally returns null for them, so we skip them in this test.
const DEBUNK_KINDS = new Set<QuestionTarget['kind']>([
  'debunk_min_steps',
  'debunk_apprentice_plan',
  'debunk_conflict_only',
]);

describe('base puzzle integrity', () => {
  for (const puzzle of ALL_PUZZLES) {
    it(puzzle.id, () => {
      const worlds = getPuzzleWorlds(puzzle);

      expect(worlds.length, 'clues must be consistent (no contradiction)').toBeGreaterThan(0);

      for (let i = 0; i < puzzle.questions.length; i++) {
        const q = puzzle.questions[i];
        if (DEBUNK_KINDS.has(q.kind)) continue;
        const answer = computeAnswerFromWorlds(worlds, q);
        expect(
          answer,
          `question[${i}] (${q.kind}) must be uniquely answerable from the clues`,
        ).not.toBeNull();
      }
    });
  }
});
