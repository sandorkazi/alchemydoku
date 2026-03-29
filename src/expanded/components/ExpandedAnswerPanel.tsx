/**
 * expanded/components/ExpandedAnswerPanel.tsx
 *
 * Answer panel for expanded-mode puzzles.
 * Handles all base question types plus expanded types:
 *   encyclopedia_fourth:       pick the missing ingredient (sign is given)
 *   encyclopedia_which_aspect: pick a Color
 *   solar_lunar:               pick Solar or Lunar
 */

import { useState } from 'react';
import { PotionImage, AlchemicalImage, ElemImage, CorrectIcon, IncorrectIcon, IngredientIcon, SignedElemImage } from '../../components/GameSprites';
import { PotionPicker, AlchemicalPicker, AspectPicker, PossiblePotionsPicker, LOGICAL_POTIONS, potionKey } from '../../components/AnswerPickers';
import { useExpandedSolver, useExpandedIngredient, computeAllExpandedAnswers } from '../contexts/ExpandedSolverContext';
import type { PotionResult, AlchemicalId, Color, Size, IngredientId } from '../../types';
import type {
  AnyQuestion, AnyAnswer,
  AspectColorAnswer, SolarLunarAnswer, IngredientSetAnswer,
  GolemConfigAnswer, AlchemicalSetAnswer,
} from '../types';
import { ExpandedDebunkAnswerPanel } from './ExpandedDebunkAnswerPanel';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Ing({ slotId, size = 28 }: { slotId: number; size?: number }) {
  const getIngredient = useExpandedIngredient();
  const { index } = getIngredient(slotId);
  return <span className="inline-flex shrink-0"><IngredientIcon index={index} width={size} /></span>;
}

// ─── Question header ──────────────────────────────────────────────────────────

function QuestionHeader({ q }: { q: AnyQuestion }) {
  // Base types
  if (q.kind === 'mixing-result') return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <Ing slotId={q.ingredient1} /><span className="text-indigo-400 font-bold">+</span><Ing slotId={q.ingredient2} />
      <span className="text-indigo-300 mx-0.5">→</span><span className="text-xs font-semibold text-indigo-500">what potion?</span>
    </span>
  );
  if (q.kind === 'alchemical') return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <span className="text-xs font-semibold text-indigo-500">alchemical of</span><Ing slotId={q.ingredient} /><span className="text-indigo-400">?</span>
    </span>
  );
  if (q.kind === 'aspect') return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <ElemImage color={q.color} size="S" width={18} />
      <span className="text-xs font-semibold text-indigo-500">aspect of</span><Ing slotId={q.ingredient} /><span className="text-indigo-400">?</span>
    </span>
  );
  if (q.kind === 'safe-publish') return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <span className="text-xs font-semibold text-indigo-500">publishing</span><Ing slotId={q.ingredient} />
      <span className="text-xs font-semibold text-indigo-500">— which aspect to hedge?</span>
    </span>
  );
  if (q.kind === 'possible-potions') return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <Ing slotId={q.ingredient1} /><span className="text-indigo-400 font-bold">+</span><Ing slotId={q.ingredient2} />
      <span className="text-indigo-300 mx-0.5">→</span><span className="text-xs font-semibold text-indigo-500">all potions that could still be possible?</span>
    </span>
  );
  if (q.kind === 'aspect-set') return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <span className="text-xs font-semibold text-indigo-500">which ingredients have</span>
      <SignedElemImage color={q.color} sign={q.sign} width={24} />
      <span className="text-indigo-400">?</span>
    </span>
  );
  if (q.kind === 'large-component') return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <span className="text-xs font-semibold text-indigo-500">which have Large</span>
      <ElemImage color={q.color} size="L" width={24} />
      <span className="text-indigo-500 text-xs font-semibold">component?</span>
    </span>
  );
  if (q.kind === 'neutral-partner') return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <Ing slotId={q.ingredient} /><span className="text-indigo-300 mx-0.5">→</span>
      <span className="text-xs font-semibold text-indigo-500">direct opposite (neutral mix)?</span>
    </span>
  );
  if (q.kind === 'ingredient-potion-profile') return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <Ing slotId={q.ingredient} /><span className="text-indigo-300 mx-0.5">→</span>
      <span className="text-xs font-semibold text-indigo-500">all certainly producible potions?</span>
    </span>
  );
  if (q.kind === 'group-possible-potions') return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      {q.ingredients.map((id: IngredientId, i: number) => (
        <span key={id} className="inline-flex items-center gap-1">
          {i > 0 && <span className="text-indigo-400 font-bold">+</span>}
          <Ing slotId={id} />
        </span>
      ))}
      <span className="text-indigo-300 mx-0.5">→</span>
      <span className="text-xs font-semibold text-indigo-500">achievable potions?</span>
    </span>
  );
  if (q.kind === 'most-informative-mix') return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <span className="text-xs font-semibold text-indigo-500">best partner to mix with</span>
      <Ing slotId={q.ingredient} /><span className="text-indigo-400">?</span>
      <span className="text-xs text-indigo-300">(most info revealed)</span>
    </span>
  );
  if (q.kind === 'guaranteed-non-producer') return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <span className="text-xs font-semibold text-indigo-500">which ingredients can never produce</span>
      <PotionImage result={q.potion} width={28} /><span className="text-indigo-400">?</span>
    </span>
  );
  if (q.kind === 'most_informative_book') return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <span className="text-xs font-semibold text-indigo-500">which ingredient to consult</span>
      <span className="text-base">☽☀</span>
      <span className="text-xs font-semibold text-indigo-500">the book about for most information?</span>
    </span>
  );

  // Expanded types
  if (q.kind === 'encyclopedia_fourth') {
    return (
      <span className="inline-flex items-center gap-1.5 flex-wrap text-xs">
        <span className="font-semibold text-emerald-600">📜 {{ R: 'Red', G: 'Green', B: 'Blue' }[q.aspect as Color]} article:</span>
        {q.known.map((e, i) => (
          <span key={i} className="inline-flex items-center gap-0.5">
            <Ing slotId={e.ingredient} size={20} />
            <SignedElemImage color={q.aspect as Color} sign={e.sign as '+' | '-'} width={16} />
          </span>
        ))}
        <span className="text-gray-500">— name the 4th entry</span>
      </span>
    );
  }
  if (q.kind === 'encyclopedia_which_aspect') {
    return (
      <span className="inline-flex items-center gap-1.5 flex-wrap text-xs">
        <span className="font-semibold text-emerald-600">📜 These 4 entries form an article. Which aspect?</span>
        {q.entries.map((e, i) => (
          <span key={i} className="inline-flex items-center gap-0.5">
            <Ing slotId={e.ingredient} />
            <span className={`inline-flex items-center justify-center w-4 h-4 rounded font-black text-xs leading-none
              ${e.sign==='+'?'bg-green-100 text-green-700 border border-green-300':'bg-red-100 text-red-700 border border-red-300'}`}>
              {e.sign === '+' ? '＋' : '－'}
            </span>
          </span>
        ))}
      </span>
    );
  }
  if (q.kind === 'golem_group') {
    const labels: Record<string, string> = {
      animators: 'animate the golem', chest_only: 'trigger only the chest',
      ears_only: 'trigger only the ears', non_reactive: 'trigger no reaction',
      any_reactive: 'trigger any reaction',
    };
    return (
      <span className="text-xs font-semibold text-violet-600">
        🧿 Which ingredients {labels[q.group]}?
      </span>
    );
  }
  if (q.kind === 'golem_animate_potion') return (
    <span className="text-xs font-semibold text-violet-600">
      🧿 What potion do the two golem animators produce?
    </span>
  );
  if (q.kind === 'golem_mix_potion') {
    const grpLabel: Record<string, string> = {
      animators: 'animators', chest_only: 'chest-only reactors',
      ears_only: 'ears-only reactors', non_reactive: 'non-reactive',
      any_reactive: 'reactive ingredients',
    };
    return (
      <span className="inline-flex items-center gap-1.5 flex-wrap text-xs font-semibold text-violet-600">
        🧿 Which ingredients can produce <PotionImage result={q.target} width={24} /> with the {grpLabel[q.with_group]}?
      </span>
    );
  }
  if (q.kind === 'golem_possible_potions') {
    const grpLabel: Record<string, string> = {
      animators: 'animators', chest_only: 'chest-only reactors',
      ears_only: 'ears-only reactors', non_reactive: 'non-reactive ingredients',
      any_reactive: 'reactive ingredients',
    };
    return (
      <span className="text-xs font-semibold text-violet-600">
        🧿 What potions can the {grpLabel[q.group]} produce{q.partner ? ' with a fixed partner' : ' among themselves'}?
      </span>
    );
  }
  if (q.kind === 'solar_lunar') return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <span className="text-xs font-semibold text-violet-600">Is</span>
      <Ing slotId={q.ingredient} />
      <span className="text-xs font-semibold"><span className="text-orange-400">☀ Solar</span> or <span className="text-slate-400">☽ Lunar</span>?</span>
    </span>
  );
  if (q.kind === 'golem_reaction_component') return (
    <span className="text-xs font-semibold text-violet-600">
      🧿 What is the golem configuration? (chest + ears: color &amp; size)
    </span>
  );
  if (q.kind === 'golem_reaction_both_alch') return (
    <span className="text-xs font-semibold text-violet-600">
      🧿 Which 2 alchemicals react to BOTH golem parts?
    </span>
  );
  if (q.kind === 'golem_reaction_both_ing') return (
    <span className="text-xs font-semibold text-violet-600">
      🧿 Which 2 ingredients react to BOTH golem parts?
    </span>
  );
  if (q.kind === 'golem_animation_alch') return (
    <span className="text-xs font-semibold text-violet-600">
      🧿 Which 2 alchemicals animate the golem?
    </span>
  );
  if (q.kind === 'golem_animation_ing') return (
    <span className="text-xs font-semibold text-violet-600">
      🧿 Which 2 ingredients animate the golem?
    </span>
  );

  return null;
}

// ─── Revealed answer ──────────────────────────────────────────────────────────

function RevealedAnswer({ q, answer }: { q: AnyQuestion; answer: AnyAnswer }) {

  // New base question types — ingredient answers
  if (q.kind === 'neutral-partner' || q.kind === 'most-informative-mix' || q.kind === 'most_informative_book') {
    return <Ing slotId={answer as number} size={36} />;
  }
  // New base question types — potion-set answers
  if (q.kind === 'ingredient-potion-profile' || q.kind === 'group-possible-potions') {
    const pots = (answer as { potions: string[] }).potions.map(k =>
      k === 'neutral' ? { type:'neutral' } as PotionResult
      : { type:'potion', color: k[0] as Color, sign: k[1] as '+' | '-' } as PotionResult
    );
    return <span className="inline-flex flex-wrap gap-1.5">{pots.map(p => <PotionImage key={potionKey(p)} result={p} width={36} />)}</span>;
  }

  if (typeof answer === 'object' && answer !== null && 'kind' in answer) {
    const a = answer as { kind: string };

    if (a.kind === 'aspect_color') {
      const color = (answer as AspectColorAnswer).color;
      return <ElemImage color={color} size="L" width={36} />;
    }
    if (a.kind === 'solar_lunar_answer') {
      const r = (answer as SolarLunarAnswer).result;
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold
          ${r==='solar'?'bg-amber-100 text-amber-700':'bg-slate-100 text-slate-600'}`}>
          {r==='solar'?<><span className="text-orange-400">☀</span> Solar</>:<><span className="text-slate-400">☽</span> Lunar</>}
        </span>
      );
    }
    if (a.kind === 'hedge-color') {
      const dc = (answer as { kind: string; color: Color }).color;
      return <span className="inline-flex items-center gap-1.5"><ElemImage color={dc} size="L" width={36} /></span>;
    }
    if (a.kind === 'golem_config') {
      const gc = answer as GolemConfigAnswer;
      const sizeLabel: Record<Size, string> = { L: 'Large', S: 'Small' };
      return (
        <span className="inline-flex flex-col gap-0.5 text-xs font-semibold text-violet-700">
          <span className="inline-flex items-center gap-1">
            <span className="text-violet-500">Ears:</span>
            <ElemImage color={gc.ears.color} size={gc.ears.size} width={20} />
            <span>{sizeLabel[gc.ears.size]}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="text-violet-500">Chest:</span>
            <ElemImage color={gc.chest.color} size={gc.chest.size} width={20} />
            <span>{sizeLabel[gc.chest.size]}</span>
          </span>
        </span>
      );
    }
    if (a.kind === 'alchemical_set') {
      const ids = (answer as AlchemicalSetAnswer).alchemicals;
      return <span className="inline-flex gap-2">{ids.map(id => <AlchemicalImage key={id} id={id as AlchemicalId} width={36} />)}</span>;
    }
    if (a.kind === 'possible-potions') {
      const pots = (answer as { potions: string[] }).potions.map(k =>
        k === 'neutral' ? { type:'neutral' } as PotionResult
        : { type:'potion', color: k[0] as Color, sign: k[1] as '+' | '-' } as PotionResult
      );
      return <span className="inline-flex flex-wrap gap-1.5">{pots.map(p => <PotionImage key={potionKey(p)} result={p} width={36} />)}</span>;
    }
    if ('ingredients' in answer) {
      const ids = (answer as { ingredients: number[] }).ingredients;
      return <span className="inline-flex flex-wrap gap-1.5">{ids.map(id => <Ing key={id} slotId={id} size={32} />)}{ids.length===0&&<span className="text-xs text-gray-400 italic">None</span>}</span>;
    }
  }
  if (typeof answer === 'object' && answer !== null && 'kind' in answer && (answer as {kind:string}).kind === 'ingredient_set') {
    const ids = (answer as unknown as IngredientSetAnswer).ingredients;
    return <span className="inline-flex flex-wrap gap-1.5">{ids.map(id => <Ing key={id} slotId={id} size={32} />)}{ids.length===0&&<span className="text-xs text-gray-400 italic">None</span>}</span>;
  }
  if (q.kind === 'encyclopedia_fourth') return <Ing slotId={answer as number} size={36} />;
  if (typeof answer === 'number') return <AlchemicalImage id={answer as AlchemicalId} width={40} />;
  if (typeof answer === 'object' && 'type' in (answer as object)) return <PotionImage result={answer as PotionResult} width={36} />;
  if (typeof answer === 'object' && 'sign' in (answer as object)) {
    const s = (answer as { sign: '+' | '-' }).sign;
    if (q.kind === 'aspect') return <SignedElemImage color={q.color} sign={s} width={40} />;
    return <span className="font-bold text-2xl text-amber-700">{s==='+'?'＋':'－'}</span>;
  }
  return null;
}

// ─── Pickers ──────────────────────────────────────────────────────────────────



function IngredientSetPicker({ selected, onToggle }: { selected: Set<number>; onToggle: (id: number) => void }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] text-gray-400 italic">Select all that apply</p>
      <div className="flex flex-wrap gap-1.5" role="group">
        {[1,2,3,4,5,6,7,8].map(slotId => {
          const active = selected.has(slotId);
          return (
            <button key={slotId} aria-pressed={active} onClick={() => onToggle(slotId)}
              className={`flex flex-col items-center gap-0.5 px-2 pt-1.5 pb-1 rounded-xl border-2 transition-all
                ${active?'border-indigo-500 bg-indigo-50 shadow-md scale-105':'border-transparent bg-gray-100 hover:bg-gray-200'}`}>
              <Ing slotId={slotId} size={36} />
              <span className={`text-[9px] font-bold h-2.5 ${active?'text-indigo-600':'text-transparent'}`}>✓</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Pick one ingredient — for encyclopedia_fourth (sign is given by question) */
function IngredientPicker({
  selected, onSelect, excludeIds = [],
}: {
  selected: number | null;
  onSelect: (id: IngredientId) => void;
  excludeIds?: number[];
}) {
  const excluded = new Set(excludeIds);
  const candidates = [1,2,3,4,5,6,7,8].filter(id => !excluded.has(id)) as IngredientId[];

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-gray-400 italic">Choose the 4th ingredient</p>
      <div className="flex flex-wrap gap-2">
        {candidates.map(slotId => {
          const active = selected === slotId;
          return (
            <button key={slotId}
              aria-pressed={active}
              onClick={() => onSelect(slotId)}
              className={`flex flex-col items-center gap-0.5 px-2 pt-1.5 pb-1 rounded-xl border-2 transition-all
                ${active ? 'border-indigo-500 bg-indigo-50 shadow-md scale-105' : 'border-transparent bg-gray-100 hover:bg-gray-200'}`}>
              <Ing slotId={slotId} size={32} />
              <span className={`text-[9px] font-bold h-2.5 ${active ? 'text-indigo-600' : 'text-transparent'}`}>✓</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Pick which Color aspect — for encyclopedia_which_aspect */
function AspectColorPicker({ selected, onSelect }: {
  selected: Color | null;
  onSelect: (c: Color) => void;
}) {
  const label: Record<Color, string> = { R: 'Red', G: 'Green', B: 'Blue' };
  return (
    <div className="flex gap-3" role="radiogroup">
      {(['R','G','B'] as Color[]).map(c => {
        const active = selected === c;
        return (
          <button key={c} role="radio" aria-checked={active} aria-label={label[c]} onClick={() => onSelect(c)}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border-2 transition-all
              ${active?'border-indigo-500 bg-indigo-50 shadow-md scale-105':'border-transparent bg-gray-100 hover:bg-gray-200'}`}>
            <ElemImage color={c} size="L" width={36} />
            <span className="text-xs font-semibold">{label[c]}</span>
          </button>
        );
      })}
    </div>
  );
}

function SolarLunarPicker({ selected, onSelect }: {
  selected: 'solar' | 'lunar' | null;
  onSelect: (v: 'solar' | 'lunar') => void;
}) {
  return (
    <div className="flex gap-3" role="radiogroup">
      {(['solar','lunar'] as const).map(val => (
        <button key={val} role="radio" aria-checked={selected===val} onClick={() => onSelect(val)}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl border-2 transition-all
            ${selected===val?(val==='solar'?'border-amber-500 bg-amber-50':'border-slate-400 bg-slate-50'):'border-transparent bg-gray-100 hover:bg-gray-200'}`}>
          <span className={`text-2xl leading-none font-bold ${val==='solar'?'text-orange-400':'text-slate-400'}`}>{val==='solar'?'☀':'☽'}</span>
          <span className={`text-xs font-semibold ${val==='solar'?'text-amber-600':'text-slate-500'}`}>{val==='solar'?'Solar':'Lunar'}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Golem config picker ──────────────────────────────────────────────────────

/** Tracks each part's selection independently so selecting one part doesn't
 *  auto-populate the other. Only emits a full answer when both are chosen and
 *  their colors differ. */
function GolemConfigPicker({ value, onChange }: {
  value: GolemConfigAnswer | null;
  onChange: (a: GolemConfigAnswer | null) => void;
}) {
  const [partial, setPartial] = useState<{
    ears?: { color: Color; size: Size };
    chest?: { color: Color; size: Size };
  }>(() =>
    value?.kind === 'golem_config'
      ? { ears: value.ears, chest: value.chest }
      : {}
  );

  const select = (part: 'ears' | 'chest', col: Color, sz: Size) => {
    const newPartial = { ...partial, [part]: { color: col, size: sz } };
    setPartial(newPartial);
    if (newPartial.ears && newPartial.chest && newPartial.ears.color !== newPartial.chest.color) {
      onChange({ kind: 'golem_config', chest: newPartial.chest, ears: newPartial.ears });
    } else {
      onChange(null);
    }
  };

  const isSelected = (part: 'ears' | 'chest', col: Color, sz: Size) => {
    const p = partial[part];
    return p?.color === col && p?.size === sz;
  };

  return (
    <div className="space-y-2">
      {(['ears', 'chest'] as const).map(part => (
        <div key={part} className="space-y-1">
          <p className="text-[10px] font-semibold text-violet-600 uppercase">{part}</p>
          <div className="flex flex-wrap gap-1">
            {(['R','G','B'] as Color[]).map(col => (['L','S'] as Size[]).map(sz => {
              const active = isSelected(part, col, sz);
              return (
                <button key={`${col}${sz}`} aria-pressed={active}
                  onClick={() => select(part, col, sz)}
                  className={`flex items-center gap-0.5 px-2 py-1 rounded-lg border-2 text-xs font-semibold transition-all
                    press-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
                    ${active ? 'border-indigo-500 bg-indigo-50 shadow-md' : 'border-transparent bg-gray-100 hover:bg-gray-200 hover:border-gray-300'}`}>
                  <ElemImage color={col} size={sz} width={18} />
                  <span>{sz === 'L' ? 'L' : 'S'}</span>
                </button>
              );
            }))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Single question row ──────────────────────────────────────────────────────

function QuestionRow({ q, index, total, value, onChange, correctAnswer, showSolution }: {
  q: AnyQuestion; index: number; total: number;
  value: AnyAnswer | null; onChange: (a: AnyAnswer | null) => void;
  correctAnswer: AnyAnswer | null; showSolution: boolean;
}) {
  const revealed = showSolution && correctAnswer !== null;

  return (
    <div className={`space-y-2 ${total>1?'border-t border-indigo-100 first:border-t-0 pt-3 first:pt-0':''}`}>
      <div className="flex items-center gap-2 flex-wrap">
        {total>1 && <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 shrink-0 w-4">{index+1}.</span>}
        <QuestionHeader q={q} />
        {revealed && correctAnswer && (
          <><span className="text-indigo-300 font-bold">→</span><RevealedAnswer q={q} answer={correctAnswer} /></>
        )}
      </div>

      {!revealed && (
        <>
          {/* Base pickers */}
          {q.kind==='mixing-result' && <PotionPicker selected={value as PotionResult|null} onSelect={p => onChange(p)} />}
          {q.kind==='alchemical' && <AlchemicalPicker selected={value as AlchemicalId|null} onSelect={id => onChange(id)} />}
          {q.kind==='aspect' && (
            <AspectPicker
              color={q.color}
              selected={(value as {sign?:string}|null)?.sign as '+'|'-'|null ?? null}
              onSelect={s => onChange({ sign: s })}
            />
          )}
          {q.kind==='safe-publish' && (
            <div className="flex gap-2" role="radiogroup">
              {(['R','G','B'] as Color[]).map(c => {
                const active = (value as {color?:Color}|null)?.color===c;
                return (
                  <button key={c} role="radio" aria-checked={active} onClick={() => onChange({ kind:'hedge-color' as const, color:c })}
                    className={`flex items-center justify-center p-2 rounded-xl border-2 transition-all
                      ${active?'border-indigo-500 bg-indigo-50 shadow-md scale-105':'border-transparent bg-gray-100 hover:bg-gray-200'}`}>
                    <ElemImage color={c} size="L" width={36} />
                  </button>
                );
              })}
            </div>
          )}
          {q.kind==='possible-potions' && (() => {
            const cur = new Set<string>((value as {potions?:string[]}|null)?.potions ?? []);
            return <PossiblePotionsPicker displayChoices={LOGICAL_POTIONS} selected={cur}
              onToggle={key => {
                const next = new Set(cur);
                if (next.has(key)) next.delete(key); else next.add(key);
                onChange(next.size===0 ? null : { kind:'possible-potions' as const, potions:[...next].sort() });
              }} />;
          })()}
          {(q.kind==='aspect-set'||q.kind==='large-component') && (() => {
            const cur = new Set<number>((value as {ingredients?:number[]}|null)?.ingredients ?? []);
            const toggle = (id: number) => {
              const next = new Set(cur);
              if (next.has(id)) next.delete(id); else next.add(id);
              const sorted = [...next].sort((a,b)=>a-b);
              onChange(sorted.length===0 ? null : { kind:q.kind as 'aspect-set'|'large-component', ingredients:sorted as IngredientId[] });
            };
            return <IngredientSetPicker selected={cur} onToggle={toggle} />;
          })()}
          {/* New base question type pickers */}
          {(q.kind==='neutral-partner'||q.kind==='most-informative-mix') && (() => {
            const cur = typeof value === 'number' ? value as IngredientId : null;
            return (
              <div className="flex flex-wrap gap-1.5" role="radiogroup">
                {([1,2,3,4,5,6,7,8] as IngredientId[]).map(slotId => {
                  if (slotId === q.ingredient) return null;
                  const active = cur === slotId;
                  return (
                    <button key={slotId} role="radio" aria-checked={active} onClick={() => onChange(slotId as unknown as AnyAnswer)}
                      className={`flex flex-col items-center gap-0.5 px-2 pt-1.5 pb-1 rounded-xl border-2 transition-all
                        press-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
                        ${active?'border-indigo-500 bg-indigo-50 shadow-md scale-105':'border-transparent bg-gray-100 hover:bg-gray-200 hover:border-gray-300'}`}>
                      <Ing slotId={slotId} size={36} />
                      <span className={`text-[9px] font-bold h-2.5 ${active?'text-indigo-600':'text-transparent'}`}>✓</span>
                    </button>
                  );
                })}
              </div>
            );
          })()}
          {q.kind==='most_informative_book' && (() => {
            const cur = typeof value === 'number' ? value as IngredientId : null;
            return (
              <div className="flex flex-wrap gap-1.5" role="radiogroup">
                {([1,2,3,4,5,6,7,8] as IngredientId[]).map(slotId => {
                  const active = cur === slotId;
                  return (
                    <button key={slotId} role="radio" aria-checked={active}
                      onClick={() => onChange(slotId as unknown as AnyAnswer)}
                      className={`flex flex-col items-center gap-0.5 px-2 pt-1.5 pb-1 rounded-xl border-2 transition-all
                        press-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
                        ${active ? 'border-indigo-500 bg-indigo-50 shadow-md scale-105'
                                 : 'border-transparent bg-gray-100 hover:bg-gray-200 hover:border-gray-300'}`}>
                      <Ing slotId={slotId} size={36} />
                      <span className={`text-[9px] font-bold h-2.5 ${active ? 'text-indigo-600' : 'text-transparent'}`}>✓</span>
                    </button>
                  );
                })}
              </div>
            );
          })()}
          {(q.kind==='ingredient-potion-profile'||q.kind==='group-possible-potions') && (() => {
            const cur = new Set<string>((value as {potions?:string[]}|null)?.potions ?? []);
            return <PossiblePotionsPicker displayChoices={LOGICAL_POTIONS} selected={cur}
              onToggle={key => {
                const next = new Set(cur);
                if (next.has(key)) next.delete(key); else next.add(key);
                onChange(next.size===0 ? null : { kind:'possible-potions' as const, potions:[...next].sort() } as unknown as AnyAnswer);
              }} />;
          })()}
          {q.kind==='guaranteed-non-producer' && (() => {
            const cur = new Set<number>((value as {ingredients?:number[]}|null)?.ingredients ?? []);
            const toggle = (id: number) => {
              const next = new Set(cur);
              if (next.has(id)) next.delete(id); else next.add(id);
              const sorted = [...next].sort((a,b)=>a-b);
              onChange(sorted.length===0 ? null : { kind:'non-producer-set' as const, ingredients:sorted as IngredientId[] } as unknown as AnyAnswer);
            };
            return <IngredientSetPicker selected={cur} onToggle={toggle} />;
          })()}

          {/* Expanded pickers */}
          {q.kind==='encyclopedia_fourth' && (
            <IngredientPicker
              selected={typeof value === 'number' ? value as number : null}
              onSelect={id => onChange(id as unknown as AnyAnswer)}
              excludeIds={q.known.map(e => e.ingredient)}
            />
          )}
          {q.kind==='encyclopedia_which_aspect' && (
            <AspectColorPicker
              selected={(value as AspectColorAnswer|null)?.kind==='aspect_color' ? (value as AspectColorAnswer).color : null}
              onSelect={c => onChange({ kind:'aspect_color', color:c } satisfies AspectColorAnswer)}
            />
          )}
          {q.kind==='solar_lunar' && (
            <SolarLunarPicker
              selected={(value as SolarLunarAnswer|null)?.kind==='solar_lunar_answer' ? (value as SolarLunarAnswer).result : null}
              onSelect={v => onChange({ kind:'solar_lunar_answer', result:v } satisfies SolarLunarAnswer)}
            />
          )}
          {/* New golem joint-config pickers */}
          {(q.kind==='golem_reaction_both_ing' || q.kind==='golem_animation_ing') && (() => {
            const cur = new Set<number>((value as IngredientSetAnswer|null)?.ingredients ?? []);
            const toggle = (id: number) => {
              const next = new Set(cur);
              if (next.has(id)) next.delete(id); else next.add(id);
              const sorted = [...next].sort((a,b)=>a-b) as IngredientId[];
              onChange(sorted.length===0 ? null : { kind:'ingredient_set', ingredients:sorted } satisfies IngredientSetAnswer);
            };
            return (
              <div className="space-y-1">
                <p className="text-[10px] text-gray-400 italic">Select exactly 2 ingredients</p>
                <IngredientSetPicker selected={cur} onToggle={toggle} />
              </div>
            );
          })()}
          {(q.kind==='golem_reaction_both_alch' || q.kind==='golem_animation_alch') && (() => {
            const cur = new Set<number>((value as AlchemicalSetAnswer|null)?.alchemicals ?? []);
            return (
              <div className="space-y-1">
                <p className="text-[10px] text-gray-400 italic">Select exactly 2 alchemicals</p>
                <div className="flex flex-wrap gap-1.5" role="group">
                  {([1,2,3,4,5,6,7,8] as AlchemicalId[]).map(id => {
                    const active = cur.has(id);
                    return (
                      <button key={id} aria-pressed={active}
                        onClick={() => {
                          const next = new Set(cur);
                          if (next.has(id)) next.delete(id); else next.add(id);
                          const sorted = [...next].sort((a,b)=>a-b) as AlchemicalId[];
                          onChange(sorted.length===0 ? null : { kind:'alchemical_set', alchemicals:sorted } satisfies AlchemicalSetAnswer);
                        }}
                        className={`flex flex-col items-center gap-0.5 px-2 pt-1.5 pb-1 rounded-xl border-2 transition-all
                          press-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
                          ${active?'border-indigo-500 bg-indigo-50 shadow-md scale-105':'border-transparent bg-gray-100 hover:bg-gray-200 hover:border-gray-300'}`}>
                        <AlchemicalImage id={id} width={32} />
                        <span className={`text-[9px] font-bold h-2.5 ${active?'text-indigo-600':'text-transparent'}`}>✓</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}
          {q.kind==='golem_reaction_component' && (
            <GolemConfigPicker value={value as GolemConfigAnswer | null} onChange={onChange} />
          )}
          {/* Golem pickers — ingredient multi-select */}
          {(q.kind==='golem_group' || q.kind==='golem_mix_potion') && (() => {
            const cur = new Set<number>((value as IngredientSetAnswer|null)?.ingredients ?? []);
            const toggle = (id: number) => {
              const next = new Set(cur);
              if (next.has(id)) next.delete(id); else next.add(id);
              const sorted = [...next].sort((a,b)=>a-b) as IngredientId[];
              onChange(sorted.length===0 ? null : { kind:'ingredient_set', ingredients:sorted } satisfies IngredientSetAnswer);
            };
            return <IngredientSetPicker selected={cur} onToggle={toggle} />;
          })()}
          {/* Golem animate potion — single potion picker */}
          {q.kind==='golem_animate_potion' && (() => {
            const cur = value as PotionResult | null;
            const key = (p: PotionResult) => p.type==='neutral'?'neutral':`${p.color}${p.sign}`;
            return (
              <div className="flex flex-wrap gap-1.5">
                {LOGICAL_POTIONS.map(p => {
                  const k = key(p); const active = cur ? key(cur)===k : false;
                  return (
                    <button key={k} aria-pressed={active} onClick={() => onChange(active ? null : p)}
                      className={`flex flex-col items-center gap-0.5 px-2 pt-1.5 pb-1 rounded-xl border-2 transition-all
                        ${active?'border-indigo-500 bg-indigo-50 shadow-md scale-105':'border-transparent bg-gray-100 hover:bg-gray-200'}`}>
                      <PotionImage result={p} width={36} />
                      <span className={`text-[9px] font-bold h-2.5 ${active?'text-indigo-600':'text-transparent'}`}>✓</span>
                    </button>
                  );
                })}
              </div>
            );
          })()}
          {/* Golem possible potions — multi potion picker */}
          {q.kind==='golem_possible_potions' && (() => {
            const cur = new Set<string>((value as {kind:string;potions:string[]}|null)?.potions ?? []);
            return <PossiblePotionsPicker displayChoices={LOGICAL_POTIONS} selected={cur}
              onToggle={key => {
                const next = new Set(cur);
                if (next.has(key)) next.delete(key); else next.add(key);
                onChange(next.size===0 ? null : { kind:'possible-potions', potions:[...next].sort() });
              }} />;
          })()}
        </>
      )}
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

function StandardExpandedAnswerPanel({ onNext, isTutorial = false }: {
  onNext?: () => void;
  isTutorial?: boolean;
}) {
  const { state, dispatch } = useExpandedSolver();
  const { puzzle, completed, wrongAttempts, showSolution } = state;
  const qs = puzzle.questions;

  const [pending, setPending] = useState<(AnyAnswer | null)[]>(() => qs.map(() => null));
  const setPendingAt = (i: number, a: AnyAnswer | null) =>
    setPending((prev: (AnyAnswer|null)[]) => prev.map((x: AnyAnswer|null, j: number) => j===i ? a : x));

  const allAnswered = pending.every((a: AnyAnswer|null) => a !== null);
  const correctAnswers = (showSolution || completed) ? computeAllExpandedAnswers(puzzle) : null;

  return (
    <div className="space-y-4">
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 space-y-3">
        {(qs as AnyQuestion[]).map((q: AnyQuestion, i: number) => (
          <QuestionRow
            key={i} q={q} index={i} total={qs.length}
            value={pending[i]}
            onChange={a => setPendingAt(i, a)}
            correctAnswer={correctAnswers ? correctAnswers[i] : null}
            showSolution={showSolution || completed}
          />
        ))}
      </div>

      {completed && (
        <div className="rounded-xl bg-green-50 border border-green-300 p-4 flex items-center justify-between gap-3 flex-wrap animate-fadein">
          <span className="flex items-center gap-2 text-green-800 font-semibold">
            <CorrectIcon width={28} /> Correct! Well deduced.
          </span>
          {onNext && (
            <button onClick={onNext}
              className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
              {isTutorial ? 'Continue →' : 'Next →'}
            </button>
          )}
        </div>
      )}

      {!completed && wrongAttempts>0 && !showSolution && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 space-y-2 animate-fadein">
          <div className="flex items-center gap-2 text-red-700 font-semibold">
            <IncorrectIcon width={24} /> Not quite — try again.
          </div>
          {wrongAttempts>=3 && (
            <button onClick={() => dispatch({ type:'REVEAL_SOLUTION' })}
              className="text-xs text-red-600 underline hover:no-underline">Show solution</button>
          )}
        </div>
      )}

      {!completed && !showSolution && (
        <button
          onClick={() => { if (allAnswered) dispatch({ type:'SUBMIT_ANSWER', answers: pending }); }}
          disabled={!allAnswered}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold
                     hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed
                     transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
          {qs.length>1 ? `Submit ${qs.length} Answers` : 'Submit Answer'}
        </button>
      )}
    </div>
  );
}

export function ExpandedAnswerPanel({ onNext, isTutorial = false }: {
  onNext?: () => void;
  isTutorial?: boolean;
}) {
  const { state } = useExpandedSolver();
  const isDebunkPuzzle = state.puzzle.questions.some(
    q => q.kind === 'debunk_min_steps' || q.kind === 'debunk_apprentice_plan' || q.kind === 'debunk_conflict_only'
  );
  if (isDebunkPuzzle) {
    return <ExpandedDebunkAnswerPanel onNext={onNext} isTutorial={isTutorial} />;
  }
  return <StandardExpandedAnswerPanel onNext={onNext} isTutorial={isTutorial} />;
}
