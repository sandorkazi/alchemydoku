import { useState, useEffect } from 'react';
import { ALL_PUZZLES, COLLECTIONS, PUZZLE_MAP } from './data/puzzles/index';
import { PuzzleSolverPage } from './pages/PuzzleSolverPage';
import { TutorialPage } from './pages/TutorialPage';
import { MIXING_TUTORIAL_STEPS } from './data/tutorials/mixing';
import { ASPECT_BALANCE_TUTORIAL_STEPS } from './data/tutorials/aspect-balance';
import { SELLING_TUTORIAL_STEPS } from './data/tutorials/selling';
import { TWO_COLOR_TUTORIAL_STEPS } from './data/tutorials/two-color';
import { DEBUNK_APPRENTICE_TUTORIAL_STEPS } from './data/tutorials/debunk-apprentice';
import { DEBUNK_MASTER_TUTORIAL_STEPS } from './data/tutorials/debunk-master';
import type { TutorialId } from './contexts/TutorialContext';
import { RulesQuickReference } from './components/RulesQuickReference';
import { InterfaceQuickReference } from './components/InterfaceQuickReference';
import { SettingsModal } from './components/SettingsModal';
import type { Puzzle } from './types';
import { clearPuzzleState } from './contexts/SolverContext';
import { ExpandedHome as ExpandedHomeImpl } from './expanded/ExpandedHome';
import { parsePermalink } from './utils/permalink';
import { DriveProvider, useDrive } from './contexts/DriveContext';
import { DriveSync } from './components/DriveSync';
import { shouldShowReleaseNotes, markReleaseNotesSeen, getCurrentReleaseEntry } from './utils/releaseNotes';
import { WhatsNewBanner } from './components/WhatsNewBanner';
import { loadSettings, saveSettings, type Settings } from './utils/settings';
import { clearExpandedProgress } from './utils/saveProgress';
import { isPuzzleNonCompliant } from './compliance';

type Collection = {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  puzzleIds: string[];
  unlockedAfter?: string;
  boardGameCompliant?: boolean;
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
  tutorial: 'bg-purple-100 text-purple-700',
  easy:     'bg-green-100  text-green-700',
  medium:   'bg-yellow-100 text-yellow-700',
  hard:     'bg-red-100    text-red-700',
  expert:   'bg-orange-100 text-orange-700',
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
  col, completed, hiddenCount, nonCompliantCount, locked, onOpen,
}: {
  col: Collection; completed: number; hiddenCount: number; nonCompliantCount: number; locked: boolean; onOpen: () => void;
}) {
  const total = col.puzzleIds.length;
  const visibleTotal = total - hiddenCount;
  const allHidden = hiddenCount === total && total > 0;
  const done = completed === visibleTotal && visibleTotal > 0;

  return (
    <button
      onClick={locked || allHidden ? undefined : onOpen}
      disabled={locked || allHidden}
      aria-label={`${col.title} collection${locked ? ' (locked)' : ''}`}
      className={`w-full text-left rounded-2xl border-2 bg-white shadow-sm overflow-hidden
        press-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
        transition-all
        ${locked
          ? 'border-gray-200 opacity-60 cursor-not-allowed'
          : allHidden
            ? 'border-gray-200 opacity-60 cursor-not-allowed'
            : done
              ? 'border-green-300 hover:border-green-400 hover:shadow-md cursor-pointer'
              : 'border-gray-200 hover:border-indigo-300 hover:shadow-md cursor-pointer'
        }`}
    >
      <div className={`px-4 py-3 ${done ? 'bg-green-50' : 'bg-gray-50'}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-bold text-gray-900 text-sm">{col.title}</h3>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0
              ${DIFF_BADGE[col.difficulty] ?? 'bg-gray-100 text-gray-600'}`}>
              {col.difficulty}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {locked
              ? <span className="text-base">🔒</span>
              : visibleTotal === 0
                ? <span className="text-xs font-semibold text-gray-400">🧩{nonCompliantCount}</span>
                : <>
                    <span className={`text-xs font-semibold tabular-nums ${done ? 'text-green-600' : 'text-gray-400'}`}>
                      {completed}/{visibleTotal}
                    </span>
                    {nonCompliantCount > 0 && (
                      <span className="text-xs text-gray-400">🧩{nonCompliantCount}</span>
                    )}
                  </>
            }
            <span className="text-gray-300 text-xs">›</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{col.description}</p>
        {locked && col.unlockedAfter && (
          <p className="text-xs text-gray-400 mt-1">
            Complete "{(COLLECTIONS as Collection[]).find(c => c.id === col.unlockedAfter)?.title ?? col.unlockedAfter}" first
          </p>
        )}
        {allHidden && (
          <p className="text-xs text-gray-400 mt-1">
            Allow unrealistic puzzles in ⚙️ Settings to see these puzzles
          </p>
        )}
      </div>
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
        className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200
                   bg-white hover:bg-indigo-50 hover:border-indigo-200 transition-colors text-left
                   press-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
      >
        <span
          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0
            ${isDone
              ? 'bg-green-500 text-white'
              : 'bg-gray-200 text-gray-400 group-hover:bg-indigo-200 group-hover:text-indigo-600'}`}
          aria-hidden="true"
        >
          {isDone ? '✓' : ''}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 text-sm truncate">{puzzle.title}</span>
            {(puzzle as any).metadata?.complexityScore != null && (
              <ComplexityPips score={(puzzle as any).metadata.complexityScore} />
            )}
          </div>
          <div className="text-xs text-gray-400 truncate">{puzzle.description}</div>
        </div>
      </button>
      <button
        onClick={isDone ? handleReset : undefined}
        title={confirmReset ? 'Click again to confirm reset' : 'Reset puzzle annotations'}
        aria-hidden={!isDone}
        tabIndex={isDone ? undefined : -1}
        className={`shrink-0 text-xs px-2 py-1.5 rounded-lg border transition-all
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400
                    ${!isDone
                      ? 'invisible'
                      : confirmReset
                        ? 'opacity-100 bg-red-100 border-red-300 text-red-700 font-semibold'
                        : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100 bg-gray-50 border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200'
                    }`}
      >
        {confirmReset ? 'Sure?' : '↺'}
      </button>
    </div>
  );
}

// ─── Tutorial steps registry ──────────────────────────────────────────────────

const TUTORIAL_STEPS = {
  mixing:              MIXING_TUTORIAL_STEPS,
  'aspect-balance':    ASPECT_BALANCE_TUTORIAL_STEPS,
  selling:             SELLING_TUTORIAL_STEPS,
  'two-color':         TWO_COLOR_TUTORIAL_STEPS,
  'debunk-apprentice': DEBUNK_APPRENTICE_TUTORIAL_STEPS,
  'debunk-master':     DEBUNK_MASTER_TUTORIAL_STEPS,
};

// ─── Expanded home wrapper ────────────────────────────────────────────────────

function ExpandedHome({ onModeChange, initialPuzzleId, showReleaseNotes, onDismissReleaseNotes, settings, onSettingsChange }: {
  onModeChange: (m: 'base' | 'expanded') => void;
  initialPuzzleId?: string;
  showReleaseNotes: boolean;
  onDismissReleaseNotes: () => void;
  settings: Settings;
  onSettingsChange: (s: Settings) => void;
}) {
  return (
    <ExpandedHomeImpl
      onModeChange={onModeChange}
      initialPuzzleId={initialPuzzleId}
      showReleaseNotes={showReleaseNotes}
      onDismissReleaseNotes={onDismissReleaseNotes}
      settings={settings}
      onSettingsChange={onSettingsChange}
    />
  );
}

// ─── Base-game App ────────────────────────────────────────────────────────────

function AppInner() {
  // ── Permalink bootstrap ────────────────────────────────────────────────────
  // Read once at mount — window.location.hash is synchronous and stable.
  const [permalink] = useState(parsePermalink);
  const initMode = permalink?.mode ?? loadMode();

  const [showReleaseNotes, setShowReleaseNotes] = useState(() => shouldShowReleaseNotes());
  const releaseEntry = getCurrentReleaseEntry();

  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [mode, setMode]                 = useState<'base' | 'expanded'>(initMode);
  const [view, setView]                 = useState<View>(() => {
    if (permalink?.mode === 'base') {
      const puzzle = PUZZLE_MAP[permalink.puzzleId];
      if (puzzle) {
        const col = (COLLECTIONS as Collection[]).find(c => c.puzzleIds.includes(permalink.puzzleId));
        if (col) return { kind: 'puzzle', puzzleId: permalink.puzzleId, colId: col.id };
      }
    }
    return { kind: 'home' };
  });
  const [completed, setCompleted]       = useState<Set<string>>(() => loadCompleted(initMode));
  const [lastPuzzleId, setLastPuzzleId] = useState<string | null>(() => loadLastPuzzle(initMode));
  /** Incremented on reset to force SolverProvider remount even for same puzzleId */
  const [resetVersion, setResetVersion] = useState(0);

  const { onPuzzleComplete } = useDrive();

  // Re-read state when Drive sync merges cloud data
  useEffect(() => {
    function handleCloudSync() {
      setCompleted(loadCompleted('base'));
      setShowReleaseNotes(shouldShowReleaseNotes());
      setSettings(loadSettings());
    }
    window.addEventListener('alch-cloud-sync', handleCloudSync);
    return () => window.removeEventListener('alch-cloud-sync', handleCloudSync);
  }, []);

  function handleSettingsChange(s: Settings) {
    setSettings(s);
    saveSettings(s);
  }

  function handleDismissReleaseNotes() {
    markReleaseNotesSeen();
    setShowReleaseNotes(false);
  }

  // When mode switches, reload per-mode state and reset to home
  function handleModeChange(m: 'base' | 'expanded') {
    saveMode(m);
    setMode(m);
    setView({ kind: 'home' });
    setCompleted(loadCompleted(m));
    setLastPuzzleId(loadLastPuzzle(m));
  }

  // ── Expanded mode: completely separate experience ──────────────────────────
  if (mode === 'expanded') {
    return (
      <ExpandedHome
        onModeChange={handleModeChange}
        initialPuzzleId={permalink?.mode === 'expanded' ? permalink.puzzleId : undefined}
        showReleaseNotes={settings.showLatestUpdates && showReleaseNotes}
        onDismissReleaseNotes={handleDismissReleaseNotes}
        settings={settings}
        onSettingsChange={handleSettingsChange}
      />
    );
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

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

  // ── Reset callbacks for SettingsModal ──────────────────────────────────────

  function handleResetBase() {
    clearAllProgress('base');
    try { localStorage.removeItem('alch-save-base'); } catch { /* ignore */ }
    setCompleted(new Set());
    setLastPuzzleId(null);
    setResetVersion(v => v + 1);
  }

  function handleResetExpanded() {
    clearExpandedProgress();
  }

  function handleResetAll() {
    handleResetBase();
    clearExpandedProgress();
  }

  // ── Tutorial ───────────────────────────────────────────────────────────────
  if (view.kind === 'tutorial') {
    return (
      <TutorialPage
        tutorialId={view.tutorialId}
        steps={TUTORIAL_STEPS[view.tutorialId]}
        onBack={() => setView({ kind: 'home' })}
        onDone={() => setView({ kind: 'home' })}
        onPuzzleDone={markDone}
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
    const allPuzzles = col.puzzleIds.map(id => PUZZLE_MAP[id]).filter(Boolean) as Puzzle[];
    const visiblePuzzles = settings.showPuzzleOnly
      ? allPuzzles
      : allPuzzles.filter(p => !isPuzzleNonCompliant(p, 'base'));
    const hiddenCount = allPuzzles.length - visiblePuzzles.length;
    const doneCount = visiblePuzzles.filter(p => completed.has(p.id)).length;

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
            <p className="text-xs text-gray-400 mt-1">{doneCount}/{visiblePuzzles.length} solved</p>
            {hiddenCount > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                🧩 {hiddenCount} puzzle{hiddenCount > 1 ? 's' : ''} hidden — enable "Allow unrealistic puzzles" in ⚙️ Settings
              </p>
            )}
          </div>

          <div className="space-y-2">
            {visiblePuzzles.map(p => (
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

        {/* Mode switcher + settings + cloud save — very top */}
        <div className="flex items-center justify-between gap-2">
          <ModeSwitcher mode="base" onChange={handleModeChange} />
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setSettingsOpen(true)}
              title="Settings"
              aria-label="Open settings"
              className="flex items-center justify-center w-8 h-8 rounded-xl text-gray-500
                bg-white border border-gray-200 hover:border-gray-300 hover:text-gray-700
                shadow-sm transition-colors focus-visible:outline-none
                focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              ⚙️
            </button>
            <DriveSync />
          </div>
        </div>

        {/* What's New banner */}
        {settings.showLatestUpdates && showReleaseNotes && releaseEntry && (
          <WhatsNewBanner entry={releaseEntry} onDismiss={handleDismissReleaseNotes} variant="base" />
        )}

        {/* Hero */}
        <div className="text-center space-y-2">
          <div className="text-5xl" aria-hidden="true">⚗️</div>
          <h1 className="text-3xl font-bold text-gray-900">Alchemy Sudoku Training</h1>
          <p className="text-gray-500 text-sm">
            Train your deduction skills with interactive alchemy puzzles.
          </p>
        </div>

        {/* Rules quick reference — shown only when enabled in settings */}
        {settings.showQuickRef && (
          <>
            <RulesQuickReference showPuzzleOnly={settings.showPuzzleOnly} />
            <InterfaceQuickReference />
          </>
        )}

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
          {(COLLECTIONS as Collection[]).map(col => {
            const nonCompliantCount = col.puzzleIds.filter(id => { const p = PUZZLE_MAP[id]; return !!p && isPuzzleNonCompliant(p, 'base'); }).length;
            const hiddenCount = settings.showPuzzleOnly ? 0 : nonCompliantCount;
            const visibleCompleted = !settings.showPuzzleOnly
              ? col.puzzleIds.filter(id => completed.has(id) && !!PUZZLE_MAP[id] && !isPuzzleNonCompliant(PUZZLE_MAP[id]!, 'base')).length
              : col.puzzleIds.filter(id => completed.has(id)).length;
            return (
            <CollectionCard
              key={col.id}
              col={col}
              completed={visibleCompleted}
              hiddenCount={hiddenCount}
              nonCompliantCount={nonCompliantCount}
              locked={false}
              onOpen={() => {
                const tutorialMap: Record<string, TutorialId> = {
                  'tutorial-mixing':              'mixing',
                  'tutorial-aspect-balance':      'aspect-balance',
                  'tutorial-selling':             'selling',
                  'tutorial-two-color':           'two-color',
                  'tutorial-debunking-apprentice': 'debunk-apprentice',
                  'tutorial-debunking-master':    'debunk-master',
                };
                const tid = tutorialMap[col.id];
                if (tid) {
                  setView({ kind: 'tutorial', tutorialId: tid });
                } else {
                  setView({ kind: 'collection', colId: col.id });
                }
              }}
            />
            );
          })}
        </section>

        <div className="pt-4 border-t" aria-live="polite">
          <p className="text-xs text-gray-400 text-center">
            {completed.size} / {ALL_PUZZLES.length} puzzles solved
          </p>
        </div>

      </div>

      {/* Settings modal */}
      {settingsOpen && (
        <SettingsModal
          settings={settings}
          onSettingsChange={handleSettingsChange}
          onResetBase={handleResetBase}
          onResetExpanded={handleResetExpanded}
          onResetAll={handleResetAll}
          onClose={() => setSettingsOpen(false)}
        />
      )}
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
