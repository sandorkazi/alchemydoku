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

The claim outcome determines how much information the result carries about the possible worlds:

  • Correct claim: the audience learns the exact true result. Every world in which that pair produces a different potion is eliminated — a strong constraint.

  • Wrong claim: the audience only learns that the true result was not what was claimed. Just one of the seven possible results is ruled out — a much weaker constraint.

The gap is significant. A correct claim pins the exact mixing result. A wrong claim still narrows things down, but only slightly.

Importantly, what happens to the publications is a separate question — covered next.`,
  },

  // ── When a debunk achieves something ─────────────────────────────────────
  {
    kind: 'explain',
    id: 'debm-effect',
    title: 'When Does a Debunk Achieve Something?',
    emoji: '⚖️',
    body: `A master debunk achieves something against the publications in exactly two cases:

  • A publication is removed: the true result exposes a publication as impossible. There are two ways this can happen:
      – Direct disproval: the claimed alchemical cannot produce the observed result with ANY partner. The audience can verify this from the result alone — no knowledge of the other ingredient is needed.
      – Blame-based disproval: the other ingredient's alchemical is definitively known. The audience tests the claim directly: if the claimed alchemical would predict a different result when mixed with that known alchemical, the claim is disproved.

  • A conflict is created: both publications are simultaneously caught — each claim individually could produce the observed result with some partner, but together they predict the wrong result. Neither can be singled out, but the conflict itself is recorded. There is even a puzzle type where creating a conflict is the goal.

If neither happens — neither publication is caught, or the other ingredient is unknown and the claim is not individually incompatible with the result — the debunk has no effect on the publications.

Whether the claim was correct or wrong does not determine which of these outcomes occurs. Both claim outcomes can lead to removal, conflict, or no effect.`,
  },

  // ── Conflict case ────────────────────────────────────────────────────────
  {
    kind: 'explain',
    id: 'debm-conflict',
    title: 'Conflicts Can Arise From Either Claim',
    emoji: '⚡',
    body: `A conflict does not require a correct claim — it only requires that both publications are simultaneously contradicted.

Example with a wrong claim: both published alchemicals would predict that the pair produces Red+. The debunker claims Red+, but the true result is something else entirely. Since neither publication correctly predicted the true result, both are implicated — and neither can be removed. A conflict is created from a wrong claim.

Example without a claim context: two ingredients whose true alchemicals are direct opposites always produce neutral. Any publication claiming a non-opposing alchemical predicts a non-neutral result — both are caught simultaneously regardless of what was claimed.

Conflicts can happen accidentally (wasting a step) or intentionally — there is a puzzle type called "debunk conflict only" where producing a conflict without removing anything is the goal.

Plan your master debunks carefully to avoid accidental conflicts.`,
  },

  // ── How to approach a planning puzzle ───────────────────────────────────
  {
    kind: 'explain',
    id: 'debm-planning',
    title: 'Debunk Planning Puzzles',
    emoji: '🗺️',
    body: `In a debunk planning puzzle, your clues carry enough information to prove which publications are false — the same evidence that would guide you at the table.

Before planning any debunk, check whether a clue directly contradicts a publication. If a clue reveals the true aspect sign of an ingredient, and the publication claims an alchemical whose sign for that same aspect is different, the publication is provably false. No guesswork needed.

Once you have identified which publications are false, the planning question becomes: what is the minimum sequence of master debunks to publicly expose each one?

Master debunk strategy: two paths to exposing a false publication:

  • Direct path — no reference needed: if the observed result is one that the claimed alchemical can never produce with any partner, the claim is directly disproved. The audience verifies this from the result alone.

  • Reference path — needs a known partner: if the other ingredient is definitively known, the audience can mix the claimed alchemical against that known reference. If the predicted result doesn't match the true result, the claim is disproved.

In practice, plan your mix so that the true result makes the false claim look impossible — either directly incompatible with the result, or contradicted by a known reference.`,
  },

  // ── Puzzle: apply a master debunk's planning ─────────────────────────────
  {
    kind: 'puzzle',
    id: 'debm-puzzle-negative',
    puzzleId: 'debunk-plan-easy-02',
    banner: 'First, use the clues to prove which publications are false. Then find the minimum sequence of master debunks to expose them — one ingredient is fully known and ready to serve as your reference.',
  },

  // ── Not every publication is false (master context) ──────────────────────
  {
    kind: 'explain',
    id: 'debm-not-all-false',
    title: 'Some Publications Are Correct',
    emoji: '🤝',
    body: `In planning puzzles, the clues always provide enough evidence to evaluate every publication — but not every publication on the board is wrong.

Before planning any master debunk, verify each publication:
  1. Use the aspect clues to determine the true alchemical for each published ingredient.
  2. Compare it to what the publication claims.
  3. Only the publications whose claimed alchemical differs from the truth are targets.

A correct publication is not a target and cannot be removed — even if you mix the published ingredient with a known reference, a true publication's prediction will match the true result and nothing happens.

Check first, then plan.`,
  },

  // ── Puzzle: master debunk with one true, one false publication ───────────
  {
    kind: 'puzzle',
    id: 'debm-puzzle-mixed',
    puzzleId: 'debunk-plan-easy-04',
    banner: 'Three ingredients are fully revealed. Two have publications — check each against the clues. Only the one contradicted by the evidence is a target. A single master debunk is enough.',
  },

];
