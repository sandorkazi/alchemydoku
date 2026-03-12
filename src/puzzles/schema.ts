import { generateAllWorlds, applyClues } from '../logic/worldSet';
import { deduceMixingResult, deduceAlchemical, deduceAspect, deduceUncertainAspect, getPossibleResults, deduceNeutralPartner, getIngredientPotionProfile, getGroupPossiblePotions, getMostInformativeMix, getGuaranteedNonProducers } from '../logic/deducer';
import { COLOR_INDEX, WORLD_DATA, SIGN_TABLE, SIZE_TABLE } from '../logic/worldPack';
import { validateMinStepsAnswer, validateApprenticePlanAnswer, validateConflictOnlyAnswer } from '../logic/debunk';
import type {
  Puzzle, QuestionTarget, PotionResult, AlchemicalId, IngredientId, Sign, Color, WorldSet,
  DebunkStep, Publication,
} from '../types';

// ─── Shared helpers ───────────────────────────────────────────────────────────

const potionKey = (r: PotionResult): string =>
  r.type === 'neutral' ? 'neutral' : `${(r as Extract<PotionResult,{type:'potion'}>).color}${(r as Extract<PotionResult,{type:'potion'}>).sign}`;

// ─── Answer type ──────────────────────────────────────────────────────────────

export type PuzzleAnswer =
  | PotionResult
  | AlchemicalId
  | { sign: Sign }
  | { kind: 'hedge-color'; color: Color }
  /** Sorted array of possible potion keys e.g. ['G+','R-','neutral'] */
  | { kind: 'possible-potions'; potions: string[] }
  /** Sorted array of ingredient IDs confirmed to have this color+sign */
  | { kind: 'aspect-set'; ingredients: IngredientId[] }
  /** Sorted array of ingredient IDs confirmed to have the Large component for this color */
  | { kind: 'large-component'; ingredients: IngredientId[] }
  /** A debunk plan: ordered sequence of debunking actions */
  | { kind: 'debunk-plan'; steps: DebunkStep[] }
  /** Sorted array of ingredient IDs that can never produce the target potion */
  | { kind: 'non-producer-set'; ingredients: IngredientId[] };

// ─── Core functions ───────────────────────────────────────────────────────────

export function getPuzzleWorlds(puzzle: Puzzle): WorldSet {
  return applyClues(generateAllWorlds(), puzzle.clues);
}

export function computeAnswerFromWorlds(
  worlds: WorldSet,
  question: QuestionTarget
): PuzzleAnswer | null {
  switch (question.kind) {
    case 'mixing-result':
      return deduceMixingResult(worlds, question.ingredient1, question.ingredient2);
    case 'alchemical':
      return deduceAlchemical(worlds, question.ingredient);
    case 'aspect': {
      const asp = deduceAspect(worlds, question.ingredient, question.color);
      if (!asp) return null;
      return { sign: asp.sign };
    }
    case 'possible-potions': {
      if (worlds.length === 0) return null;
      const results = getPossibleResults(worlds, question.ingredient1, question.ingredient2);
      return { kind: 'possible-potions', potions: results.map(potionKey).sort() };
    }

    case 'aspect-set': {
      if (worlds.length === 0) return null;
      const ci = COLOR_INDEX[question.color];
      const targetSign = question.sign === '+' ? 1 : 0;
      const confirmed: IngredientId[] = [];
      for (let s = 0; s < 8; s++) {
        const firstA0 = WORLD_DATA[worlds[0] * 8 + s];
        const firstSign = SIGN_TABLE[firstA0 * 3 + ci];
        if (firstSign !== targetSign) continue;
        let fixed = true;
        for (let i = 1; i < worlds.length; i++) {
          const a0 = WORLD_DATA[worlds[i] * 8 + s];
          if (SIGN_TABLE[a0 * 3 + ci] !== targetSign) { fixed = false; break; }
        }
        if (fixed) confirmed.push((s + 1) as IngredientId);
      }
      return { kind: 'aspect-set', ingredients: confirmed.sort((a, b) => a - b) };
    }

    case 'large-component': {
      if (worlds.length === 0) return null;
      const ci = COLOR_INDEX[question.color];
      const confirmed: IngredientId[] = [];
      for (let s = 0; s < 8; s++) {
        const firstA0 = WORLD_DATA[worlds[0] * 8 + s];
        const firstSize = SIZE_TABLE[firstA0 * 3 + ci];
        if (firstSize !== 1) continue; // only care about L confirmed
        let fixed = true;
        for (let i = 1; i < worlds.length; i++) {
          const a0 = WORLD_DATA[worlds[i] * 8 + s];
          if (SIZE_TABLE[a0 * 3 + ci] !== 1) { fixed = false; break; }
        }
        if (fixed) confirmed.push((s + 1) as IngredientId);
      }
      return { kind: 'large-component', ingredients: confirmed.sort((a, b) => a - b) };
    }

    case 'safe-publish': {
      const color = deduceUncertainAspect(worlds, question.ingredient);
      if (!color) return null;
      return { kind: 'hedge-color', color };
    }

    // Debunk planning questions: answer is validated externally, not computed from worlds
    case 'debunk_min_steps':
    case 'debunk_apprentice_plan':
    case 'debunk_conflict_only':
      return null;

    case 'neutral-partner':
      return deduceNeutralPartner(worlds, question.ingredient);

    case 'ingredient-potion-profile': {
      const r = getIngredientPotionProfile(worlds, question.ingredient);
      if (r.length === 0) return null;
      return { kind: 'possible-potions', potions: r.map(potionKey).sort() };
    }

    case 'group-possible-potions': {
      const r = getGroupPossiblePotions(worlds, [...question.ingredients]);
      if (r.length === 0) return null;
      return { kind: 'possible-potions', potions: r.map(potionKey).sort() };
    }

    case 'most-informative-mix':
      return getMostInformativeMix(worlds, question.ingredient);

    case 'guaranteed-non-producer': {
      const r = getGuaranteedNonProducers(worlds, question.potion);
      if (r.length === 0) return null;
      return { kind: 'non-producer-set', ingredients: r };
    }
  }
}

/** Computes correct answers for all questions. Returns null if any is not uniquely determined. */
export function computeAnswers(puzzle: Puzzle): PuzzleAnswer[] | null {
  const worlds = getPuzzleWorlds(puzzle);
  const answers: PuzzleAnswer[] = [];
  for (const q of puzzle.questions) {
    const a = computeAnswerFromWorlds(worlds, q);
    if (a === null) return null;
    answers.push(a);
  }
  return answers;
}

/** Legacy single-question compat */
export function computeAnswer(puzzle: Puzzle): PuzzleAnswer | null {
  const all = computeAnswers(puzzle);
  return all ? all[0] : null;
}

export function validatePuzzle(puzzle: Puzzle): boolean {
  const worlds = getPuzzleWorlds(puzzle);
  if (worlds.length === 0) return false;
  for (const q of puzzle.questions) {
    if (computeAnswerFromWorlds(worlds, q) === null) return false;
  }
  return true;
}

export function answersEqual(a: PuzzleAnswer, b: PuzzleAnswer): boolean {
  if (typeof a === 'number' && typeof b === 'number') return a === b;
  if (typeof a === 'object' && typeof b === 'object' && 'type' in a && 'type' in b) {
    const pa = a as PotionResult; const pb = b as PotionResult;
    if (pa.type !== pb.type) return false;
    if (pa.type === 'neutral') return true;
    return (pa as Extract<PotionResult,{type:'potion'}>).color ===
           (pb as Extract<PotionResult,{type:'potion'}>).color &&
           (pa as Extract<PotionResult,{type:'potion'}>).sign ===
           (pb as Extract<PotionResult,{type:'potion'}>).sign;
  }
  if (typeof a === 'object' && typeof b === 'object' && 'sign' in a && 'sign' in b)
    return (a as {sign:Sign}).sign === (b as {sign:Sign}).sign;
  if (typeof a === 'object' && typeof b === 'object' && 'kind' in a && 'kind' in b) {
    const ka = a as { kind: string; potions?: string[]; color?: Color; steps?: DebunkStep[]; ingredients?: number[] };
    const kb = b as { kind: string; potions?: string[]; color?: Color; steps?: DebunkStep[]; ingredients?: number[] };
    if (ka.kind !== kb.kind) return false;
    if (ka.kind === 'possible-potions')
      return JSON.stringify(ka.potions ?? []) === JSON.stringify(kb.potions ?? []);
    if (ka.kind === 'debunk-plan')
      return JSON.stringify(ka.steps ?? []) === JSON.stringify(kb.steps ?? []);
    if ('ingredients' in ka && 'ingredients' in kb)
      return JSON.stringify(ka.ingredients ?? []) === JSON.stringify(kb.ingredients ?? []);
    return ka.color === kb.color;
  }
  return false;
}

/**
 * Check debunk plan answers. Used instead of checkAnswers when the puzzle has debunk questions.
 * Imports the debunk evaluator lazily to avoid circular deps.
 */
export function checkDebunkAnswers(
  puzzle: Puzzle,
  worlds: WorldSet,
  playerAnswers: (PuzzleAnswer | null)[],
): boolean {
  const pubs: Publication[] = (puzzle.publications ?? []).filter(Boolean) as Publication[];
  const sol = puzzle.solution;

  return puzzle.questions.every((q, i) => {
    const playerAns = playerAnswers[i];
    if (!playerAns) return false;
    const plan = (playerAns as { kind: string; steps?: DebunkStep[] });
    if (plan.kind !== 'debunk-plan' || !plan.steps) return false;
    const steps = plan.steps;

    if (q.kind === 'debunk_min_steps') {
      const refLen = (puzzle.debunk_answers?.debunk_min_steps ?? []).length;
      return validateMinStepsAnswer(steps, sol, pubs, worlds, refLen);
    }
    if (q.kind === 'debunk_apprentice_plan') {
      const refLen = (puzzle.debunk_answers?.debunk_apprentice_plan ?? []).length;
      return validateApprenticePlanAnswer(steps, sol, pubs, worlds, refLen);
    }
    if (q.kind === 'debunk_conflict_only') {
      if (steps.length !== 1) return false;
      return validateConflictOnlyAnswer(steps[0], q.fixedIngredient, sol, pubs, worlds);
    }
    return false;
  });
}

/**
 * Checks whether all submitted answers are correct.
 * playerAnswers must be same length as puzzle.questions.
 */
export function checkAnswers(puzzle: Puzzle, playerAnswers: (PuzzleAnswer | null)[]): boolean {
  const correct = computeAnswers(puzzle);
  if (!correct) return false;
  if (playerAnswers.length !== correct.length) return false;
  return playerAnswers.every((a, i) => a !== null && answersEqual(a, correct[i]));
}

/** Legacy single-answer compat */
export function checkAnswer(puzzle: Puzzle, playerAnswer: PuzzleAnswer): boolean {
  return checkAnswers(puzzle, [playerAnswer]);
}

export function questionText(question: QuestionTarget, ingredientName: (id: number) => string): string {
  switch (question.kind) {
    case 'mixing-result':
      return `What potion from mixing ${ingredientName(question.ingredient1)} + ${ingredientName(question.ingredient2)}?`;
    case 'alchemical':
      return `What is the alchemical of ${ingredientName(question.ingredient)}?`;
    case 'aspect':
      return `What is the ${{R:'Red',G:'Green',B:'Blue'}[question.color]} aspect sign of ${ingredientName(question.ingredient)}?`;
    case 'safe-publish':
      return `Which aspect of ${ingredientName(question.ingredient)} should you hedge?`;
    case 'possible-potions':
      return `Which potions are possible mixing ${ingredientName(question.ingredient1)} + ${ingredientName(question.ingredient2)}?`;
    case 'aspect-set':
      return `Which ingredients have a ${{ R: 'Red', G: 'Green', B: 'Blue' }[question.color]}${question.sign === '+' ? ' positive' : ' negative'} aspect?`;
    case 'large-component':
      return `Which ingredients have a Large ${{ R: 'Red', G: 'Green', B: 'Blue' }[question.color]} component?`;
    case 'debunk_min_steps':
      return 'What is the shortest sequence of debunk actions to remove all publications?';
    case 'debunk_apprentice_plan':
      return 'What is the shortest apprentice-only debunk sequence to remove all publications?';
    case 'debunk_conflict_only':
      return `Mix ingredient ${ingredientName(question.fixedIngredient)} with something to create a conflict — without removing any publication.`;
    case 'neutral-partner':
      return `Which ingredient is always the direct opposite (neutral mix) of ${ingredientName(question.ingredient)}?`;
    case 'ingredient-potion-profile':
      return `Which potions can ${ingredientName(question.ingredient)} certainly produce with some partner?`;
    case 'group-possible-potions':
      return `Which potions can certainly be produced by some pair among ingredients ${question.ingredients.map(ingredientName).join(', ')}?`;
    case 'most-informative-mix':
      return `Which ingredient gives the most information when mixed with ${ingredientName(question.ingredient)}?`;
    case 'guaranteed-non-producer':
      return `Which ingredients can never produce ${potionKey(question.potion)} with any partner?`;
  }
}
