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
    banner: 'A theory has been published about ing1. Compare its claimed signs against your aspect clues — if any colour contradicts the claim, you can expose it with an apprentice debunk.',
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

  // ── Not every publication is false ───────────────────────────────────────
  {
    kind: 'explain',
    id: 'deba-not-all-false',
    title: 'Not Every Publication Is Wrong',
    emoji: '🤔',
    body: `An important habit: never assume a publication is false just because it is on the board.

A published theory might be correct. Before committing to a debunk, check the claim against your clues:

  • Determine the ingredient's true aspect sign for each colour from your notes.
  • Compare each sign to what the publication claims.

Only a colour where the true sign DIFFERS from the claimed sign is a valid debunk target.

If all signs match, the publication is accurate — attempting a debunk would reveal the true sign anyway, but the publication would survive. In a planning puzzle, an accurate publication is never a target.

Always check first. Debunk only the claims the evidence disproves.`,
  },

  // ── Fifth puzzle: true + false publication ───────────────────────────────
  {
    kind: 'puzzle',
    id: 'deba-puzzle-mixed',
    puzzleId: 'debunk-plan-easy-03',
    banner: 'Two theories have been published. Check both against the aspect clues — one matches the evidence, one does not. Expose only the false one.',
  },

  // ── When mixing won't help ───────────────────────────────────────────────
  {
    kind: 'explain',
    id: 'deba-neutral-mix',
    title: 'When Mixing Won\'t Help',
    emoji: '🌀',
    body: `Sometimes you might think: "I'll just mix the two published ingredients to expose them." But there's a catch.

If the two published ingredients' true alchemicals are direct opposites, mixing them produces a neutral potion. When both publications claim wrong alchemicals, the neutral result implicates both simultaneously — a conflict — so neither publication can be removed.

In those cases, forget the mixing table. If your existing clues already tell you an ingredient's true aspect sign, you can apprentice-debunk it directly: pick that ingredient, reveal the colour where the truth contradicts the claim, and the publication is removed.

No mixing required.`,
  },

  // ── Third puzzle: neutral mix, clue-guided debunk ────────────────────────
  {
    kind: 'puzzle',
    id: 'deba-puzzle-neutral',
    puzzleId: 'debunk-plan-tutorial-02',
    banner: 'Two theories have been published. Check each ingredient\'s aspect clues against the claimed signs. Mixing the two won\'t help here — use what the clues already tell you.',
  },

  // ── Fourth puzzle: apply a revealed sign ────────────────────────────────
  {
    kind: 'puzzle',
    id: 'deba-puzzle-apply',
    puzzleId: 'debunk-plan-easy-01',
    banner: 'Two theories have been published. Your aspect clues fully reveal both ingredients — check each claim and apply one apprentice debunk per contradiction.',
  },

];
