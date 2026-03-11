// ─── Primitives ───────────────────────────────────────────────────────────────

export type Sign = '+' | '-';
export type Size = 'S' | 'L';
export type Color = 'R' | 'G' | 'B';

// ─── Alchemical ───────────────────────────────────────────────────────────────

export type AlchemicalId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type AspectValue = { sign: Sign; size: Size };

export type Alchemical = {
  id: AlchemicalId;
  code: string;
  R: AspectValue;
  G: AspectValue;
  B: AspectValue;
};

// ─── Ingredient ───────────────────────────────────────────────────────────────

export type IngredientId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type Ingredient = {
  id: IngredientId;
  name: string;
  iconUrl?: string;
};

// ─── Assignment & World ───────────────────────────────────────────────────────

/** A complete bijective mapping: each ingredient maps to exactly one alchemical */
export type Assignment = Record<IngredientId, AlchemicalId>;

/**
 * The set of possible worlds — a Uint16Array of world indices into WORLD_DATA.
 * Each entry (0–40319) identifies one permutation in the flat packed store.
 * Use worldAlch(idx, slot) from worldPack.ts for per-slot access.
 */
export type WorldSet = Uint16Array;

// ─── Potion Result ────────────────────────────────────────────────────────────

export type PotionResult =
  | { type: 'potion'; color: Color; sign: Sign }
  | { type: 'neutral' };

export const NEUTRAL: PotionResult = { type: 'neutral' };

// ─── Clue Types ───────────────────────────────────────────────────────────────

export type MixingClue = {
  kind: 'mixing';
  ingredient1: IngredientId;
  ingredient2: IngredientId;
  result: PotionResult;
};

export type AspectClue = {
  kind: 'aspect';
  ingredient: IngredientId;
  color: Color;
  sign: Sign;
  // size intentionally omitted — the public sheet only reveals sign
};

export type FullAssignmentClue = {
  kind: 'assignment';
  ingredient: IngredientId;
  alchemical: AlchemicalId;
};

export type SellResult = 'total_match' | 'sign_ok' | 'neutral' | 'opposite';

export type SellClue = {
  kind: 'sell';
  ingredient1: IngredientId;
  ingredient2: IngredientId;
  /** The non-neutral potion the player claimed (color + sign) */
  claimedResult: { type: 'potion'; color: Color; sign: Sign };
  /** Observed outcome of the actual mix vs the claim */
  sellResult: SellResult;
};

// ─── Debunk clue ─────────────────────────────────────────────────────────────

export type DebunkOutcome = 'success' | 'failure';

/** Apprentice debunking: reveals the true aspect sign for one colour of one ingredient.
 *  The outcome field is informational only — the filter is the same regardless:
 *  we always learn the true sign the card reader showed. */
export type ApprenticeDebunkClue = {
  kind:       'debunk';
  variant:    'apprentice';
  ingredient: number;
  color:      Color;
  sign:       Sign;
  outcome:    DebunkOutcome;
};

/** Master debunking: confirms or denies a specific mix result for a pair of ingredients.
 *  success → mix(i1, i2) === claimedPotion  (same as MixingClue)
 *  failure → mix(i1, i2) !== claimedPotion  (new negative constraint) */
export type MasterDebunkClue = {
  kind:          'debunk';
  variant:       'master';
  ingredient1:   number;
  ingredient2:   number;
  claimedPotion: PotionResult;
  outcome:       DebunkOutcome;
};

export type DebunkClue = ApprenticeDebunkClue | MasterDebunkClue;

/**
 * "Among" clue: at least one pair from the listed 2-4 ingredients mixed this result.
 * You witnessed the outcome across the table but not which specific pair was involved.
 */
export type MixingAmongClue = {
  kind: 'mixing_among';
  ingredients: [IngredientId, IngredientId, ...IngredientId[]]; // 2-4
  result: PotionResult;
};

/**
 * "Among" clue: exactly `count` of the listed 2-4 ingredients sold for this potion.
 * A sold result means the ingredient has that color+sign aspect; rejected means it does not.
 * Typical puzzle usage: count=2, result='sold'.
 */
export type SellAmongClue = {
  kind: 'sell_among';
  ingredients: [IngredientId, IngredientId, ...IngredientId[]]; // 2-4
  potion: { color: Color; sign: Sign };
  result: 'sold' | 'rejected';
  count: number;
};

/**
 * Ambiguous sell-attempt clue: some pair from these 3–5 ingredients was mixed,
 * claimed as `claimedPotion`, and the market's verdict was `sellResult`.
 * You saw the outcome but not which specific pair was used.
 *
 * Filter: keep worlds where ∃ at least one pair (i,j) whose mix produces the
 * sell result against claimedPotion.
 *
 * The most informative variants are `sign_ok` (only the sign matched — wrong
 * colour) and `opposite` (same colour but sign was flipped).
 */
export type SellResultAmongClue = {
  kind: 'sell_result_among';
  ingredients: [IngredientId, IngredientId, ...IngredientId[]]; // 2–5
  claimedPotion: { color: Color; sign: Sign };
  sellResult: SellResult;
};

export type Clue = MixingClue | AspectClue | FullAssignmentClue | SellClue | DebunkClue
                | MixingAmongClue | SellAmongClue | SellResultAmongClue;

// ─── Puzzle ───────────────────────────────────────────────────────────────────

export type Difficulty = 'tutorial' | 'easy' | 'medium' | 'hard';

export type QuestionTarget =
  | { kind: 'mixing-result'; ingredient1: IngredientId; ingredient2: IngredientId }
  | { kind: 'alchemical'; ingredient: IngredientId }
  | { kind: 'aspect'; ingredient: IngredientId; color: Color }
  | { kind: 'safe-publish'; ingredient: IngredientId }
  | { kind: 'possible-potions'; ingredient1: IngredientId; ingredient2: IngredientId }
  /** Which ingredients have this color+sign aspect (deduced, never directly clued)? */
  | { kind: 'aspect-set'; color: Color; sign: Sign }
  /** Which ingredients have the Large component for this color? (size never directly revealed) */
  | { kind: 'large-component'; color: Color }
  /** Debunk planning: find the shortest sequence of actions that removes all publications */
  | { kind: 'debunk_min_steps' }
  /** Debunk planning: perform a master mix that conflicts with fixedIngredient's publication
   *  without removing it (both publications conflict → neither removed) */
  | { kind: 'debunk_conflict_only'; fixedIngredient: IngredientId };

// ─── Debunk plan types ────────────────────────────────────────────────────────

/** A single debunking action in a plan */
export type DebunkStep =
  | { kind: 'apprentice'; ingredient: IngredientId; color: Color }
  | { kind: 'master'; ingredient1: IngredientId; ingredient2: IngredientId };

/** A wrong publication on the board: opponent claims ingredient has claimedAlchemical */
export type Publication = {
  ingredient: IngredientId;
  claimedAlchemical: AlchemicalId;
};

export type Puzzle = {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  clues: Clue[];
  questions: QuestionTarget[];
  solution: Assignment;
  hints?: { level: number; text: string }[];
  metadata?: {
    generatedAt?: string;
    worldsAfterClues?: number;
    minimumClues?: boolean;
  };
  /** Present for debunk-plan puzzles: opponent publications to disprove */
  publications?: (Publication | null)[];
  /** Pre-computed reference answers for debunk questions (keyed by question kind) */
  debunk_answers?: Record<string, DebunkStep[]>;
};

// ─── Solver State ─────────────────────────────────────────────────────────────

export type CellState = 'unknown' | 'possible' | 'eliminated' | 'confirmed';

export type SolverState = {
  puzzleId: string;
  remainingWorlds: WorldSet;
  playerAnswer: PotionResult | AlchemicalId | { sign: Sign } | null;
  completed: boolean;
  hintLevel: number;
  startedAt: string;
  completedAt?: string;
  gridState: Record<IngredientId, Record<AlchemicalId, CellState>>;
};
