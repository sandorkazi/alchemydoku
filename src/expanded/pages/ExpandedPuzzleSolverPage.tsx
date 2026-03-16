/**
 * expanded/pages/ExpandedPuzzleSolverPage.tsx
 *
 * Self-contained solver page for expanded puzzles.
 * Uses ExpandedSolverProvider and all expanded UI components.
 * No base game context or pages are imported here.
 */

import { useState } from 'react';
import { ExpandedSolverProvider, useExpandedSolver } from '../contexts/ExpandedSolverContext';
import { ExpandedCluePanel } from '../components/ExpandedCluePanel';
import { ExpandedIngredientGrid, GolemPanel } from '../components/ExpandedIngredientGrid';
import { ExpandedAnswerPanel } from '../components/ExpandedAnswerPanel';
import { ExpandedMixSimulator } from '../components/ExpandedMixSimulator';
import { ExpandedHintDrawer } from '../components/ExpandedHintDrawer';
import { PuzzleToolbar } from '../../components/PuzzleToolbar';
import { downloadBothFiles, uploadExpandedProgress } from '../../utils/saveProgress';
import { applyPermalink } from '../../utils/permalink';
import type { ExpandedPuzzle } from '../types';

// ─── Mobile clue drawer ───────────────────────────────────────────────────────

function MobileClueDrawer({ puzzle }: { puzzle: ExpandedPuzzle }) {
  const [open, setOpen] = useState(false);
  const hints = (puzzle as unknown as { hints?: { level: number; text: string }[] }).hints;
  return (
    <div className="lg:hidden">
      <button onClick={() => setOpen(v => !v)} aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-white border-b
                   text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
        <span className="flex items-center gap-2"><span>📋</span><span>Clues ({puzzle.clues.length})</span></span>
        <span className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="bg-white border-b px-4 py-4 space-y-4 animate-fadein">
          <ExpandedCluePanel clues={puzzle.clues} />
          <ExpandedHintDrawer hints={hints} />
        </div>
      )}
    </div>
  );
}

// ─── Collapsible sections ─────────────────────────────────────────────────────

function IngredientGridSection() {
  const { state, dispatch } = useExpandedSolver();
  const hasGolem = !!state.puzzle.golem;
  const [open, setOpen] = useState(hasGolem);
  const [golemOpen, setGolemOpen] = useState(hasGolem);
  const [activeTool, setActiveTool] = useState<import('../components/ExpandedIngredientGrid').GridTool>('mark');
  return (
    <div className="border-t">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between py-2.5 text-xs font-semibold
                   uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors
                   focus-visible:outline-none"
        aria-expanded={open}>
        <span>Ingredient Grid</span>
        <span className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="pb-2 animate-fadein">
          <ExpandedIngredientGrid
            onRandomize={() => dispatch({ type: 'RESHUFFLE' })}
            activeTool={activeTool}
            setActiveTool={setActiveTool}
          />
          {hasGolem && (
            <div className="mt-2 border-t border-gray-100">
              <button
                onClick={() => setGolemOpen(v => !v)}
                className="w-full flex items-center justify-between px-1 py-1.5 text-[11px] font-semibold
                           uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors
                           focus-visible:outline-none"
                aria-expanded={golemOpen}>
                <span>🧿 Golem</span>
                <span className={`transition-transform duration-200 ${golemOpen ? 'rotate-180' : ''}`}>▾</span>
              </button>
              {golemOpen && <GolemPanel activeTool={activeTool} />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MixSimulatorSection() {
  const [open, setOpen] = useState(false);
  const { state } = useExpandedSolver();
  const q = state.puzzle.questions[0];
  const defaultI1 = q?.kind === 'mixing-result' ? q.ingredient1 : undefined;
  const defaultI2 = q?.kind === 'mixing-result' ? q.ingredient2 : undefined;
  return (
    <div className="border-t">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between py-2.5 text-xs font-semibold
                   uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors
                   focus-visible:outline-none"
        aria-expanded={open}>
        <span>Potion Mixing Hints</span>
        <span className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="pb-2 animate-fadein">
          <ExpandedMixSimulator defaultI1={defaultI1} defaultI2={defaultI2} />
        </div>
      )}
    </div>
  );
}

// ─── Inner page ───────────────────────────────────────────────────────────────

function SolverInner({ onBack, onNext, isTutorial = false }: {
  onBack: () => void; onNext?: () => void; isTutorial?: boolean;
}) {
  const { state, dispatch } = useExpandedSolver();
  const { puzzle, worlds } = state;
  const hints = (puzzle as unknown as { hints?: { level: number; text: string }[] }).hints;

  function handleSave() {
    downloadBothFiles(puzzle.id, {
      savedAt: new Date().toISOString(),
      gridState: state.gridState,
      notes: state.notes,
      hintLevel: state.hintLevel,
      wrongAttempts: state.wrongAttempts,
      answers: state.answers,
      solarLunarMarks: state.solarLunarMarks,
      golemNotepad: state.golemNotepad,
    }, 'expanded');
  }

  async function handleLoad() {
    const entry = await uploadExpandedProgress(puzzle.id);
    if (!entry) return;
    dispatch({
      type: 'LOAD_PROGRESS',
      gridState: entry.gridState as never,
      notes: entry.notes,
      hintLevel: entry.hintLevel ?? 0,
      wrongAttempts: entry.wrongAttempts ?? 0,
      answers: entry.answers ?? state.answers.map(() => null),
      solarLunarMarks: (entry.solarLunarMarks ?? {}) as never,
      golemNotepad: entry.golemNotepad ?? { chest: null, ears: null, ingredientMarks: {} },
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">

      <PuzzleToolbar
        title={puzzle.title}
        difficulty={puzzle.difficulty}
        worldsLeft={worlds.length}
        isTutorial={isTutorial}
        subtitle={<span className="text-[10px] text-violet-500 font-semibold">✨ Expanded</span>}
        onBack={onBack}
        onSave={handleSave}
        onLoad={handleLoad}
        onReset={() => dispatch({ type: 'RESET' })}
        onPermalink={() => applyPermalink(puzzle.id, 'expanded')}
        onUndo={() => dispatch({ type: 'UNDO' })}
        onRedo={() => dispatch({ type: 'REDO' })}
        canUndo={state.undoStack.length > 0}
        canRedo={state.redoStack.length > 0}
      />

      <MobileClueDrawer puzzle={puzzle} />

      {/* Body */}
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
          {/* Desktop sidebar: clues + hints */}
          <div className="hidden lg:flex lg:flex-col lg:w-52 shrink-0 sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto space-y-5 pb-6">
            <ExpandedCluePanel clues={puzzle.clues} />
            <ExpandedHintDrawer hints={hints} />
          </div>
          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-4 sm:space-y-6 animate-fadein">
            <div className="bg-white rounded-xl border shadow-sm p-3 sm:p-5">
              <ExpandedAnswerPanel onNext={onNext} isTutorial={isTutorial} />
            </div>
            <div className="bg-white rounded-xl border shadow-sm p-3 sm:p-5 space-y-5">
              <IngredientGridSection />
              <MixSimulatorSection />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

// ─── Public page component ────────────────────────────────────────────────────

export function ExpandedPuzzleSolverPage({ puzzle, onBack, onNext, isTutorial = false }: {
  puzzle: ExpandedPuzzle; onBack: () => void; onNext?: () => void; isTutorial?: boolean;
}) {
  return (
    <ExpandedSolverProvider key={puzzle.id} puzzle={puzzle}>
      <SolverInner onBack={onBack} onNext={onNext} isTutorial={isTutorial} />
    </ExpandedSolverProvider>
  );
}
