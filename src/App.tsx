import { useState, useEffect } from 'react';
import { ALL_PUZZLES, COLLECTIONS, PUZZLE_MAP } from './data/puzzles/index';
import { PuzzleSolverPage } from './pages/PuzzleSolverPage';
import { TutorialPage } from './pages/TutorialPage';
import { MIXING_TUTORIAL_STEPS } from './data/tutorials/mixing';
import { SELLING_TUTORIAL_STEPS } from './data/tutorials/selling';
import { TWO_COLOR_TUTORIAL_STEPS } from './data/tutorials/two-color';
import { useTutorial } from './contexts/TutorialContext';
import type { TutorialId } from './contexts/TutorialContext';
import type { Puzzle } from './types';
import { clearPuzzleState } from './contexts/SolverContext';
import { ExpandedHome as ExpandedHomeImpl } from './expanded/ExpandedHome';
import { DriveProvider, useDrive } from './contexts/DriveContext';
import { DriveSync } from './components/DriveSync';

type Collection = {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  puzzleIds: string[];
  unlockedAfter?: string;
};

type View =
  | { kind: 'home' }
  | { kind: 'tutorial'; tutorialId: TutorialId }
  | { kind: 'collection'; colId: string }
  | { kind: 'puzzle'; puzzleId: string; colId: string };

// ─── Persistence ──────────────────────────────────────────────────────────────

function loadMode(): 'base' | 'expanded' {
  try { return localStorage.getItem('alch-mode') === 'expanded' ? 'expanded' : 'base'; }
  catch { return 'base'; }
}
function saveMode(m: 'base' | 'expanded') {
  try { localStorage.setItem('alch-mode', m); } catch { /* ignore */ }
}

function loadFreePlay(mode: 'base' | 'expanded'): boolean {
  try { return localStorage.getItem(`alch-freeplay-${mode}`) === '1'; } catch { return false; }
}
function saveFreePlay(mode: 'base' | 'expanded', v: boolean) {
  try { localStorage.setItem(`alch-freeplay-${mode}`, v ? '1' : '0'); } catch { /* ignore */ }
}

function loadCompleted(mode: 'base' | 'expanded'): Set<string> {
  try {
    const raw = localStorage.getItem(`alch-completed-${mode}`);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}
function saveCompleted(mode: 'base' | 'expanded', ids: Set<string>) {
  try { localStorage.setItem(`alch-completed-${mode}`, JSON.stringify([...ids])); } catch { /* ignore */ }
}
function clearAllProgress(mode: 'base' | 'expanded') {
  try {
    localStorage.removeItem(`alch-completed-${mode}`);
    localStorage.removeItem(`alch-last-puzzle-${mode}`);
    // Also clear per-puzzle state (grid marks, notes, hints)
    ALL_PUZZLES.forEach(p => {
      localStorage.removeItem(`solver-${p.id}`);
      localStorage.removeItem(`display-map-${p.id}`);
    });
  } catch { /* ignore */ }
}
function loadLastPuzzle(mode: 'base' | 'expanded'): string | null {
  try { return localStorage.getItem(`alch-last-puzzle-${mode}`); } catch { return null; }
}
function saveLastPuzzle(mode: 'base' | 'expanded', id: string) {
  try { localStorage.setItem(`alch-last-puzzle-${mode}`, id); } catch { /* ignore */ }
}

// ─── Style maps ───────────────────────────────────────────────────────────────

const DIFF_BADGE: Record<string, string> = {
  tutorial: 'bg-purple-100 text-purple-700 border border-purple-200',
  easy:     'bg-green-100  text-green-700  border border-green-200',
  medium:   'bg-yellow-100 text-yellow-700 border border-yellow-200',
  hard:     'bg-red-100    text-red-700    border border-red-200',
};

const DIFF_BORDER: Record<string, string> = {
  tutorial: 'border-purple-200 hover:border-purple-400',
  easy:     'border-green-200  hover:border-green-400',
  medium:   'border-yellow-200 hover:border-yellow-400',
  hard:     'border-red-200    hover:border-red-400',
};

// ─── Mode switcher (top of every home-level page) ─────────────────────────────

function ModeSwitcher({
  mode,
  onChange,
}: {
  mode: 'base' | 'expanded';
  onChange: (m: 'base' | 'expanded') => void;
}) {
  return (
    <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1 w-full max-w-xs mx-auto">
      {(['base', 'expanded'] as const).map(m => (
        <button
          key={m}
          onClick={() => onChange(m)}
          aria-pressed={mode === m}
          className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
            ${mode === m
              ? m === 'expanded'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          {m === 'base' ? '⚗️ Base game' : '✨ Expanded'}
        </button>
      ))}
    </div>
  );
}

// ─── Complexity pips ──────────────────────────────────────────────────────────

function ComplexityPips({ score }: { score: number }) {
  const filled = score <= 35 ? 1 : score <= 45 ? 2 : score <= 52 ? 3 : score <= 58 ? 4 : 5;
  return (
    <span className="inline-flex items-center gap-0.5" title={`Complexity: ${score}/100`}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={`inline-block w-1.5 h-1.5 rounded-full transition-colors
          ${i <= filled ? 'bg-indigo-400' : 'bg-gray-200'}`} />
      ))}
    </span>
  );
}

// ─── Collection card ──────────────────────────────────────────────────────────

function CollectionCard({
  col, completed, locked, onOpen,
}: {
  col: Collection; completed: number; locked: boolean; onOpen: () => void;
}) {
  const total = col.puzzleIds.length;
  const pct   = total > 0 ? Math.round((completed / total) * 100) : 0;
  const done  = completed === total && total > 0;

  return (
    <button
      onClick={locked ? undefined : onOpen}
      disabled={locked}
      aria-label={`${col.title} collection${locked ? ' (locked)' : ''}`}
      className={`w-full text-left rounded-2xl border-2 p-5 transition-all space-y-3
        press-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
        ${locked
          ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
          : `${DIFF_BORDER[col.difficulty] ?? 'border-gray-200 hover:border-gray-400'}
             bg-white hover:shadow-md cursor-pointer`
        }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-gray-900">{col.title}</h3>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
              ${DIFF_BADGE[col.difficulty] ?? 'bg-gray-100 text-gray-600'}`}>
              {col.difficulty}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{col.description}</p>
        </div>
        <div className="text-2xl shrink-0">{locked ? '🔒' : done ? '⭐' : '📖'}</div>
      </div>

      {!locked && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{completed}/{total} solved</span>
            {done && <span className="text-green-600 font-semibold">Complete!</span>}
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5" role="progressbar"
               aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div
              className={`h-1.5 rounded-full transition-all duration-500
                ${done ? 'bg-green-500' : 'bg-indigo-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {locked && col.unlockedAfter && (
        <p className="text-xs text-gray-400">
          Complete "{(COLLECTIONS as Collection[]).find(c => c.id === col.unlockedAfter)?.title ?? col.unlockedAfter}" first
        </p>
      )}
    </button>
  );
}

// ─── Puzzle row ───────────────────────────────────────────────────────────────

function PuzzleRow({
  puzzle, isDone, onPlay,
}: {
  puzzle: Puzzle; isDone: boolean; onPlay: () => void;
}) {
  const [confirmReset, setConfirmReset] = useState(false);

  function handleReset(e: React.MouseEvent) {
    e.stopPropagation();
    if (confirmReset) {
      clearPuzzleState(puzzle.id);
      onPlay();
      setConfirmReset(false);
    } else {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 3000);
    }
  }

  return (
    <div className="w-full flex items-center gap-2 group">
      <button
        onClick={onPlay}
        aria-label={`${puzzle.title}${isDone ? ' (solved)' : ''}`}
        className="flex-1 flex items-center gap-4 p-4 rounded-xl border border-gray-200
                   bg-white hover:border-indigo-300 hover:shadow-sm transition-all text-left
                   press-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
      >
        <span className="text-xl w-8 text-center shrink-0" aria-hidden="true">
          {isDone ? '✅' : '○'}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-800 text-sm">{puzzle.title}</span>
            {(puzzle as any).metadata?.complexityScore != null && (
              <ComplexityPips score={(puzzle as any).metadata.complexityScore} />
            )}
          </div>
          <div className="text-xs text-gray-500 leading-snug line-clamp-2 min-h-[2.5rem]">{puzzle.description}</div>
        </div>
        <span className="text-xs text-indigo-500 font-semibold shrink-0" aria-hidden="true">
          Play →
        </span>
      </button>
      {isDone && (
        <button
          onClick={handleReset}
          title={confirmReset ? 'Click again to confirm reset' : 'Reset puzzle annotations'}
          className={`shrink-0 text-xs px-2 py-1.5 rounded-lg border transition-all opacity-0
                      group-hover:opacity-100 focus-visible:opacity-100
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400
                      ${confirmReset
                        ? 'bg-red-100 border-red-300 text-red-700 font-semibold'
                        : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200'
                      }`}
        >
          {confirmReset ? 'Sure?' : '↺'}
        </button>
      )}
    </div>
  );
}

// ─── Tutorial steps registry ──────────────────────────────────────────────────

const TUTORIAL_STEPS = {
  mixing:      MIXING_TUTORIAL_STEPS,
  selling:     SELLING_TUTORIAL_STEPS,
  'two-color': TWO_COLOR_TUTORIAL_STEPS,
};

// ─── Expanded home (under construction) ──────────────────────────────────────

function ExpandedHome({ onModeChange }: { onModeChange: (m: 'base' | 'expanded') => void }) {
  return <ExpandedHomeImpl onModeChange={onModeChange} />;
}

// ─── Base-game App ────────────────────────────────────────────────────────────

function AppInner() {
  const [mode, setMode]                 = useState<'base' | 'expanded'>(loadMode);
  const [view, setView]                 = useState<View>({ kind: 'home' });
  const [completed, setCompleted]       = useState<Set<string>>(() => loadCompleted(loadMode()));
  const { completedTutorials } = useTutorial();
  const [freePlay, setFreePlay]         = useState<boolean>(() => loadFreePlay(loadMode()));
  const [lastPuzzleId, setLastPuzzleId] = useState<string | null>(() => loadLastPuzzle(loadMode()));
  /** Incremented on reset to force SolverProvider remount even for same puzzleId */
  const [resetVersion, setResetVersion] = useState(0);

  const { onPuzzleComplete } = useDrive();

  // Re-read completed set when Drive sync merges cloud data
  useEffect(() => {
    function handleCloudSync() {
      setCompleted(loadCompleted('base'));
    }
    window.addEventListener('alch-cloud-sync', handleCloudSync);
    return () => window.removeEventListener('alch-cloud-sync', handleCloudSync);
  }, []);

  // When mode switches, reload per-mode state and reset to home
  function handleModeChange(m: 'base' | 'expanded') {
    saveMode(m);
    setMode(m);
    setView({ kind: 'home' });
    setCompleted(loadCompleted(m));
    setFreePlay(loadFreePlay(m));
    setLastPuzzleId(loadLastPuzzle(m));
  }

  // ── Expanded mode: completely separate experience ──────────────────────────
  if (mode === 'expanded') {
    return <ExpandedHome onModeChange={handleModeChange} />;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function isCollectionUnlocked(col: Collection): boolean {
    if (freePlay) return true;
    if (!col.unlockedAfter) return true;
    const prereq = (COLLECTIONS as Collection[]).find(c => c.id === col.unlockedAfter);
    if (!prereq) return true;
    return prereq.puzzleIds.some(id => completed.has(id));
  }

  function markDone(puzzleId: string) {
    const next = new Set(completed);
    next.add(puzzleId);
    setCompleted(next);
    saveCompleted('base', next);
    onPuzzleComplete(); // sync to Drive if signed in
  }

  function openPuzzle(puzzleId: string, colId: string) {
    setLastPuzzleId(puzzleId);
    saveLastPuzzle('base', puzzleId);
    setView({ kind: 'puzzle', puzzleId, colId });
  }

  function getNextPuzzleId(puzzleId: string, colId: string): string | null {
    const col = (COLLECTIONS as Collection[]).find(c => c.id === colId);
    if (!col) return null;
    const idx = col.puzzleIds.indexOf(puzzleId);
    return col.puzzleIds[idx + 1] ?? null;
  }

  // ── Tutorial ───────────────────────────────────────────────────────────────
  if (view.kind === 'tutorial') {
    return (
      <TutorialPage
        tutorialId={view.tutorialId}
        steps={TUTORIAL_STEPS[view.tutorialId]}
        onBack={() => setView({ kind: 'home' })}
        onDone={() => setView({ kind: 'home' })}
      />
    );
  }

  // ── Puzzle solver ──────────────────────────────────────────────────────────
  if (view.kind === 'puzzle') {
    const puzzle = PUZZLE_MAP[view.puzzleId];
    if (!puzzle) return <div className="p-8 text-red-500">Puzzle not found.</div>;
    const nextId = getNextPuzzleId(view.puzzleId, view.colId);
    return (
      <PuzzleSolverPage
        key={`${view.puzzleId}-${resetVersion}`}
        puzzle={puzzle}
        onBack={() => setView({ kind: 'collection', colId: view.colId })}
        onNext={() => {
          markDone(view.puzzleId);
          if (nextId) openPuzzle(nextId, view.colId);
          else        setView({ kind: 'collection', colId: view.colId });
        }}
      />
    );
  }

  // ── Collection detail ──────────────────────────────────────────────────────
  if (view.kind === 'collection') {
    const col = (COLLECTIONS as Collection[]).find(c => c.id === view.colId);
    if (!col) return <div className="p-8 text-red-500">Collection not found.</div>;
    const puzzles = col.puzzleIds.map(id => PUZZLE_MAP[id]).filter(Boolean) as Puzzle[];
    const doneCount = puzzles.filter(p => completed.has(p.id)).length;

    return (
      <div className="min-h-screen bg-gray-50 animate-fadein">
        <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-5">
          <button
            onClick={() => setView({ kind: 'home' })}
            className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1
                       transition-colors focus-visible:outline-none focus-visible:ring-2
                       focus-visible:ring-indigo-400 rounded"
          >
            ← Back
          </button>

          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{col.title}</h1>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full
                ${DIFF_BADGE[col.difficulty] ?? ''}`}>
                {col.difficulty}
              </span>
            </div>
            <p className="text-gray-500 mt-1 text-sm">{col.description}</p>
            <p className="text-xs text-gray-400 mt-1">{doneCount}/{puzzles.length} solved</p>
          </div>

          <div className="space-y-2">
            {puzzles.map(p => (
              <PuzzleRow
                key={p.id}
                puzzle={p}
                isDone={completed.has(p.id)}
                onPlay={() => openPuzzle(p.id, col.id)}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Home ───────────────────────────────────────────────────────────────────
  const lastPuzzle = lastPuzzleId ? PUZZLE_MAP[lastPuzzleId] : null;
  const lastCol    = lastPuzzle
    ? (COLLECTIONS as Collection[]).find(c => c.puzzleIds.includes(lastPuzzle.id))
    : null;

  return (
    <div className="min-h-screen bg-gray-50 animate-fadein">
      <div className="max-w-xl mx-auto px-4 py-10 space-y-8">

        {/* Mode switcher + cloud save — very top */}
        <div className="flex items-center justify-between gap-2">
          <ModeSwitcher mode="base" onChange={handleModeChange} />
          <DriveSync />
        </div>

        {/* Hero */}
        <div className="text-center space-y-2">
          <div className="text-5xl" aria-hidden="true">⚗️</div>
          <h1 className="text-3xl font-bold text-gray-900">Alchemists Trainer</h1>
          <p className="text-gray-500 text-sm">
            Learn the deduction logic of Alchemists through interactive puzzles.
          </p>
        </div>

        {/* Continue banner */}
        {lastPuzzle && lastCol && !completed.has(lastPuzzle.id) && (
          <button
            onClick={() => openPuzzle(lastPuzzle.id, lastCol.id)}
            aria-label={`Continue: ${lastPuzzle.title}`}
            className="w-full flex items-center gap-4 bg-indigo-600 text-white rounded-2xl
                       p-4 hover:bg-indigo-700 transition-colors press-sm
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <span className="text-2xl" aria-hidden="true">▶</span>
            <div className="flex-1 text-left">
              <div className="font-semibold text-sm">Continue where you left off</div>
              <div className="text-indigo-200 text-xs">{lastPuzzle.title}</div>
            </div>
            <span className="text-indigo-200 text-sm" aria-hidden="true">→</span>
          </button>
        )}

        {/* Puzzle collections */}
        <section aria-label="Puzzle collections" className="space-y-3">
          {(COLLECTIONS as Collection[]).map(col => (
            <CollectionCard
              key={col.id}
              col={col}
              completed={col.puzzleIds.filter(id => completed.has(id)).length}
              locked={!isCollectionUnlocked(col)}
              onOpen={() => {
                const tutorialMap: Record<string, TutorialId> = {
                  'tutorial-mixing':   'mixing',
                  'tutorial-selling':  'selling',
                  'tutorial-two-color':'two-color',
                };
                const tid = tutorialMap[col.id];
                if (tid) {
                  setView({ kind: 'tutorial', tutorialId: tid });
                } else {
                  setView({ kind: 'collection', colId: col.id });
                }
              }}
            />
          ))}
        </section>

        {/* ── Progressive mechanics reference — shown after each collection is completed ── */}
        {(completedTutorials.has('mixing') ||
          completed.has('tutorial-mix-01') ||
          completed.has('tutorial-mix-03')) && (
          <details className="group border border-gray-200 rounded-xl overflow-hidden animate-fadein">
            <summary className="flex items-center justify-between px-3 py-2 cursor-pointer
              text-xs font-semibold text-gray-600 hover:bg-gray-50 select-none list-none">
              <span>📖 Mixing Rule — Quick Reference</span>
              <span className="text-gray-400 group-open:rotate-180 transition-transform">▾</span>
            </summary>
            <div className="px-3 pb-3 pt-3 border-t border-gray-100 space-y-2">
              <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-2.5 space-y-1.5">
                <p className="text-[11px] font-bold text-indigo-800 uppercase tracking-wide">⚗️ The Mixing Rule</p>
                <p className="text-[11px] text-indigo-700 leading-relaxed">
                  Compare alchemicals colour by colour (R, G, B):
                </p>
                <ul className="text-[11px] text-indigo-700 space-y-1 pl-2">
                  <li>All signs opposite → <strong>Neutral</strong> (no potion)</li>
                  <li>Otherwise: find the colour where signs <strong>match</strong> and sizes <strong>differ</strong> → that colour + sign is your potion</li>
                </ul>
                <p className="text-[10px] text-indigo-500 italic">There is always exactly one resolver, or all are opposite.</p>
              </div>
            </div>
          </details>
        )}

        {completedTutorials.has('two-color') && (
          <details className="group border border-gray-200 rounded-xl overflow-hidden animate-fadein">
            <summary className="flex items-center justify-between px-3 py-2 cursor-pointer
              text-xs font-semibold text-gray-600 hover:bg-gray-50 select-none list-none">
              <span>🎨 Two-Colour Rule — Quick Reference</span>
              <span className="text-gray-400 group-open:rotate-180 transition-transform">▾</span>
            </summary>
            <div className="px-3 pb-3 pt-3 border-t border-gray-100 space-y-2">
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 space-y-1.5">
                <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">🎨 Two-Colour Rule</p>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  When two alchemicals share a sign on a colour, only two result colours are possible:
                </p>
                <div className="grid grid-cols-3 gap-1 text-center">
                  <div className="rounded bg-amber-100 px-1 py-1 text-[10px] font-semibold text-red-700">🔴 Red matches<br/><span className="font-normal">→ Red or Green</span></div>
                  <div className="rounded bg-amber-100 px-1 py-1 text-[10px] font-semibold text-green-700">🟢 Green matches<br/><span className="font-normal">→ Green or Blue</span></div>
                  <div className="rounded bg-amber-100 px-1 py-1 text-[10px] font-semibold text-blue-700">🔵 Blue matches<br/><span className="font-normal">→ Blue or Red</span></div>
                </div>
                <p className="text-[10px] text-amber-600 italic">Works in reverse: a Red potion means Red or Green sign matched.</p>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 space-y-1">
                <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">⚖️ Neutralizing Pairs</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  If two ingredients produce <strong>Neutral</strong>, their alchemicals are direct opposites — all three signs differ.
                  They will always react identically to the golem.
                </p>
              </div>
            </div>
          </details>
        )}

        {completedTutorials.has('selling') && (
          <details className="group border border-gray-200 rounded-xl overflow-hidden animate-fadein">
            <summary className="flex items-center justify-between px-3 py-2 cursor-pointer
              text-xs font-semibold text-gray-600 hover:bg-gray-50 select-none list-none">
              <span>💰 Sell Results — Quick Reference</span>
              <span className="text-gray-400 group-open:rotate-180 transition-transform">▾</span>
            </summary>
            <div className="px-3 pb-3 pt-3 border-t border-gray-100">
              <div className="rounded-lg bg-green-50 border border-green-200 p-2.5 space-y-1.5">
                <p className="text-[11px] font-bold text-green-800 uppercase tracking-wide">💰 Sell Outcomes</p>
                <p className="text-[11px] text-green-700 leading-relaxed">When you sell a potion and claim a colour+sign:</p>
                <ul className="text-[11px] text-green-700 space-y-1 pl-2">
                  <li><strong>Total match</strong> — actual result equals claim exactly</li>
                  <li><strong>Sign OK</strong> — same sign, different colour</li>
                  <li><strong>Neutral</strong> — actual result is Neutral</li>
                  <li><strong>Opposite</strong> — actual sign is opposite to claim</li>
                </ul>
              </div>
            </div>
          </details>
        )}

        {(completed.has('tutorial-debunk-01') || completed.has('tutorial-debunk-03')) && (
          <details className="group border border-gray-200 rounded-xl overflow-hidden animate-fadein">
            <summary className="flex items-center justify-between px-3 py-2 cursor-pointer
              text-xs font-semibold text-gray-600 hover:bg-gray-50 select-none list-none">
              <span>🔍 Debunking — Quick Reference</span>
              <span className="text-gray-400 group-open:rotate-180 transition-transform">▾</span>
            </summary>
            <div className="px-3 pb-3 pt-3 border-t border-gray-100 space-y-2">
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 space-y-1.5">
                <p className="text-[11px] font-bold text-rose-800 uppercase tracking-wide">🔍 Apprentice Debunk</p>
                <p className="text-[11px] text-rose-700 leading-relaxed">
                  Reveals the <strong>true</strong> aspect sign for one ingredient — always filterable regardless of success or failure.
                </p>
              </div>
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 space-y-1.5">
                <p className="text-[11px] font-bold text-rose-800 uppercase tracking-wide">⚗️ Master Debunk</p>
                <p className="text-[11px] text-rose-700 leading-relaxed">
                  Shows the <strong>claimed</strong> mix result. Only constrains worlds if the debunk <strong>succeeded</strong> — failure reveals nothing about the true result.
                </p>
              </div>
            </div>
          </details>
        )}

        <div className="pt-4 border-t space-y-3" aria-live="polite">

          {/* Free-play toggle */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-gray-600">Unlock all collections</span>
              <p className="text-[10px] text-gray-400 leading-tight mt-0.5">
                Skip prerequisites — explore any puzzle freely
              </p>
            </div>
            <button
              role="switch"
              aria-checked={freePlay}
              aria-label="Unlock all collections"
              onClick={() => {
                const next = !freePlay;
                setFreePlay(next);
                saveFreePlay('base', next);
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2
                border-transparent transition-colors duration-200
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
                ${freePlay ? 'bg-indigo-600' : 'bg-gray-200'}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow
                ring-0 transition-transform duration-200
                ${freePlay ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Progress + reset */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {completed.size} / {ALL_PUZZLES.length} puzzles solved
            </p>
            {completed.size > 0 && (
              <button
                onClick={() => {
                  clearAllProgress('base');
                  setCompleted(new Set());
                  setLastPuzzleId(null);
                  setResetVersion(v => v + 1);
                }}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                title="Clear all base game progress and grid marks"
              >
                ✕ Reset base game progress
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}

// ─── Root export wrapped in DriveProvider ────────────────────────────────────

export default function App() {
  return (
    <DriveProvider>
      <AppInner />
    </DriveProvider>
  );
}
