import { useState, useMemo } from 'react';
import { SolverProvider, useSolver } from '../contexts/SolverContext';
import { CluePanel } from '../components/CluePanel';
import { IngredientGrid } from '../components/IngredientGrid';
import { MixSimulator } from '../components/MixSimulator';
import { HintDrawer } from '../components/HintDrawer';
import { AnswerPanel } from '../components/AnswerPanel';
import { PuzzleToolbar } from '../components/PuzzleToolbar';
import { ShufflePickerModal } from '../components/ShufflePickerModal';
import { downloadBothFiles, uploadBaseProgress } from '../utils/saveProgress';
import { applyPermalink } from '../utils/permalink';
import { loadSettings } from '../utils/settings';
import { BuildStamp } from '../components/BuildStamp';
import type { Puzzle } from '../types';

function fmtTimer(s: number): string {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// ─── Mobile clue drawer ───────────────────────────────────────────────────────

function MobileClueDrawer({ clues, hints }: {
  clues: Puzzle['clues'];
  hints?: { level: number; text: string }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-white border-b
                   text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <span>📋</span>
          <span>Clues ({clues.length})</span>
        </span>
        <span className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>
      {open && (
        <div className="bg-white border-b px-4 py-4 space-y-4 animate-fadein">
          <CluePanel clues={clues} />
          <HintDrawer hints={hints} />
        </div>
      )}
    </div>
  );
}

// ─── Collapsible mix simulator ───────────────────────────────────────────────

function MixSimulatorSection() {
  const [open, setOpen] = useState(false);
  const { state } = useSolver();
  const q = state.puzzle.questions[0];
  const defaultI1 = q?.kind === 'mixing-result' ? q.ingredient1 : undefined;
  const defaultI2 = q?.kind === 'mixing-result' ? q.ingredient2 : undefined;
  return (
    <div className="border-t">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between py-2.5 text-xs font-semibold
                   uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors
                   focus-visible:outline-none"
        aria-expanded={open}
      >
        <span>Potion Mixing Hints</span>
        <span className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="pb-2 animate-fadein">
          <MixSimulator defaultI1={defaultI1} defaultI2={defaultI2} />
        </div>
      )}
    </div>
  );
}


// ─── Collapsible ingredient grid ─────────────────────────────────────────────

function IngredientGridSection() {
  const [open, setOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const { state, dispatch } = useSolver();
  return (
    <div className="border-t">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between py-2.5 text-xs font-semibold
                   uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors
                   focus-visible:outline-none"
        aria-expanded={open}
      >
        <span>Ingredient Grid</span>
        <span className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="pb-2 animate-fadein">
          <IngredientGrid
            onRandomize={() => dispatch({ type: 'RESHUFFLE' })}
            onLongPressRandomize={() => setPickerOpen(true)}
          />
        </div>
      )}
      {pickerOpen && (
        <ShufflePickerModal
          currentMap={state.displayMap}
          onApply={map => { dispatch({ type: 'RESHUFFLE_CUSTOM', map }); setPickerOpen(false); }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}

// ─── Inner page (requires SolverProvider above it) ────────────────────────────

function SolverInner({
  onBack,
  onNext,
  isTutorial = false,
}: {
  onBack: () => void;
  onNext?: () => void;
  isTutorial?: boolean;
}) {
  const { state, dispatch } = useSolver();
  const { puzzle, worlds } = state;

  const showTimer = useMemo(() => loadSettings().showTimer, []);
  const timerDisplay = showTimer ? fmtTimer(state.timerElapsed) : undefined;

  const hints = (puzzle as unknown as { hints?: { level: number; text: string }[] }).hints;

  function handleSave() {
    downloadBothFiles(puzzle.id, {
      savedAt: new Date().toISOString(),
      gridState: state.gridState,
      notes: state.notes,
      hintLevel: state.hintLevel,
      wrongAttempts: state.wrongAttempts,
      answers: state.answers,
    }, 'base');
  }

  async function handleLoad() {
    const entry = await uploadBaseProgress(puzzle.id);
    if (!entry) return;
    dispatch({
      type: 'LOAD_PROGRESS',
      gridState: entry.gridState as never,
      notes: entry.notes,
      hintLevel: entry.hintLevel ?? 0,
      wrongAttempts: entry.wrongAttempts ?? 0,
      answers: entry.answers ?? state.answers.map(() => null),
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">

      <PuzzleToolbar
        title={puzzle.title}
        difficulty={puzzle.difficulty}
        worldsLeft={worlds.length}
        isTutorial={isTutorial}
        onBack={onBack}
        onSave={handleSave}
        onLoad={handleLoad}
        onReset={() => dispatch({ type: 'RESET' })}
        onPermalink={() => applyPermalink(puzzle.id, 'base', state.displayMap)}
        onUndo={() => dispatch({ type: 'UNDO' })}
        onRedo={() => dispatch({ type: 'REDO' })}
        canUndo={state.undoStack.length > 0}
        canRedo={state.redoStack.length > 0}
        timerDisplay={timerDisplay}
        timerPaused={state.timerPaused}
        onTimerToggle={() => dispatch({ type: state.timerPaused ? 'TIMER_RESUME' : 'TIMER_PAUSE' })}
      />

      {/* ── Pause overlay (z-10, below toolbar z-20, hides puzzle content) ── */}
      {showTimer && state.timerPaused && !state.completed && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-white/90 backdrop-blur-md">
          <div className="text-center">
            <div className="text-5xl mb-3">⏸</div>
            <p className="text-lg font-semibold text-gray-700 mb-1">Timer paused</p>
            <p className="text-sm text-gray-500 mb-6">{fmtTimer(state.timerElapsed)}</p>
            <button
              onClick={() => dispatch({ type: 'TIMER_RESUME' })}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700"
            >
              Resume
            </button>
          </div>
        </div>
      )}

      {/* ── Mobile clue drawer ─────────────────────────────────────────────── */}
      <MobileClueDrawer clues={puzzle.clues} hints={hints} />

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">

          {/* Left column: clues + hints (desktop only) — sticky with own scroll */}
          <div className="hidden lg:flex lg:flex-col lg:w-52 shrink-0 sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto space-y-5 pb-6">
            <CluePanel clues={puzzle.clues} />
            <HintDrawer hints={hints} />
          </div>

          {/* Right column: grid + simulator + answer */}
          <div className="flex-1 min-w-0 space-y-4 sm:space-y-6 animate-fadein">

            {/* Solution block: question header + answer picker, unified */}
            <div className="bg-white rounded-xl border shadow-sm p-3 sm:p-5">
              <AnswerPanel onNext={onNext} isTutorial={isTutorial} />
            </div>

            {/* Deduction workspace */}
            <div className="bg-white rounded-xl border shadow-sm p-3 sm:p-5 space-y-5">
              <IngredientGridSection />
              <MixSimulatorSection />
            </div>

          </div>
        </div>
      </div>

      <BuildStamp />
    </div>
  );
}

// ─── Public page component ────────────────────────────────────────────────────

export function PuzzleSolverPage({
  puzzle,
  onBack,
  onNext,
  isTutorial = false,
  initialDisplayMap,
}: {
  puzzle: Puzzle;
  onBack: () => void;
  onNext?: () => void;
  isTutorial?: boolean;
  initialDisplayMap?: import('../utils/solverStorage').DisplayMap;
}) {
  return (
    <SolverProvider key={puzzle.id} puzzle={puzzle} initialDisplayMap={initialDisplayMap}>
      <SolverInner onBack={onBack} onNext={onNext} isTutorial={isTutorial} />
    </SolverProvider>
  );
}
