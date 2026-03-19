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
    body: `In a debunk planning puzzle you are told upfront that all listed publications are false. Your job is to find the minimum number of debunk actions to remove every one of them.

Step 1 — Identify the definitively known ingredient: look at your clues. If an ingredient's aspect signs are fully determined (all three colours pinned down), its alchemical is known to everyone, including the audience.

Step 2 — Choose the right pairs: a master debunk can expose a publication for ingredient X only if the OTHER ingredient in the mix is definitively known. With that reference alchemical in hand, the audience can compare the expected result (predicted by the publication) against the true result.

Step 3 — Verify analytically: if the publication's claimed alchemical predicts result P when mixed with the known ingredient, and every possible true alchemical for the publication-holder (consistent with the remaining clues) gives a different result, then the debunk is guaranteed to expose the publication.

The "Step hints" toggle (on by default here) shows each step's effect as you build the plan — use it to confirm your reasoning.`,
  },

  // ── Puzzle: apply a master debunk's planning ─────────────────────────────
  {
    kind: 'puzzle',
    id: 'debm-puzzle-negative',
    puzzleId: 'debunk-plan-easy-02',
    banner: 'Both publications are false. One ingredient is definitively known — use it as your reference in each master debunk. Verify analytically that the plan is guaranteed to work, then submit.',
  },

];
