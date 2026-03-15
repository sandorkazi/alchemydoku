import { createContext, useContext, useReducer, useEffect, useMemo, type ReactNode } from 'react';
import { generateAllWorlds, applyClues } from '../logic/worldSet';
import { checkAnswers, checkDebunkAnswers } from '../puzzles/schema';
import { makeDisplayMap, loadDisplayMap, saveDisplayMap, emptyGrid, mergeIntoUnifiedStore } from '../utils/solverStorage';
import type { Puzzle, CellState, WorldSet } from '../types';
import type { PuzzleAnswer } from '../puzzles/schema';

export type { DisplayMap, GridState } from '../utils/solverStorage';

// ─── Local type aliases ───────────────────────────────────────────────────────

type GridState  = import('../utils/solverStorage').GridState;
type DisplayMap = import('../utils/solverStorage').DisplayMap;

// ─── State ────────────────────────────────────────────────────────────────────

function loadSolverState(puzzleId: string): { gridState: GridState; notes: Record<string,string>; hintLevel: number; drawStrokes: string[] } | null {
  try {
    // 1. Try new unified key (written by save-file load + auto-save)
    const unified = localStorage.getItem('alch-save-base');
    if (unified) {
      const file = JSON.parse(unified);
      const entry = file?.puzzles?.[puzzleId];
      if (entry?.gridState) {
        return {
          gridState:   entry.gridState as GridState,
          notes:       (entry.notes ?? {}) as Record<string,string>,
          hintLevel:   typeof entry.hintLevel === 'number' ? entry.hintLevel : 0,
          drawStrokes: (entry.drawStrokes ?? []) as string[],
        };
      }
    }
    // 2. Fall back to legacy per-puzzle key
    const raw = localStorage.getItem(`solver-${puzzleId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || !parsed.gridState) return null;
    return {
      gridState:   parsed.gridState  as GridState,
      notes:       (parsed.notes ?? {}) as Record<string,string>,
      hintLevel:   typeof parsed.hintLevel === 'number' ? parsed.hintLevel : 0,
      drawStrokes: (parsed.drawStrokes ?? []) as string[],
    };
  } catch { return null; }
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
  drawStrokes: string[];
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
  | { type: 'SET_NOTE'; key: string; value: string }
  | { type: 'LOAD_PROGRESS'; gridState: GridState; notes: Record<string,string>; hintLevel: number; wrongAttempts: number; answers: (PuzzleAnswer | null)[] }
  | { type: 'ADD_DRAW_STROKE'; d: string }
  | { type: 'CLEAR_DRAW_STROKES' };

// ─── Reducer ──────────────────────────────────────────────────────────────────

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
      const hasDebunk = state.puzzle.questions.some(
        q => q.kind === 'debunk_min_steps' || q.kind === 'debunk_conflict_only' || q.kind === 'debunk_apprentice_plan'
      );
      const correct = hasDebunk
        ? checkDebunkAnswers(state.puzzle, state.worlds, action.answers)
        : checkAnswers(state.puzzle, action.answers);
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
      return { ...state, autoDeduction: !state.autoDeduction };

    case 'REVEAL_SOLUTION':
      return { ...state, showSolution: true };

    case 'RESET': {
      const newMap = makeDisplayMap();
      saveDisplayMap(`display-map-${state.puzzle.id}`, newMap);
      return {
        ...state,
        displayMap: newMap,
        gridState: emptyGrid(),
        hintLevel: 0,
        wrongAttempts: 0,
        answers: state.puzzle.questions.map(() => null),
        completed: false,
        showSolution: false,
      };
    }

    case 'CLEAR_GRID':
      return { ...state, gridState: emptyGrid(), notes: {} };
    case 'SET_NOTE': {
      const notes = { ...state.notes };
      if (action.value === '') delete notes[action.key];
      else notes[action.key] = action.value.slice(0, 4);  // max 4 chars
      return { ...state, notes };
    }

    case 'RESHUFFLE': {
      // Re-randomise ingredient visuals without clearing logic progress
      const newMap = makeDisplayMap();
      saveDisplayMap(`display-map-${state.puzzle.id}`, newMap);
      return { ...state, displayMap: newMap };
    }

    case 'LOAD_PROGRESS': {
      const loaded = {
        ...state,
        gridState: action.gridState,
        notes: action.notes,
        hintLevel: action.hintLevel,
        wrongAttempts: action.wrongAttempts,
        answers: action.answers,
        completed: false,
        showSolution: false,
      };
      // Persist to localStorage too
      try {
        localStorage.setItem(`solver-${state.puzzle.id}`, JSON.stringify(action.gridState));
        mergeIntoUnifiedStore('alch-save-base', state.puzzle.id, {
          savedAt: new Date().toISOString(),
          gridState: action.gridState,
          notes: action.notes,
          hintLevel: action.hintLevel,
          wrongAttempts: action.wrongAttempts,
          answers: action.answers,
        });
      } catch { /* ignore */ }
      return loaded;
    }

    case 'ADD_DRAW_STROKE':
      return { ...state, drawStrokes: [...state.drawStrokes, action.d] };

    case 'CLEAR_DRAW_STROKES':
      return { ...state, drawStrokes: [] };

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
    const saved = loadDisplayMap(`display-map-${puzzle.id}`);
    if (saved) return saved;
    const fresh = makeDisplayMap();
    saveDisplayMap(`display-map-${puzzle.id}`, fresh);
    return fresh;
  }, [puzzle.id]);

  const savedState = useMemo(() => loadSolverState(puzzle.id), [puzzle.id]);

  const initialState: SolverState = {
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
    drawStrokes: savedState?.drawStrokes ?? [],
  };

  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    try {
      if (!state.completed) {
        const progress = {
          savedAt:      new Date().toISOString(),
          gridState:    state.gridState,
          notes:        state.notes,
          hintLevel:    state.hintLevel,
          wrongAttempts: state.wrongAttempts,
          answers:      state.answers,
          drawStrokes:  state.drawStrokes,
        };
        // Legacy per-puzzle key (backwards compat)
        localStorage.setItem(`solver-${puzzle.id}`, JSON.stringify(progress));
        // Unified key
        mergeIntoUnifiedStore('alch-save-base', puzzle.id, progress);
      }
    } catch { /* ignore */ }
  }, [state.gridState, state.notes, state.completed, state.hintLevel, state.wrongAttempts, state.answers, state.drawStrokes, puzzle.id]);

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

