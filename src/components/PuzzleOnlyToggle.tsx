/**
 * PuzzleOnlyToggle — pill toggle that shows/hides puzzle-only (non-board-game) collections.
 * Renders below the ModeSwitcher on both base and expanded home pages.
 */

export function PuzzleOnlyToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between w-full max-w-xs mx-auto
                    px-3 py-2 rounded-xl bg-white border border-gray-200 shadow-sm">
      <span className="text-xs text-gray-600 flex items-center gap-1.5">
        <span aria-hidden="true">🧩</span>
        <span>Puzzle-only clues</span>
      </span>
      <button
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
          ${value ? 'bg-indigo-500' : 'bg-gray-300'}`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform
            ${value ? 'translate-x-[18px]' : 'translate-x-1'}`}
        />
        <span className="sr-only">{value ? 'Show puzzle-only collections' : 'Hide puzzle-only collections'}</span>
      </button>
    </div>
  );
}
