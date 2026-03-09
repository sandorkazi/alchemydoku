/**
 * expanded/puzzles/schemaExpanded.ts
 *
 * Answer computation and validation for expanded puzzle question types.
 * Base question types are delegated to the original schema module.
 */

import { generateAllWorlds } from '../../logic/worldSet';
import { computeAnswerFromWorlds as baseComputeAnswer, answersEqual as baseAnswersEqual } from '../../puzzles/schema';
import { applyAnyClues } from '../logic/worldSetExpanded';
import {
  computeGolemGroup, computeGolemAnimatePotion,
  computeGolemMixPotion, computeGolemPossiblePotions,
} from '../logic/golem';
import { isSolar } from '../logic/solarLunar';
import { WORLD_DATA, SIGN_TABLE, COLOR_INDEX } from '../../logic/worldPack';
import type { WorldSet, IngredientId, AlchemicalId, Color } from '../../types';
import type { PuzzleAnswer } from '../../puzzles/schema';
import type {
  ExpandedPuzzle, AnyQuestion, AnyAnswer, ExpandedAnswer,
  AspectColorAnswer, SolarLunarAnswer, IngredientSetAnswer,
  EncyclopediaFourthQuestion, EncyclopediaWhichAspectQuestion, SolarLunarQuestion,
  GolemGroupQuestion, GolemMixPotionQuestion, GolemPossiblePotionsQuestion,
} from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** True if every world agrees ingredient slot si has wantSign on ci. */
function allHaveSign(worlds: WorldSet, si: number, ci: number, wantSign: number): boolean {
  if (worlds.length === 0) return false;
  for (let i = 0; i < worlds.length; i++) {
    if (SIGN_TABLE[WORLD_DATA[worlds[i] * 8 + si] * 3 + ci] !== wantSign) return false;
  }
  return true;
}

// ─── Expanded answer computation ─────────────────────────────────────────────

/**
 * encyclopedia_fourth: 3 known entries + missing_sign given.
 * Find the unique ingredient (not in `known`) that every world agrees has
 * missing_sign on aspect.
 * Answer is a plain IngredientId (number), same representation as base
 * alchemical answers.
 */
function computeEncyclopediaFourth(
  worlds: WorldSet,
  q: EncyclopediaFourthQuestion,
): AnyAnswer | null {
  if (worlds.length === 0) return null;
  const ci        = COLOR_INDEX[q.aspect];
  const wantSign  = q.missing_sign === '+' ? 1 : 0;
  const knownIds  = new Set<number>(q.known.map(e => e.ingredient));
  const candidates: IngredientId[] = [];
  for (let s = 0; s < 8; s++) {
    const id = (s + 1) as IngredientId;
    if (knownIds.has(id)) continue;
    if (allHaveSign(worlds, s, ci, wantSign)) candidates.push(id);
  }
  if (candidates.length !== 1) return null;
  // Return as plain number (IngredientId = number in base types)
  return candidates[0] as unknown as PuzzleAnswer;
}

/**
 * encyclopedia_which_aspect: all 4 entries given with signs.
 * Find the unique Color where every world agrees each entry's ingredient
 * has the stated sign on that color.
 */
function computeEncyclopediaWhichAspect(
  worlds: WorldSet,
  q: EncyclopediaWhichAspectQuestion,
): AnyAnswer | null {
  if (worlds.length === 0) return null;
  const slots = q.entries.map(e => ({ si: e.ingredient - 1, wantSign: e.sign === '+' ? 1 : 0 }));
  for (const color of ['R', 'G', 'B'] as Color[]) {
    const ci = COLOR_INDEX[color];
    if (slots.every(({ si, wantSign }) => allHaveSign(worlds, si, ci, wantSign))) {
      return { kind: 'aspect_color', color } satisfies AspectColorAnswer;
    }
  }
  return null;
}

function computeSolarLunar(worlds: WorldSet, q: SolarLunarQuestion): AnyAnswer | null {
  if (worlds.length === 0) return null;
  const si    = q.ingredient - 1;
  const first = isSolar((WORLD_DATA[worlds[0] * 8 + si] + 1) as AlchemicalId);
  for (let i = 1; i < worlds.length; i++) {
    if (isSolar((WORLD_DATA[worlds[i] * 8 + si] + 1) as AlchemicalId) !== first) return null;
  }
  return { kind: 'solar_lunar_answer', result: first ? 'solar' : 'lunar' } satisfies SolarLunarAnswer;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getExpandedPuzzleWorlds(puzzle: ExpandedPuzzle): WorldSet {
  return applyAnyClues(generateAllWorlds(), puzzle.clues, { golem: puzzle.golem });
}

export function computeExpandedAnswer(worlds: WorldSet, question: AnyQuestion, puzzle?: ExpandedPuzzle): AnyAnswer | null {
  switch (question.kind) {
    case 'encyclopedia_fourth':       return computeEncyclopediaFourth(worlds, question);
    case 'encyclopedia_which_aspect': return computeEncyclopediaWhichAspect(worlds, question);
    case 'solar_lunar':               return computeSolarLunar(worlds, question);
    // Golem questions — require golem params
    case 'golem_group':
    case 'golem_animate_potion':
    case 'golem_mix_potion':
    case 'golem_possible_potions': {
      const params = puzzle?.golem;
      if (!params) return null;
      if (question.kind === 'golem_group')
        return computeGolemGroup(worlds, params, question as GolemGroupQuestion) as AnyAnswer | null;
      if (question.kind === 'golem_animate_potion')
        return computeGolemAnimatePotion(worlds, params) as AnyAnswer | null;
      if (question.kind === 'golem_mix_potion')
        return computeGolemMixPotion(worlds, params, question as GolemMixPotionQuestion) as AnyAnswer | null;
      if (question.kind === 'golem_possible_potions')
        return computeGolemPossiblePotions(worlds, params, question as GolemPossiblePotionsQuestion) as AnyAnswer | null;
      return null;
    }
    default:
      return baseComputeAnswer(worlds, question) as AnyAnswer | null;
  }
}

export function computeAllExpandedAnswers(puzzle: ExpandedPuzzle): AnyAnswer[] | null {
  const worlds = getExpandedPuzzleWorlds(puzzle);
  const answers: AnyAnswer[] = [];
  for (const q of puzzle.questions) {
    const a = computeExpandedAnswer(worlds, q, puzzle);
    if (a === null) return null;
    answers.push(a);
  }
  return answers;
}

export function expandedAnswersEqual(a: AnyAnswer, b: AnyAnswer): boolean {
  if (typeof a === 'object' && typeof b === 'object' && 'kind' in a && 'kind' in b) {
    if (a.kind === 'aspect_color' && b.kind === 'aspect_color') {
      return (a as AspectColorAnswer).color === (b as AspectColorAnswer).color;
    }
    if (a.kind === 'solar_lunar_answer' && b.kind === 'solar_lunar_answer') {
      return (a as SolarLunarAnswer).result === (b as SolarLunarAnswer).result;
    }
    if (a.kind === 'ingredient_set' && b.kind === 'ingredient_set') {
      const ia = (a as IngredientSetAnswer).ingredients;
      const ib = (b as IngredientSetAnswer).ingredients;
      if (ia.length !== ib.length) return false;
      return ia.every((v, i) => v === ib[i]);
    }
  }
  return baseAnswersEqual(a as PuzzleAnswer, b as PuzzleAnswer);
}

export function checkExpandedAnswers(
  puzzle: ExpandedPuzzle,
  playerAnswers: (AnyAnswer | null)[],
): boolean {
  const correct = computeAllExpandedAnswers(puzzle);
  if (!correct) return false;
  if (playerAnswers.length !== correct.length) return false;
  return playerAnswers.every((a, i) => a !== null && expandedAnswersEqual(a, correct[i]));
}

export function expandedQuestionText(
  question: AnyQuestion,
  ingredientName: (id: number) => string,
): string {
  switch (question.kind) {
    case 'encyclopedia_fourth': {
      const known = question.known.map(e =>
        `${ingredientName(e.ingredient)} (${e.sign === '+' ? '+' : '−'})`
      ).join(', ');
      const aspect = { R: 'Red', G: 'Green', B: 'Blue' }[question.aspect];
      const ms = question.missing_sign === '+' ? '+' : '−';
      return `${known} are known entries on ${aspect}. Which ingredient has ${aspect}${ms}?`;
    }
    case 'encyclopedia_which_aspect': {
      const entries = question.entries.map(e =>
        `${ingredientName(e.ingredient)}${e.sign === '+' ? '+' : '−'}`
      ).join(', ');
      return `${entries} form a valid article. Which aspect (color)?`;
    }
    case 'solar_lunar':
      return `Is ${ingredientName(question.ingredient)} Solar ☀️ or Lunar 🌙?`;
    case 'golem_group': {
      const labels: Record<string, string> = {
        animators: 'animate the golem', chest_only: 'trigger only the chest',
        ears_only: 'trigger only the ears', non_reactive: 'trigger no reaction',
        any_reactive: 'trigger any reaction',
      };
      return `Which ingredients ${labels[question.group]}?`;
    }
    case 'golem_animate_potion':
      return 'What potion do the two golem animators produce together?';
    case 'golem_mix_potion': {
      const t = question.target;
      const potStr = t.type === 'neutral' ? 'Neutral' : `${t.color}${t.sign === '+' ? '+' : '−'}`;
      const grpLabel: Record<string, string> = {
        animators: 'animators', chest_only: 'chest-only reactors',
        ears_only: 'ears-only reactors', non_reactive: 'non-reactive ingredients',
        any_reactive: 'any reactive ingredient',
      };
      return `Which ingredients can produce ${potStr} with at least one of the ${grpLabel[question.with_group]}?`;
    }
    case 'golem_possible_potions': {
      const grpLabel: Record<string, string> = {
        animators: 'animators', chest_only: 'chest-only reactors',
        ears_only: 'ears-only reactors', non_reactive: 'non-reactive ingredients',
        any_reactive: 'reactive ingredients',
      };
      const base = `What potions can the ${grpLabel[question.group]} produce`;
      return question.partner
        ? `${base} when mixed with ${ingredientName(question.partner)}?`
        : `${base} among themselves?`;
    }
    default: {
      const q = question as { kind: string; ingredient?: number; ingredient1?: number; ingredient2?: number; color?: string; sign?: string };
      if (q.kind === 'mixing-result')    return `What potion from ${ingredientName(q.ingredient1!)} + ${ingredientName(q.ingredient2!)}?`;
      if (q.kind === 'alchemical')       return `Alchemical of ${ingredientName(q.ingredient!)}?`;
      if (q.kind === 'aspect')           return `${q.color} aspect sign of ${ingredientName(q.ingredient!)}?`;
      if (q.kind === 'safe-publish')     return `Hedge which aspect of ${ingredientName(q.ingredient!)}?`;
      if (q.kind === 'possible-potions') return `Possible potions: ${ingredientName(q.ingredient1!)} + ${ingredientName(q.ingredient2!)}?`;
      if (q.kind === 'aspect-set')       return `Which ingredients have ${q.color}${q.sign}?`;
      if (q.kind === 'large-component')  return `Which have Large ${q.color}?`;
      return q.kind;
    }
  }
}
