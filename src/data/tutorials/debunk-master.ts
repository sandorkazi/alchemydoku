import type { TutorialStep } from '../../contexts/TutorialContext';

/**
 * Master Debunking tutorial — teaches how a publicly witnessed mix constrains
 * two alchemicals at once, and what success and failure each imply.
 */
export const DEBUNK_MASTER_TUTORIAL_STEPS: TutorialStep[] = [

  // ── How master debunking works ───────────────────────────────────────────
  {
    kind: 'explain',
    id: 'debm-how-it-works',
    title: 'Master Debunking',
    emoji: '⚗️',
    body: `A master debunk involves mixing two ingredients in public.

The audience sees the TRUE result of the mix. Any publication whose claimed alchemical would predict a different result is contradicted — and if only one publication is implicated, it is removed.

Unlike an apprentice debunk, a master debunk targets a pair of ingredients rather than a single aspect. It can remove a publication in one step if the other ingredient's alchemical is already known.`,
  },

  // ── Success vs failure ───────────────────────────────────────────────────
  {
    kind: 'explain',
    id: 'debm-success-failure',
    title: 'Success vs Failure — Both Constrain',
    emoji: '⚖️',
    body: `After a master debunk, one of two things happens:

  • Success: the true mix result contradicts one publication and not the other → that publication is removed. The result also acts as a mixing clue for your grid.

  • Failure: the true result does not contradict either publication (or contradicts both simultaneously — see the next step).

Important: even a failed master debunk gives you information. You now know the true result of mixing those two ingredients — a valuable mixing clue even if no publication was removed.`,
  },

  // ── Conflict case ────────────────────────────────────────────────────────
  {
    kind: 'explain',
    id: 'debm-conflict',
    title: 'Caution: Master Debunks Can Conflict',
    emoji: '⚡',
    body: `If both publications on the board are implicated by the same master mix — meaning both claim an alchemical that predicts the wrong result — neither is removed.

This is called a conflict. Both publications stay on the board.

Conflicts can happen accidentally (wasting a step) or intentionally — there is a puzzle type called "debunk conflict only" where your goal is specifically to produce this situation without removing anything.

Plan your master debunks carefully to avoid accidental conflicts.`,
  },

  // ── Puzzle: apply a master debunk's negative constraint ─────────────────
  {
    kind: 'puzzle',
    id: 'debm-puzzle-negative',
    puzzleId: 'debunk-plan-easy-02',
    banner: 'This puzzle requires a master debunk. Plan the shortest sequence that removes all publications — mix pairs wisely.',
  },

];
