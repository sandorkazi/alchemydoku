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

/** True if the puzzle contains any non-compliant clue kind. */
export function isPuzzleNonCompliant(
  puzzle: { clues: { kind: string }[] },
  mode: 'base' | 'expanded',
): boolean {
  const set = mode === 'expanded' ? NON_COMPLIANT_EXPANDED_CLUE_KINDS : NON_COMPLIANT_BASE_CLUE_KINDS;
  return puzzle.clues.some(c => set.has(c.kind));
}
