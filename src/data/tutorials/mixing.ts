import type { TutorialStep } from '../../contexts/TutorialContext';

/**
 * Mixing tutorial — teaches the core potion-result rule from scratch.
 * Structured as: explain → explain → explain → explain → puzzle → explain
 *                → explain → puzzle → explain → puzzle → explain
 */
export const MIXING_TUTORIAL_STEPS: TutorialStep[] = [

  // ── What is this game? ───────────────────────────────────────────────────
  {
    kind: 'explain',
    id: 'mix-welcome',
    title: 'Welcome to Alchemy Sudoku Training',
    emoji: '⚗️',
    body: `You are a trainee alchemist. Eight ingredients are laid out on your workbench — mushroom, fern, mandrake root, and others.

Each ingredient secretly contains an alchemical essence. Your goal is to figure out which essence hides in which ingredient, by running experiments and reasoning from the results.

You never see the essences directly. You deduce them.`,
  },

  // ── What is an alchemical? ───────────────────────────────────────────────
  {
    kind: 'explain',
    id: 'mix-aspects',
    title: 'Aspects: Sign and Size',
    emoji: '🔬',
    body: `Every alchemical has three colour aspects: Red, Green, and Blue.

Each aspect has two properties:
  • Sign: positive (+) or negative (−)
  • Size: Large (L) or Small (S)

So for example, an alchemical might have: R+Large, G−Small, B−Large.

Sign and size are independent — a Large aspect can be positive or negative, and so can a Small one.`,
  },

  // ── The 8 alchemicals ────────────────────────────────────────────────────
  {
    kind: 'explain',
    id: 'mix-eight',
    title: 'The 8 Alchemicals',
    emoji: '🧪',
    body: `There are exactly 8 alchemicals. Six of them each have one Large aspect and two Small aspects. The Large aspect is what distinguishes them:

  R+  (Large Red positive, others Small)
  R−  (Large Red negative, others Small)
  G+  (Large Green positive, others Small)
  G−  (Large Green negative, others Small)
  B+  (Large Blue positive, others Small)
  B−  (Large Blue negative, others Small)

The remaining two are extremes:
  PPP — all three aspects are Large and positive (+L, +L, +L)
  NNN — all three aspects are Large and negative (−L, −L, −L)`,
  },

  // ── The mixing rule, part 1: neutral ────────────────────────────────────
  {
    kind: 'explain',
    id: 'mix-neutral',
    title: 'Mixing: The Neutral Case',
    emoji: '⚖️',
    body: `When you mix two ingredients, you compare their alchemicals aspect by aspect.

Start with the simplest case: if every colour has opposite signs between the two alchemicals — Red is opposite, Green is opposite, Blue is opposite — the two essences cancel each other completely.

The result is Neutral. No potion is produced.

The clearest example: NNN is (−,−,−) and PPP is (+,+,+). Every sign is the opposite of the other. Mix them → Neutral.`,
  },

  // ── First puzzle: NNN + PPP → Neutral ────────────────────────────────────
  {
    kind: 'puzzle',
    id: 'mix-puzzle-neutral',
    puzzleId: 'tutorial-mix-01',
    banner: 'Ingredient 1 is NNN (−,−,−) and ingredient 2 is PPP (+,+,+). Every sign is opposite. What is the result?',
  },

  // ── After neutral ────────────────────────────────────────────────────────
  {
    kind: 'explain',
    id: 'mix-after-neutral',
    title: 'Good — Now the Interesting Case',
    emoji: '✅',
    body: `Neutral happens only when all three signs are opposite. That is a special case.

Most of the time, the two alchemicals share a sign on at least one colour. That shared colour is where a real potion can emerge.

The rule: find the colour where the signs match AND the sizes differ. That colour and its shared sign is your potion.

There is always exactly one such colour — the alchemical set is designed to guarantee it.`,
  },

  // ── The mixing rule, part 2: resolver ────────────────────────────────────
  {
    kind: 'explain',
    id: 'mix-resolver',
    title: 'Finding the Resolver',
    emoji: '🔍',
    body: `To find the resolver, check each colour in order:

1. Do the two alchemicals have the same sign on this colour?
   No → skip it (opposite signs cannot resolve)

2. Do they have different sizes on this colour?
   Yes → this colour resolves! The result is this colour with that shared sign.
   No → skip it (same sign AND same size also cannot resolve)

Work through R, then G, then B. One will always be the resolver.

Example: if both have R+, but one is Large and the other is Small → the result is R+.`,
  },

  // ── Second puzzle: find the resolver ────────────────────────────────────
  {
    kind: 'puzzle',
    id: 'mix-puzzle-resolver',
    puzzleId: 'tutorial-mix-02',
    banner: 'Check each colour in order. Where do the signs match AND sizes differ? That is your potion.',
  },

  // ── After resolver ───────────────────────────────────────────────────────
  {
    kind: 'explain',
    id: 'mix-after-resolver',
    title: 'Deduction, Not Just Calculation',
    emoji: '🧩',
    body: `In a real puzzle, you will not be told which alchemical belongs to which ingredient. You will be given results — "these two produced B−" — and you work backwards.

A single mixing result dramatically narrows the possibilities. If ingredients 1 and 2 produce R+, you know:
  • Their Red signs both match (both +)
  • Their Red sizes differ (one Large, one Small)
  • This rules out most of the 8 alchemicals immediately

The next puzzle introduces this kind of backwards reasoning.`,
  },

  // ── Third puzzle: deduce from results ────────────────────────────────────
  {
    kind: 'puzzle',
    id: 'mix-puzzle-deduce',
    puzzleId: 'tutorial-mix-03',
    banner: 'Two mixing results are given. Use them to figure out what ingredient 1 must be — then predict what it produces with NNN.',
  },

  // ── Wrap-up ───────────────────────────────────────────────────────────────
  {
    kind: 'explain',
    id: 'mix-done',
    title: 'The Foundation Is Set',
    emoji: '🎓',
    body: `You now know the core loop: mix two ingredients, observe the result, eliminate the alchemicals that could not have produced it.

As you solve more puzzles, you will layer on selling results, debunking evidence, and more — but everything builds on what you just learned.

Next: the two-colour rule — a shortcut that tells you which result colours are even possible before you check sizes.`,
  },

];
