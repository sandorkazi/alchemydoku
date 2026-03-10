/**
 * Shared, context-free answer picker widgets used by both AnswerPanel and
 * ExpandedAnswerPanel.  All state is passed in via props — no hooks.
 */

import { ALCHEMICALS } from '../data/alchemicals';
import { PotionImage, AlchemicalImage, ElemImage } from './GameSprites';
import type { PotionResult, AlchemicalId, Color } from '../types';

// ─── Shared helpers ───────────────────────────────────────────────────────────

export const LOGICAL_POTIONS: PotionResult[] = [
  { type: 'potion', color: 'R', sign: '+' }, { type: 'potion', color: 'R', sign: '-' },
  { type: 'potion', color: 'G', sign: '+' }, { type: 'potion', color: 'G', sign: '-' },
  { type: 'potion', color: 'B', sign: '+' }, { type: 'potion', color: 'B', sign: '-' },
  { type: 'neutral' },
];

export function potionKey(p: PotionResult): string {
  return p.type === 'neutral' ? 'neutral' : `${p.color}${p.sign}`;
}

const activeCls = 'border-indigo-500 bg-indigo-50 shadow-md scale-105';
const idleCls   = 'border-transparent bg-gray-100 hover:bg-gray-200 hover:border-gray-300';
const btnBase   = 'flex items-center justify-center p-1.5 rounded-xl border-2 transition-all press-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400';

// ─── Pickers ──────────────────────────────────────────────────────────────────

export function PotionPicker({ choices = LOGICAL_POTIONS, selected, onSelect, potionWidth = 40 }: {
  choices?: PotionResult[];
  selected: PotionResult | null;
  onSelect: (p: PotionResult) => void;
  potionWidth?: number;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup">
      {choices.map(p => {
        const key = potionKey(p);
        const active = selected ? potionKey(selected) === key : false;
        return (
          <button key={key} role="radio" aria-checked={active} aria-label={key}
            onClick={() => onSelect(p)}
            className={`${btnBase} ${active ? activeCls : idleCls}`}
          ><PotionImage result={p} width={potionWidth} /></button>
        );
      })}
    </div>
  );
}

export function AlchemicalPicker({ selected, onSelect, alchWidth = 44 }: {
  selected: AlchemicalId | null;
  onSelect: (id: AlchemicalId) => void;
  alchWidth?: number;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup">
      {([1,2,3,4,5,6,7,8] as AlchemicalId[]).map(id => {
        const active = selected === id;
        return (
          <button key={id} role="radio" aria-checked={active} aria-label={ALCHEMICALS[id].code}
            onClick={() => onSelect(id)}
            className={`${btnBase} ${active ? activeCls : idleCls}`}
          ><AlchemicalImage id={id} width={alchWidth} /></button>
        );
      })}
    </div>
  );
}

export function AspectPicker({ selected, onSelect }: {
  selected: '+' | '-' | null;
  onSelect: (s: '+' | '-') => void;
}) {
  return (
    <div className="flex gap-3" role="radiogroup">
      {(['+', '-'] as const).map(s => (
        <button key={s} role="radio" aria-checked={selected === s}
          aria-label={s === '+' ? 'Positive' : 'Negative'} onClick={() => onSelect(s)}
          className={`flex items-center justify-center w-20 h-16 rounded-xl border-2 text-3xl font-bold
            transition-all press-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
            ${selected === s ? activeCls : idleCls}`}
        >{s === '+' ? '＋' : '－'}</button>
      ))}
    </div>
  );
}

export function HedgeColorPicker({ displayColors, selected, onSelect }: {
  displayColors: { color: Color; label: string }[];
  selected: Color | null;
  onSelect: (c: Color) => void;
}) {
  return (
    <div className="flex gap-2" role="radiogroup">
      {displayColors.map(({ color, label }) => (
        <button key={color} role="radio" aria-checked={selected === color} aria-label={label}
          onClick={() => onSelect(color)}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all press-sm
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
            ${selected === color ? activeCls : idleCls}`}
        >
          <ElemImage color={color} size="L" width={36} />
          <span className="text-[10px] font-semibold text-gray-500">{label}</span>
        </button>
      ))}
    </div>
  );
}

export function PossiblePotionsPicker({ displayChoices, selected, onToggle }: {
  displayChoices: PotionResult[];
  selected: Set<string>;
  onToggle: (key: string) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] text-gray-400 italic">Select all that apply</p>
      <div className="flex flex-wrap gap-1.5" role="group">
        {displayChoices.map(p => {
          const key = potionKey(p);
          const active = selected.has(key);
          return (
            <button key={key} aria-pressed={active} aria-label={key} onClick={() => onToggle(key)}
              className={`flex flex-col items-center gap-0.5 px-2 pt-1.5 pb-1 rounded-xl border-2 transition-all
                press-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
                ${active ? activeCls : idleCls}`}
            >
              <PotionImage result={p} width={40} />
              <span className={`text-[9px] font-bold leading-none h-2.5 ${active ? 'text-indigo-600' : 'text-transparent'}`}>✓</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
