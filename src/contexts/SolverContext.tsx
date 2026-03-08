import { createContext, useContext, useReducer, useEffect, useMemo, type ReactNode } from 'react';
import { generateAllWorlds, applyClues } from '../logic/worldSet';
import { getEliminatedCells } from '../logic/deducer';
import { checkAnswers } from '../puzzles/schema';
import type { Puzzle, CellState, WorldSet } from '../types';
import type { PuzzleAnswer } from '../puzzles/schema';

// ─── Display map ──────────────────────────────────────────────────────────────

/**
 * Maps ingredient slot IDs (1-8) → display ingredient IDs (1-8).
 * Randomly shuffled once per puzzle session so the same puzzle can be
 * played with different ingredient visuals every time you start fresh.
 *
 * Slot IDs are what the logic engine sees (clues, question, world-set).
 * Display IDs control which name + sprite the player actually sees.
 */
export type DisplayMap = Record<number, number>;

function randomShuffle(arr: number[]): number[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeDisplayMap(): DisplayMap {
  const shuffled = randomShuffle([1, 2, 3, 4, 5, 6, 7, 8]);
  const map: DisplayMap = {};
  for (let i = 0; i < 8; i++) map[i + 1] = shuffled[i];
  return map;
}

function loadDisplayMap(puzzleId: string): DisplayMap | null {
  try {
    const raw = localStorage.getItem(`display-map-${puzzleId}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveDisplayMap(puzzleId: string, map: DisplayMap) {
  try { localStorage.setItem(`display-map-${puzzleId}`, JSON.stringify(map)); } catch { /* ignore */ }
}

// ─── State ────────────────────────────────────────────────────────────────────

type GridState = Record<number, Record<number, CellState>>;

function loadSolverState(puzzleId: string): { gridState: GridState; notes: Record<string,string>; hintLevel: number } | null {
  try {
    const raw = localStorage.getItem(`solver-${puzzleId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || !parsed.gridState) return null;
    return {
      gridState:  parsed.gridState  as GridState,
      notes:      (parsed.notes ?? {}) as Record<string,string>,
      hintLevel:  typeof parsed.hintLevel === 'number' ? parsed.hintLevel : 0,
    };
  } catch { return null; }
}

function emptyGrid(): GridState {
  const g: GridState = {};
  for (let i = 1; i <= 8; i++) {
    g[i] = {};
    for (let a = 1; a <= 8; a++) g[i][a] = 'unknown';
  }
  return g;
}

export type SolverState = {
  puzzle: Puzzle;
  worlds: WorldSet;
  /** Stable random visual assignment for this session: slot → display ingredient */
  displayMap: DisplayMap;
  /** Cosmetic colour/sign permutation applied to all potion/aspect displays */
  gridState: GridState;
  /** Per-cell text annotations: key is `${ingredient}-${alchemical}` */
  notes: Record<string, string>;
  autoDeduction: boolean;
  hintLevel: number;
  wrongAttempts: number;
  /** One entry per puzzle.questions — null means not yet answered */
  answers: (PuzzleAnswer | null)[];
  completed: boolean;
  showSolution: boolean;
};

// ─── Actions ──────────────────────────────────────────────────────────────────

export type Action =
  | { type: 'TOGGLE_CELL'; ingredient: number; alchemical: number }
  | { type: 'SET_CELL'; ingredient: number; alchemical: number; state: CellState }
  | { type: 'SUBMIT_ANSWER'; answers: (PuzzleAnswer | null)[] }
  | { type: 'REQUEST_HINT' }
  | { type: 'TOGGLE_AUTO_DEDUCTION' }
  | { type: 'REVEAL_SOLUTION' }
  | { type: 'RESET' }
  | { type: 'RESHUFFLE' }
  | { type: 'CLEAR_GRID' }
  | { type: 'SET_NOTE'; key: string; value: string };

// ─── Reducer ──────────────────────────────────────────────────────────────────

function applyAutoDeduction(state: SolverState): SolverState {
  if (!state.autoDeduction) return state;
  const eliminated = getEliminatedCells(state.worlds);
  const newGrid = { ...state.gridState };
  for (let i = 1; i <= 8; i++) {
    newGrid[i] = { ...newGrid[i] };
    for (let a = 1; a <= 8; a++) {
      const key = `${i}-${a}`;
      if (eliminated.has(key) && newGrid[i][a] === 'unknown') {
        newGrid[i][a] = 'eliminated';
      }
      const possible = Object.entries(newGrid[i]).filter(([ak]) => !eliminated.has(`${i}-${ak}`));
      if (possible.length === 1) {
        const onlyAlch = Number(possible[0][0]);
        if (newGrid[i][onlyAlch] !== 'confirmed') {
          newGrid[i] = { ...newGrid[i], [onlyAlch]: 'confirmed' };
        }
      }
    }
  }
  return { ...state, gridState: newGrid };
}

function reducer(state: SolverState, action: Action): SolverState {
  switch (action.type) {
    case 'TOGGLE_CELL': {
      const { ingredient, alchemical } = action;
      const current = state.gridState[ingredient][alchemical];
      const cycle: CellState[] = ['unknown', 'eliminated', 'confirmed'];
      const next = cycle[(cycle.indexOf(current) + 1) % cycle.length];
      return {
        ...state,
        gridState: {
          ...state.gridState,
          [ingredient]: { ...state.gridState[ingredient], [alchemical]: next },
        },
      };
    }

    case 'SET_CELL': {
      const { ingredient, alchemical, state: cellState } = action;
      return {
        ...state,
        gridState: {
          ...state.gridState,
          [ingredient]: { ...state.gridState[ingredient], [alchemical]: cellState },
        },
      };
    }

    case 'SUBMIT_ANSWER': {
      const correct = checkAnswers(state.puzzle, action.answers);
      if (correct) return { ...state, answers: action.answers, completed: true };
      const wrongAttempts = state.wrongAttempts + 1;
      return {
        ...state,
        answers: action.answers,
        wrongAttempts,
        hintLevel: Math.min(state.hintLevel + 1, 3),
        showSolution: wrongAttempts >= 3,
      };
    }

    case 'REQUEST_HINT':
      return { ...state, hintLevel: Math.min(state.hintLevel + 1, 3) };

    case 'TOGGLE_AUTO_DEDUCTION':
      return applyAutoDeduction({ ...state, autoDeduction: !state.autoDeduction });

    case 'REVEAL_SOLUTION':
      return { ...state, showSolution: true };

    case 'RESET': {
      const newMap = makeDisplayMap();
      saveDisplayMap(state.puzzle.id, newMap);
      return applyAutoDeduction({
        ...state,
        displayMap: newMap,
        gridState: emptyGrid(),
        hintLevel: 0,
        wrongAttempts: 0,
        answers: state.puzzle.questions.map(() => null),
        completed: false,
        showSolution: false,
      });
    }

    case 'CLEAR_GRID':
      return applyAutoDeduction({ ...state, gridState: emptyGrid(), notes: {} });
    case 'SET_NOTE': {
      const notes = { ...state.notes };
      if (action.value === '') delete notes[action.key];
      else notes[action.key] = action.value.slice(0, 4);  // max 4 chars
      return { ...state, notes };
    }

    case 'RESHUFFLE': {
      // Re-randomise ingredient visuals without clearing logic progress
      const newMap = makeDisplayMap();
      saveDisplayMap(state.puzzle.id, newMap);
      return { ...state, displayMap: newMap };
    }

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

type SolverContextValue = {
  state: SolverState;
  dispatch: React.Dispatch<Action>;
};

const SolverContext = createContext<SolverContextValue | null>(null);

export function SolverProvider({ puzzle, children }: { puzzle: Puzzle; children: ReactNode }) {
  const worlds = useMemo(() => applyClues(generateAllWorlds(), puzzle.clues), [puzzle]);

  const displayMap = useMemo(() => {
    const saved = loadDisplayMap(puzzle.id);
    if (saved) return saved;
    const fresh = makeDisplayMap();
    saveDisplayMap(puzzle.id, fresh);
    return fresh;
  }, [puzzle.id]);

  const savedState = useMemo(() => loadSolverState(puzzle.id), [puzzle.id]);

  const initialState: SolverState = applyAutoDeduction({
    puzzle,
    worlds,
    displayMap,
    gridState: savedState?.gridState ?? emptyGrid(),
    notes:     savedState?.notes     ?? {},
    autoDeduction: false,
    hintLevel: savedState?.hintLevel ?? 0,
    wrongAttempts: 0,
    answers: puzzle.questions.map(() => null),
    completed: false,
    showSolution: false,
  });

  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    try {
      if (!state.completed) {
        localStorage.setItem(`solver-${puzzle.id}`, JSON.stringify({
          gridState:  state.gridState,
          notes:      state.notes,
          hintLevel:  state.hintLevel,
        }));
      }
    } catch { /* ignore */ }
  }, [state.gridState, state.notes, state.completed, state.hintLevel, puzzle.id]);

  return (
    <SolverContext.Provider value={{ state, dispatch }}>
      {children}
    </SolverContext.Provider>
  );
}

/** Clear persisted state for a single puzzle (call before navigating to it for a fresh start) */
export function clearPuzzleState(puzzleId: string) {
  try { localStorage.removeItem(`solver-${puzzleId}`); } catch { /* ignore */ }
}

export function useSolver() {
  const ctx = useContext(SolverContext);
  if (!ctx) throw new Error('useSolver must be used within SolverProvider');
  return ctx;
}

/**
 * Returns a resolver function for ingredient SLOT IDs → display info.
 * Use this everywhere you need an ingredient name or sprite index.
 *
 * Example:
 *   const getIngredient = useIngredient();
 *   const { name, index } = getIngredient(slotId);  // slotId from clue/question
 */
export function useIngredient() {
  const { state } = useSolver();
  return (slotId: number) => {
    const displayId = state.displayMap[slotId] ?? slotId;
    return {
      displayId,
      index: (displayId - 1) as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7,
    };
  };
}

