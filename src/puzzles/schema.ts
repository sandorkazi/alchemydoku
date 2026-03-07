import { generateAllWorlds, applyClues } from '../logic/worldSet';
import { deduceMixingResult, deduceAlchemical, deduceAspect, deduceUncertainAspect, getPossibleResults } from '../logic/deducer';
import { COLOR_INDEX, WORLD_DATA, SIGN_TABLE, SIZE_TABLE } from '../logic/worldPack';
import type {
  Puzzle, QuestionTarget, PotionResult, AlchemicalId, IngredientId, Sign, Color, WorldSet,
} from '../types';

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
  | { kind: 'large-component'; ingredients: IngredientId[] };

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
      const potionKey = (r: PotionResult) => r.type === 'neutral' ? 'neutral' : `${(r as Extract<PotionResult,{type:'potion'}>).color}${(r as Extract<PotionResult,{type:'potion'}>).sign}`;
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
  if (typeof a === 'object' && typeof b === 'object' && 'kind' in a && 'kind' in b)
    return (a as {kind:string;color:Color}).color === (b as {kind:string;color:Color}).color;
  return false;
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
  }
}
