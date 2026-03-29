/**
 * expanded/logic/golem.ts
 *
 * Pure functions for golem reaction logic and answer computation.
 * No side effects, no context imports.
 *
 * Two modes:
 * 1. Legacy mode (fixed GolemParams from puzzle.golem): filterByGolemTest etc.
 * 2. Joint world × config mode (GolemSolverState): 24 configs × world-sets.
 */

import { WORLD_DATA, SIZE_TABLE, SIGN_TABLE, MIX_TABLE, COLOR_INDEX, INDEX_COLOR, filterWorlds } from '../../logic/worldPack';
import { getPossibleResults } from '../../logic/deducer';
import type { WorldSet, IngredientId, AlchemicalId, PotionResult, Color, Size } from '../../types';
import type {
  GolemParams, GolemReactionGroup,
  GolemGroupQuestion, GolemMixPotionQuestion, GolemPossiblePotionsQuestion,
  IngredientSetAnswer, GolemConfigAnswer, AlchemicalSetAnswer, GolemSolverState,
} from '../types';

// ─── Config enumeration ───────────────────────────────────────────────────────

/**
 * All 24 valid golem configs.
 * chest.color ≠ ears.color; sizes may coincide.
 * Index matches the position in this array.
 */
export const ALL_GOLEM_CONFIGS: readonly GolemParams[] = (() => {
  const configs: GolemParams[] = [];
  for (const cc of ['R', 'G', 'B'] as Color[]) {
    for (const cs of ['L', 'S'] as Size[]) {
      for (const ec of ['R', 'G', 'B'] as Color[]) {
        if (ec === cc) continue;
        for (const es of ['L', 'S'] as Size[]) {
          configs.push({ chest: { color: cc, size: cs }, ears: { color: ec, size: es } });
        }
      }
    }
  }
  return configs;
})();

export const GOLEM_CONFIG_COUNT = ALL_GOLEM_CONFIGS.length; // 24

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
export function isAnimationIngredient0(alch0: number, params: GolemParams): boolean {
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

// ─── World-set helpers (legacy / single-config) ───────────────────────────────

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
    const first = getReactionGroup0(WORLD_DATA[worlds[0] * 8 + s], params);
    if (!groupMatches(group, first)) continue;
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

// ─── Legacy answer computation (requires known GolemParams) ───────────────────

export function computeGolemGroup(
  worlds: WorldSet,
  params: GolemParams,
  q: GolemGroupQuestion,
): IngredientSetAnswer | null {
  if (worlds.length === 0) return null;
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
    let canMakeTarget = false;
    for (const partner of groupMembers) {
      if (partner === id) continue;
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
    for (const id of groupMembers) {
      if (id === q.partner) continue;
      const possible = getPossibleResults(worlds, id, q.partner);
      possible.forEach(p => allKeys.add(potionKey(p)));
    }
  } else {
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

// ─── Legacy world filter ──────────────────────────────────────────────────────

/**
 * Keep only worlds where ingredient reacts to the golem as stated.
 * chest_reacted/ears_reacted may be null (not observed — skip that part).
 */
export function filterByGolemTest(
  worlds: WorldSet,
  ingredient: IngredientId,
  chestReacted: boolean | null,
  earsReacted: boolean | null,
  params: GolemParams,
): WorldSet {
  const si = ingredient - 1;
  return filterWorlds(worlds, w => {
    const alch0 = WORLD_DATA[w * 8 + si];
    if (chestReacted !== null && golemReacts0(alch0, params, 'chest') !== chestReacted) return false;
    if (earsReacted  !== null && golemReacts0(alch0, params, 'ears')  !== earsReacted)  return false;
    return true;
  });
}

// ─── GolemSolverState: joint world × config ───────────────────────────────────

/**
 * Create initial GolemSolverState.
 * If fixedConfig is given, only that config index is populated.
 * Otherwise all 24 configs start with the full base worlds.
 */
export function initGolemSolverState(
  baseWorlds: Uint16Array,
  fixedConfig?: GolemParams,
): GolemSolverState {
  const state = new Array<Uint16Array | null>(GOLEM_CONFIG_COUNT).fill(null);
  if (fixedConfig) {
    const idx = ALL_GOLEM_CONFIGS.findIndex(c =>
      c.chest.color === fixedConfig.chest.color &&
      c.chest.size  === fixedConfig.chest.size  &&
      c.ears.color  === fixedConfig.ears.color  &&
      c.ears.size   === fixedConfig.ears.size,
    );
    if (idx >= 0) state[idx] = baseWorlds;
  } else {
    for (let i = 0; i < GOLEM_CONFIG_COUNT; i++) state[i] = baseWorlds;
  }
  return state;
}

/**
 * Filter GolemSolverState by a golem_test clue.
 * chest_reacted/ears_reacted may be null (not observed — skip that part).
 * For each surviving config, keeps only worlds consistent with the test.
 * Also eliminates configs where the observed reaction is impossible for ALL worlds.
 */
export function filterGolemSolverByTest(
  state: GolemSolverState,
  ingredient: IngredientId,
  chestReacted: boolean | null,
  earsReacted: boolean | null,
): GolemSolverState {
  const si = ingredient - 1;
  const next = new Array<Uint16Array | null>(GOLEM_CONFIG_COUNT).fill(null);
  for (let ci = 0; ci < GOLEM_CONFIG_COUNT; ci++) {
    const worlds = state[ci];
    if (!worlds) continue;
    const cfg = ALL_GOLEM_CONFIGS[ci];
    const filtered = filterWorlds(worlds, w => {
      const alch0 = WORLD_DATA[w * 8 + si];
      if (chestReacted !== null && golemReacts0(alch0, cfg, 'chest') !== chestReacted) return false;
      if (earsReacted  !== null && golemReacts0(alch0, cfg, 'ears')  !== earsReacted)  return false;
      return true;
    });
    if (filtered.length > 0) next[ci] = filtered;
  }
  return next;
}

/**
 * Filter GolemSolverState by a golem_animation clue (SIGN-based).
 * For each surviving config, keeps only worlds where ingredient's alchemical
 * matches is_animator.
 */
export function filterGolemSolverByAnimation(
  state: GolemSolverState,
  ingredient: IngredientId,
  isAnimator: boolean,
): GolemSolverState {
  const si = ingredient - 1;
  const next = new Array<Uint16Array | null>(GOLEM_CONFIG_COUNT).fill(null);
  for (let ci = 0; ci < GOLEM_CONFIG_COUNT; ci++) {
    const worlds = state[ci];
    if (!worlds) continue;
    const cfg = ALL_GOLEM_CONFIGS[ci];
    const filtered = filterWorlds(worlds, w => {
      const alch0 = WORLD_DATA[w * 8 + si];
      return isAnimationIngredient0(alch0, cfg) === isAnimator;
    });
    if (filtered.length > 0) next[ci] = filtered;
  }
  return next;
}

/**
 * Filter GolemSolverState by a golem_hint_color clue.
 * Eliminates configs where the given part's color doesn't match.
 */
export function filterGolemSolverByHintColor(
  state: GolemSolverState,
  part: 'chest' | 'ears',
  color: Color,
): GolemSolverState {
  const next = new Array<Uint16Array | null>(GOLEM_CONFIG_COUNT).fill(null);
  for (let ci = 0; ci < GOLEM_CONFIG_COUNT; ci++) {
    const worlds = state[ci];
    if (!worlds) continue;
    if (ALL_GOLEM_CONFIGS[ci][part].color === color) next[ci] = worlds;
  }
  return next;
}

/**
 * Filter GolemSolverState by a golem_hint_size clue.
 * Eliminates configs where the given part's size doesn't match.
 */
export function filterGolemSolverByHintSize(
  state: GolemSolverState,
  part: 'chest' | 'ears',
  size: Size,
): GolemSolverState {
  const next = new Array<Uint16Array | null>(GOLEM_CONFIG_COUNT).fill(null);
  for (let ci = 0; ci < GOLEM_CONFIG_COUNT; ci++) {
    const worlds = state[ci];
    if (!worlds) continue;
    if (ALL_GOLEM_CONFIGS[ci][part].size === size) next[ci] = worlds;
  }
  return next;
}

/**
 * Apply a non-golem world predicate to each config's world set.
 * Used for base clues that don't depend on the config.
 */
export function applyWorldFilterToGolemState(
  state: GolemSolverState,
  predicate: (worldIdx: number) => boolean,
): GolemSolverState {
  const next = new Array<Uint16Array | null>(GOLEM_CONFIG_COUNT).fill(null);
  for (let ci = 0; ci < GOLEM_CONFIG_COUNT; ci++) {
    const worlds = state[ci];
    if (!worlds) continue;
    const filtered = filterWorlds(worlds, predicate);
    if (filtered.length > 0) next[ci] = filtered;
  }
  return next;
}

/**
 * Project GolemSolverState to a flat WorldSet (union of all non-null entries).
 * Uses a bitmask approach for deduplication.
 */
export function golemSolverToWorldSet(state: GolemSolverState): Uint16Array {
  const seen = new Uint8Array(40320);
  let count = 0;
  for (let ci = 0; ci < GOLEM_CONFIG_COUNT; ci++) {
    const worlds = state[ci];
    if (!worlds) continue;
    for (let i = 0; i < worlds.length; i++) {
      if (!seen[worlds[i]]) { seen[worlds[i]] = 1; count++; }
    }
  }
  const result = new Uint16Array(count);
  let j = 0;
  for (let w = 0; w < 40320; w++) {
    if (seen[w]) result[j++] = w;
  }
  return result;
}

/**
 * Returns the unique surviving config, or null if != 1 config remains.
 */
export function getUniqueGolemConfig(state: GolemSolverState): GolemParams | null {
  let found: GolemParams | null = null;
  for (let ci = 0; ci < GOLEM_CONFIG_COUNT; ci++) {
    if (state[ci]) {
      if (found) return null; // more than one
      found = ALL_GOLEM_CONFIGS[ci];
    }
  }
  return found;
}

// ─── GolemSolverState answer computation ──────────────────────────────────────

/**
 * golem_reaction_component: returns unique config if exactly 1 survives.
 */
export function computeGolemReactionComponent(state: GolemSolverState): GolemConfigAnswer | null {
  const cfg = getUniqueGolemConfig(state);
  if (!cfg) return null;
  return {
    kind: 'golem_config',
    chest: { color: cfg.chest.color, size: cfg.chest.size },
    ears:  { color: cfg.ears.color,  size: cfg.ears.size  },
  };
}

/**
 * golem_reaction_both_alch: returns the 2 SIZE-based both_reactive alchemicals
 * if ALL surviving (config, world) pairs agree on the same 2.
 *
 * For each config, the both_reactive alchemicals are determined by the config alone
 * (not by world). We check if all surviving configs agree on the same set.
 */
export function computeGolemReactionBothAlch(state: GolemSolverState): AlchemicalSetAnswer | null {
  let refKey: string | null = null;
  let refSet: AlchemicalId[] | null = null;
  for (let ci = 0; ci < GOLEM_CONFIG_COUNT; ci++) {
    if (!state[ci]) continue;
    const cfg = ALL_GOLEM_CONFIGS[ci];
    const both: AlchemicalId[] = [];
    for (let a0 = 0; a0 < 8; a0++) {
      if (golemReacts0(a0, cfg, 'chest') && golemReacts0(a0, cfg, 'ears')) {
        both.push((a0 + 1) as AlchemicalId);
      }
    }
    both.sort((a, b) => a - b);
    const key = both.join(',');
    if (refKey === null) { refKey = key; refSet = both; }
    else if (key !== refKey) return null;
  }
  if (!refSet) return null;
  return { kind: 'alchemical_set', alchemicals: refSet };
}

/**
 * golem_reaction_both_ing: slot s is "definitely both_reactive" iff in EVERY
 * (config, world) pair remaining, the alch at slot s is both_reactive for that config.
 * Returns exactly 2 such slots, or null.
 */
export function computeGolemReactionBothIng(state: GolemSolverState): IngredientSetAnswer | null {
  const definite: IngredientId[] = [];
  for (let s = 0; s < 8; s++) {
    let allBoth = true;
    let hasAny = false;
    for (let ci = 0; ci < GOLEM_CONFIG_COUNT; ci++) {
      const worlds = state[ci];
      if (!worlds) continue;
      const cfg = ALL_GOLEM_CONFIGS[ci];
      for (let i = 0; i < worlds.length; i++) {
        hasAny = true;
        const alch0 = WORLD_DATA[worlds[i] * 8 + s];
        if (!golemReacts0(alch0, cfg, 'chest') || !golemReacts0(alch0, cfg, 'ears')) {
          allBoth = false;
          break;
        }
      }
      if (!allBoth) break;
    }
    if (hasAny && allBoth) definite.push((s + 1) as IngredientId);
  }
  if (definite.length !== 2) return null;
  return { kind: 'ingredient_set', ingredients: definite };
}

/**
 * golem_animation_alch: returns the 2 SIGN-based animator alchemicals
 * if ALL surviving configs agree on the same set.
 *
 * For each config, animators are purely config-determined (sign conditions).
 */
export function computeGolemAnimationAlch(state: GolemSolverState): AlchemicalSetAnswer | null {
  let refKey: string | null = null;
  let refSet: AlchemicalId[] | null = null;
  for (let ci = 0; ci < GOLEM_CONFIG_COUNT; ci++) {
    if (!state[ci]) continue;
    const cfg = ALL_GOLEM_CONFIGS[ci];
    const anim: AlchemicalId[] = [];
    for (let a0 = 0; a0 < 8; a0++) {
      if (isAnimationIngredient0(a0, cfg)) anim.push((a0 + 1) as AlchemicalId);
    }
    anim.sort((a, b) => a - b);
    const key = anim.join(',');
    if (refKey === null) { refKey = key; refSet = anim; }
    else if (key !== refKey) return null;
  }
  if (!refSet) return null;
  return { kind: 'alchemical_set', alchemicals: refSet };
}

/**
 * golem_animation_ing: slot s is "definitely an animator" iff in EVERY
 * (config, world) pair remaining, the alch at slot s is a SIGN-based animator.
 * Returns exactly 2 such slots, or null.
 */
export function computeGolemAnimationIng(state: GolemSolverState): IngredientSetAnswer | null {
  const definite: IngredientId[] = [];
  for (let s = 0; s < 8; s++) {
    let allAnim = true;
    let hasAny = false;
    for (let ci = 0; ci < GOLEM_CONFIG_COUNT; ci++) {
      const worlds = state[ci];
      if (!worlds) continue;
      const cfg = ALL_GOLEM_CONFIGS[ci];
      for (let i = 0; i < worlds.length; i++) {
        hasAny = true;
        const alch0 = WORLD_DATA[worlds[i] * 8 + s];
        if (!isAnimationIngredient0(alch0, cfg)) {
          allAnim = false;
          break;
        }
      }
      if (!allAnim) break;
    }
    if (hasAny && allAnim) definite.push((s + 1) as IngredientId);
  }
  if (definite.length !== 2) return null;
  return { kind: 'ingredient_set', ingredients: definite };
}

// ─── Re-export INDEX_COLOR for use in display ─────────────────────────────────
export { INDEX_COLOR };
