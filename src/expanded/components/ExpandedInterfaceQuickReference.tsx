/**
 * src/expanded/components/ExpandedInterfaceQuickReference.tsx
 *
 * Collapsible interface quick-reference for the expanded game home page.
 * Covers all base interface tools plus the three expanded-specific panels:
 * Solar/Lunar grid colouring, Solar/Lunar ingredient mark buttons, and
 * the Golem Panel.
 */

import { AlchemicalImage, IngredientIcon, ElemImage } from '../../components/GameSprites';
import { RuleCard } from '../../components/RulesQuickReference';
import { BaseInterfaceCards } from '../../components/InterfaceQuickReference';
import type { AlchemicalId } from '../../types';

// ─── Expanded interface cards ─────────────────────────────────────────────────

function ExpandedInterfaceCards() {
  return (
    <>
      {/* Solar/Lunar grid rows */}
      <RuleCard
        icon="🌓" title="Solar / Lunar Grid Rows" accent="sky"
        visual={
          <div className="flex flex-col gap-0.5">
            {/* Solar row sample */}
            <div className="flex items-center gap-1">
              <span className="w-1 h-[22px] rounded-r bg-amber-400 shrink-0" />
              <span className="bg-amber-50 border border-amber-200 rounded-sm px-1 flex items-center gap-1">
                <AlchemicalImage id={1 as AlchemicalId} width={18} />
                <span className="text-[9px] text-orange-400 font-bold">☀</span>
              </span>
              {[0,1,2].map(i => (
                <span key={i} className="w-[22px] h-[22px] rounded-sm border border-amber-200 bg-amber-50" />
              ))}
            </div>
            {/* Lunar row sample */}
            <div className="flex items-center gap-1">
              <span className="w-1 h-[22px] rounded-r bg-blue-400 shrink-0" />
              <span className="bg-blue-50 border border-blue-200 rounded-sm px-1 flex items-center gap-1">
                <AlchemicalImage id={2 as AlchemicalId} width={18} />
                <span className="text-[9px] text-blue-400 font-bold">☽</span>
              </span>
              {[0,1,2].map(i => (
                <span key={i} className="w-[22px] h-[22px] rounded-sm border border-blue-200 bg-blue-50" />
              ))}
            </div>
          </div>
        }
        text="In the expanded grid, alchemical rows are colour-coded: Solar alchemicals (☀) have an amber left border and warm background; Lunar alchemicals (☽) have a blue left border. A ☀/☽ legend appears above the grid as a reminder. Note: the bottom two rows (PPP Solar and NNN Lunar) are intentionally swapped compared to the base game — PPP appears just above NNN so the Solar/Lunar grouping is visually consistent."
      />

      {/* Solar/Lunar column buttons */}
      <RuleCard
        icon="☀☽" title="Solar / Lunar Ingredient Marks" accent="sky"
        visual={
          <div className="flex items-end gap-2">
            {([0, 1, 2] as const).map(i => (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <IngredientIcon index={i} width={22} />
                <div className="flex gap-0.5">
                  <span className={`w-[22px] h-[15px] rounded-sm text-[9px] flex items-center justify-center font-bold
                    ${i === 0 ? 'bg-amber-400 text-white' : 'bg-amber-50 border border-amber-300 text-amber-500'}`}>
                    ☀
                  </span>
                  <span className={`w-[22px] h-[15px] rounded-sm text-[9px] flex items-center justify-center font-bold
                    ${i === 1 ? 'bg-blue-400 text-white' : 'bg-blue-50 border border-blue-300 text-blue-400'}`}>
                    ☽
                  </span>
                </div>
              </div>
            ))}
          </div>
        }
        text="Each ingredient column in the expanded grid has a ☀ and ☽ button in its header. Use these to record whether you've determined an ingredient to be Solar or Lunar — clicking cycles through confirmed (✔) → eliminated (✗) → possible (?) → unknown, and corner indicators appear on the corresponding grid cells."
      />

      {/* Golem Panel */}
      <RuleCard
        icon="🧿" title="Golem Panel" accent="violet"
        visual={
          <div className="flex flex-col gap-1.5">
            {/* Top mini-grid: reactions per ingredient */}
            <div className="flex items-center gap-1 text-[9px] text-violet-500 font-semibold">
              <img src="/alchemydoku/images/golem_chest_icon.png" alt="chest"
                   style={{ width: 16, height: 16, borderRadius: '50%' }} />
              {([0, 1, 2, 3] as const).map(i => (
                <span key={i} className={`w-[18px] h-[18px] rounded-sm border flex items-center justify-center text-[10px] font-bold
                  ${i === 1 ? 'border-green-300 bg-green-50 text-green-600'
                  : i === 3 ? 'border-red-300 bg-red-50 text-red-500'
                  : 'border-gray-200 bg-white text-gray-300'}`}>
                  {i === 1 ? '✔' : i === 3 ? '✗' : ''}
                </span>
              ))}
            </div>
            {/* Bottom mini-grid: aspect deduction */}
            <div className="flex items-center gap-1 text-[9px] text-violet-500 font-semibold">
              <img src="/alchemydoku/images/golem_ears_icon.png" alt="ears"
                   style={{ width: 16, height: 16, borderRadius: '50%' }} />
              {(['R','G','B'] as const).map(c => (
                <span key={c} className="flex gap-0.5">
                  <span className={`w-[18px] h-[18px] rounded-sm border flex items-center justify-center
                    ${c === 'R' ? 'border-green-300 bg-green-50 text-green-600 text-[10px] font-bold' : 'border-gray-200 bg-white'}`}>
                    {c === 'R' ? '✔' : <ElemImage color={c} size="L" width={12} />}
                  </span>
                </span>
              ))}
            </div>
          </div>
        }
        text="On golem puzzles, a 🧿 Golem sub-panel appears inside the ingredient grid section. The top grid tracks which ingredients react to each golem body part; the bottom grid lets you mark which color aspect (Large) triggers each part — combining both determines the exact sensitivity."
      />
    </>
  );
}

// ─── Full details block ───────────────────────────────────────────────────────

export function ExpandedInterfaceQuickReference() {
  return (
    <details className="group border border-violet-200 rounded-xl bg-white overflow-hidden">
      <summary className="flex items-center justify-between px-4 py-3 cursor-pointer
        text-sm font-semibold text-gray-700 hover:bg-violet-50 select-none list-none">
        <span>🖥️ Interface Quick Reference</span>
        <span className="text-gray-400 group-open:rotate-180 transition-transform">▾</span>
      </summary>
      <div className="px-4 pb-4 pt-3 border-t border-violet-100">
        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-2">
          Solver tools
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <BaseInterfaceCards />
        </div>
        <p className="text-[10px] text-violet-500 uppercase tracking-widest font-semibold mb-2">
          Expanded panels
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ExpandedInterfaceCards />
        </div>
      </div>
    </details>
  );
}
