/**
 * PuzzleToolbar — shared sticky header used by both PuzzleSolverPage and
 * ExpandedPuzzleSolverPage.  All behaviour is injected via props so the
 * component has no context dependency.
 */

import { useState } from 'react';

const DIFFICULTY_BADGE: Record<string, string> = {
  tutorial: 'bg-purple-100 text-purple-700',
  easy:     'bg-green-100 text-green-700',
  medium:   'bg-yellow-100 text-yellow-700',
  hard:     'bg-red-100 text-red-700',
};

export type PuzzleToolbarProps = {
  title: string;
  difficulty: string;
  worldsLeft: number;
  isTutorial?: boolean;
  /** Optional subtitle shown below title (e.g. "✨ Expanded") */
  subtitle?: React.ReactNode;
  onBack: () => void;
  onSave: () => void;
  onLoad: () => void;
  onReset: () => void;
  /** Called when the user clicks the chain-link button; should update the URL and copy to clipboard. */
  onPermalink?: () => void;
};

export function PuzzleToolbar({
  title, difficulty, worldsLeft,
  isTutorial = false, subtitle,
  onBack, onSave, onLoad, onReset, onPermalink,
}: PuzzleToolbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied]     = useState(false);

  function handlePermalink() {
    onPermalink?.();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const iconBtn = 'text-xs text-gray-400 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors';
  const menuItem = 'w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2';

  return (
    <div className="bg-white border-b shadow-sm sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 flex items-center gap-2 sm:gap-3">

        {/* Back */}
        <button
          onClick={onBack}
          aria-label={isTutorial ? 'Back to tutorial' : 'Back to collection'}
          className="text-sm text-gray-500 hover:text-gray-800 transition-colors flex items-center gap-1 shrink-0"
        >
          ← <span className="hidden sm:inline">{isTutorial ? 'Tutorial' : 'Back'}</span>
        </button>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-gray-900 text-sm truncate">{title}</h1>
          {subtitle && <div>{subtitle}</div>}
        </div>

        {/* Difficulty badge */}
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize shrink-0
          ${DIFFICULTY_BADGE[difficulty] ?? 'bg-gray-100 text-gray-600'}`}>
          {difficulty}
        </span>

        {/* Worlds counter */}
        <span className="hidden xs:inline text-xs text-gray-400 shrink-0 tabular-nums">
          {worldsLeft.toLocaleString()}w
        </span>

        {/* Desktop actions */}
        <div className="hidden sm:flex items-center gap-1">
          {onPermalink && (
            <button onClick={handlePermalink} aria-label="Copy permalink" title="Copy link to this puzzle" className={iconBtn}>
              {copied ? '✓' : '🔗'}
            </button>
          )}
          <button onClick={onSave}  aria-label="Save progress"  title="Save progress to file"  className={iconBtn}>💾</button>
          <button onClick={onLoad}  aria-label="Load progress"  title="Load progress from file" className={iconBtn}>📂</button>
          <button onClick={onReset} aria-label="Reset puzzle"   title="Reset all progress"      className={iconBtn}>↺</button>
        </div>

        {/* Mobile overflow menu */}
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
              {onPermalink && (
                <button onClick={() => { handlePermalink(); setMenuOpen(false); }} className={menuItem}>
                  {copied ? '✓ Copied!' : '🔗 Copy link'}
                </button>
              )}
              <button onClick={() => { onSave();  setMenuOpen(false); }} className={menuItem}>💾 Save progress</button>
              <button onClick={() => { onLoad();  setMenuOpen(false); }} className={menuItem}>📂 Load progress</button>
              <button onClick={() => { onReset(); setMenuOpen(false); }} className={menuItem}>↺ Reset</button>
            </div>
          )}
        </div>

      </div>
      {/* Dismiss mobile menu on outside click */}
      {menuOpen && <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />}
    </div>
  );
}
