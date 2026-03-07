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

export type Clue = MixingClue | AspectClue | FullAssignmentClue | SellClue | DebunkClue;

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
  | { kind: 'large-component'; color: Color };

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
