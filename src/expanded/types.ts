/**
 * expanded/types.ts
 * All types specific to the expanded rules mode.
 * Nothing in this file is imported by the base game.
 */

import type {
  IngredientId, AlchemicalId, Color, Sign, Size, CellState,
  Clue as BaseClue, QuestionTarget as BaseQuestion,
  PotionResult,
} from '../types';
import type { PuzzleAnswer } from '../puzzles/schema';

// ─── Solar / Lunar ────────────────────────────────────────────────────────────

export type SolarLunar = 'solar' | 'lunar';
/** Per-column mark: each polarity tracked independently as a CellState. */
export type SolarLunarMark = { solar: CellState; lunar: CellState };
export type SolarLunarMarks = Record<number, SolarLunarMark | null>;

// ─── Encyclopedia entry ───────────────────────────────────────────────────────

/**
 * One slot in a Royal Encyclopedia article.
 * Covers one aspect; each entry assigns a sign (+/−) to one ingredient.
 * An article's 4 entries can have any mix of signs (all+, all−, 2+2−, etc.).
 */
export type EncyclopediaEntry = {
  ingredient: IngredientId;
  sign: Sign;
};

// ─── Expanded clue kinds ──────────────────────────────────────────────────────

/** Book token: whether this ingredient's alchemical is solar or lunar. */
export type BookClue = {
  kind: 'book';
  ingredient: IngredientId;
  result: SolarLunar;
};

/**
 * "Among" book clue: exactly `count` of the listed 2–4 ingredients are solar/lunar.
 * You observed the book result but not which ingredient caused it.
 * Typical usage: count=1, result='solar' or 'lunar'.
 */
export type BookAmongClue = {
  kind: 'book_among';
  ingredients: [IngredientId, IngredientId, ...IngredientId[]]; // 2–4
  result: SolarLunar;
  count: number;
};

/**
 * Trusted Royal Encyclopedia article.
 * All 4 (ingredient, sign) entries are guaranteed correct on the given aspect.
 */
export type EncyclopediaClue = {
  kind: 'encyclopedia';
  aspect: Color;
  entries: [EncyclopediaEntry, EncyclopediaEntry, EncyclopediaEntry, EncyclopediaEntry];
};

/**
 * Uncertain article (not yet debunked, unverified).
 * At least 3 of the 4 (ingredient, sign) entries are correct.
 * A player may hedge one slot with a coloured seal (physical mechanic only,
 * not modelled in world-set filtering).
 */
export type EncyclopediaUncertainClue = {
  kind: 'encyclopedia_uncertain';
  aspect: Color;
  entries: [EncyclopediaEntry, EncyclopediaEntry, EncyclopediaEntry, EncyclopediaEntry];
};

// ─── Debunk clues ─────────────────────────────────────────────────────────────

/**
 * Apprentice-variant debunk evidence.
 * Shows the TRUE aspect sign of one ingredient — which contradicts what an
 * article claimed. Display as a fact. Always filterable regardless of success
 * (success only affects whether the article was removed from the board).
 */
export type DebunkApprenticeClue = {
  kind: 'debunk_apprentice';
  /** The ingredient whose true sign was revealed. */
  ingredient: IngredientId;
  /** The aspect being shown. */
  aspect: Color;
  /** The TRUE sign on that aspect (contradicts the article's claim). */
  sign: Sign;
  /** Whether the debunk succeeded (article removed) or was blocked by hedging. */
  successful: boolean;
};

/**
 * Master-variant debunk evidence.
 * Shows a CLAIMED mixing result that contradicts one or two article entries
 * (possibly via the two-colour rule). Only the claim is shown — the true
 * result is not public, especially on an unsuccessful attempt.
 * World filter: apply mixing-result constraint only when successful === true.
 */
export type DebunkMasterClue = {
  kind: 'debunk_master';
  ingredient1: IngredientId;
  ingredient2: IngredientId;
  /** The result the debunker CLAIMED to have produced. */
  claimed_result: PotionResult;
  /** Whether the debunk was accepted (result verified and article removed). */
  successful: boolean;
};

// ─── Golem types ─────────────────────────────────────────────────────────────

export type GolemParams = {
  chest: { color: Color; size: Size };
  ears:  { color: Color; size: Size };
};

export type GolemReactionGroup =
  | 'animators'
  | 'chest_only'
  | 'ears_only'
  | 'non_reactive'
  | 'any_reactive';

/**
 * Result of testing one ingredient on the golem.
 * null = not observed for that part (partial test).
 * Both non-null: full test. One null: partial test.
 * World filter: filters on each non-null part independently.
 * Config filter: eliminates configs inconsistent with observed reactions.
 */
export type GolemTestClue = {
  kind: 'golem_test';
  ingredient: IngredientId;
  chest_reacted: boolean | null;   // null = not observed (partial test)
  ears_reacted:  boolean | null;   // null = not observed
};

/**
 * SIGN-based animation clue: does this ingredient animate the golem?
 * Animation rule: Large → '+', Small → '−' on each part's color.
 * The ingredient must match BOTH parts' implied signs.
 * Does NOT require knowing which config is correct — filters across all configs.
 */
export type GolemAnimationClue = {
  kind: 'golem_animation';
  ingredient: IngredientId;
  is_animator: boolean;
};

/**
 * Partial golem hint: reveals the COLOR the chest or ears reacts to.
 * Display only — does not filter world-set.
 */
export type GolemHintColorClue = {
  kind: 'golem_hint_color';
  part: 'chest' | 'ears';
  color: Color;
};

/**
 * Partial golem hint: reveals the SIZE (Large/Small) the chest or ears reacts to.
 * Display only — does not filter world-set.
 */
export type GolemHintSizeClue = {
  kind: 'golem_hint_size';
  part: 'chest' | 'ears';
  size: Size;
};

/**
 * "Among" clue: exactly `count` of the listed 2-4 ingredients trigger the given
 * golem reaction. You observed the test but not which ingredient caused it.
 * Typical puzzle usage: count=1, reaction='animators'.
 * Requires puzzle-level GolemParams to filter (like GolemTestClue).
 */
export type GolemReactionAmongClue = {
  kind: 'golem_reaction_among';
  ingredients: [IngredientId, IngredientId, ...IngredientId[]]; // 2-4
  reaction: GolemReactionGroup;
  count: number;
};

export type ExpandedClue =
  | BookClue
  | BookAmongClue
  | EncyclopediaClue
  | EncyclopediaUncertainClue
  | DebunkApprenticeClue
  | DebunkMasterClue
  | GolemTestClue
  | GolemAnimationClue
  | GolemHintColorClue
  | GolemHintSizeClue
  | GolemReactionAmongClue;

export type AnyClue = BaseClue | ExpandedClue;

// ─── Expanded question kinds ──────────────────────────────────────────────────

/**
 * 3 entries of an article on `aspect` are known (ingredient + sign each).
 * The 4th slot has sign `missing_sign` — which ingredient fills it?
 * Answer: IngredientId (plain number, same as alchemical answer type).
 */
export type EncyclopediaFourthQuestion = {
  kind: 'encyclopedia_fourth';
  aspect: Color;
  known: [EncyclopediaEntry, EncyclopediaEntry, EncyclopediaEntry];
  /** The sign the unknown 4th ingredient has on this aspect. */
  missing_sign: Sign;
};

/**
 * These 4 (ingredient, sign) entries are known to form a valid article.
 * Which aspect (color) does it cover?
 * Answer: AspectColorAnswer.
 */
export type EncyclopediaWhichAspectQuestion = {
  kind: 'encyclopedia_which_aspect';
  entries: [EncyclopediaEntry, EncyclopediaEntry, EncyclopediaEntry, EncyclopediaEntry];
};

/** Is this ingredient's alchemical Solar or Lunar? Answer: SolarLunarAnswer. */
export type SolarLunarQuestion = {
  kind: 'solar_lunar';
  ingredient: IngredientId;
};

/** Which ingredient gives most information if you consult the book about it? Answer: IngredientId */
export type MostInformativeBookQuestion = {
  kind: 'most_informative_book';
};

// ─── Golem question types ────────────────────────────────────────────────────

/** Which ingredients are in the given reaction group? Answer: IngredientSetAnswer */
export type GolemGroupQuestion = {
  kind: 'golem_group';
  group: GolemReactionGroup;
};

/** What potion do the two animating ingredients produce together? Answer: PotionResult */
export type GolemAnimatePotionQuestion = {
  kind: 'golem_animate_potion';
};

/**
 * Which ingredients can produce [target] when mixed with at least one member of [with_group]?
 * Answer: IngredientSetAnswer
 */
export type GolemMixPotionQuestion = {
  kind: 'golem_mix_potion';
  target: PotionResult;
  with_group: GolemReactionGroup;
};

/**
 * What potions are achievable mixing all pairs within [group],
 * or if partner given: mixing each group member with partner?
 * Answer: { kind: 'possible-potions'; potions: string[] }
 */
export type GolemPossiblePotionsQuestion = {
  kind: 'golem_possible_potions';
  group: GolemReactionGroup;
  partner?: IngredientId;
};

// ─── New joint-world×config golem question types ─────────────────────────────

/**
 * Which golem config (chest+ears) is consistent with all clues?
 * Answer: GolemConfigAnswer — unique config surviving after all clue filtering.
 */
export type GolemReactionComponentQuestion = {
  kind: 'golem_reaction_component';
};

/**
 * Which 2 alchemicals are SIZE-based both_reactive (react to BOTH chest and ears)?
 * Answer: AlchemicalSetAnswer — 2 alchemicals agreed by all surviving (config, world) pairs.
 */
export type GolemReactionBothAlchQuestion = {
  kind: 'golem_reaction_both_alch';
};

/**
 * Which 2 ingredient slots are SIZE-based both_reactive in ALL surviving (config, world) pairs?
 * Answer: IngredientSetAnswer — exactly 2 slots confirmed both_reactive.
 */
export type GolemReactionBothIngQuestion = {
  kind: 'golem_reaction_both_ing';
};

/**
 * Which 2 alchemicals are SIGN-based animators in ALL surviving (config, world) pairs?
 * Answer: AlchemicalSetAnswer — 2 alchemicals agreed by all surviving configs.
 */
export type GolemAnimationAlchQuestion = {
  kind: 'golem_animation_alch';
};

/**
 * Which 2 ingredient slots are SIGN-based animators in ALL surviving (config, world) pairs?
 * Answer: IngredientSetAnswer — exactly 2 slots confirmed animators.
 */
export type GolemAnimationIngQuestion = {
  kind: 'golem_animation_ing';
};

export type ExpandedQuestion =
  | EncyclopediaFourthQuestion
  | EncyclopediaWhichAspectQuestion
  | SolarLunarQuestion
  | MostInformativeBookQuestion
  | GolemGroupQuestion
  | GolemAnimatePotionQuestion
  | GolemMixPotionQuestion
  | GolemPossiblePotionsQuestion
  | GolemReactionComponentQuestion
  | GolemReactionBothAlchQuestion
  | GolemReactionBothIngQuestion
  | GolemAnimationAlchQuestion
  | GolemAnimationIngQuestion;

export type AnyQuestion = BaseQuestion | ExpandedQuestion;

// ─── Expanded answer types ────────────────────────────────────────────────────

/** Sorted set of ingredient IDs — for golem_group, golem_mix_potion answers. */
export type IngredientSetAnswer = {
  kind: 'ingredient_set';
  ingredients: IngredientId[];  // always sorted ascending
};

/** Which aspect color an article covers (for encyclopedia_which_aspect). */
export type AspectColorAnswer = {
  kind: 'aspect_color';
  color: Color;
};

/** Solar or lunar classification (for solar_lunar). */
export type SolarLunarAnswer = {
  kind: 'solar_lunar_answer';
  result: SolarLunar;
};

/** Golem configuration (chest + ears) — for golem_reaction_component. */
export type GolemConfigAnswer = {
  kind: 'golem_config';
  chest: { color: Color; size: Size };
  ears:  { color: Color; size: Size };
};

/** Sorted pair of alchemical IDs — for golem_reaction_both_alch, golem_animation_alch. */
export type AlchemicalSetAnswer = {
  kind: 'alchemical_set';
  alchemicals: AlchemicalId[];  // always sorted ascending, length 2
};

export type ExpandedAnswer =
  | AspectColorAnswer
  | SolarLunarAnswer
  | IngredientSetAnswer
  | GolemConfigAnswer
  | AlchemicalSetAnswer;

/**
 * Any answer: base PuzzleAnswer or an expanded answer.
 * encyclopedia_fourth answers are plain IngredientId (number) — same as base
 * alchemical answers; question kind distinguishes them in context.
 */
export type AnyAnswer = PuzzleAnswer | ExpandedAnswer;

// ─── GolemSolverState ─────────────────────────────────────────────────────────

/**
 * Joint world × config state for golem puzzles.
 * For each of 24 valid golem configs, stores the set of consistent world indices.
 * null entry = config eliminated. Length always = ALL_GOLEM_CONFIGS.length (24).
 */
export type GolemSolverState = ReadonlyArray<Uint16Array | null>;

// ─── Expanded puzzle ──────────────────────────────────────────────────────────

import type { Puzzle } from '../types';

/**
 * A debunkable encyclopedia article (expanded-mode debunk puzzles only).
 * One article covers one aspect (color). Each entry claims a sign for one ingredient.
 * The article is removed when ANY entry is directly and unambiguously disproved.
 */
export type DebunkArticle = {
  id: string;
  aspect: import('../types').Color;
  entries: { ingredient: import('../types').IngredientId; sign: '+' | '-' }[];
};

export type ExpandedPuzzle = Omit<Puzzle, 'clues' | 'questions'> & {
  clues: AnyClue[];
  questions: AnyQuestion[];
  mode: 'expanded';
  /** Hidden golem configuration. Present for all golem puzzles. */
  golem?: GolemParams;
  /** Expanded debunk: encyclopedia articles that can be disproved alongside publications. */
  articles?: DebunkArticle[];
};
