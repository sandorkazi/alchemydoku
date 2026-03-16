import type { TutorialStep } from '../../contexts/TutorialContext';

export const ASPECT_BALANCE_TUTORIAL_STEPS: TutorialStep[] = [
  {
    kind: 'explain',
    id: 'balance-rule',
    title: 'Aspects Always Balance',
    body: `Every colour aspect is split evenly across the eight alchemicals: exactly four have a positive sign, and exactly four have a negative sign.

This is true for Red, Green, and Blue — always 4 positive and 4 negative, no exceptions.`,
    emoji: '⚖️',
  },
  {
    kind: 'explain',
    id: 'balance-deduction',
    title: 'Four Tells You Four',
    body: `If your clues confirm that four different ingredients all share the same aspect sign — say, all four are R− — those four ingredients account for every R− alchemical in the game.

That means the remaining four ingredients cannot be R−. They must all be R+.

Four clues just told you the sign of eight ingredients.`,
    emoji: '💡',
  },
  {
    kind: 'puzzle',
    id: 'balance-puzzle-1',
    puzzleId: 'tutorial-balance-01',
    banner: 'Four ingredients are confirmed R−. Use the balance rule to determine the sign of a fifth.',
  },
  {
    kind: 'explain',
    id: 'balance-any-color',
    title: 'Works for Any Colour',
    body: `The same logic applies to Green and Blue — and in either direction.

If you know four ingredients are all G+, the other four must be G−. The rule is symmetric: whichever sign is "full", the remaining ingredients must carry the opposite.

Keep an eye on your aspect clues. When they approach four of a kind, the rest of the board snaps into place.`,
    emoji: '🔄',
  },
  {
    kind: 'puzzle',
    id: 'balance-puzzle-2',
    puzzleId: 'tutorial-balance-02',
    banner: 'Four ingredients are confirmed G−. Which sign must a sixth ingredient carry?',
  },
];
