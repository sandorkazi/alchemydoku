/**
 * logic/debunk.ts
 *
 * Plan evaluation and validation for debunk-planning puzzle questions.
 * All rules follow DEBUNK_PUZZLES.md §2-§5 (base mode: publications only, no articles).
 */

import { ALCHEMICALS } from '../data/alchemicals';
import { MIX_TABLE, MIX_RESULTS, COLOR_INDEX, WORLD_DATA } from './worldPack';
import type { IngredientId, AlchemicalId, Color, Assignment, WorldSet } from '../types';
import type { DebunkStep, Publication } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** True sign (+1) or false sign (0) of ingredient's alchemical on a color axis. */
function trueSign(solution: Assignment, ingSlot: IngredientId, color: Color): 0 | 1 {
  const alchId = solution[ingSlot];
  const alch = ALCHEMICALS[alchId];
  return alch[color].sign === '+' ? 1 : 0;
}

/** The true mix result code for two ingredients under a given solution. */
function trueMixCode(solution: Assignment, ing1: IngredientId, ing2: IngredientId): number {
  const a0 = solution[ing1] - 1;
  const b0 = solution[ing2] - 1;
  return MIX_TABLE[a0 * 8 + b0];
}

/** Mix result code when using claimed alchemical for ing1 but true alchemical for ing2. */
function claimedMixCode(claimedAlch1: AlchemicalId, trueAlch2: AlchemicalId): number {
  return MIX_TABLE[(claimedAlch1 - 1) * 8 + (trueAlch2 - 1)];
}

/**
 * Returns true if ingredient `slot` is definitively known from clue-derived worlds alone —
 * i.e. all worlds agree on its alchemical assignment.
 */
export function isDefinitivelyKnown(worlds: WorldSet, slot: IngredientId): boolean {
  if (worlds.length === 0) return false;
  const first = WORLD_DATA[worlds[0] * 8 + (slot - 1)];
  for (let i = 1; i < worlds.length; i++) {
    if (WORLD_DATA[worlds[i] * 8 + (slot - 1)] !== first) return false;
  }
  return true;
}

// ─── Step outcome ─────────────────────────────────────────────────────────────

export type StepOutcome = {
  removed: IngredientId[];   // publications removed by this step
  conflicts: IngredientId[]; // publications conflicted but NOT removed (both sides conflict)
};

/**
 * Simulate one step against the current active publications.
 * Mutates `activePubs` in place (removes entries that are disproved).
 */
function simulateStep(
  step: DebunkStep,
  solution: Assignment,
  worlds: WorldSet,
  activePubs: Map<IngredientId, AlchemicalId>,
): StepOutcome {
  const removed: IngredientId[] = [];
  const conflicts: IngredientId[] = [];

  if (step.kind === 'apprentice') {
    const { ingredient, color } = step;
    const sign = trueSign(solution, ingredient, color);
    const ci = COLOR_INDEX[color];
    for (const [ing, claimedAlch] of activePubs) {
      const claimedSign = ALCHEMICALS[claimedAlch][color].sign === '+' ? 1 : 0;
      if (ing === ingredient && sign !== claimedSign) {
        removed.push(ing);
      }
    }
    for (const ing of removed) activePubs.delete(ing);
    void ci; // unused
  }

  else if (step.kind === 'master') {
    const { ingredient1, ingredient2 } = step;
    const trueCode = trueMixCode(solution, ingredient1, ingredient2);
    const truAlch2 = solution[ingredient2];
    const truAlch1 = solution[ingredient1];
    const ing1Known = isDefinitivelyKnown(worlds, ingredient1);
    const ing2Known = isDefinitivelyKnown(worlds, ingredient2);

    let conflict1 = false;
    let conflict2 = false;

    if (activePubs.has(ingredient1) && ing2Known) {
      const claimedAlch1 = activePubs.get(ingredient1)!;
      const expectedCode = claimedMixCode(claimedAlch1, truAlch2);
      if (expectedCode !== trueCode) conflict1 = true;
    }

    if (activePubs.has(ingredient2) && ing1Known) {
      const claimedAlch2 = activePubs.get(ingredient2)!;
      const expectedCode = claimedMixCode(truAlch1, claimedAlch2);
      if (expectedCode !== trueCode) conflict2 = true;
    }

    // Removal: only when blame is unambiguous
    if (conflict1 && !conflict2) {
      removed.push(ingredient1);
      activePubs.delete(ingredient1);
    } else if (conflict2 && !conflict1) {
      removed.push(ingredient2);
      activePubs.delete(ingredient2);
    } else if (conflict1 && conflict2) {
      // Both conflict → neither removed
      conflicts.push(ingredient1, ingredient2);
    }
  }

  return { removed, conflicts };
}

// ─── Full plan evaluation ─────────────────────────────────────────────────────

export type PlanOutcome = StepOutcome[];

export function evaluatePlan(
  steps: DebunkStep[],
  solution: Assignment,
  publications: Publication[],
  worlds: WorldSet,
): PlanOutcome {
  const activePubs = new Map<IngredientId, AlchemicalId>(
    publications.map(p => [p.ingredient, p.claimedAlchemical])
  );
  return steps.map(step => simulateStep(step, solution, worlds, activePubs));
}

// ─── Validators ───────────────────────────────────────────────────────────────

/**
 * Core plan validator (step-kind-agnostic).
 * Valid when:
 * 1. Plan length equals refLen.
 * 2. Every step removes at least one publication (no wasted steps).
 * 3. All FALSE publications are removed by the end.
 *
 * Truth values are not given as a premise — they are derived from the
 * solution: a publication is false iff solution[ingredient] ≠ claimedAlchemical.
 * True publications cannot be removed by any debunk and are not part of the
 * plan target.
 *
 * Step-kind constraints (master-only, apprentice-only) are enforced by the
 * callers validateMasterPlanAnswer and validateApprenticePlanAnswer.
 */
export function validateMinStepsAnswer(
  steps: DebunkStep[],
  solution: Assignment,
  publications: Publication[],
  worlds: WorldSet,
  refLen: number,
): boolean {
  if (steps.length !== refLen) return false;

  // Only false publications need to be (and can be) removed
  const falsePubs = publications.filter(p => solution[p.ingredient] !== p.claimedAlchemical);
  if (falsePubs.length === 0) return steps.length === 0;

  const activePubs = new Map<IngredientId, AlchemicalId>(
    falsePubs.map(p => [p.ingredient, p.claimedAlchemical])
  );

  for (const step of steps) {
    const outcome = simulateStep(step, solution, worlds, activePubs);
    // Every step in an optimal plan must remove at least one publication
    if (outcome.removed.length === 0) return false;
  }

  // All false publications removed
  return activePubs.size === 0;
}

/**
 * Validate a master-only plan (debunk_min_steps mode).
 * Same as validateMinStepsAnswer but additionally rejects any non-master steps.
 */
export function validateMasterPlanAnswer(
  steps: DebunkStep[],
  solution: Assignment,
  publications: Publication[],
  worlds: WorldSet,
  refLen: number,
): boolean {
  if (steps.some(s => s.kind !== 'master')) return false;
  return validateMinStepsAnswer(steps, solution, publications, worlds, refLen);
}

/**
 * Validate an apprentice-only plan.
 * Same as validateMinStepsAnswer but additionally rejects any master steps.
 */
export function validateApprenticePlanAnswer(
  steps: DebunkStep[],
  solution: Assignment,
  publications: Publication[],
  worlds: WorldSet,
  refLen: number,
): boolean {
  if (steps.some(s => s.kind === 'master')) return false;
  return validateMinStepsAnswer(steps, solution, publications, worlds, refLen);
}

/**
 * Validate a conflict-only answer.
 * Valid when the single step:
 * 1. Is a master debunk.
 * 2. Produces zero removals.
 * 3. Produces at least one conflict on fixedIngredient's publication.
 */
export function validateConflictOnlyAnswer(
  step: DebunkStep,
  fixedIngredient: IngredientId,
  solution: Assignment,
  publications: Publication[],
  worlds: WorldSet,
): boolean {
  if (step.kind !== 'master') return false;
  if (step.ingredient1 !== fixedIngredient && step.ingredient2 !== fixedIngredient) return false;

  const activePubs = new Map<IngredientId, AlchemicalId>(
    publications.map(p => [p.ingredient, p.claimedAlchemical])
  );
  const outcome = simulateStep(step, solution, worlds, activePubs);

  return (
    outcome.removed.length === 0 &&
    outcome.conflicts.includes(fixedIngredient)
  );
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

/** Simulate a plan and return per-step outcomes for live display. */
export function simulatePlan(
  steps: DebunkStep[],
  solution: Assignment,
  publications: Publication[],
  worlds: WorldSet,
): { outcomes: PlanOutcome; remainingPubs: IngredientId[] } {
  // Only false publications are tracked — true ones cannot be removed
  const falsePubs = publications.filter(p => solution[p.ingredient] !== p.claimedAlchemical);
  const activePubs = new Map<IngredientId, AlchemicalId>(
    falsePubs.map(p => [p.ingredient, p.claimedAlchemical])
  );
  const outcomes: PlanOutcome = [];
  for (const step of steps) {
    outcomes.push(simulateStep(step, solution, worlds, activePubs));
  }
  return { outcomes, remainingPubs: [...activePubs.keys()] };
}

/** True mix result description string (for display). */
export function describeMixResult(code: number): string {
  const r = MIX_RESULTS[code];
  if (r.type === 'neutral') return 'neutral';
  return `${r.color}${r.sign}`;
}
