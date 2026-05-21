import { createContext, useContext, useReducer, useEffect, useMemo, type ReactNode } from 'react';
import { generateAllWorlds, applyClues } from '../logic/worldSet';
import { checkAnswers, checkDebunkAnswers } from '../puzzles/schema';
import { makeDisplayMap, loadDisplayMap, saveDisplayMap, emptyGrid, mergeIntoUnifiedStore } from '../utils/solverStorage';
import { normalizeStroke, type DrawStroke } from '../utils/penColors';
import { loadSettings } from '../utils/settings';
import type { Puzzle, CellState, WorldSet } from '../types';
import type { PuzzleAnswer } from '../puzzles/schema';

export type { DisplayMap, GridState } from '../utils/solverStorage';

// ─── Local type aliases ───────────────────────────────────────────────────────

type GridState  = import('../utils/solverStorage').GridState;
type DisplayMap = import('../utils/solverStorage').DisplayMap;

// ─── Undo / Redo ──────────────────────────────────────────────────────────────

export type { DrawStroke } from '../utils/penColors';

export type UndoSnapshot = {
  gridState:   GridState;
  notes:       Record<string, string>;
  drawStrokes: DrawStroke[];
};

const MAX_UNDO = 100;

function snap(s: SolverState): UndoSnapshot {
  return { gridState: s.gridState, notes: s.notes, drawStrokes: s.drawStrokes };
}

// ─── State ────────────────────────────────────────────────────────────────────

function loadSolverState(puzzleId: string): { gridState: GridState; notes: Record<string,string>; hintLevel: number; hintStepIndex: number; drawStrokes: DrawStroke[]; timerElapsed: number } | null {
  try {
    // 1. Try new unified key (written by save-file load + auto-save)
    const unified = localStorage.getItem('alch-save-base');
    if (unified) {
      const file = JSON.parse(unified);
      const entry = file?.puzzles?.[puzzleId];
      if (entry?.gridState) {
        return {
          gridState:     entry.gridState as GridState,
          notes:         (entry.notes ?? {}) as Record<string,string>,
          hintLevel:     typeof entry.hintLevel === 'number' ? entry.hintLevel : 0,
          hintStepIndex: typeof entry.hintStepIndex === 'number' ? entry.hintStepIndex : 0,
          drawStrokes:   ((entry.drawStrokes ?? []) as (string | DrawStroke)[]).map(normalizeStroke),
          timerElapsed:  typeof entry.timerElapsed === 'number' ? entry.timerElapsed : 0,
        };
      }
    }
    // 2. Fall back to legacy per-puzzle key
    const raw = localStorage.getItem(`solver-${puzzleId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || !parsed.gridState) return null;
    return {
      gridState:     parsed.gridState  as GridState,
      notes:         (parsed.notes ?? {}) as Record<string,string>,
      hintLevel:     typeof parsed.hintLevel === 'number' ? parsed.hintLevel : 0,
      hintStepIndex: typeof parsed.hintStepIndex === 'number' ? parsed.hintStepIndex : 0,
      drawStrokes:   ((parsed.drawStrokes ?? []) as (string | DrawStroke)[]).map(normalizeStroke),
      timerElapsed:  typeof parsed.timerElapsed === 'number' ? parsed.timerElapsed : 0,
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
  hintStepIndex: number;
  wrongAttempts: number;
  /** One entry per puzzle.questions — null means not yet answered */
  answers: (PuzzleAnswer | null)[];
  completed: boolean;
  showSolution: boolean;
  drawStrokes: DrawStroke[];
  undoStack: UndoSnapshot[];
  redoStack: UndoSnapshot[];
  timerElapsed: number;
  timerPaused: boolean;
};

// ─── Actions ──────────────────────────────────────────────────────────────────

export type Action =
  | { type: 'TOGGLE_CELL'; ingredient: number; alchemical: number }
  | { type: 'SET_CELL'; ingredient: number; alchemical: number; state: CellState }
  | { type: 'SUBMIT_ANSWER'; answers: (PuzzleAnswer | null)[] }
  | { type: 'REQUEST_HINT' }
  | { type: 'NEXT_HINT_STEP' }
  | { type: 'TOGGLE_AUTO_DEDUCTION' }
  | { type: 'REVEAL_SOLUTION' }
  | { type: 'RESET' }
  | { type: 'RESHUFFLE' }
  | { type: 'RESHUFFLE_CUSTOM'; map: DisplayMap }
  | { type: 'CLEAR_GRID' }
  | { type: 'SET_NOTE'; key: string; value: string }
  | { type: 'LOAD_PROGRESS'; gridState: GridState; notes: Record<string,string>; hintLevel: number; wrongAttempts: number; answers: (PuzzleAnswer | null)[] }
  | { type: 'ADD_DRAW_STROKE'; d: string; color: string }
  | { type: 'CLEAR_DRAW_STROKES' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'TIMER_TICK' }
  | { type: 'TIMER_PAUSE' }
  | { type: 'TIMER_RESUME' };

// ─── Reducer ──────────────────────────────────────────────────────────────────

function reducer(state: SolverState, action: Action): SolverState {
  switch (action.type) {
    case 'TOGGLE_CELL': {
      const { ingredient, alchemical } = action;
      const current = state.gridState[ingredient][alchemical];
      const cycle: CellState[] = ['unknown', 'eliminated', 'confirmed', 'possible'];
      const next = cycle[(cycle.indexOf(current) + 1) % cycle.length];
      const undoStack = [snap(state), ...state.undoStack].slice(0, MAX_UNDO);
      return {
        ...state,
        gridState: {
          ...state.gridState,
          [ingredient]: { ...state.gridState[ingredient], [alchemical]: next },
        },
        undoStack,
        redoStack: [],
      };
    }

    case 'SET_CELL': {
      const { ingredient, alchemical, state: cellState } = action;
      const undoStack = [snap(state), ...state.undoStack].slice(0, MAX_UNDO);
      return {
        ...state,
        gridState: {
          ...state.gridState,
          [ingredient]: { ...state.gridState[ingredient], [alchemical]: cellState },
        },
        undoStack,
        redoStack: [],
      };
    }

    case 'SUBMIT_ANSWER': {
      const hasDebunk = state.puzzle.questions.some(
        q => q.kind === 'debunk_min_steps' || q.kind === 'debunk_conflict_only' || q.kind === 'debunk_apprentice_plan'
      );
      const correct = hasDebunk
        ? checkDebunkAnswers(state.puzzle, state.worlds, action.answers)
        : checkAnswers(state.puzzle, action.answers);
      if (correct) return { ...state, answers: action.answers, completed: true, timerPaused: true };
      const wrongAttempts = state.wrongAttempts + 1;
      return {
        ...state,
        answers: action.answers,
        wrongAttempts,
        hintLevel: Math.min(state.hintLevel + 1, state.puzzle.hints?.length ?? 3),
        showSolution: wrongAttempts >= 3,
      };
    }

    case 'REQUEST_HINT':
      return { ...state, hintLevel: Math.min(state.hintLevel + 1, state.puzzle.hints?.length ?? 3) };

    case 'NEXT_HINT_STEP':
      return {
        ...state,
        hintStepIndex: Math.min(
          state.hintStepIndex + 1,
          state.puzzle.hint_steps?.length ?? 0,
        ),
      };

    case 'TOGGLE_AUTO_DEDUCTION':
      return { ...state, autoDeduction: !state.autoDeduction };

    case 'REVEAL_SOLUTION':
      return { ...state, showSolution: true };

    case 'RESET': {
      const undoStack = [snap(state), ...state.undoStack].slice(0, MAX_UNDO);
      return {
        ...state,
        gridState: emptyGrid(),
        hintLevel: 0,
        hintStepIndex: 0,
        wrongAttempts: 0,
        answers: state.puzzle.questions.map(() => null),
        completed: false,
        showSolution: false,
        timerElapsed: 0,
        timerPaused: false,
        undoStack,
        redoStack: [],
      };
    }

    case 'CLEAR_GRID': {
      const undoStack = [snap(state), ...state.undoStack].slice(0, MAX_UNDO);
      return { ...state, gridState: emptyGrid(), notes: {}, undoStack, redoStack: [] };
    }
    case 'SET_NOTE': {
      const undoStack = [snap(state), ...state.undoStack].slice(0, MAX_UNDO);
      const notes = { ...state.notes };
      if (action.value === '') delete notes[action.key];
      else notes[action.key] = action.value.slice(0, 4);  // max 4 chars
      return { ...state, notes, undoStack, redoStack: [] };
    }

    case 'RESHUFFLE': {
      // Re-randomise ingredient visuals without clearing logic progress
      const newMap = makeDisplayMap();
      saveDisplayMap(`display-map-${state.puzzle.id}`, newMap);
      return { ...state, displayMap: newMap };
    }

    case 'RESHUFFLE_CUSTOM': {
      saveDisplayMap(`display-map-${state.puzzle.id}`, action.map);
      return { ...state, displayMap: action.map };
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
        undoStack: [] as UndoSnapshot[],
        redoStack: [] as UndoSnapshot[],
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

    case 'ADD_DRAW_STROKE': {
      const undoStack = [snap(state), ...state.undoStack].slice(0, MAX_UNDO);
      return { ...state, drawStrokes: [...state.drawStrokes, { d: action.d, color: action.color }], undoStack, redoStack: [] };
    }

    case 'CLEAR_DRAW_STROKES': {
      const undoStack = [snap(state), ...state.undoStack].slice(0, MAX_UNDO);
      return { ...state, drawStrokes: [], undoStack, redoStack: [] };
    }

    case 'UNDO': {
      if (!state.undoStack.length) return state;
      const [prev, ...rest] = state.undoStack;
      return {
        ...state,
        ...prev,
        undoStack: rest,
        redoStack: [snap(state), ...state.redoStack].slice(0, MAX_UNDO),
      };
    }

    case 'REDO': {
      if (!state.redoStack.length) return state;
      const [next, ...rest] = state.redoStack;
      return {
        ...state,
        ...next,
        undoStack: [snap(state), ...state.undoStack].slice(0, MAX_UNDO),
        redoStack: rest,
      };
    }

    case 'TIMER_TICK':
      if (state.timerPaused || state.completed) return state;
      return { ...state, timerElapsed: state.timerElapsed + 1 };

    case 'TIMER_PAUSE':
      return { ...state, timerPaused: true };

    case 'TIMER_RESUME':
      return { ...state, timerPaused: false };

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

export function SolverProvider({ puzzle, children, initialDisplayMap }: { puzzle: Puzzle; children: ReactNode; initialDisplayMap?: DisplayMap }) {
  const worlds = useMemo(() => applyClues(generateAllWorlds(), puzzle.clues), [puzzle]);

  const displayMap = useMemo(() => {
    if (initialDisplayMap) {
      saveDisplayMap(`display-map-${puzzle.id}`, initialDisplayMap);
      return initialDisplayMap;
    }
    const saved = loadDisplayMap(`display-map-${puzzle.id}`);
    if (saved) return saved;
    const fresh = makeDisplayMap();
    saveDisplayMap(`display-map-${puzzle.id}`, fresh);
    return fresh;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle.id]);

  const savedState = useMemo(() => loadSolverState(puzzle.id), [puzzle.id]);

  const showTimer = useMemo(() => loadSettings().showTimer, []);

  const initialState: SolverState = {
    puzzle,
    worlds,
    displayMap,
    gridState: savedState?.gridState ?? emptyGrid(),
    notes:     savedState?.notes     ?? {},
    autoDeduction: false,
    hintLevel: savedState?.hintLevel ?? 0,
    hintStepIndex: Math.min(savedState?.hintStepIndex ?? 0, puzzle.hint_steps?.length ?? 0),
    wrongAttempts: 0,
    answers: puzzle.questions.map(() => null),
    completed: false,
    showSolution: false,
    drawStrokes: savedState?.drawStrokes ?? [],
    undoStack: [],
    redoStack: [],
    timerElapsed: savedState?.timerElapsed ?? 0,
    timerPaused: false,
  };

  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    if (!showTimer || state.completed) return;
    const id = setInterval(() => dispatch({ type: 'TIMER_TICK' }), 1000);
    return () => clearInterval(id);
  }, [showTimer, state.completed]);

  useEffect(() => {
    try {
      if (!state.completed) {
        const progress = {
          savedAt:       new Date().toISOString(),
          gridState:     state.gridState,
          notes:         state.notes,
          hintLevel:     state.hintLevel,
          hintStepIndex: state.hintStepIndex,
          wrongAttempts: state.wrongAttempts,
          answers:       state.answers,
          drawStrokes:   state.drawStrokes,
          timerElapsed:  state.timerElapsed,
        };
        // Legacy per-puzzle key (backwards compat)
        localStorage.setItem(`solver-${puzzle.id}`, JSON.stringify(progress));
        // Unified key
        mergeIntoUnifiedStore('alch-save-base', puzzle.id, progress);
      }
    } catch { /* ignore */ }
  }, [state.gridState, state.notes, state.completed, state.hintLevel, state.hintStepIndex, state.wrongAttempts, state.answers, state.drawStrokes, state.timerElapsed, puzzle.id]);

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

