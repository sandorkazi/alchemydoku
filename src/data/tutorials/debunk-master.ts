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

  • A publication is removed: the true result clearly contradicts one publication's prediction and not the other's — that publication is singled out and removed.

  • A conflict is created: both publications are contradicted simultaneously — each predicts the wrong result when tested against the true alchemical of the other ingredient. Neither can be singled out, but the conflict itself is recorded. There is even a puzzle type where creating a conflict is the goal.

If neither happens — neither publication is contradicted, or only one is but the other ingredient's alchemical is unknown — the debunk has no effect on the publications.

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

Master debunk strategy: a master debunk can expose a publication for ingredient X only if the OTHER ingredient in the mix is definitively known. With that reference alchemical in hand, the audience can verify whether the publication's predicted mix result matches the true one — and if not, the publication is publicly disproved.`,
  },

  // ── Puzzle: apply a master debunk's planning ─────────────────────────────
  {
    kind: 'puzzle',
    id: 'debm-puzzle-negative',
    puzzleId: 'debunk-plan-easy-02',
    banner: 'First, use the clues to prove which publications are false. Then find the minimum sequence of master debunks to expose them — one ingredient is fully known and ready to serve as your reference.',
  },

];
