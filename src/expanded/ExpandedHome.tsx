/**
 * expanded/ExpandedHome.tsx
 *
 * Home page for the expanded rules mode.
 * Manages expanded puzzle selection, progress tracking, and navigation.
 * Completely isolated from base game data (no base puzzle imports).
 */

import { useState, useEffect } from 'react';
import { ALL_EXPANDED_PUZZLES, EXPANDED_COLLECTIONS, EXPANDED_PUZZLE_MAP } from './data/puzzlesIndex';
import { ExpandedPuzzleSolverPage } from './pages/ExpandedPuzzleSolverPage';
import { clearExpandedPuzzleState } from './contexts/ExpandedSolverContext';
import type { ExpandedPuzzle } from './types';
import type { ExpandedCollection } from './data/puzzlesIndex';

// ─── Progress persistence ─────────────────────────────────────────────────────

const STORAGE_COMPLETED = 'alch-exp-completed';
const STORAGE_LAST      = 'alch-exp-last';

function loadCompleted(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_COMPLETED);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function saveCompleted(ids: Set<string>) {
  try { localStorage.setItem(STORAGE_COMPLETED, JSON.stringify([...ids])); } catch { /**/ }
}

function clearAllExpandedProgress() {
  try {
    localStorage.removeItem(STORAGE_COMPLETED);
    localStorage.removeItem(STORAGE_LAST);
    ALL_EXPANDED_PUZZLES.forEach(p => clearExpandedPuzzleState(p.id));
  } catch { /**/ }
}

// ─── Difficulty badge ─────────────────────────────────────────────────────────

const DIFF_BADGE: Record<string, string> = {
  tutorial: 'bg-purple-100 text-purple-700',
  easy:     'bg-green-100 text-green-700',
  medium:   'bg-yellow-100 text-yellow-700',
  hard:     'bg-red-100 text-red-700',
};

// ─── Complexity pips (expanded) ───────────────────────────────────────────────

function ComplexityPips({ raw }: { raw: number }) {
  const filled = raw < 1.7 ? 1 : raw < 2.1 ? 2 : raw < 2.8 ? 3 : raw < 3.5 ? 4 : 5;
  return (
    <span className="inline-flex items-center gap-0.5" title={`Complexity: ${raw.toFixed(2)}`}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={`inline-block w-1.5 h-1.5 rounded-full transition-colors
          ${i <= filled ? 'bg-indigo-400' : 'bg-gray-200'}`} />
      ))}
    </span>
  );
}

// ─── Collection summary card (hub level) ─────────────────────────────────────

function CollectionSummaryCard({ collection, completed, onOpen }: {
  collection: ExpandedCollection;
  completed: Set<string>;
  onOpen: () => void;
}) {
  const puzzles = collection.puzzleIds.map(id => EXPANDED_PUZZLE_MAP[id]).filter(Boolean);
  const doneCount = puzzles.filter(p => completed.has(p.id)).length;
  const allDone = doneCount === puzzles.length;

  return (
    <button onClick={onOpen}
      className={`w-full text-left rounded-2xl border-2 bg-white shadow-sm overflow-hidden
        hover:border-violet-300 hover:shadow-md transition-all
        ${allDone ? 'border-green-300' : 'border-gray-200'}`}>
      <div className={`px-4 py-3 ${allDone ? 'bg-green-50' : 'bg-gray-50'}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-bold text-gray-900 text-sm">{collection.title}</h3>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0
              ${DIFF_BADGE[collection.difficulty] ?? 'bg-gray-100 text-gray-600'}`}>
              {collection.difficulty}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs font-semibold tabular-nums ${allDone ? 'text-green-600' : 'text-gray-400'}`}>
              {doneCount}/{puzzles.length}
            </span>
            <span className="text-gray-300 text-xs">›</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{collection.description}</p>
      </div>
    </button>
  );
}

// ─── Collection puzzle list (collection level) ───────────────────────────────

function CollectionView({ collection, completed, onSelectPuzzle, onBack }: {
  collection: ExpandedCollection;
  completed: Set<string>;
  onSelectPuzzle: (puzzle: ExpandedPuzzle) => void;
  onBack: () => void;
}) {
  const puzzles = collection.puzzleIds.map(id => EXPANDED_PUZZLE_MAP[id]).filter(Boolean);
  const doneCount = puzzles.filter(p => completed.has(p.id)).length;
  const allDone = doneCount === puzzles.length;

  return (
    <div className="min-h-screen bg-amber-50 animate-fadein">
      <div className="max-w-xl mx-auto px-4 py-6 space-y-4">
        {/* Back + header */}
        <div className="flex items-center gap-3">
          <button onClick={onBack}
            className="text-sm text-violet-600 hover:text-violet-800 font-semibold transition-colors">
            ← Back
          </button>
        </div>
        <div className={`rounded-2xl border-2 bg-white shadow-sm overflow-hidden
          ${allDone ? 'border-green-300' : 'border-gray-200'}`}>
          <div className={`px-4 py-3 ${allDone ? 'bg-green-50' : 'bg-gray-50'} border-b`}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-bold text-gray-900 text-base">{collection.title}</h2>
              <span className={`text-xs font-semibold tabular-nums ${allDone ? 'text-green-600' : 'text-gray-400'}`}>
                {doneCount}/{puzzles.length}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{collection.description}</p>
          </div>
          <div className="divide-y divide-gray-100">
            {puzzles.map(puzzle => {
              const done = completed.has(puzzle.id);
              return (
                <button key={puzzle.id} onClick={() => onSelectPuzzle(puzzle)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 transition-colors text-left group">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0
                    ${done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400 group-hover:bg-indigo-200 group-hover:text-indigo-600'}`}>
                    {done ? '✓' : ''}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">{puzzle.title}</span>
                      {(puzzle as any).complexity?.raw != null && (
                        <ComplexityPips raw={(puzzle as any).complexity.raw} />
                      )}
                    </span>
                    <span className="text-xs text-gray-400 truncate block">{puzzle.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main ExpandedHome ────────────────────────────────────────────────────────

export function ExpandedHome({ onModeChange }: { onModeChange: (m: 'base' | 'expanded') => void }) {
  const [completed, setCompleted] = useState<Set<string>>(loadCompleted as () => Set<string>);
  const [activePuzzle, setActivePuzzle] = useState<ExpandedPuzzle | null>(null);
  const [activeCollection, setActiveCollection] = useState<ExpandedCollection | null>(null);
  const [puzzleQueue, setPuzzleQueue] = useState<ExpandedPuzzle[]>([]);
  const [resetVersion, setResetVersion] = useState(0);

  // Persist completed set
  useEffect(() => { saveCompleted(completed); }, [completed]);

  // ── Puzzle selection ───────────────────────────────────────────────────────

  const openPuzzle = (puzzle: ExpandedPuzzle) => {
    // Queue = rest of the puzzle's collection after the selected puzzle
    const coll = EXPANDED_COLLECTIONS.find(c => c.puzzleIds.includes(puzzle.id));
    const queue: ExpandedPuzzle[] = [];
    if (coll) {
      const idx = coll.puzzleIds.indexOf(puzzle.id);
      coll.puzzleIds.slice(idx + 1).forEach(id => {
        if (EXPANDED_PUZZLE_MAP[id]) queue.push(EXPANDED_PUZZLE_MAP[id]);
      });
    }
    setPuzzleQueue(queue);
    setActivePuzzle(puzzle);
    try { localStorage.setItem(STORAGE_LAST, puzzle.id); } catch { /**/ }
  };

  const markCompleted = (id: string) => {
    setCompleted((prev: Set<string>) => { const next = new Set<string>(prev); next.add(id); return next; });
  };

  const handleNext = () => {
    if (activePuzzle) markCompleted(activePuzzle.id);
    if (puzzleQueue.length > 0) {
      const [next, ...rest] = puzzleQueue;
      setPuzzleQueue(rest);
      setActivePuzzle(next);
    } else {
      if (activePuzzle) markCompleted(activePuzzle.id);
      setActivePuzzle(null);
      // stay on collection view if we came from one
    }
  };

  // ── Active puzzle view ─────────────────────────────────────────────────────

  if (activePuzzle) {
    const isTutorial = activePuzzle.difficulty === 'tutorial';
    return (
      <ExpandedPuzzleSolverPage
        key={`${activePuzzle.id}-${resetVersion}`}
        puzzle={activePuzzle}
        onBack={() => setActivePuzzle(null)}
        onNext={handleNext}
        isTutorial={isTutorial}
      />
    );
  }

  // ── Collection view ────────────────────────────────────────────────────────

  if (activeCollection) {
    return (
      <CollectionView
        collection={activeCollection}
        completed={completed}
        onSelectPuzzle={openPuzzle}
        onBack={() => setActiveCollection(null)}
      />
    );
  }

  // ── Hub view ───────────────────────────────────────────────────────────────

  const totalDone = EXPANDED_COLLECTIONS
    .flatMap(c => c.puzzleIds)
    .filter(id => completed.has(id)).length;

  return (
    <div className="min-h-screen bg-amber-50 animate-fadein">
      <div className="max-w-xl mx-auto px-4 py-10 space-y-8">

        {/* Mode switcher */}
        <div className="flex rounded-xl border border-gray-200 overflow-hidden shadow-sm bg-white">
          {(['base', 'expanded'] as const).map(m => (
            <button key={m} onClick={() => onModeChange(m)}
              aria-pressed={m === 'expanded'}
              className={`flex-1 py-2 text-sm font-semibold capitalize transition-colors
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400
                ${m === 'expanded'
                  ? 'bg-violet-600 text-white'
                  : 'bg-white text-gray-500 hover:text-gray-700'}`}>
              {m === 'expanded' ? '✨ Expanded' : 'Base Game'}
            </button>
          ))}
        </div>

        {/* Hero */}
        <div className="text-center space-y-2">
          <div className="text-5xl" aria-hidden="true">✨</div>
          <h1 className="text-3xl font-bold text-gray-900">Expanded Rules</h1>
          <p className="text-gray-500 text-sm">
            New mechanics: Book Tokens, Solar/Lunar classification, and the Royal Encyclopedia.
          </p>
        </div>

        {/* Quick legend */}
        <div className="rounded-xl bg-white border border-violet-100 p-4 space-y-2 text-xs text-gray-600">
          <p className="font-semibold text-violet-700 text-sm">New mechanics in this mode:</p>
          <p>📖 <strong>Book Token</strong> — reveals whether an ingredient's alchemical is Solar (☀) or Lunar (☽)</p>
          <p>☀ ☽ <strong>Solar/Lunar</strong> — alchemicals with 0 or 2 negatives are Solar; 1 or 3 are Lunar</p>
          <p>📜 <strong>Encyclopedia Article</strong> — covers one aspect; lists 4 ingredients each with their own sign on that aspect (any mix of + and −)</p>
          <p>📄 <strong>Uncertain Article</strong> — at least 3 of 4 entries are correct</p>
          <p>🔍 <strong>Debunked Article</strong> — at least 1 entry has been proven wrong (actual sign differs from listed sign)</p>
        </div>

        {/* Collections */}
        <div className="space-y-3">
          {EXPANDED_COLLECTIONS.map(coll => (
            <CollectionSummaryCard
              key={coll.id}
              collection={coll}
              completed={completed}
              onOpen={() => setActiveCollection(coll)}
            />
          ))}
        </div>

        {/* Progress + reset */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {totalDone} / {ALL_EXPANDED_PUZZLES.length} puzzles solved
          </p>
          {totalDone > 0 && (
            <button
              onClick={() => { clearAllExpandedProgress(); setCompleted(new Set()); setResetVersion(v => v + 1); }}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              title="Clear all expanded mode progress and grid marks">
              ✕ Reset expanded progress
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
