import type { TutorialStep } from '../../contexts/TutorialContext';

/**
 * Apprentice Debunking tutorial — teaches how a single card-reader reveal
 * exposes false publications, whether the debunk succeeds or fails.
 */
export const DEBUNK_APPRENTICE_TUTORIAL_STEPS: TutorialStep[] = [

  // ── What is a Publication? ───────────────────────────────────────────────
  {
    kind: 'explain',
    id: 'deba-publications',
    title: 'What Is a Publication?',
    emoji: '📜',
    body: `In Alchemists, players can publish theories about their ingredients on a public board.

Each publication claims: "Ingredient X contains Alchemical Y."

When a publication is wrong, an opponent can challenge it — this is called debunking. A successful debunk removes the false theory from the board and costs the publisher points.`,
  },

  // ── Apprentice debunking explained ──────────────────────────────────────
  {
    kind: 'explain',
    id: 'deba-how-it-works',
    title: 'Apprentice Debunking',
    emoji: '🔍',
    body: `To perform an apprentice debunk, you choose:
  • An ingredient (the one you are challenging)
  • A colour aspect (Red, Green, or Blue)

A card reader then reveals the TRUE sign for that colour of that ingredient — for everyone to see.

If the true sign contradicts what the publication claims, the publication is removed.
If it matches, the publication survives — but everyone still learned the true sign!

Either way, the revealed sign is new public information.`,
  },

  // ── First puzzle: successful debunk ─────────────────────────────────────
  {
    kind: 'puzzle',
    id: 'deba-puzzle-success',
    puzzleId: 'debunk-plan-tutorial-01',
    banner: 'A rival published a wrong theory. Use an apprentice debunk to expose it — pick the ingredient and a colour where the true sign differs from the claim.',
  },

  // ── Failed debunks reveal truth too ─────────────────────────────────────
  {
    kind: 'explain',
    id: 'deba-failed-reveal',
    title: 'Even Failed Debunks Reveal the Truth',
    emoji: '💡',
    body: `A failed debunk means the true sign happened to match what the publication claimed — so the publication stays.

But the card reader still showed everyone the true sign.

This means a failed debunk is not wasted information. You (and your opponents) now know one more aspect of that ingredient for certain.

The information value is identical whether the debunk succeeds or fails.`,
  },

  // ── When mixing won't help ───────────────────────────────────────────────
  {
    kind: 'explain',
    id: 'deba-neutral-mix',
    title: 'When Mixing Won\'t Help',
    emoji: '🌀',
    body: `Sometimes you might think: "I'll just mix the two published ingredients to expose them." But there's a catch.

If the two published ingredients' true alchemicals are direct opposites, mixing them produces a neutral potion. A neutral result doesn't contradict either publication — both theories survive untouched.

In those cases, forget the mixing table. If your existing clues already tell you an ingredient's true aspect sign, you can apprentice-debunk it directly: pick that ingredient, reveal the colour where the truth contradicts the claim, and the publication is removed.

No mixing required.`,
  },

  // ── Third puzzle: neutral mix, clue-guided debunk ────────────────────────
  {
    kind: 'puzzle',
    id: 'deba-puzzle-neutral',
    puzzleId: 'debunk-plan-tutorial-02',
    banner: 'Mixing these two ingredients would give neutral — no conflict possible. Use what your notes already tell you about each ingredient\'s aspects.',
  },

  // ── Fourth puzzle: apply a revealed sign ────────────────────────────────
  {
    kind: 'puzzle',
    id: 'deba-puzzle-apply',
    puzzleId: 'debunk-plan-easy-01',
    banner: 'Two publications, two targets. Apply an apprentice debunk to each — a single revealing step per publication is enough.',
  },

];
