/**
 * expanded/logic/debunkExpanded.ts
 *
 * Extended debunk plan evaluation for expanded-mode puzzles.
 * Handles both publications (base game) and encyclopedia articles (expanded).
 *
 * Article disproof rules (see DEBUNK_PUZZLES.md §2e):
 *   - Apprentice: reveals true sign for (ingredient, color). Any article entry
 *     claiming a different sign for that ingredient on that color → article removed.
 *   - Master: if an ingredient involved in the mix is definitively known from clue
 *     worlds, the audience can verify all of that ingredient's claims. Any article
 *     entry for that ingredient (on any aspect) that is wrong → article removed.
 *     Note: the master mix result itself does not directly reveal aspect signs;
 *     it only enables article disproof when the ingredient is already known.
 */

import { ALCHEMICALS } from '../../data/alchemicals';
import { isDefinitivelyKnown } from '../../logic/debunk';
import { MIX_TABLE } from '../../logic/worldPack';
import type { IngredientId, AlchemicalId, Color, Assignment, WorldSet } from '../../types';
import type { DebunkStep, Publication } from '../../types';
import type { DebunkArticle } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function trueSign(solution: Assignment, ingSlot: IngredientId, color: Color): 0 | 1 {
  const alchId = solution[ingSlot];
  const alch = ALCHEMICALS[alchId];
  return alch[color].sign === '+' ? 1 : 0;
}

function trueMixCode(solution: Assignment, ing1: IngredientId, ing2: IngredientId): number {
  return MIX_TABLE[(solution[ing1] - 1) * 8 + (solution[ing2] - 1)];
}

function claimedMixCode(claimedAlch1: AlchemicalId, trueAlch2: AlchemicalId): number {
  return MIX_TABLE[(claimedAlch1 - 1) * 8 + (trueAlch2 - 1)];
}

// ─── Step outcome (extended) ──────────────────────────────────────────────────

export type ExpandedStepOutcome = {
  removedPubs: IngredientId[];   // publications removed by this step
  removedArts: string[];         // article IDs removed by this step
  conflicts: IngredientId[];     // publications conflicted but NOT removed
};

// ─── Single step simulation ───────────────────────────────────────────────────

function simulateExpandedStep(
  step: DebunkStep,
  solution: Assignment,
  worlds: WorldSet,
  activePubs: Map<IngredientId, AlchemicalId>,
  activeArts: Map<string, DebunkArticle>,
): ExpandedStepOutcome {
  const removedPubs: IngredientId[] = [];
  const removedArts: string[] = [];
  const conflicts: IngredientId[] = [];

  if (step.kind === 'apprentice') {
    const { ingredient, color } = step;
    const sign = trueSign(solution, ingredient, color);

    // Publications: directly contradicted
    for (const [ing, claimedAlch] of activePubs) {
      if (ing === ingredient) {
        const claimedSign = ALCHEMICALS[claimedAlch][color].sign === '+' ? 1 : 0;
        if (sign !== claimedSign) removedPubs.push(ing);
      }
    }
    for (const ing of removedPubs) activePubs.delete(ing);

    // Articles: any entry for (ingredient, color) with wrong sign → article removed
    for (const [artId, art] of activeArts) {
      if (art.aspect !== color) continue;
      for (const entry of art.entries) {
        if (entry.ingredient === ingredient) {
          const entrySgn = entry.sign === '+' ? 1 : 0;
          if (entrySgn !== sign) {
            removedArts.push(artId);
            break; // one wrong entry is enough
          }
        }
      }
    }
    for (const artId of removedArts) activeArts.delete(artId);
  }

  else if (step.kind === 'master') {
    const { ingredient1, ingredient2 } = step;
    const trueCode = trueMixCode(solution, ingredient1, ingredient2);
    const trueAlch1 = solution[ingredient1];
    const trueAlch2 = solution[ingredient2];
    const ing1Known = isDefinitivelyKnown(worlds, ingredient1);
    const ing2Known = isDefinitivelyKnown(worlds, ingredient2);

    let conflict1 = false;
    let conflict2 = false;

    // Publications
    if (activePubs.has(ingredient1) && ing2Known) {
      const claimedAlch1 = activePubs.get(ingredient1)!;
      if (claimedMixCode(claimedAlch1, trueAlch2) !== trueCode) conflict1 = true;
    }
    if (activePubs.has(ingredient2) && ing1Known) {
      const claimedAlch2 = activePubs.get(ingredient2)!;
      if (claimedMixCode(trueAlch1, claimedAlch2) !== trueCode) conflict2 = true;
    }

    if (conflict1 && !conflict2) {
      removedPubs.push(ingredient1);
      activePubs.delete(ingredient1);
    } else if (conflict2 && !conflict1) {
      removedPubs.push(ingredient2);
      activePubs.delete(ingredient2);
    } else if (conflict1 && conflict2) {
      conflicts.push(ingredient1, ingredient2);
    }

    // Articles: if an ingredient is definitively known, the audience can verify
    // any article entries for that ingredient on any aspect.
    const knownIngs: IngredientId[] = [];
    if (ing1Known) knownIngs.push(ingredient1);
    if (ing2Known) knownIngs.push(ingredient2);

    for (const [artId, art] of activeArts) {
      if (removedArts.includes(artId)) continue; // already marked
      for (const entry of art.entries) {
        if (!knownIngs.includes(entry.ingredient)) continue;
        const trueSgn = trueSign(solution, entry.ingredient, art.aspect);
        const entrySgn = entry.sign === '+' ? 1 : 0;
        if (entrySgn !== trueSgn) {
          removedArts.push(artId);
          break;
        }
      }
    }
    for (const artId of removedArts) activeArts.delete(artId);
  }

  return { removedPubs, removedArts, conflicts };
}

// ─── Full plan simulation ─────────────────────────────────────────────────────

export function simulateExpandedPlan(
  steps: DebunkStep[],
  solution: Assignment,
  publications: Publication[],
  articles: DebunkArticle[],
  worlds: WorldSet,
): { outcomes: ExpandedStepOutcome[]; remainingPubs: IngredientId[]; remainingArts: string[] } {
  const activePubs = new Map<IngredientId, AlchemicalId>(
    publications.map(p => [p.ingredient, p.claimedAlchemical])
  );
  const activeArts = new Map<string, DebunkArticle>(
    articles.map(a => [a.id, a])
  );
  const outcomes: ExpandedStepOutcome[] = [];
  for (const step of steps) {
    outcomes.push(simulateExpandedStep(step, solution, worlds, activePubs, activeArts));
  }
  return {
    outcomes,
    remainingPubs: [...activePubs.keys()],
    remainingArts: [...activeArts.keys()],
  };
}

// ─── Validators ───────────────────────────────────────────────────────────────

export function validateExpandedMinStepsAnswer(
  steps: DebunkStep[],
  solution: Assignment,
  publications: Publication[],
  articles: DebunkArticle[],
  worlds: WorldSet,
  refLen: number,
): boolean {
  if (steps.length !== refLen) return false;
  const totalTargets = publications.length + articles.length;
  if (totalTargets === 0) return steps.length === 0;

  const activePubs = new Map<IngredientId, AlchemicalId>(
    publications.map(p => [p.ingredient, p.claimedAlchemical])
  );
  const activeArts = new Map<string, DebunkArticle>(
    articles.map(a => [a.id, a])
  );

  for (const step of steps) {
    const outcome = simulateExpandedStep(step, solution, worlds, activePubs, activeArts);
    if (outcome.removedPubs.length === 0 && outcome.removedArts.length === 0) return false;
  }

  return activePubs.size === 0 && activeArts.size === 0;
}

export function validateExpandedConflictOnlyAnswer(
  step: DebunkStep,
  fixedIngredient: IngredientId,
  solution: Assignment,
  publications: Publication[],
  articles: DebunkArticle[],
  worlds: WorldSet,
): boolean {
  if (step.kind !== 'master') return false;
  if (step.ingredient1 !== fixedIngredient && step.ingredient2 !== fixedIngredient) return false;

  const activePubs = new Map<IngredientId, AlchemicalId>(
    publications.map(p => [p.ingredient, p.claimedAlchemical])
  );
  const activeArts = new Map<string, DebunkArticle>(
    articles.map(a => [a.id, a])
  );
  const outcome = simulateExpandedStep(step, solution, worlds, activePubs, activeArts);

  return (
    outcome.removedPubs.length === 0 &&
    outcome.removedArts.length === 0 &&
    outcome.conflicts.includes(fixedIngredient)
  );
}
