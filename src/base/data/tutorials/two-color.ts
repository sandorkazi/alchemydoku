import type { TutorialStep } from '@shared/contexts/TutorialContext';

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

Now let's see the rule at work when it's Blue signs that match — and how other clues let you eliminate one of the two candidates without checking sizes at all.`,
    emoji: '✅',
  },
  {
    kind: 'puzzle',
    id: 'tc-puzzle-2',
    puzzleId: 'tutorial-two-color-02',
    banner: 'Both ingredients are B+. The two-colour rule says the result is Blue or Red. The Red clues tell you which one wins.',
  },
  {
    kind: 'explain',
    id: 'tc-after-2',
    title: 'Blue Wins When Red Signs Differ',
    body: `Both ingredients were B+ — Blue signs matched — so the two-colour rule said: result is Blue or Red.

Then the Red clues did the work: one ingredient produced R− with its partner, the other produced R+. That means their Red signs are opposite, so Red cannot resolve.

With Red ruled out, Blue had to win. And since both ingredients were B+, the result is B+.

You didn't need to know the Blue sizes at all — opposite Red signs eliminated the other candidate entirely.`,
    emoji: '✅',
  },
  {
    kind: 'explain',
    id: 'tc-reverse',
    title: 'Using the Rule in Reverse',
    body: `You can also use the two-colour rule backwards: if you observe a result colour, you learn something about the NEXT colour in the cycle.

🔴 Saw Red → Green signs are different on the two ingredients (one G+, the other G−).
🟢 Saw Green → Blue signs are different on the two ingredients (one B+, the other B−).
🔵 Saw Blue → Red signs are different on the two ingredients (one R+, the other R−).

This is powerful when combined with aspect clues: if you know the result was Blue and one ingredient is PPP (all large positive), then the other ingredient must have B+ (same Blue sign) and a different Blue size — and its Red sign must be opposite to PPP's R+, meaning R−.

That can narrow the unknown ingredient down to a single alchemical.`,
    emoji: '🔍',
  },
  {
    kind: 'puzzle',
    id: 'tc-puzzle-3',
    puzzleId: 'tutorial-two-color-03',
    banner: 'One ingredient has G−. The other is PPP. Their mix is B+. Use the two-colour rule in reverse to identify the unknown alchemical.',
  },
  {
    kind: 'explain',
    id: 'tc-after-3',
    title: 'Working Backwards',
    body: `The result is B+, so Blue resolved. For Blue to be the result, Red signs must be different — if both ingredients shared the same Red sign, the two-colour rule would give Red or Green, not Blue.

Blue resolved also means both ingredients share B+ sign, and their Blue sizes differ. PPP is B+Large, so the unknown must be B+Small.

The G− clue then pinpoints the exact alchemical: only Nnp is G− with B+Small. And Nnp (R−L) paired with PPP (R+L) confirms opposite Red signs — which is exactly why the result was Blue and not Red or Green.`,
    emoji: '✅',
  },
];
