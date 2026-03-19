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

  // ── The claiming requirement ──────────────────────────────────────────────
  {
    kind: 'explain',
    id: 'debm-claiming',
    title: 'You Must Claim the Result First',
    emoji: '🎯',
    body: `Before the mix is performed, the debunker must publicly declare which potion they believe the pair will produce.

This claim is what determines how much information the result carries:

  • Correct claim (success): the audience learns the exact true result. Every world in which that pair produces a different potion is eliminated — a strong constraint.

  • Wrong claim (failure): the audience only learns that the true result was not the claim. Just one of the seven possible results is ruled out — a much weaker constraint.

The gap is significant. A well-chosen master debunk that succeeds pins the exact mixing result. A failed one still narrows things down, but only slightly.`,
  },

  // ── Success vs failure ───────────────────────────────────────────────────
  {
    kind: 'explain',
    id: 'debm-success-failure',
    title: 'Success vs Failure — Publications',
    emoji: '⚖️',
    body: `After a master debunk, one of two things happens for the publications:

  • Success: the true mix result contradicts one publication and not the other → that publication is removed.

  • Failure: the true result does not contradict either publication (or contradicts both simultaneously — see the next step) → nothing is removed.

Either way, some information is gained: success reveals the exact true result; failure rules out exactly one possible result (the claimed one). Success is far more constraining.`,
  },

  // ── Conflict case ────────────────────────────────────────────────────────
  {
    kind: 'explain',
    id: 'debm-conflict',
    title: 'Caution: Master Debunks Can Conflict',
    emoji: '⚡',
    body: `A conflict happens when the true mix result implicates at least one publication, but the evidence cannot single out either one — so neither is removed.

This occurs when both publications are contradicted simultaneously: each claimed alchemical, tested against the true alchemical of the other ingredient, predicts the wrong result. With both equally implicated, blame cannot be assigned to either, and both stay on the board.

The clearest example: mixing two ingredients whose true alchemicals are direct opposites produces neutral. Any publication claiming a non-opposing alchemical predicts a non-neutral result — both are caught, neither can be removed.

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
