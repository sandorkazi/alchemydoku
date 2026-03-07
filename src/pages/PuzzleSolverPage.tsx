import { useState } from 'react';
import { SolverProvider, useSolver } from '../contexts/SolverContext';
import { CluePanel } from '../components/CluePanel';
import { IngredientGrid } from '../components/IngredientGrid';
import { MixSimulator } from '../components/MixSimulator';
import { HintDrawer } from '../components/HintDrawer';
import { AnswerPanel } from '../components/AnswerPanel';
import type { Puzzle } from '../types';

const DIFFICULTY_BADGE: Record<string, string> = {
  tutorial: 'bg-purple-100 text-purple-700',
  easy:     'bg-green-100 text-green-700',
  medium:   'bg-yellow-100 text-yellow-700',
  hard:     'bg-red-100 text-red-700',
};

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
        <span>Mix Simulator</span>
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
  const { dispatch } = useSolver();
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
          <IngredientGrid onRandomize={() => dispatch({ type: 'RESHUFFLE' })} />
        </div>
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
  const [menuOpen, setMenuOpen] = useState(false);

  const hints = (puzzle as unknown as { hints?: { level: number; text: string }[] }).hints;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Sticky header ──────────────────────────────────────────────────── */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 flex items-center gap-2 sm:gap-3">

          {/* Back button */}
          <button
            onClick={onBack}
            aria-label={isTutorial ? 'Back to tutorial' : 'Back to collection'}
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors flex items-center gap-1 shrink-0"
          >
            ← <span className="hidden sm:inline">{isTutorial ? 'Tutorial' : 'Back'}</span>
          </button>

          {/* Title */}
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-900 text-sm truncate">{puzzle.title}</h1>
          </div>

          {/* Difficulty badge */}
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize shrink-0
            ${DIFFICULTY_BADGE[puzzle.difficulty] ?? 'bg-gray-100 text-gray-600'}`}>
            {puzzle.difficulty}
          </span>

          {/* Worlds left — hide on very small */}
          <span className="hidden xs:inline text-xs text-gray-400 shrink-0 tabular-nums">
            {worlds.length.toLocaleString()}w
          </span>

          {/* Desktop: inline actions */}
          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={() => dispatch({ type: 'RESET' })}
              aria-label="Reset puzzle"
              title="Reset all progress"
              className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              ↺
            </button>
          </div>

          {/* Mobile: overflow menu */}
          <div className="sm:hidden relative">
            <button
              onClick={() => setMenuOpen(v => !v)}
              aria-label="More options"
              aria-expanded={menuOpen}
              className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              ⋯
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white border rounded-xl shadow-lg py-1 z-30 min-w-[140px] animate-fadein">
                <button
                  onClick={() => { dispatch({ type: 'RESET' }); setMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  ↺ Reset
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

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

      {/* Dismiss mobile menu on outside click */}
      {menuOpen && (
        <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
      )}
    </div>
  );
}

// ─── Public page component ────────────────────────────────────────────────────

export function PuzzleSolverPage({
  puzzle,
  onBack,
  onNext,
  isTutorial = false,
}: {
  puzzle: Puzzle;
  onBack: () => void;
  onNext?: () => void;
  isTutorial?: boolean;
}) {
  return (
    <SolverProvider key={puzzle.id} puzzle={puzzle}>
      <SolverInner onBack={onBack} onNext={onNext} isTutorial={isTutorial} />
    </SolverProvider>
  );
}
