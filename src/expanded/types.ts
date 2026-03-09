/**
 * expanded/types.ts
 * All types specific to the expanded rules mode.
 * Nothing in this file is imported by the base game.
 */

import type {
  IngredientId, Color, Sign, Size,
  Clue as BaseClue, QuestionTarget as BaseQuestion,
  PotionResult,
} from '../types';
import type { PuzzleAnswer } from '../puzzles/schema';

// ─── Solar / Lunar ────────────────────────────────────────────────────────────

export type SolarLunar = 'solar' | 'lunar';
export type SolarLunarMark = 'solar' | 'lunar' | null;
export type SolarLunarMarks = Record<number, SolarLunarMark>;

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
 * Both flags false = non_reactive; both true = animator.
 * World filter: uses puzzle-level GolemParams via applyAnyClues context.
 */
export type GolemTestClue = {
  kind: 'golem_test';
  ingredient: IngredientId;
  chest_reacted: boolean;
  ears_reacted: boolean;
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

export type ExpandedClue =
  | BookClue
  | EncyclopediaClue
  | EncyclopediaUncertainClue
  | DebunkApprenticeClue
  | DebunkMasterClue
  | GolemTestClue
  | GolemHintColorClue
  | GolemHintSizeClue;

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

export type ExpandedQuestion =
  | EncyclopediaFourthQuestion
  | EncyclopediaWhichAspectQuestion
  | SolarLunarQuestion
  | GolemGroupQuestion
  | GolemAnimatePotionQuestion
  | GolemMixPotionQuestion
  | GolemPossiblePotionsQuestion;

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

export type ExpandedAnswer = AspectColorAnswer | SolarLunarAnswer | IngredientSetAnswer;

/**
 * Any answer: base PuzzleAnswer or an expanded answer.
 * encyclopedia_fourth answers are plain IngredientId (number) — same as base
 * alchemical answers; question kind distinguishes them in context.
 */
export type AnyAnswer = PuzzleAnswer | ExpandedAnswer;

// ─── Expanded puzzle ──────────────────────────────────────────────────────────

import type { Puzzle } from '../types';

export type ExpandedPuzzle = Omit<Puzzle, 'clues' | 'questions'> & {
  clues: AnyClue[];
  questions: AnyQuestion[];
  mode: 'expanded';
  /** Hidden golem configuration. Present for all golem puzzles. */
  golem?: GolemParams;
};
