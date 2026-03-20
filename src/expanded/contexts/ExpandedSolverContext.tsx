/**
 * expanded/contexts/ExpandedSolverContext.tsx
 *
 * Self-contained solver context for expanded-mode puzzles.
 * Mirrors the structure of base SolverContext but:
 *  - Uses ExpandedPuzzle (AnyClue / AnyQuestion)
 *  - Adds solarLunarMarks state (column-level deduction)
 *  - Uses applyAnyClues for world filtering
 *  - Uses checkExpandedAnswers for answer validation
 *
 * Nothing from the base SolverContext is imported here.
 */

import {
  createContext, useContext, useReducer, useEffect, useMemo, type ReactNode,
} from 'react';
import { generateAllWorlds } from '../../logic/worldSet';
import { applyAnyClues } from '../logic/worldSetExpanded';
import { isSolar } from '../logic/solarLunar';
import { checkExpandedAnswers, computeAllExpandedAnswers } from '../puzzles/schemaExpanded';
import { validateExpandedMinStepsAnswer, validateExpandedApprenticePlanAnswer, validateExpandedConflictOnlyAnswer } from '../logic/debunkExpanded';
import { validateMaxConflictAnswer } from '../../logic/debunk';
import { WORLD_DATA } from '../../logic/worldPack';
import { makeDisplayMap, loadDisplayMap, saveDisplayMap, emptyGrid, mergeIntoUnifiedStore } from '../../utils/solverStorage';
import type { CellState, WorldSet, AlchemicalId } from '../../types';
import type { ExpandedPuzzle, AnyAnswer, SolarLunarMark, SolarLunarMarks } from '../types';
import type { Color, Size } from '../../types';

export type { DisplayMap, GridState } from '../../utils/solverStorage';

// ─── Undo / Redo ──────────────────────────────────────────────────────────────

export type UndoSnapshot = {
  gridState:   import('../../utils/solverStorage').GridState;
  notes:       Record<string, string>;
  drawStrokes: string[];
};

export type ExpandedUndoSnapshot = UndoSnapshot & {
  solarLunarMarks: SolarLunarMarks;
  golemNotepad:    GolemNotepad;
};

const MAX_UNDO = 100;

function snap(s: ExpandedSolverState): ExpandedUndoSnapshot {
  return {
    gridState:       s.gridState,
    notes:           s.notes,
    drawStrokes:     s.drawStrokes,
    solarLunarMarks: s.solarLunarMarks,
    golemNotepad:    s.golemNotepad,
  };
}

// ─── Debunk answer validator ──────────────────────────────────────────────────

function checkExpandedDebunkAnswers(
  puzzle: ExpandedPuzzle,
  worlds: WorldSet,
  playerAnswers: (AnyAnswer | null)[],
): boolean {
  const publications = (puzzle.publications ?? []).filter(Boolean) as import('../../types').Publication[];
  const articles = puzzle.articles ?? [];
  const solution = puzzle.solution;

  for (let i = 0; i < puzzle.questions.length; i++) {
    const q = puzzle.questions[i];
    const a = playerAnswers[i];
    if (!a || typeof a !== 'object' || !('kind' in a) || (a as {kind:string}).kind !== 'debunk-plan') return false;
    const steps = (a as { kind: 'debunk-plan'; steps: import('../../types').DebunkStep[] }).steps;

    if (q.kind === 'debunk_min_steps') {
      const refLen = (puzzle.debunk_answers?.debunk_min_steps ?? []).length;
      if (!validateExpandedMinStepsAnswer(steps, solution, publications, articles, worlds, refLen)) return false;
    } else if (q.kind === 'debunk_apprentice_plan') {
      const refLen = (puzzle.debunk_answers?.debunk_apprentice_plan ?? []).length;
      if (!validateExpandedApprenticePlanAnswer(steps, solution, publications, articles, worlds, refLen)) return false;
    } else if (q.kind === 'debunk_conflict_only') {
      const refLen = (puzzle.debunk_answers?.debunk_conflict_only ?? []).length;
      if (!validateExpandedConflictOnlyAnswer(steps, solution, publications, articles, worlds, refLen)) return false;
    } else if (q.kind === 'debunk_max_conflict') {
      const refMaxCoverage = (q as { kind: 'debunk_max_conflict'; maxCoverage: number }).maxCoverage;
      if (!validateMaxConflictAnswer(steps, solution, publications, worlds, refMaxCoverage)) return false;
    }
  }
  return true;
}

// ─── Display map (identical logic to base) ────────────────────────────────────

// ─── Grid + solar/lunar state ─────────────────────────────────────────────────

type GridState = import('../../utils/solverStorage').GridState;
type DisplayMap = import('../../utils/solverStorage').DisplayMap;

function emptySolarLunarMarks(): SolarLunarMarks {
  const m: SolarLunarMarks = {};
  for (let i = 1; i <= 8; i++) m[i] = null;
  return m;
}

// ─── Persistence ──────────────────────────────────────────────────────────────

type SavedState = {
  gridState: GridState;
  notes: Record<string, string>;
  hintLevel: number;
  solarLunarMarks: SolarLunarMarks;
  golemNotepad: GolemNotepad;
  drawStrokes: string[];
};

export type GolemSlotMark = 'reacts' | 'no-react' | 'possible' | null;

export type GolemNotepad = {
  chest: { color: Color; size: Size } | null;
  ears:  { color: Color; size: Size } | null;
  ingredientMarks: Record<number, { chest: GolemSlotMark; ears: GolemSlotMark }>;
};

function emptyGolemNotepad(): GolemNotepad { return { chest: null, ears: null, ingredientMarks: {} }; }

function loadSolverState(puzzleId: string): SavedState | null {
  try {
    // 1. Try new unified key
    const unified = localStorage.getItem('alch-save-expanded');
    if (unified) {
      const file = JSON.parse(unified);
      const entry = file?.puzzles?.[puzzleId];
      if (entry?.gridState) {
        return {
          gridState:       entry.gridState      as GridState,
          notes:           (entry.notes ?? {})  as Record<string, string>,
          hintLevel:       typeof entry.hintLevel === 'number' ? entry.hintLevel : 0,
          solarLunarMarks: (entry.solarLunarMarks ?? emptySolarLunarMarks()) as SolarLunarMarks,
          golemNotepad:    (entry.golemNotepad    ?? emptyGolemNotepad())    as GolemNotepad,
          drawStrokes:     (entry.drawStrokes ?? []) as string[],
        };
      }
    }
    // 2. Fall back to legacy per-puzzle key
    const raw = localStorage.getItem(`exp-solver-${puzzleId}`);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p !== 'object' || !p.gridState) return null;
    return {
      gridState:       p.gridState      as GridState,
      notes:           (p.notes ?? {})  as Record<string, string>,
      hintLevel:       typeof p.hintLevel === 'number' ? p.hintLevel : 0,
      solarLunarMarks: (p.solarLunarMarks ?? emptySolarLunarMarks()) as SolarLunarMarks,
      golemNotepad:    (p.golemNotepad ?? emptyGolemNotepad()) as GolemNotepad,
      drawStrokes:     (p.drawStrokes ?? []) as string[],
    };
  } catch { return null; }
}

// ─── State shape ──────────────────────────────────────────────────────────────

export type ExpandedSolverState = {
  puzzle:          ExpandedPuzzle;
  worlds:          WorldSet;
  displayMap:      DisplayMap;
  gridState:       GridState;
  notes:           Record<string, string>;
  autoDeduction:   boolean;
  hintLevel:       number;
  wrongAttempts:   number;
  answers:         (AnyAnswer | null)[];
  solarLunarMarks: SolarLunarMarks;
  golemNotepad:    GolemNotepad;
  drawStrokes:     string[];
  completed:       boolean;
  showSolution:    boolean;
  undoStack:       ExpandedUndoSnapshot[];
  redoStack:       ExpandedUndoSnapshot[];
};

// ─── Actions ──────────────────────────────────────────────────────────────────

export type ExpandedAction =
  | { type: 'TOGGLE_CELL';         ingredient: number; alchemical: number }
  | { type: 'SET_CELL';            ingredient: number; alchemical: number; state: CellState }
  | { type: 'SUBMIT_ANSWER';       answers: (AnyAnswer | null)[] }
  | { type: 'REQUEST_HINT' }
  | { type: 'TOGGLE_AUTO_DEDUCTION' }
  | { type: 'REVEAL_SOLUTION' }
  | { type: 'RESET' }
  | { type: 'RESHUFFLE' }
  | { type: 'CLEAR_GRID' }
  | { type: 'SET_NOTE';            key: string; value: string }
  | { type: 'SET_SOLAR_LUNAR_MARK'; slot: number; mark: SolarLunarMark }
  | { type: 'SET_GOLEM_NOTEPAD'; part: 'chest' | 'ears'; value: { color: Color; size: Size } | null }
  | { type: 'SET_GOLEM_INGREDIENT_MARK'; slot: number; part: 'chest' | 'ears'; mark: GolemSlotMark }
  | { type: 'LOAD_PROGRESS'; gridState: GridState; notes: Record<string,string>; hintLevel: number; wrongAttempts: number; answers: (AnyAnswer | null)[]; solarLunarMarks: SolarLunarMarks; golemNotepad: GolemNotepad }
  | { type: 'ADD_DRAW_STROKE'; d: string }
  | { type: 'CLEAR_DRAW_STROKES' }
  | { type: 'UNDO' }
  | { type: 'REDO' };

// ─── Solar/lunar hint computation (exported for grid component) ───────────────

export function computeSolarLunarAutoMarks(worlds: WorldSet): SolarLunarMarks {
  const marks: SolarLunarMarks = {};
  for (let s = 0; s < 8; s++) {
    if (worlds.length === 0) { marks[s + 1] = null; continue; }
    const firstSolar = isSolar((WORLD_DATA[worlds[0] * 8 + s] + 1) as AlchemicalId);
    let allSame = true;
    for (let i = 1; i < worlds.length; i++) {
      if (isSolar((WORLD_DATA[worlds[i] * 8 + s] + 1) as AlchemicalId) !== firstSolar) {
        allSame = false; break;
      }
    }
    marks[s + 1] = allSame
      ? (firstSolar
        ? { solar: 'confirmed', lunar: 'eliminated' }
        : { solar: 'eliminated', lunar: 'confirmed' })
      : null;
  }
  return marks;
}

function applyAutoDeduction(state: ExpandedSolverState): ExpandedSolverState {
  // Solar/lunar and golem hints are now visual-only overlays computed in the
  // grid component. This function is kept as a no-op for call-site compatibility.
  return state;
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

function reducer(state: ExpandedSolverState, action: ExpandedAction): ExpandedSolverState {
  switch (action.type) {

    case 'TOGGLE_CELL': {
      const { ingredient, alchemical } = action;
      const cycle: CellState[] = ['unknown', 'eliminated', 'confirmed'];
      const current = state.gridState[ingredient][alchemical];
      const next = cycle[(cycle.indexOf(current) + 1) % cycle.length];
      const undoStack = [snap(state), ...state.undoStack].slice(0, MAX_UNDO);
      return {
        ...state,
        gridState: { ...state.gridState, [ingredient]: { ...state.gridState[ingredient], [alchemical]: next } },
        undoStack,
        redoStack: [],
      };
    }

    case 'SET_CELL': {
      const undoStack = [snap(state), ...state.undoStack].slice(0, MAX_UNDO);
      return {
        ...state,
        gridState: {
          ...state.gridState,
          [action.ingredient]: { ...state.gridState[action.ingredient], [action.alchemical]: action.state },
        },
        undoStack,
        redoStack: [],
      };
    }

    case 'SUBMIT_ANSWER': {
      const hasDebunk = state.puzzle.questions.some(
        q => q.kind === 'debunk_min_steps' || q.kind === 'debunk_apprentice_plan'
          || q.kind === 'debunk_conflict_only' || q.kind === 'debunk_max_conflict'
      );
      let correct: boolean;
      if (hasDebunk) {
        correct = checkExpandedDebunkAnswers(state.puzzle, state.worlds, action.answers);
      } else {
        correct = checkExpandedAnswers(state.puzzle, action.answers);
      }
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
      saveDisplayMap(`exp-display-map-${state.puzzle.id}`, newMap);
      const undoStack = [snap(state), ...state.undoStack].slice(0, MAX_UNDO);
      return applyAutoDeduction({
        ...state,
        displayMap:      newMap,
        gridState:       emptyGrid(),
        solarLunarMarks: emptySolarLunarMarks(),
        golemNotepad:    emptyGolemNotepad(),
        hintLevel:       0,
        wrongAttempts:   0,
        answers:         state.puzzle.questions.map(() => null),
        completed:       false,
        showSolution:    false,
        notes:           {},
        undoStack,
        redoStack:       [],
      });
    }

    case 'RESHUFFLE': {
      const newMap = makeDisplayMap();
      saveDisplayMap(`exp-display-map-${state.puzzle.id}`, newMap);
      return { ...state, displayMap: newMap };
    }

    case 'CLEAR_GRID': {
      const undoStack = [snap(state), ...state.undoStack].slice(0, MAX_UNDO);
      return applyAutoDeduction({
        ...state,
        gridState:       emptyGrid(),
        solarLunarMarks: emptySolarLunarMarks(),
        golemNotepad:    emptyGolemNotepad(),
        notes:           {},
        undoStack,
        redoStack:       [],
      });
    }

    case 'SET_NOTE': {
      const undoStack = [snap(state), ...state.undoStack].slice(0, MAX_UNDO);
      const notes = { ...state.notes };
      if (action.value === '') delete notes[action.key];
      else notes[action.key] = action.value.slice(0, 4);
      return { ...state, notes, undoStack, redoStack: [] };
    }

    case 'SET_SOLAR_LUNAR_MARK': {
      const undoStack = [snap(state), ...state.undoStack].slice(0, MAX_UNDO);
      return {
        ...state,
        solarLunarMarks: { ...state.solarLunarMarks, [action.slot]: action.mark },
        undoStack,
        redoStack: [],
      };
    }

    case 'SET_GOLEM_NOTEPAD': {
      const undoStack = [snap(state), ...state.undoStack].slice(0, MAX_UNDO);
      return {
        ...state,
        golemNotepad: { ...state.golemNotepad, [action.part]: action.value },
        undoStack,
        redoStack: [],
      };
    }

    case 'SET_GOLEM_INGREDIENT_MARK': {
      const undoStack = [snap(state), ...state.undoStack].slice(0, MAX_UNDO);
      const prev = state.golemNotepad.ingredientMarks[action.slot] ?? { chest: null, ears: null };
      return {
        ...state,
        golemNotepad: {
          ...state.golemNotepad,
          ingredientMarks: {
            ...state.golemNotepad.ingredientMarks,
            [action.slot]: { ...prev, [action.part]: action.mark },
          },
        },
        undoStack,
        redoStack: [],
      };
    }

    case 'LOAD_PROGRESS': {
      const loaded = applyAutoDeduction({
        ...state,
        gridState: action.gridState,
        notes: action.notes,
        hintLevel: action.hintLevel,
        wrongAttempts: action.wrongAttempts,
        answers: action.answers,
        solarLunarMarks: action.solarLunarMarks,
        golemNotepad: action.golemNotepad,
        completed: false,
        showSolution: false,
        undoStack: [] as ExpandedUndoSnapshot[],
        redoStack: [] as ExpandedUndoSnapshot[],
      });
      try {
        localStorage.setItem(`exp-solver-${state.puzzle.id}`, JSON.stringify(action.gridState));
        mergeIntoUnifiedStore('alch-save-expanded', state.puzzle.id, {
          savedAt: new Date().toISOString(),
          gridState: action.gridState,
          notes: action.notes,
          hintLevel: action.hintLevel,
          wrongAttempts: action.wrongAttempts,
          answers: action.answers,
          solarLunarMarks: action.solarLunarMarks,
          golemNotepad: action.golemNotepad,
        });
      } catch { /* ignore */ }
      return loaded;
    }

    case 'ADD_DRAW_STROKE': {
      const undoStack = [snap(state), ...state.undoStack].slice(0, MAX_UNDO);
      return { ...state, drawStrokes: [...state.drawStrokes, action.d], undoStack, redoStack: [] };
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

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

type ContextValue = { state: ExpandedSolverState; dispatch: React.Dispatch<ExpandedAction> };
const ExpandedSolverContext = createContext<ContextValue | null>(null);

export function ExpandedSolverProvider({ puzzle, children }: { puzzle: ExpandedPuzzle; children: ReactNode }) {
  const worlds = useMemo(() => applyAnyClues(generateAllWorlds(), puzzle.clues), [puzzle]);

  const displayMap = useMemo(() => {
    const saved = loadDisplayMap(`exp-display-map-${puzzle.id}`);
    if (saved) return saved;
    const fresh = makeDisplayMap();
    saveDisplayMap(`exp-display-map-${puzzle.id}`, fresh);
    return fresh;
  }, [puzzle.id]);

  const savedState = useMemo(() => loadSolverState(puzzle.id), [puzzle.id]);

  const initialState: ExpandedSolverState = applyAutoDeduction({
    puzzle,
    worlds,
    displayMap,
    gridState:       savedState?.gridState       ?? emptyGrid(),
    notes:           savedState?.notes           ?? {},
    solarLunarMarks: savedState?.solarLunarMarks ?? emptySolarLunarMarks(),
    golemNotepad:    savedState?.golemNotepad    ?? emptyGolemNotepad(),
    drawStrokes:     savedState?.drawStrokes     ?? [],
    autoDeduction:   false,
    hintLevel:       savedState?.hintLevel ?? 0,
    wrongAttempts:   0,
    answers:         puzzle.questions.map(() => null),
    completed:       false,
    showSolution:    false,
    undoStack:       [],
    redoStack:       [],
  });

  const [state, dispatch] = useReducer(reducer, initialState);

  // Persist on every relevant state change
  useEffect(() => {
    try {
      if (!state.completed) {
        const progress = {
          savedAt:         new Date().toISOString(),
          gridState:       state.gridState,
          notes:           state.notes,
          hintLevel:       state.hintLevel,
          wrongAttempts:   state.wrongAttempts,
          answers:         state.answers,
          solarLunarMarks: state.solarLunarMarks,
          golemNotepad:    state.golemNotepad,
          drawStrokes:     state.drawStrokes,
        };
        // Legacy per-puzzle key (backwards compat)
        localStorage.setItem(`exp-solver-${puzzle.id}`, JSON.stringify(progress));
        // Unified key
        mergeIntoUnifiedStore('alch-save-expanded', puzzle.id, progress);
      }
    } catch { /**/ }
  }, [state.gridState, state.notes, state.hintLevel, state.wrongAttempts, state.answers, state.solarLunarMarks, state.golemNotepad, state.drawStrokes, state.completed, puzzle.id]);

  return (
    <ExpandedSolverContext.Provider value={{ state, dispatch }}>
      {children}
    </ExpandedSolverContext.Provider>
  );
}

export function clearExpandedPuzzleState(puzzleId: string) {
  try {
    localStorage.removeItem(`exp-solver-${puzzleId}`);
    localStorage.removeItem(`exp-display-map-${puzzleId}`);
  } catch { /**/ }
}

export function useExpandedSolver() {
  const ctx = useContext(ExpandedSolverContext);
  if (!ctx) throw new Error('useExpandedSolver must be inside ExpandedSolverProvider');
  return ctx;
}

export function useExpandedIngredient() {
  const { state } = useExpandedSolver();
  return (slotId: number) => {
    const displayId = state.displayMap[slotId] ?? slotId;
    return { displayId, index: (displayId - 1) as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 };
  };
}

// Expose computeAllExpandedAnswers for use in ExpandedAnswerPanel (solution reveal)
export { computeAllExpandedAnswers };
