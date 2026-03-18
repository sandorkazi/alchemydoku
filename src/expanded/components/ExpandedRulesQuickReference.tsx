/**
 * src/expanded/components/ExpandedRulesQuickReference.tsx
 *
 * Collapsible rules quick-reference for the expanded game home page.
 * Covers all base mechanics plus the five expanded mechanics.
 */

import {
  AlchemicalImage, IngredientIcon,
  ElemImage, SignedElemImage, CorrectIcon, IncorrectIcon,
} from '../../components/GameSprites';
import { RuleCard, BaseRulesCards } from '../../components/RulesQuickReference';
import type { AlchemicalId } from '../../types';

// ─── Expanded rule cards ─────────────────────────────────────────────────────

function ExpandedRulesCards() {
  return (
    <>
      <RuleCard
        icon="📖" title="Solar / Lunar" accent="sky"
        visual={
          <>
            <AlchemicalImage id={1 as AlchemicalId} width={26} />
            <span className="text-base text-orange-400">☀</span>
            <AlchemicalImage id={8 as AlchemicalId} width={26} />
            <span className="text-base text-orange-400">☀</span>
            <span className="text-sky-200 mx-1">·</span>
            <AlchemicalImage id={2 as AlchemicalId} width={26} />
            <span className="text-base text-slate-400">☽</span>
            <AlchemicalImage id={7 as AlchemicalId} width={26} />
            <span className="text-base text-slate-400">☽</span>
          </>
        }
        text="A Book Token reveals whether an ingredient is Solar (☀) or Lunar (☽). Count the alchemical's negative aspects: 0 or 2 negatives → Solar {npN, pNn, Nnp, PPP}; 1 or 3 negatives → Lunar {pnP, nPp, Ppn, NNN}."
      />

      <RuleCard
        icon="📜" title="Verified Publication" accent="green"
        visual={
          <>
            <ElemImage color="R" size="S" width={20} />
            <span className="text-green-400 text-[10px]">aspect:</span>
            <IngredientIcon index={0} width={22} />
            <SignedElemImage color="R" sign="+" width={22} />
            <IngredientIcon index={1} width={22} />
            <SignedElemImage color="R" sign="-" width={22} />
            <IngredientIcon index={2} width={22} />
            <SignedElemImage color="R" sign="+" width={22} />
            <IngredientIcon index={3} width={22} />
            <SignedElemImage color="R" sign="-" width={22} />
          </>
        }
        text="A Verified Publication lists 4 ingredient/sign pairs for one color aspect — all guaranteed correct. Treat each entry as a direct aspect clue for that ingredient."
      />

      <RuleCard
        icon="📄" title="Uncertain Article" accent="amber"
        visual={
          <>
            <ElemImage color="G" size="S" width={20} />
            <span className="text-amber-400 text-[10px]">aspect:</span>
            <IngredientIcon index={4} width={22} />
            <SignedElemImage color="G" sign="+" width={22} />
            <IngredientIcon index={5} width={22} />
            <SignedElemImage color="G" sign="-" width={22} />
            <IngredientIcon index={6} width={22} />
            <SignedElemImage color="G" sign="+" width={22} />
            <span className="text-[10px] text-amber-400 font-bold ml-0.5">≥ 3 correct</span>
          </>
        }
        text="An Uncertain Article lists 4 ingredient/sign pairs for one color aspect, but at least 3 of 4 entries are correct (one may be wrong). Use overlapping clues to identify the erroneous entry."
      />

      <RuleCard
        icon="🧿" title="Golem Test" accent="violet"
        visual={
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex flex-col items-center gap-0.5">
              <img src="/alchemydoku/images/golem_chest_icon.png" alt="chest"
                   style={{ width: 22, height: 22, borderRadius: '50%' }} />
              <span className="text-[8px] text-violet-500">chest</span>
            </div>
            <span className="text-violet-300 text-xs">+</span>
            <IngredientIcon index={0} width={24} />
            <span className="text-violet-400 text-sm">→</span>
            <div className="flex items-center gap-0.5">
              <CorrectIcon width={20} />
              <span className="text-[9px] text-violet-500">reacts</span>
            </div>
            <span className="text-violet-200">|</span>
            <div className="flex items-center gap-0.5">
              <IncorrectIcon width={20} />
              <span className="text-[9px] text-violet-500">silent</span>
            </div>
          </div>
        }
        text="A Golem Test places an ingredient near the golem and records whether it triggers the chest, ears, both, or neither. Reactions are triggered by ingredients whose alchemical has the required Large aspect — determined by Golem Hints."
      />

      <RuleCard
        icon="🎯" title="Golem Hint — Color" accent="violet"
        visual={
          <div className="flex items-center gap-1.5">
            <div className="flex flex-col items-center gap-0.5">
              <img src="/alchemydoku/images/golem_ears_icon.png" alt="ears"
                   style={{ width: 22, height: 22, borderRadius: '50%' }} />
              <span className="text-[8px] text-violet-500">ears</span>
            </div>
            <span className="text-violet-400 text-[10px]">reacts to color:</span>
            <ElemImage color="R" size="S" width={24} />
          </div>
        }
        text="A Golem Color Hint tells you which color aspect (R/G/B) triggers reactions in a specific body part. Combine it with the Size Hint below to fully determine the activating aspect."
      />

      <RuleCard
        icon="📏" title="Golem Hint — Size" accent="violet"
        visual={
          <div className="flex items-center gap-1.5">
            <div className="flex flex-col items-center gap-0.5">
              <img src="/alchemydoku/images/golem_chest_icon.png" alt="chest"
                   style={{ width: 22, height: 22, borderRadius: '50%' }} />
              <span className="text-[8px] text-violet-500">chest</span>
            </div>
            <span className="text-violet-400 text-[10px]">reacts to size:</span>
            <ElemImage color="R" size="L" width={26} />
            <span className="text-[10px] text-violet-500 font-bold">Large</span>
            <span className="text-violet-200 mx-0.5">/</span>
            <span className="text-[10px] line-through text-violet-300">
              <ElemImage color="R" size="S" width={20} />
            </span>
          </div>
        }
        text="A Golem Size Hint tells you whether Large or Small sized aspects trigger a body part. A Large aspect activates reactions; a Small aspect of the same color does not."
      />
    </>
  );
}

// ─── Full details block ───────────────────────────────────────────────────────

export function ExpandedRulesQuickReference() {
  return (
    <details className="group border border-violet-200 rounded-xl bg-white overflow-hidden">
      <summary className="flex items-center justify-between px-4 py-3 cursor-pointer
        text-sm font-semibold text-gray-700 hover:bg-violet-50 select-none list-none">
        <span>📖 Rules Quick Reference</span>
        <span className="text-gray-400 group-open:rotate-180 transition-transform">▾</span>
      </summary>
      <div className="px-4 pb-4 pt-3 border-t border-violet-100">
        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-2">
          Base rules
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <BaseRulesCards />
        </div>
        <p className="text-[10px] text-violet-500 uppercase tracking-widest font-semibold mb-2">
          Expanded mechanics
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ExpandedRulesCards />
        </div>
      </div>
    </details>
  );
}
