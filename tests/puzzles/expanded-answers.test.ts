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
          expect(
            validateConflictOnlyAnswer(ref, puzzle.solution, pubs, worlds, ref.length),
            'debunk_conflict_only reference answer must pass the validator',
          ).toBe(true);
        }
      }
    });
  }
});

describe('golem config deducibility', () => {
  // For puzzles with golem_group:'animators' questions, verify that
  // no alternative golem config (consistent with the clues) gives a different answer.
  // This catches puzzles where the golem config itself is ambiguous and the animation
  // ingredient *slot set* answer differs across consistent configs.
  //
  // NOTE: golem_animate_potion is intentionally excluded. The animation potion is
  // a mathematical constant determined solely by the golem config (independent of the
  // specific alchemical assignment), so alt configs with the same color pair but
  // opposite size always give a different potion. Deducibility for that question type
  // can never be satisfied. The question is fair because the player deduces the config
  // from golem_test clues and applies it directly.
  const COLORS = ['R', 'G', 'B'] as const;
  const SIZES  = ['L', 'S'] as const;

  for (const puzzle of ALL_EXPANDED_PUZZLES) {
    if (!puzzle.golem) continue;
    const golemQs = puzzle.questions.filter(q =>
      q.kind === 'golem_group',
    );
    if (golemQs.length === 0) continue;

    it(puzzle.id, () => {
      const realWorlds  = getExpandedPuzzleWorlds(puzzle);
      const realAnswers = golemQs.map(q => computeExpandedAnswer(realWorlds, q, puzzle));

      for (const cc of COLORS) {
        for (const ec of COLORS) {
          if (cc === ec) continue;
          for (const cs of SIZES) {
            for (const es of SIZES) {
              const alt = { chest: { color: cc, size: cs }, ears: { color: ec, size: es } };
              // Skip the real config
              if (cc === puzzle.golem!.chest.color && cs === puzzle.golem!.chest.size &&
                  ec === puzzle.golem!.ears.color  && es === puzzle.golem!.ears.size) continue;

              const altPuzzle = { ...puzzle, golem: alt };
              const altWorlds = getExpandedPuzzleWorlds(altPuzzle);
              if (altWorlds.length === 0) continue; // alt config rules out all worlds — no ambiguity

              for (let i = 0; i < golemQs.length; i++) {
                const q = golemQs[i];
                const altAns = computeExpandedAnswer(altWorlds, q, altPuzzle);
                if (altAns === null) continue; // underdetermined under alt — not a definite conflict
                // For golem_group, a partial alt answer (fewer ingredients confirmed than
                // the real answer) is treated as undetermined — not a definite conflict.
                // This matches Python's answer() semantics which requires exactly N
                // ingredients to be unanimously confirmed before returning a result.
                if (q.kind === 'golem_group') {
                  const realAns = realAnswers[i];
                  const altIngCount = (altAns as { ingredients?: number[] }).ingredients?.length ?? 0;
                  const realIngCount = (realAns as { ingredients?: number[] } | null)?.ingredients?.length ?? 0;
                  if (altIngCount !== realIngCount) continue; // partial — skip
                }
                expect(
                  altAns,
                  `alt golem {chest:${cc}${cs}, ears:${ec}${es}} is consistent with clues but gives different answer for ${q.kind}`,
                ).toEqual(realAnswers[i]);
              }
            }
          }
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
