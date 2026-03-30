/**
 * Board-game compliance registry.
 *
 * PROTOCOL: When adding a new clue kind:
 *   1. Decide whether it maps to a real Alchemists board game action.
 *   2. If NOT — add its `kind` string to the appropriate set below.
 *   3. Tag any collection that contains such puzzles with `boardGameCompliant: false`
 *      in collections.json (base) or puzzlesIndex.ts (expanded).
 */

export const NON_COMPLIANT_BASE_CLUE_KINDS: ReadonlySet<string> = new Set([
  'mixing_among', 'mixing_count_among', 'sell_result_among', 'sell_among',
]);

export const NON_COMPLIANT_EXPANDED_CLUE_KINDS: ReadonlySet<string> = new Set([
  ...NON_COMPLIANT_BASE_CLUE_KINDS, 'book_among', 'golem_reaction_among',
]);

/** True if the puzzle contains any non-compliant clue kind or an unrealistic publication/article layout. */
export function isPuzzleNonCompliant(
  puzzle: {
    clues: { kind: string; chest_reacted?: boolean | null; ears_reacted?: boolean | null }[];
    publications?: (null | { ingredient: number; claimedAlchemical: number })[];
    articles?: { aspect: string; entries: { ingredient: number }[] }[];
  },
  mode: 'base' | 'expanded',
): boolean {
  const set = mode === 'expanded' ? NON_COMPLIANT_EXPANDED_CLUE_KINDS : NON_COMPLIANT_BASE_CLUE_KINDS;
  if (puzzle.clues.some(c => set.has(c.kind))) return true;

  // A golem_test that only reveals one part's reaction is unrealistic — the board
  // game always reveals both reactions simultaneously.
  if (puzzle.clues.some(c =>
    c.kind === 'golem_test' &&
    (c.chest_reacted === null || c.ears_reacted === null)
  )) return true;

  if (puzzle.publications) {
    const pubs = puzzle.publications.filter((p): p is { ingredient: number; claimedAlchemical: number } => p !== null);
    // Each alchemical can only be published once in a real game.
    const alchemicals = pubs.map(p => p.claimedAlchemical);
    if (new Set(alchemicals).size < alchemicals.length) return true;
    // Each ingredient can only be published once in a real game.
    const ingredients = pubs.map(p => p.ingredient);
    if (new Set(ingredients).size < ingredients.length) return true;
  }

  if (puzzle.articles) {
    // Each color can appear in at most one article.
    const aspects = puzzle.articles.map(a => a.aspect);
    if (new Set(aspects).size < aspects.length) return true;
    // Each ingredient can appear in at most two articles (once per color aspect).
    const ingCounts = new Map<number, number>();
    for (const article of puzzle.articles) {
      for (const entry of article.entries) {
        ingCounts.set(entry.ingredient, (ingCounts.get(entry.ingredient) ?? 0) + 1);
      }
    }
    if ([...ingCounts.values()].some(n => n > 2)) return true;
  }

  return false;
}
