import { describe, it, expect } from 'vitest';
import { ALL_PUZZLES } from '../../src/data/puzzles/index';
import { getPuzzleWorlds, computeAnswerFromWorlds } from '../../src/puzzles/schema';
import { validateMasterPlanAnswer, validateApprenticePlanAnswer, validateConflictOnlyAnswer } from '../../src/logic/debunk';
import type { QuestionTarget, Publication } from '../../src/types';

// Debunk questions are validated externally (via debunk_answers); computeAnswerFromWorlds
// intentionally returns null for them, so we skip them in this test.
const DEBUNK_KINDS = new Set<QuestionTarget['kind']>([
  'debunk_min_steps',
  'debunk_apprentice_plan',
  'debunk_conflict_only',
]);

describe('debunk reference answers', () => {
  for (const puzzle of ALL_PUZZLES) {
    const debunkQs = puzzle.questions.filter(q =>
      q.kind === 'debunk_min_steps' ||
      q.kind === 'debunk_apprentice_plan' ||
      q.kind === 'debunk_conflict_only',
    );
    if (debunkQs.length === 0) continue;

    it(puzzle.id, () => {
      const worlds = getPuzzleWorlds(puzzle);
      const pubs = (puzzle.publications ?? []).filter(Boolean) as Publication[];
      const answers = puzzle.debunk_answers ?? {};

      for (const q of debunkQs) {
        if (q.kind === 'debunk_min_steps') {
          const ref = answers['debunk_min_steps'] ?? [];
          expect(ref.length, 'debunk_min_steps must have a reference answer').toBeGreaterThan(0);
          expect(
            validateMasterPlanAnswer(ref, puzzle.solution, pubs, worlds, ref.length),
            'debunk_min_steps reference answer must pass the validator',
          ).toBe(true);
        } else if (q.kind === 'debunk_apprentice_plan') {
          const ref = answers['debunk_apprentice_plan'] ?? [];
          expect(ref.length, 'debunk_apprentice_plan must have a reference answer').toBeGreaterThan(0);
          expect(
            validateApprenticePlanAnswer(ref, puzzle.solution, pubs, worlds, ref.length),
            'debunk_apprentice_plan reference answer must pass the validator',
          ).toBe(true);
        } else if (q.kind === 'debunk_conflict_only') {
          const ref = answers['debunk_conflict_only'] ?? [];
          expect(
            validateConflictOnlyAnswer(ref, puzzle.solution, pubs, worlds, ref.length),
            'debunk_conflict_only reference answer must pass the validator',
          ).toBe(true);
        }
      }
    });
  }
});

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
