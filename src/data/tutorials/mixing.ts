import type { TutorialStep } from '../../contexts/TutorialContext';

/**
 * Mixing tutorial — teaches the core potion-result rule from scratch.
 *
 * Step kinds:
 *  'explain'  — full-screen card, player clicks Continue to advance
 *  'puzzle'   — loads a puzzle; player must answer correctly to advance
 */
export const MIXING_TUTORIAL_STEPS: TutorialStep[] = [
  {
    kind: 'explain',
    id: 'mix-intro',
    title: 'Welcome to Alchemists',
    body: `Each ingredient hides a secret alchemical. An alchemical has three colour aspects — Red, Green, and Blue — each with a sign (+ or −) and a size (large or small).

Your job as an alchemist: figure out which alchemical belongs to which ingredient, using the results of your experiments.`,
    emoji: '⚗️',
  },
  {
    kind: 'explain',
    id: 'mix-alchemicals',
    title: 'The 8 Alchemicals',
    body: `There are exactly 8 alchemicals. Six of them have one large aspect and two small ones — that large aspect's sign is what makes them unique (B−, B+, G−, G+, R−, R+).

The remaining two are special: NNN has three large negative aspects, and PPP has three large positive aspects.`,
    emoji: '🧪',
  },
  {
    kind: 'explain',
    id: 'mix-rule',
    title: 'The Mixing Rule',
    body: `When you mix two ingredients, compare their alchemicals colour by colour (R, G, B):

• If the signs are OPPOSITE for every colour → the result is Neutral (no potion).
• Otherwise, find the colour where signs MATCH but sizes DIFFER. That colour and sign is your potion.

There is always exactly one such colour, or all are opposite.`,
    emoji: '🔬',
  },
  {
    kind: 'puzzle',
    id: 'mix-puzzle-1',
    puzzleId: 'tutorial-mix-01',
    banner: 'NNN and PPP are complete opposites on every colour. Apply the mixing rule — what do you get?',
  },
  {
    kind: 'explain',
    id: 'mix-after-neutral',
    title: 'All Opposite → Neutral',
    body: `Exactly right. When every colour aspect has opposite signs, there is no "resolver" colour, so the two alchemicals cancel each other out completely.

This always gives a Neutral result — regardless of sizes.`,
    emoji: '⚖️',
  },
  {
    kind: 'puzzle',
    id: 'mix-puzzle-2',
    puzzleId: 'tutorial-mix-02',
    banner: 'Now find the resolver colour. Check R, then G, then B — where do the signs match?',
  },
  {
    kind: 'puzzle',
    id: 'mix-puzzle-3',
    puzzleId: 'tutorial-mix-03',
    banner: 'This time you need to deduce the alchemical from two mixing results first, then predict a third.',
  },
];
