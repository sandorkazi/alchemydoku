import { describe, it, expect } from 'vitest';
import { ALL_EXPANDED_PUZZLES } from '../../src/expanded/data/puzzlesIndex';
import { getExpandedPuzzleWorlds, computeExpandedAnswer } from '../../src/expanded/puzzles/schemaExpanded';
import { validateMasterPlanAnswer, validateApprenticePlanAnswer, validateConflictOnlyAnswer } from '../../src/logic/debunk';
import type { AnyQuestion } from '../../src/expanded/types';
import type { Publication } from '../../src/types';

// Debunk planning questions return null by design — skip them.
const SKIP_KINDS = new Set<AnyQuestion['kind']>([
  'debunk_min_steps',
  'debunk_apprentice_plan',
  'debunk_conflict_only',
]);

describe('expanded debunk reference answers', () => {
  for (const puzzle of ALL_EXPANDED_PUZZLES) {
    const debunkQs = puzzle.questions.filter(q =>
      q.kind === 'debunk_min_steps' ||
      q.kind === 'debunk_apprentice_plan' ||
      q.kind === 'debunk_conflict_only',
    );
    if (debunkQs.length === 0) continue;

    it(puzzle.id, () => {
      const worlds = getExpandedPuzzleWorlds(puzzle);
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
          expect(ref.length, 'debunk_conflict_only must have exactly 1 reference step').toBe(1);
          expect(
            validateConflictOnlyAnswer(ref[0], q.fixedIngredient, puzzle.solution, pubs, worlds),
            'debunk_conflict_only reference answer must pass the validator',
          ).toBe(true);
        }
      }
    });
  }
});

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
