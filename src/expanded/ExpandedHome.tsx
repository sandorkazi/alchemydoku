/**
 * expanded/ExpandedHome.tsx
 *
 * Home page for the expanded rules mode.
 * Manages expanded puzzle selection, progress tracking, and navigation.
 * Completely isolated from base game data (no base puzzle imports).
 */

import { useState, useEffect } from 'react';
import { ExpandedRulesQuickReference } from './components/ExpandedRulesQuickReference';
import { ExpandedInterfaceQuickReference } from './components/ExpandedInterfaceQuickReference';
import { ALL_EXPANDED_PUZZLES, EXPANDED_COLLECTIONS, EXPANDED_PUZZLE_MAP } from './data/puzzlesIndex';
import { ExpandedPuzzleSolverPage } from './pages/ExpandedPuzzleSolverPage';
import { clearExpandedPuzzleState } from './contexts/ExpandedSolverContext';
import type { ExpandedPuzzle } from './types';
import type { ExpandedCollection } from './data/puzzlesIndex';
import { WhatsNewBanner } from '../components/WhatsNewBanner';
import { getCurrentReleaseEntry } from '../utils/releaseNotes';
import { SettingsModal } from '../components/SettingsModal';
import { clearBaseProgress } from '../utils/saveProgress';
import type { Settings } from '../utils/settings';
import { isPuzzleNonCompliant } from '../compliance';

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
  easy:     'bg-green-100  text-green-700',
  medium:   'bg-yellow-100 text-yellow-700',
  hard:     'bg-red-100    text-red-700',
  expert:   'bg-orange-100 text-orange-700',
  extreme:  'bg-rose-100   text-rose-800',
};

// ─── Complexity pips (expanded) ───────────────────────────────────────────────

function ComplexityPips({ score }: { score: number }) {
  const filled = score <= 32 ? 1 : score <= 58 ? 2 : score <= 70 ? 3 : score <= 82 ? 4 : 5;
  return (
    <span className="inline-flex items-center gap-0.5" title={`Complexity: ${score}/100`}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={`inline-block w-1.5 h-1.5 rounded-full transition-colors
          ${i <= filled ? 'bg-indigo-400' : 'bg-gray-200'}`} />
      ))}
    </span>
  );
}

// ─── Collection summary card (hub level) ─────────────────────────────────────

function CollectionSummaryCard({ collection, completed, showPuzzleOnly, onOpen }: {
  collection: ExpandedCollection;
  completed: Set<string>;
  showPuzzleOnly: boolean;
  onOpen: () => void;
}) {
  const allPuzzles = collection.puzzleIds.map(id => EXPANDED_PUZZLE_MAP[id]).filter(Boolean);
  const nonCompliantCount = allPuzzles.filter(p => isPuzzleNonCompliant(p, 'expanded')).length;
  const hiddenCount = showPuzzleOnly ? 0 : nonCompliantCount;
  const visiblePuzzles = showPuzzleOnly ? allPuzzles
    : allPuzzles.filter(p => !isPuzzleNonCompliant(p, 'expanded'));
  const doneCount = visiblePuzzles.filter(p => completed.has(p.id)).length;
  const allHidden = hiddenCount === allPuzzles.length && allPuzzles.length > 0;
  const allDone = doneCount === visiblePuzzles.length && visiblePuzzles.length > 0;

  return (
    <button onClick={allHidden ? undefined : onOpen} disabled={allHidden}
      className={`w-full text-left rounded-2xl border-2 bg-white shadow-sm overflow-hidden
        transition-all
        ${allHidden
          ? 'border-gray-200 opacity-60 cursor-not-allowed'
          : allDone
            ? 'border-green-300 hover:border-violet-300 hover:shadow-md'
            : 'border-gray-200 hover:border-violet-300 hover:shadow-md'
        }`}>
      <div className={`px-4 py-3 ${allDone ? 'bg-green-50' : 'bg-gray-50'}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-bold text-gray-900 text-sm">{collection.title}</h3>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0
              ${DIFF_BADGE[collection.difficulty] ?? 'bg-gray-100 text-gray-600'}`}>
              {collection.difficulty}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-20 justify-end">
            {visiblePuzzles.length === 0
              ? <span className="text-xs font-semibold text-gray-400">🧩{nonCompliantCount}</span>
              : <>
                  <span className={`text-xs font-semibold tabular-nums ${allDone ? 'text-green-600' : 'text-gray-400'}`}>
                    {doneCount}/{visiblePuzzles.length}
                  </span>
                  {nonCompliantCount > 0 && (
                    <span className="text-xs text-gray-400">🧩{nonCompliantCount}</span>
                  )}
                </>
            }
            <span className="text-gray-300 text-xs">›</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{collection.description}</p>
        {allHidden && (
          <p className="text-xs text-gray-400 mt-1">
            Allow unrealistic puzzles in ⚙️ Settings to see these puzzles
          </p>
        )}
      </div>
    </button>
  );
}

// ─── Collection puzzle list (collection level) ───────────────────────────────

function CollectionView({ collection, completed, showPuzzleOnly, onSelectPuzzle, onBack }: {
  collection: ExpandedCollection;
  completed: Set<string>;
  showPuzzleOnly: boolean;
  onSelectPuzzle: (puzzle: ExpandedPuzzle) => void;
  onBack: () => void;
}) {
  const allPuzzles = collection.puzzleIds.map(id => EXPANDED_PUZZLE_MAP[id]).filter(Boolean);
  const visiblePuzzles = showPuzzleOnly ? allPuzzles
    : allPuzzles.filter(p => !isPuzzleNonCompliant(p, 'expanded'));
  const hiddenCount = allPuzzles.length - visiblePuzzles.length;
  const doneCount = visiblePuzzles.filter(p => completed.has(p.id)).length;
  const allDone = doneCount === visiblePuzzles.length && visiblePuzzles.length > 0;

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
                {doneCount}/{visiblePuzzles.length}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{collection.description}</p>
            {hiddenCount > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                🧩 {hiddenCount} hidden — enable "Allow unrealistic puzzles" in ⚙️ Settings
              </p>
            )}
          </div>
          <div className="divide-y divide-gray-100">
            {visiblePuzzles.map(puzzle => {
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
                      {(puzzle as any).complexity?.score != null && (
                        <ComplexityPips score={(puzzle as any).complexity.score} />
                      )}
                      {isPuzzleNonCompliant(puzzle, 'expanded') && (
                        <span className="text-xs text-gray-400 shrink-0" title="Unrealistic puzzle">🧩</span>
                      )}
                    </span>
                    <span className="text-xs text-gray-400 break-words block">{puzzle.description}</span>
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

function computeInitialExpanded(puzzleId?: string): { puzzle: ExpandedPuzzle | null; queue: ExpandedPuzzle[] } {
  if (!puzzleId) return { puzzle: null, queue: [] };
  const puzzle = EXPANDED_PUZZLE_MAP[puzzleId];
  if (!puzzle) return { puzzle: null, queue: [] };
  const coll = EXPANDED_COLLECTIONS.find(c => c.puzzleIds.includes(puzzleId));
  const queue: ExpandedPuzzle[] = [];
  if (coll) {
    const idx = coll.puzzleIds.indexOf(puzzleId);
    coll.puzzleIds.slice(idx + 1).forEach(id => {
      if (EXPANDED_PUZZLE_MAP[id]) queue.push(EXPANDED_PUZZLE_MAP[id]);
    });
  }
  return { puzzle, queue };
}

export function ExpandedHome({ onModeChange, initialPuzzleId, showReleaseNotes, onDismissReleaseNotes, settings, onSettingsChange }: {
  onModeChange: (m: 'base' | 'expanded') => void;
  initialPuzzleId?: string;
  showReleaseNotes?: boolean;
  onDismissReleaseNotes?: () => void;
  settings: Settings;
  onSettingsChange: (s: Settings) => void;
}) {
  const { puzzle: initPuzzle, queue: initQueue } = computeInitialExpanded(initialPuzzleId);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [completed, setCompleted] = useState<Set<string>>(loadCompleted as () => Set<string>);
  const [activePuzzle, setActivePuzzle] = useState<ExpandedPuzzle | null>(initPuzzle);
  const [activeCollection, setActiveCollection] = useState<ExpandedCollection | null>(null);
  const [puzzleQueue, setPuzzleQueue] = useState<ExpandedPuzzle[]>(initQueue);
  const [resetVersion, setResetVersion] = useState(0);

  // Persist completed set
  useEffect(() => { saveCompleted(completed); }, [completed]);

  // Re-read completed set when Drive sync merges cloud data
  useEffect(() => {
    function handleCloudSync() { setCompleted(loadCompleted()); }
    window.addEventListener('alch-cloud-sync', handleCloudSync);
    return () => window.removeEventListener('alch-cloud-sync', handleCloudSync);
  }, []);

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
        showPuzzleOnly={settings.showPuzzleOnly}
        onSelectPuzzle={openPuzzle}
        onBack={() => setActiveCollection(null)}
      />
    );
  }

  // ── Hub view ───────────────────────────────────────────────────────────────

  const totalDone = EXPANDED_COLLECTIONS
    .flatMap(c => c.puzzleIds)
    .filter(id => completed.has(id)).length;

  const releaseEntry = getCurrentReleaseEntry();

  return (
    <div className="min-h-screen bg-amber-50 animate-fadein">
      <div className="max-w-xl mx-auto px-4 py-10 space-y-8">

        {/* Mode switcher + settings gear */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex rounded-xl border border-gray-200 overflow-hidden shadow-sm bg-white">
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
          <button
            onClick={() => setSettingsOpen(true)}
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white
              text-gray-500 hover:text-gray-700 shadow-sm transition-colors
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            aria-label="Settings"
          >
            ⚙️
          </button>
        </div>

        {/* What's New banner */}
        {showReleaseNotes && releaseEntry && onDismissReleaseNotes && (
          <WhatsNewBanner entry={releaseEntry} onDismiss={onDismissReleaseNotes} variant="expanded" />
        )}

        {/* Hero */}
        <div className="text-center space-y-2">
          <div className="text-5xl" aria-hidden="true">✨</div>
          <h1 className="text-3xl font-bold text-gray-900">Expanded Rules</h1>
          <p className="text-gray-500 text-sm">
            New mechanics: Book Tokens, Solar/Lunar classification, and the Royal Encyclopedia.
          </p>
        </div>

        {/* Quick references — each toggled independently in settings */}
        {settings.showRulesRef && (
          <ExpandedRulesQuickReference showPuzzleOnly={settings.showPuzzleOnly} />
        )}
        {settings.showInterfaceRef && (
          <ExpandedInterfaceQuickReference />
        )}

        {/* Collections */}
        <div className="space-y-3">
          {EXPANDED_COLLECTIONS.map(coll => (
            <CollectionSummaryCard
              key={coll.id}
              collection={coll}
              completed={completed}
              showPuzzleOnly={settings.showPuzzleOnly}
              onOpen={() => setActiveCollection(coll)}
            />
          ))}
        </div>

        {/* Progress */}
        <p className="text-xs text-gray-400">
          {totalDone} / {ALL_EXPANDED_PUZZLES.length} puzzles solved
        </p>

        {/* Settings modal */}
        {settingsOpen && (
          <SettingsModal
            settings={settings}
            onSettingsChange={onSettingsChange}
            onResetBase={() => { clearBaseProgress(); }}
            onResetExpanded={() => { clearAllExpandedProgress(); setCompleted(new Set()); setResetVersion(v => v + 1); }}
            onResetAll={() => { clearBaseProgress(); clearAllExpandedProgress(); setCompleted(new Set()); setResetVersion(v => v + 1); }}
            onClose={() => setSettingsOpen(false)}
          />
        )}

      </div>
    </div>
  );
}
