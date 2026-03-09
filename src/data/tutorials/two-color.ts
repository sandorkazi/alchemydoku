import type { TutorialStep } from '../../contexts/TutorialContext';

/**
 * Two-Colour Rule tutorial — teaches the colour-pair constraint that
 * follows from the mixing rule, and how to use it in both directions.
 */
export const TWO_COLOR_TUTORIAL_STEPS: TutorialStep[] = [
  {
    kind: 'explain',
    id: 'tc-intro',
    title: 'Beyond the Basics',
    body: `You already know the mixing rule: find the colour where signs match and sizes differ.

But here is a powerful shortcut: before you even check sizes, the sign comparison alone tells you which two colours are possible for the result.

This is the Two-Colour Rule.`,
    emoji: '🎨',
  },
  {
    kind: 'explain',
    id: 'tc-rule',
    title: 'The Two-Colour Rule',
    body: `When two alchemicals share a sign on a colour, the result can only be one of two colours — determined by which sign matched:

🔴 Red sign matches → result is Red or Green
🟢 Green sign matches → result is Green or Blue
🔵 Blue sign matches → result is Blue or Red

The result colour is always one of the adjacent pair. The third colour is completely ruled out.

You figure out which of the two by checking sizes — but you've already eliminated an entire colour before you do.`,
    emoji: '🔴🟢🔵',
  },
  {
    kind: 'explain',
    id: 'tc-why',
    title: 'Why Does This Work?',
    body: `The mixing rule says: the result colour is where signs match AND sizes differ.

If Red signs match, Red might resolve (if sizes differ) or not (if sizes also match). But if Red doesn't resolve, the only remaining candidates are Green and Blue — and since we already know Blue signs don't match (they're opposite), Green must be the resolver.

So a Red sign match always leads to Red or Green. Never Blue.

The same logic applies cyclically: Green match → Green or Blue, Blue match → Blue or Red.`,
    emoji: '💡',
  },
  {
    kind: 'puzzle',
    id: 'tc-puzzle-1',
    puzzleId: 'tutorial-two-color-01',
    banner: 'Both ingredients share R+. The two-colour rule tells you the result must be Red or Green — now find which one.',
  },
  {
    kind: 'explain',
    id: 'tc-after-1',
    title: 'Red Resolved Directly',
    body: `The Red signs matched, and the Red sizes differed — so Red resolved directly to R+.

The two-colour rule correctly predicted the colour pair (Red or Green). Sizes determined which member of the pair won.

Now let's see what happens when both Red signs match but the sizes also happen to be equal.`,
    emoji: '✅',
  },
  {
    kind: 'puzzle',
    id: 'tc-puzzle-2',
    puzzleId: 'tutorial-two-color-02',
    banner: 'Red signs match again — but this time both Red aspects are the same size. The rule still narrows it to Red or Green. Which one?',
  },
  {
    kind: 'explain',
    id: 'tc-after-2',
    title: 'Green Took Over',
    body: `Red signs matched, so the result had to be Red or Green — and Green won.

Red couldn't resolve because both Red aspects had the same size. Green's signs also matched, and Green's sizes differed, so Green resolved instead.

The two-colour rule gave you the pair. Sizes inside that pair decided the winner.`,
    emoji: '✅',
  },
  {
    kind: 'explain',
    id: 'tc-reverse',
    title: 'Using the Rule in Reverse',
    body: `You can also use the two-colour rule backwards: if you observe a result colour, you know which sign must have matched.

Saw a Red potion? → Either Red or Green sign matched on the two ingredients.
Saw a Green potion? → Either Green or Blue sign matched.
Saw a Blue potion? → Either Blue or Red sign matched.

This is powerful when combined with aspect clues: if you know an ingredient has R−, and the observed result was Red, then the other ingredient must have R− too (matching Red) or G± matching Green — and Blue is ruled out entirely.`,
    emoji: '🔍',
  },
];
