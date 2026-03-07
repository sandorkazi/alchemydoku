import type { TutorialStep } from '../../contexts/TutorialContext';

export const SELLING_TUTORIAL_STEPS: TutorialStep[] = [
  {
    kind: 'explain',
    id: 'sell-intro',
    title: 'Selling Potions',
    body: `When a player sells a potion, they mix two ingredients and claim a specific result to an adventurer. The actual mixing result determines what the adventurer observes.

In this trainer, we show you the observed outcome directly — four possible results, each giving you different information about what actually happened.`,
    emoji: '💰',
  },
  {
    kind: 'explain',
    id: 'sell-outcomes',
    title: 'The Four Outcomes',
    body: `After mixing and claiming a result, one of four things is observed:

Total match — actual potion exactly equals the claim (same colour AND sign).
Sign match — different colour potion, but same sign as claimed. The actual colour is unknown from this clue alone.
Neutral — the mix produced soup (neutral potion), regardless of what was claimed.
Opposite sign — the actual potion had the opposite sign to the claim. Any colour is possible.

Each outcome gives you different information to work with.`,
    emoji: '🧪',
  },
  {
    kind: 'puzzle',
    id: 'sell-puzzle-1',
    puzzleId: 'tutorial-sell-01',
    banner: 'R+ was claimed and the result was a total match. What do ingredients 1 and 2 actually produce?',
  },
  {
    kind: 'puzzle',
    id: 'sell-puzzle-2',
    puzzleId: 'tutorial-sell-02',
    banner: 'R+ was claimed but the result was a sign match. The ingredient sheet has one more clue — use both to find the actual result.',
  },
];
