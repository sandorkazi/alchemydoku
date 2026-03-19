import { useState, type ReactNode } from 'react';
import { type Settings } from '../utils/settings';
import { useDrive } from '../contexts/DriveContext';

type ResetTarget = 'base' | 'expanded' | 'all';

interface SettingsModalProps {
  settings: Settings;
  onSettingsChange: (s: Settings) => void;
  onResetBase: () => void;
  onResetExpanded: () => void;
  onResetAll: () => void;
  onClose: () => void;
}

function ToggleRow({
  label,
  description,
  preview,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  preview?: ReactNode;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{description}</p>}
        {preview && <div className="mt-2">{preview}</div>}
      </div>
      <button
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors mt-0.5
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
          ${value ? 'bg-indigo-500' : 'bg-gray-300'}`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform
            ${value ? 'translate-x-[18px]' : 'translate-x-1'}`}
        />
        <span className="sr-only">{value ? 'On' : 'Off'}</span>
      </button>
    </div>
  );
}

// ─── Inline preview snippets ──────────────────────────────────────────────────

const UpdatesPreview = (
  <div className="rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-2 pointer-events-none select-none opacity-80">
    <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold mb-0.5">
      Recent updates to Alchemy Sudoku Training
    </p>
    <p className="text-xs font-semibold text-gray-800">✨ Settings &amp; board-game compliance</p>
    <p className="text-[11px] text-gray-700 mt-1">• New ⚙️ Settings menu with display toggles</p>
    <p className="text-[11px] text-gray-700">• Unrealistic puzzles can be hidden by default</p>
  </div>
);

const QuickRefPreview = (
  <div className="space-y-1.5 pointer-events-none select-none opacity-80">
    <div className="rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-900">⚗️ Mixing Rule</p>
      <p className="text-[11px] leading-relaxed text-indigo-900 mt-0.5">
        Mix two ingredients → potion color comes from the aspect where signs differ; neutral if all match or all differ.
      </p>
    </div>
    <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-900">💰 Selling</p>
      <p className="text-[11px] leading-relaxed text-emerald-900 mt-0.5">
        Claim an aspect when selling a potion — result depends on whether your claim matches the truth.
      </p>
    </div>
  </div>
);

export function SettingsModal({
  settings,
  onSettingsChange,
  onResetBase,
  onResetExpanded,
  onResetAll,
  onClose,
}: SettingsModalProps) {
  const { authStatus, uploadSnapshot } = useDrive();
  const isSignedIn = authStatus === 'signed-in';

  const [confirmReset, setConfirmReset] = useState<ResetTarget | null>(null);
  const [resetDone, setResetDone] = useState<ResetTarget | null>(null);

  function set(patch: Partial<Settings>) {
    onSettingsChange({ ...settings, ...patch });
  }

  function handleReset(target: ResetTarget) {
    if (target === 'base') onResetBase();
    else if (target === 'expanded') onResetExpanded();
    else onResetAll();
    if (isSignedIn) uploadSnapshot().catch(() => {});
    setResetDone(target);
    setConfirmReset(null);
  }

  const RESET_LABELS: Record<ResetTarget, string> = {
    base: 'base game',
    expanded: 'expanded mode',
    all: 'all',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">⚙️ Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded"
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        <div className="px-5 pb-5 overflow-y-auto max-h-[80vh]">

          {/* Display section */}
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mt-4 mb-0.5">
            Display
          </p>
          <div className="divide-y divide-gray-100">
            <ToggleRow
              label="Show latest updates"
              description="Show the What's New banner when there are new releases"
              preview={UpdatesPreview}
              value={settings.showLatestUpdates}
              onChange={v => set({ showLatestUpdates: v })}
            />
            <ToggleRow
              label="Show quick references"
              description="Show the Rules and Interface reference sections on the home page"
              preview={QuickRefPreview}
              value={settings.showQuickRef}
              onChange={v => set({ showQuickRef: v })}
            />
            <ToggleRow
              label="🧩 Allow unrealistic (extra) puzzles"
              description="Show collections that use non-board-game clue mechanics"
              value={settings.showPuzzleOnly}
              onChange={v => set({ showPuzzleOnly: v })}
            />
          </div>

          {/* Reset section */}
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mt-5 mb-2">
            Reset Progress
          </p>

          {resetDone ? (
            <p className="text-sm text-green-600 py-1">
              ✓ {RESET_LABELS[resetDone].charAt(0).toUpperCase() + RESET_LABELS[resetDone].slice(1)} progress cleared.
              {isSignedIn && ' Drive has been updated.'}
            </p>
          ) : confirmReset ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-700">
                This will permanently delete all {RESET_LABELS[confirmReset]} progress.
                {isSignedIn && ' Your Drive save will also be updated.'}
              </p>
              <div className="flex gap-2 mt-2.5">
                <button
                  onClick={() => handleReset(confirmReset)}
                  className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold
                    hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                >
                  Confirm reset
                </button>
                <button
                  onClick={() => setConfirmReset(null)}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium
                    hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {(['base', 'expanded', 'all'] as const).map(target => (
                <button
                  key={target}
                  onClick={() => setConfirmReset(target)}
                  className="w-full text-left px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700
                    hover:border-red-200 hover:bg-red-50 hover:text-red-700 transition-colors
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                >
                  {target === 'base' && 'Reset base game progress'}
                  {target === 'expanded' && 'Reset expanded mode progress'}
                  {target === 'all' && 'Reset all progress'}
                </button>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
