/**
 * src/components/InterfaceQuickReference.tsx
 *
 * Collapsible interface quick-reference for both home pages.
 * Explains the solver tools: grid, marking tools, visual hints,
 * potion mixing hints, and the Grid/Truth mode switch.
 */

import { IngredientIcon, AlchemicalImage, PotionImage } from './GameSprites';
import { RuleCard } from './RulesQuickReference';
import type { AlchemicalId, PotionResult } from '../types';

const R_PLUS: PotionResult = { type: 'potion', color: 'R', sign: '+' };

// ─── Interface cards ──────────────────────────────────────────────────────────

export function BaseInterfaceCards() {
  return (
    <>
      {/* Ingredient Grid */}
      <RuleCard
        icon="🗂️" title="Ingredient Grid" accent="slate"
        visual={
          <div className="inline-grid gap-0.5" style={{ gridTemplateColumns: 'auto 1fr 1fr 1fr' }}>
            {/* header row */}
            <span />
            {([0, 1, 2] as const).map(i => (
              <span key={i} className="flex justify-center"><IngredientIcon index={i} width={18} /></span>
            ))}
            {/* data rows */}
            {([1, 3, 5] as AlchemicalId[]).map((id, row) => (
              [
                <span key={`a${id}`} className="flex items-center"><AlchemicalImage id={id} width={18} /></span>,
                <span key={`c${id}0`} className={`w-[22px] h-[22px] rounded-sm border flex items-center justify-center text-[10px] font-bold
                  ${row === 0 ? 'border-red-300 bg-red-50 text-red-500' : 'border-gray-200 bg-white text-gray-300'}`}>
                  {row === 0 ? '✗' : ''}
                </span>,
                <span key={`c${id}1`} className={`w-[22px] h-[22px] rounded-sm border flex items-center justify-center text-[10px] font-bold
                  ${row === 2 ? 'border-green-300 bg-green-50 text-green-600' : 'border-gray-200 bg-white text-gray-300'}`}>
                  {row === 2 ? '✔' : ''}
                </span>,
                <span key={`c${id}2`} className="w-[22px] h-[22px] rounded-sm border border-gray-200 bg-white" />,
              ]
            ))}
          </div>
        }
        text="The 8×8 grid tracks every possible ingredient↔alchemical assignment. Rows are alchemicals, columns are ingredients — mark cells as eliminated or confirmed as you gather evidence from the clues."
      />

      {/* Cell Marking Tools */}
      <RuleCard
        icon="🖊️" title="Cell Marking Tools" accent="blue"
        visual={
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {(['✗✔', '?', 'abc', '✏'] as const).map((t, i) => (
                <span key={t} className={`px-2 py-1 rounded text-xs font-bold border
                  ${i === 0
                    ? 'bg-blue-100 border-blue-400 text-blue-700'
                    : i === 3
                    ? 'bg-rose-100 border-rose-400 text-rose-700'
                    : 'bg-gray-100 border-gray-300 text-gray-600'}`}>
                  {t}
                </span>
              ))}
            </div>
            <span className="text-[10px] text-blue-400">Space to cycle</span>
          </div>
        }
        text="Four tools: ✗✔ cycles a cell through eliminated → confirmed → clear; ? marks an uncertain note; abc lets you write up to 3 characters as a custom label; ✏ lets you sketch freehand lines on the grid as a scratchpad. Press Space to cycle between tools."
      />

      {/* Visual Hints */}
      <RuleCard
        icon="⚡" title="Visual Hints" accent="indigo"
        visual={
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-indigo-600">Hints</span>
            {/* Styled toggle — on state */}
            <span className="relative inline-flex h-5 w-9 items-center rounded-full bg-indigo-600 shrink-0">
              <span className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow translate-x-4" />
            </span>
            <span className="text-[10px] text-indigo-400">in the grid toolbar</span>
          </div>
        }
        text="When enabled, the grid shows faint circles on cells that are logically eliminated (red squiggly) or confirmed (green circle) by the clues — without touching your own marks. The shapes also differ for colorblind accessibility."
      />

      {/* Potion Mixing Hints */}
      <RuleCard
        icon="🧪" title="Potion Mixing Hints" accent="blue"
        visual={
          <>
            <IngredientIcon index={0} width={24} />
            <span className="text-blue-400 text-sm">+</span>
            <IngredientIcon index={3} width={24} />
            <span className="text-blue-400 text-sm">→</span>
            <PotionImage result={R_PLUS} width={28} />
            <span className="text-[10px] text-blue-400 ml-1">determined</span>
          </>
        }
        text="Pick any two ingredients in the Potion Mixing Hints panel to see what the clues imply their mix result will be — a confirmed potion, a set of possibilities, or Neutral. This is a reasoning aid built from the puzzle clues, not a separate clue itself."
      />

      {/* Grid / Truth Mode */}
      <RuleCard
        icon="🔀" title="Grid / Truth Mode" accent="amber"
        visual={
          <div className="flex items-center gap-2">
            <span className="flex gap-1">
              <span className="px-2.5 py-1 rounded text-xs font-bold bg-indigo-100 border border-indigo-400 text-indigo-700">Grid</span>
              <span className="px-2.5 py-1 rounded text-xs font-bold bg-amber-100 border border-amber-400 text-amber-700">Truth</span>
            </span>
            <span className="text-[10px] text-amber-400">switch in mixer</span>
          </div>
        }
        text="Grid mode computes mixing predictions using only your current cell marks as constraints — useful for checking whether your deductions are consistent. Truth mode ignores your marks and predicts from the puzzle clues alone, revealing what is mathematically certain."
      />

      {/* Hints Panel */}
      <RuleCard
        icon="💡" title="Progressive Hints" accent="emerald"
        visual={
          <div className="flex items-center gap-1.5">
            <span className="px-2.5 py-1 rounded-lg border text-xs font-semibold bg-amber-50 border-amber-300 text-amber-600">
              💡 Show hint
            </span>
            <span className="text-emerald-400 text-[10px]">→</span>
            <span className="px-2.5 py-1 rounded-lg border text-xs font-semibold bg-amber-50 border-amber-300 text-amber-600">
              💡 Next hint
            </span>
          </div>
        }
        text="Puzzles may include up to 3 progressive hints, each more specific than the last. Hints are revealed one at a time via the button in the clue panel — once shown they cannot be hidden again."
      />
    </>
  );
}

// ─── Full details block ───────────────────────────────────────────────────────

export function InterfaceQuickReference() {
  return (
    <details className="group border border-gray-200 rounded-xl bg-white overflow-hidden">
      <summary className="flex items-center justify-between px-4 py-3 cursor-pointer
        text-sm font-semibold text-gray-700 hover:bg-gray-50 select-none list-none">
        <span>🖥️ Interface Quick Reference</span>
        <span className="text-gray-400 group-open:rotate-180 transition-transform">▾</span>
      </summary>
      <div className="px-4 pb-4 pt-3 border-t border-gray-100">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <BaseInterfaceCards />
        </div>
      </div>
    </details>
  );
}
