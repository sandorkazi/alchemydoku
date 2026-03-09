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
import { getEliminatedCells } from '../../logic/deducer';
import { applyAnyClues } from '../logic/worldSetExpanded';
import { isSolar } from '../logic/solarLunar';
import { checkExpandedAnswers, computeAllExpandedAnswers } from '../puzzles/schemaExpanded';
import { WORLD_DATA } from '../../logic/worldPack';
import type { CellState, WorldSet, AlchemicalId } from '../../types';
import type { ExpandedPuzzle, AnyAnswer, SolarLunarMark, SolarLunarMarks, GolemParams } from '../types';
import type { Color, Size } from '../../types';

// ─── Display map (identical logic to base) ────────────────────────────────────

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
    const raw = localStorage.getItem(`exp-display-map-${puzzleId}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveDisplayMap(puzzleId: string, map: DisplayMap) {
  try { localStorage.setItem(`exp-display-map-${puzzleId}`, JSON.stringify(map)); } catch { /**/ }
}

// ─── Grid + solar/lunar state ─────────────────────────────────────────────────

type GridState = Record<number, Record<number, CellState>>;

function emptyGrid(): GridState {
  const g: GridState = {};
  for (let i = 1; i <= 8; i++) {
    g[i] = {};
    for (let a = 1; a <= 8; a++) g[i][a] = 'unknown';
  }
  return g;
}

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
    const raw = localStorage.getItem(`exp-solver-${puzzleId}`);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p !== 'object' || !p.gridState) return null;
    return {
      gridState:       p.gridState      as GridState,
      notes:           (p.notes ?? {})  as Record<string, string>,
      hintLevel:       typeof p.hintLevel === 'number' ? p.hintLevel : 0,
      solarLunarMarks: (p.solarLunarMarks ?? emptySolarLunarMarks()) as SolarLunarMarks,
      golemNotepad: (p.golemNotepad ?? emptyGolemNotepad()) as GolemNotepad,
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
  completed:       boolean;
  showSolution:    boolean;
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
  | { type: 'SET_GOLEM_INGREDIENT_MARK'; slot: number; part: 'chest' | 'ears'; mark: GolemSlotMark };

// ─── Auto-deduction ───────────────────────────────────────────────────────────

function computeSolarLunarAutoMarks(worlds: WorldSet): SolarLunarMarks {
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
    marks[s + 1] = allSame ? (firstSolar ? 'solar' : 'lunar') : null;
  }
  return marks;
}

function applyAutoDeduction(state: ExpandedSolverState): ExpandedSolverState {
  if (!state.autoDeduction) return state;

  // Grid cells
  const eliminated = getEliminatedCells(state.worlds);
  const newGrid = { ...state.gridState };
  for (let i = 1; i <= 8; i++) {
    newGrid[i] = { ...newGrid[i] };
    for (let a = 1; a <= 8; a++) {
      const key = `${i}-${a}`;
      if (eliminated.has(key) && newGrid[i][a] === 'unknown') newGrid[i][a] = 'eliminated';
      const possible = Object.entries(newGrid[i]).filter(([ak]) => !eliminated.has(`${i}-${ak}`));
      if (possible.length === 1) {
        const onlyAlch = Number(possible[0][0]);
        if (newGrid[i][onlyAlch] !== 'confirmed') newGrid[i] = { ...newGrid[i], [onlyAlch]: 'confirmed' };
      }
    }
  }

  // Solar/lunar column marks
  const autoMarks = computeSolarLunarAutoMarks(state.worlds);
  const newMarks: SolarLunarMarks = { ...state.solarLunarMarks };
  for (let s = 1; s <= 8; s++) {
    if (autoMarks[s] !== null) newMarks[s] = autoMarks[s];
  }

  // Golem notepad auto-deduction
  let newNotepad: GolemNotepad = state.golemNotepad ?? emptyGolemNotepad();
  const params = state.puzzle.golem;
  if (params) {
    // Fill chest/ears alch property deduction
    if (!newNotepad.chest) newNotepad = { ...newNotepad, chest: params.chest };
    if (!newNotepad.ears)  newNotepad = { ...newNotepad, ears:  params.ears  };
    // Fill ingredient reaction marks from golem_test clues
    const newIngMarks = { ...newNotepad.ingredientMarks };
    for (const clue of state.puzzle.clues) {
      if (clue.kind !== 'golem_test') continue;
      const s = (clue as import('../puzzles/schemaExpanded').GolemTestClue).ingredient;
      const prev = newIngMarks[s] ?? { chest: null, ears: null };
      newIngMarks[s] = {
        chest: prev.chest ?? ((clue as import('../puzzles/schemaExpanded').GolemTestClue).chest_reacted ? 'reacts' : 'no-react'),
        ears:  prev.ears  ?? ((clue as import('../puzzles/schemaExpanded').GolemTestClue).ears_reacted  ? 'reacts' : 'no-react'),
      };
    }
    newNotepad = { ...newNotepad, ingredientMarks: newIngMarks };
  }

  return { ...state, gridState: newGrid, solarLunarMarks: newMarks, golemNotepad: newNotepad };
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

function reducer(state: ExpandedSolverState, action: ExpandedAction): ExpandedSolverState {
  switch (action.type) {

    case 'TOGGLE_CELL': {
      const { ingredient, alchemical } = action;
      const cycle: CellState[] = ['unknown', 'eliminated', 'confirmed'];
      const current = state.gridState[ingredient][alchemical];
      const next = cycle[(cycle.indexOf(current) + 1) % cycle.length];
      return {
        ...state,
        gridState: { ...state.gridState, [ingredient]: { ...state.gridState[ingredient], [alchemical]: next } },
      };
    }

    case 'SET_CELL': {
      return {
        ...state,
        gridState: {
          ...state.gridState,
          [action.ingredient]: { ...state.gridState[action.ingredient], [action.alchemical]: action.state },
        },
      };
    }

    case 'SUBMIT_ANSWER': {
      const correct = checkExpandedAnswers(state.puzzle, action.answers);
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
      });
    }

    case 'RESHUFFLE': {
      const newMap = makeDisplayMap();
      saveDisplayMap(state.puzzle.id, newMap);
      return { ...state, displayMap: newMap };
    }

    case 'CLEAR_GRID':
      return applyAutoDeduction({
        ...state,
        gridState:       emptyGrid(),
        solarLunarMarks: emptySolarLunarMarks(),
        golemNotepad:    emptyGolemNotepad(),
        notes:           {},
      });

    case 'SET_NOTE': {
      const notes = { ...state.notes };
      if (action.value === '') delete notes[action.key];
      else notes[action.key] = action.value.slice(0, 4);
      return { ...state, notes };
    }

    case 'SET_SOLAR_LUNAR_MARK':
      return {
        ...state,
        solarLunarMarks: { ...state.solarLunarMarks, [action.slot]: action.mark },
      };

    case 'SET_GOLEM_NOTEPAD':
      return {
        ...state,
        golemNotepad: { ...state.golemNotepad, [action.part]: action.value },
      };

    case 'SET_GOLEM_INGREDIENT_MARK': {
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
    const saved = loadDisplayMap(puzzle.id);
    if (saved) return saved;
    const fresh = makeDisplayMap();
    saveDisplayMap(puzzle.id, fresh);
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
    autoDeduction:   false,
    hintLevel:       savedState?.hintLevel ?? 0,
    wrongAttempts:   0,
    answers:         puzzle.questions.map(() => null),
    completed:       false,
    showSolution:    false,
  });

  const [state, dispatch] = useReducer(reducer, initialState);

  // Persist on every relevant state change
  useEffect(() => {
    try {
      if (!state.completed) {
        localStorage.setItem(`exp-solver-${puzzle.id}`, JSON.stringify({
          gridState:       state.gridState,
          notes:           state.notes,
          hintLevel:       state.hintLevel,
          solarLunarMarks: state.solarLunarMarks,
        }));
      }
    } catch { /**/ }
  }, [state.gridState, state.notes, state.hintLevel, state.solarLunarMarks, state.completed, puzzle.id]);

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
