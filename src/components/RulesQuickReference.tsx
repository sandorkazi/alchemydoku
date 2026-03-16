/**
 * src/components/RulesQuickReference.tsx
 *
 * Collapsible rules quick-reference for the base game home page.
 * Each concept card has a visual + at most two sentences of text.
 * Export `RuleCard` and `BaseRulesCards` so the expanded home can reuse them.
 */

import type { ReactNode } from 'react';
import {
  AlchemicalImage, IngredientIcon, PotionImage,
  ElemImage, SignedElemImage, SellResultIcon,
} from './GameSprites';
import type { AlchemicalId, PotionResult } from '../types';

// ─── Potion constants ─────────────────────────────────────────────────────────

const R_PLUS:  PotionResult = { type: 'potion', color: 'R', sign: '+' };
const G_MINUS: PotionResult = { type: 'potion', color: 'G', sign: '-' };
const NEUTRAL: PotionResult = { type: 'neutral' };

// ─── Rule card ────────────────────────────────────────────────────────────────

const ACCENTS: Record<string, string> = {
  indigo:  'bg-indigo-50  border-indigo-200  text-indigo-900',
  blue:    'bg-blue-50    border-blue-200    text-blue-900',
  emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  amber:   'bg-amber-50   border-amber-200   text-amber-900',
  slate:   'bg-slate-50   border-slate-200   text-slate-900',
  rose:    'bg-rose-50    border-rose-200    text-rose-900',
  violet:  'bg-violet-50  border-violet-200  text-violet-900',
  sky:     'bg-sky-50     border-sky-200     text-sky-900',
  green:   'bg-green-50   border-green-200   text-green-900',
};

export function RuleCard({ icon, title, accent, visual, text }: {
  icon: string;
  title: string;
  accent: string;
  visual: ReactNode;
  text: string;
}) {
  return (
    <div className={`rounded-lg border p-3 space-y-2 ${ACCENTS[accent] ?? ''}`}>
      <p className="text-[11px] font-bold uppercase tracking-wide flex items-center gap-1.5">
        <span>{icon}</span><span>{title}</span>
      </p>
      <div className="flex items-center gap-1.5 flex-wrap min-h-[32px]">
        {visual}
      </div>
      <p className="text-[11px] leading-relaxed">{text}</p>
    </div>
  );
}

// ─── Base rule cards ──────────────────────────────────────────────────────────

export function BaseRulesCards() {
  return (
    <>
      <RuleCard
        icon="🧪" title="Alchemicals" accent="indigo"
        visual={
          <>
            {([1, 3, 7, 8] as AlchemicalId[]).map(id =>
              <AlchemicalImage key={id} id={id} width={26} />
            )}
            <span className="text-[10px] text-indigo-400">… 8 total</span>
          </>
        }
        text="There are 8 unique alchemicals, each with Red, Green, and Blue aspects — every aspect has a sign (+/−) and a size (Large/Small). Your goal is to deduce which alchemical is assigned to each of the 8 ingredients."
      />

      <RuleCard
        icon="⚗️" title="Mixing Rule" accent="blue"
        visual={
          <>
            <IngredientIcon index={0} width={24} />
            <span className="text-blue-400 text-sm">+</span>
            <IngredientIcon index={1} width={24} />
            <span className="text-blue-400 text-sm">→</span>
            <PotionImage result={R_PLUS} width={28} />
            <span className="text-blue-200 mx-1">|</span>
            <PotionImage result={NEUTRAL} width={28} />
          </>
        }
        text="Two ingredients mix to produce a potion when exactly one color has opposite signs and different sizes — the result color and sign come from the Large alchemical's aspect. If all three colors cancel out (every sign opposite), the result is Neutral."
      />

      <RuleCard
        icon="🔮" title="Aspect Clue" accent="emerald"
        visual={
          <>
            <IngredientIcon index={2} width={24} />
            <span className="text-emerald-400 text-[10px]">has</span>
            <SignedElemImage color="R" sign="+" width={28} />
            <span className="text-emerald-200 mx-1">·</span>
            <IngredientIcon index={3} width={24} />
            <span className="text-emerald-400 text-[10px]">has</span>
            <SignedElemImage color="G" sign="-" width={28} />
          </>
        }
        text="An aspect clue directly reveals the true sign (+/−) of one specific color for a given ingredient. Eliminate any alchemical assignment that has the wrong sign for that color."
      />

      <RuleCard
        icon="💰" title="Selling" accent="amber"
        visual={
          <div className="flex items-end gap-2.5">
            {(['total_match', 'sign_ok', 'neutral', 'opposite'] as const).map(r => (
              <div key={r} className="flex flex-col items-center gap-0.5">
                <SellResultIcon result={r} width={26} />
                <span className="text-[8px] font-semibold text-center leading-tight text-amber-600" style={{ maxWidth: 34 }}>
                  {r === 'total_match' ? 'Match' : r === 'sign_ok' ? 'Sign OK' : r === 'neutral' ? 'Neutral' : 'Opposite'}
                </span>
              </div>
            ))}
          </div>
        }
        text="Selling reveals how the true mixing result compares to your claimed color+sign: Total Match, Sign OK, Neutral, or Opposite. Each outcome eliminates alchemical assignments that would give a different result."
      />

      <RuleCard
        icon="⚖️" title="Neutral" accent="slate"
        visual={
          <>
            <IngredientIcon index={4} width={24} />
            <span className="text-slate-400 text-sm">+</span>
            <IngredientIcon index={5} width={24} />
            <span className="text-slate-400 text-sm">→</span>
            <PotionImage result={NEUTRAL} width={28} />
          </>
        }
        text="When two alchemicals are perfect opposites (all three colors have opposite signs), they produce Neutral — no potion. Neutral pairs are exact complements: knowing one alchemical fully determines the other."
      />

      <RuleCard
        icon="👥" title="Among / Group Clues" accent="green"
        visual={
          <>
            <span className="text-[10px] text-green-500 font-semibold">{`{`}</span>
            {([0, 1, 2, 3] as const).map(i => <IngredientIcon key={i} index={i} width={22} />)}
            <span className="text-[10px] text-green-500 font-semibold">{`}`}</span>
            <span className="text-green-400 text-sm">→</span>
            <span className="text-[11px] font-bold text-green-700">2×</span>
            <PotionImage result={R_PLUS} width={26} />
          </>
        }
        text="An Among clue describes mixing or selling outcomes within a group of ingredients. It reveals either an exact count of pairs that produce a given result, or that at least one such pair exists — without naming the specific pair."
      />

      <RuleCard
        icon="📋" title="Debunking — Apprentice" accent="rose"
        visual={
          <>
            <IngredientIcon index={6} width={24} />
            <ElemImage color="R" size="S" width={20} />
            <span className="text-rose-400 text-[10px]">→ true:</span>
            <SignedElemImage color="R" sign="+" width={28} />
          </>
        }
        text="An apprentice debunker reveals the true sign of one color aspect for one ingredient — always correct and publicly visible. If the publication's claimed sign contradicts the truth, that publication is removed."
      />

      <RuleCard
        icon="🔬" title="Debunking — Master" accent="rose"
        visual={
          <>
            <IngredientIcon index={0} width={24} />
            <span className="text-rose-400 text-sm">+</span>
            <IngredientIcon index={7} width={24} />
            <span className="text-rose-400 text-sm">→</span>
            <PotionImage result={G_MINUS} width={28} />
            <span className="text-[10px] text-rose-300 italic ml-0.5">(true)</span>
          </>
        }
        text="A master debunker publicly mixes two ingredients, revealing the true mixing result to everyone. Any publication whose implied mix result contradicts the observed result is removed."
      />
    </>
  );
}

// ─── Full details block ───────────────────────────────────────────────────────

export function RulesQuickReference() {
  return (
    <details className="group border border-gray-200 rounded-xl bg-white overflow-hidden">
      <summary className="flex items-center justify-between px-4 py-3 cursor-pointer
        text-sm font-semibold text-gray-700 hover:bg-gray-50 select-none list-none">
        <span>📖 Rules Quick Reference</span>
        <span className="text-gray-400 group-open:rotate-180 transition-transform">▾</span>
      </summary>
      <div className="px-4 pb-4 pt-3 border-t border-gray-100">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <BaseRulesCards />
        </div>
      </div>
    </details>
  );
}
