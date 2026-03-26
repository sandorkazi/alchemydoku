/**
 * expanded/logic/golem.ts
 *
 * Pure functions for golem reaction logic and answer computation.
 * No side effects, no context imports.
 */

import { WORLD_DATA, SIZE_TABLE, SIGN_TABLE, MIX_TABLE, COLOR_INDEX, filterWorlds } from '../../logic/worldPack';
import { getPossibleResults } from '../../logic/deducer';
import type { WorldSet, IngredientId, AlchemicalId, PotionResult, Color } from '../../types';
import type {
  GolemParams, GolemReactionGroup,
  GolemGroupQuestion, GolemMixPotionQuestion, GolemPossiblePotionsQuestion,
  IngredientSetAnswer,
} from '../types';

// ─── Reaction primitives ──────────────────────────────────────────────────────

/** Does alch0 (0-indexed) react to the given part of the golem? */
export function golemReacts0(
  alch0: number,
  params: GolemParams,
  part: 'chest' | 'ears',
): boolean {
  const { color, size } = params[part];
  const ci        = COLOR_INDEX[color];
  const wantSize  = size === 'L' ? 1 : 0;
  return SIZE_TABLE[alch0 * 3 + ci] === wantSize;
}

/** Does AlchemicalId (1-indexed) react to the given part? */
export function golemReacts(
  alchId: AlchemicalId,
  params: GolemParams,
  part: 'chest' | 'ears',
): boolean {
  return golemReacts0(alchId - 1, params, part);
}

// ─── Animation primitives (SIGN-based) ───────────────────────────────────────
// Distinct from reaction (SIZE-based): Large reaction implies '+' sign, Small implies '-'.

/** Animation sign value (1='+', 0='-') implied by a golem part's size. */
function animationSignVal(params: GolemParams, part: 'chest' | 'ears'): number {
  return params[part].size === 'L' ? 1 : 0;
}

/**
 * Does alch0 qualify as an animation ingredient?
 * An animation ingredient has the sign IMPLIED by the golem part size on both reaction colors.
 * Large → '+' (+1), Small → '-' (0). Entirely distinct from SIZE-based reaction.
 */
function isAnimationIngredient0(alch0: number, params: GolemParams): boolean {
  return (
    SIGN_TABLE[alch0 * 3 + COLOR_INDEX[params.chest.color]] === animationSignVal(params, 'chest') &&
    SIGN_TABLE[alch0 * 3 + COLOR_INDEX[params.ears.color]]  === animationSignVal(params, 'ears')
  );
}

/**
 * Returns every ingredient slot (1–8) that every remaining world agrees
 * is an animation ingredient (SIGN-based).
 * For any valid golem config, exactly 2 alchemicals satisfy both sign conditions.
 */
function getAnimationIngredients(worlds: WorldSet, params: GolemParams): IngredientId[] {
  if (worlds.length === 0) return [];
  const result: IngredientId[] = [];
  for (let s = 0; s < 8; s++) {
    if (!isAnimationIngredient0(WORLD_DATA[worlds[0] * 8 + s], params)) continue;
    let allAgree = true;
    for (let i = 1; i < worlds.length; i++) {
      if (!isAnimationIngredient0(WORLD_DATA[worlds[i] * 8 + s], params)) { allAgree = false; break; }
    }
    if (allAgree) result.push((s + 1) as IngredientId);
  }
  return result;
}

// ─── SIZE-based reaction classification ───────────────────────────────────────

/**
 * Classify an alch0 into its SIZE-based reaction group.
 * 'animators' here = reacts to BOTH chest and ears (SIZE match on each color).
 * This is used for golem_reaction_among clues and as a reaction group label,
 * NOT for the golem_group:'animators' question (which is SIGN-based).
 */
export function getReactionGroup0(
  alch0: number,
  params: GolemParams,
): GolemReactionGroup {
  const chest = golemReacts0(alch0, params, 'chest');
  const ears  = golemReacts0(alch0, params, 'ears');
  if (chest && ears)  return 'animators';
  if (chest)          return 'chest_only';
  if (ears)           return 'ears_only';
  return 'non_reactive';
}

function groupMatches(group: GolemReactionGroup, g: GolemReactionGroup): boolean {
  if (group === 'any_reactive') return g !== 'non_reactive';
  return g === group;
}

// ─── World-set helpers ────────────────────────────────────────────────────────

/**
 * Returns every ingredient slot (1–8) that every remaining world agrees
 * belongs to the given reaction group.
 */
export function getGroupIngredients(
  worlds: WorldSet,
  params: GolemParams,
  group: GolemReactionGroup,
): IngredientId[] {
  if (worlds.length === 0) return [];
  const result: IngredientId[] = [];
  for (let s = 0; s < 8; s++) {
    // Check first world
    const first = getReactionGroup0(WORLD_DATA[worlds[0] * 8 + s], params);
    if (!groupMatches(group, first)) continue;
    // Verify all other worlds agree
    let allAgree = true;
    for (let i = 1; i < worlds.length; i++) {
      const g = getReactionGroup0(WORLD_DATA[worlds[i] * 8 + s], params);
      if (!groupMatches(group, g)) { allAgree = false; break; }
    }
    if (allAgree) result.push((s + 1) as IngredientId);
  }
  return result;
}

/**
 * Returns all ingredient slots that could belong to the group in ANY remaining world.
 * Used for mix/potion computations where we need the candidate set.
 */
function getGroupIngredientsPossible(
  worlds: WorldSet,
  params: GolemParams,
  group: GolemReactionGroup,
): IngredientId[] {
  if (worlds.length === 0) return [];
  const inGroup = new Set<number>();
  for (let i = 0; i < worlds.length; i++) {
    for (let s = 0; s < 8; s++) {
      const g = getReactionGroup0(WORLD_DATA[worlds[i] * 8 + s], params);
      if (groupMatches(group, g)) inGroup.add(s + 1);
    }
  }
  return [...inGroup].sort((a, b) => a - b) as IngredientId[];
}

// ─── Answer computation ───────────────────────────────────────────────────────

export function computeGolemGroup(
  worlds: WorldSet,
  params: GolemParams,
  q: GolemGroupQuestion,
): IngredientSetAnswer | null {
  if (worlds.length === 0) return null;
  // 'animators' = SIGN-based animation ingredients (Large→+, Small→−).
  // All other groups = SIZE-based reaction classification.
  const ingredients = q.group === 'animators'
    ? getAnimationIngredients(worlds, params)
    : getGroupIngredients(worlds, params, q.group);
  if (ingredients.length === 0) return null;
  return { kind: 'ingredient_set', ingredients };
}

export function computeGolemAnimatePotion(
  worlds: WorldSet,
  params: GolemParams,
): PotionResult | null {
  if (worlds.length === 0) return null;

  // For each world find the 2 animation ingredient slots (SIGN-based) and the potion they produce.
  // We only require all worlds to agree on the *potion*, not on the identity
  // of the animation ingredients (which may still be ambiguous).
  let firstCode = -1;
  for (let i = 0; i < worlds.length; i++) {
    const animSlots: number[] = [];
    for (let s = 0; s < 8; s++) {
      if (isAnimationIngredient0(WORLD_DATA[worlds[i] * 8 + s], params)) {
        animSlots.push(s);
      }
    }
    if (animSlots.length !== 2) return null;
    const code = MIX_TABLE[WORLD_DATA[worlds[i] * 8 + animSlots[0]] * 8 + WORLD_DATA[worlds[i] * 8 + animSlots[1]]];
    if (firstCode === -1) {
      firstCode = code;
    } else if (code !== firstCode) {
      return null;
    }
  }

  if (firstCode === 0) return { type: 'neutral' };
  const colors: Color[] = ['R', 'R', 'G', 'G', 'B', 'B'];
  const signs: ('+' | '-')[] = ['+', '-', '+', '-', '+', '-'];
  return { type: 'potion', color: colors[firstCode - 1], sign: signs[firstCode - 1] };
}

const potionKey = (p: PotionResult) =>
  p.type === 'neutral' ? 'neutral' : `${p.color}${p.sign}`;

export function computeGolemMixPotion(
  worlds: WorldSet,
  params: GolemParams,
  q: GolemMixPotionQuestion,
): IngredientSetAnswer | null {
  if (worlds.length === 0) return null;
  const targetKey = potionKey(q.target);
  const groupMembers = getGroupIngredientsPossible(worlds, params, q.with_group);
  if (groupMembers.length === 0) return null;

  const result: IngredientId[] = [];
  for (let s = 1; s <= 8; s++) {
    const id = s as IngredientId;
    // Candidate must not already be confirmed IN the group (mixing with yourself is invalid)
    // Actually we allow cross-mix; same-ingredient mixing is handled by getPossibleResults returning []
    let canMakeTarget = false;
    for (const partner of groupMembers) {
      if (partner === id) continue; // can't mix with yourself
      const possible = getPossibleResults(worlds, id, partner);
      if (possible.some(p => potionKey(p) === targetKey)) {
        canMakeTarget = true;
        break;
      }
    }
    if (canMakeTarget) result.push(id);
  }

  if (result.length === 0) return null;
  return { kind: 'ingredient_set', ingredients: result };
}

export function computeGolemPossiblePotions(
  worlds: WorldSet,
  params: GolemParams,
  q: GolemPossiblePotionsQuestion,
): { kind: 'possible-potions'; potions: string[] } | null {
  if (worlds.length === 0) return null;
  const groupMembers = getGroupIngredientsPossible(worlds, params, q.group);
  if (groupMembers.length === 0) return null;

  const allKeys = new Set<string>();

  if (q.partner !== undefined) {
    // Cross-mix each group member with fixed partner
    for (const id of groupMembers) {
      if (id === q.partner) continue;
      const possible = getPossibleResults(worlds, id, q.partner);
      possible.forEach(p => allKeys.add(potionKey(p)));
    }
  } else {
    // Intra-group: all distinct pairs
    for (let i = 0; i < groupMembers.length; i++) {
      for (let j = i + 1; j < groupMembers.length; j++) {
        const possible = getPossibleResults(worlds, groupMembers[i], groupMembers[j]);
        possible.forEach(p => allKeys.add(potionKey(p)));
      }
    }
  }

  if (allKeys.size === 0) return null;
  return { kind: 'possible-potions', potions: [...allKeys].sort() };
}

// ─── World filter helper ──────────────────────────────────────────────────────

/**
 * Keep only worlds where ingredient reacts to the golem as stated.
 */
export function filterByGolemTest(
  worlds: WorldSet,
  ingredient: IngredientId,
  chestReacted: boolean,
  earsReacted: boolean,
  params: GolemParams,
): WorldSet {
  const si = ingredient - 1;
  return filterWorlds(worlds, w => {
    const alch0 = WORLD_DATA[w * 8 + si];
    return (
      golemReacts0(alch0, params, 'chest') === chestReacted &&
      golemReacts0(alch0, params, 'ears')  === earsReacted
    );
  });
}
