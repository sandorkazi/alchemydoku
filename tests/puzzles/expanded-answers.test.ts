import { describe, it, expect } from 'vitest';
import { ALL_EXPANDED_PUZZLES } from '../../src/expanded/data/puzzlesIndex';
import { getExpandedPuzzleWorlds, computeExpandedAnswer, getExpandedPuzzleGolemState } from '../../src/expanded/puzzles/schemaExpanded';
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
          expect(
            validateConflictOnlyAnswer(ref, puzzle.solution, pubs, worlds, ref.length),
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
      const golemState = getExpandedPuzzleGolemState(puzzle);
      const worlds = getExpandedPuzzleWorlds(puzzle);

      expect(worlds.length, 'clues must be consistent (no contradiction)').toBeGreaterThan(0);

      for (let i = 0; i < puzzle.questions.length; i++) {
        const q = puzzle.questions[i];
        if (SKIP_KINDS.has(q.kind)) continue;
        const answer = computeExpandedAnswer(worlds, q, puzzle, golemState ?? undefined);
        expect(
          answer,
          `question[${i}] (${q.kind}) must be uniquely answerable from the clues`,
        ).not.toBeNull();
      }
    });
  }
});

describe('golem solver state integrity', () => {
  // Only puzzles WITHOUT a fixed puzzle.golem config use joint reasoning.
  const jointGolemPuzzles = ALL_EXPANDED_PUZZLES.filter(p =>
    !p.golem &&
    p.clues.some(c =>
      c.kind === 'golem_test' || c.kind === 'golem_animation' ||
      c.kind === 'golem_hint_color' || c.kind === 'golem_hint_size',
    ),
  );

  if (jointGolemPuzzles.length === 0) {
    it('no joint-golem puzzles registered yet', () => {
      // This test will pass once joint-golem puzzles are generated.
    });
  }

  for (const puzzle of jointGolemPuzzles) {
    it(`${puzzle.id} — golem state has ≥1 surviving config`, () => {
      const golemState = getExpandedPuzzleGolemState(puzzle);
      expect(golemState, 'getExpandedPuzzleGolemState must return non-null for joint-golem puzzles').not.toBeNull();
      const survivingConfigs = golemState!.filter(w => w !== null).length;
      expect(survivingConfigs, 'at least 1 config must survive after filtering').toBeGreaterThan(0);
    });
  }
});
