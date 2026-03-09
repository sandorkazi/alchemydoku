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
import { ALCHEMICALS } from '../../data/alchemicals';
import { PotionImage, AlchemicalImage, ElemImage, CorrectIcon, IncorrectIcon, IngredientIcon, SignedElemImage } from '../../components/GameSprites';
import { useExpandedSolver, useExpandedIngredient, computeAllExpandedAnswers } from '../contexts/ExpandedSolverContext';
import { INGREDIENTS } from '../../data/ingredients';
import type { PotionResult, AlchemicalId, Color, IngredientId } from '../../types';
import type {
  AnyQuestion, AnyAnswer,
  AspectColorAnswer, SolarLunarAnswer, IngredientSetAnswer,
} from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LOGICAL_POTIONS: PotionResult[] = [
  { type:'potion',color:'R',sign:'+' }, { type:'potion',color:'R',sign:'-' },
  { type:'potion',color:'G',sign:'+' }, { type:'potion',color:'G',sign:'-' },
  { type:'potion',color:'B',sign:'+' }, { type:'potion',color:'B',sign:'-' },
  { type:'neutral' },
];
const potionKey = (p: PotionResult) => p.type === 'neutral' ? 'neutral' : `${p.color}${p.sign}`;

function Ing({ slotId, size = 28 }: { slotId: number; size?: number }) {
  const getIngredient = useExpandedIngredient();
  const { index } = getIngredient(slotId);
  return <span className="inline-flex shrink-0"><IngredientIcon index={index} width={size} /></span>;
}

function ingName(slotId: number, getIngredient: ReturnType<typeof useExpandedIngredient>): string {
  const { displayId } = getIngredient(slotId);
  return INGREDIENTS[displayId as 1]?.name ?? `#${slotId}`;
}

// ─── Question header ──────────────────────────────────────────────────────────

function QuestionHeader({ q }: { q: AnyQuestion }) {
  const getIngredient = useExpandedIngredient();
  const colorLabel = (c: Color) => ({ R:'Red', G:'Green', B:'Blue' }[c]);

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
      <span className="text-xs font-semibold text-indigo-500">{colorLabel(q.color)} aspect of</span><Ing slotId={q.ingredient} /><span className="text-indigo-400">?</span>
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
      <span className="text-indigo-300 mx-0.5">→</span><span className="text-xs font-semibold text-indigo-500">all possible potions?</span>
    </span>
  );
  if (q.kind === 'aspect-set') return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <span className="text-xs font-semibold text-indigo-500">which ingredients have</span>
      <span className={`font-bold text-xs px-1.5 py-0.5 rounded ${q.color==='R'?'bg-red-100 text-red-700':q.color==='G'?'bg-green-100 text-green-700':'bg-blue-100 text-blue-700'}`}>{q.color}{q.sign}</span>
      <span className="text-indigo-400">?</span>
    </span>
  );
  if (q.kind === 'large-component') return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <span className="text-xs font-semibold text-indigo-500">which have Large</span>
      <span className={`font-bold text-xs px-1.5 py-0.5 rounded ${q.color==='R'?'bg-red-100 text-red-700':q.color==='G'?'bg-green-100 text-green-700':'bg-blue-100 text-blue-700'}`}>{colorLabel(q.color)}</span>
      <span className="text-indigo-500 text-xs font-semibold">component?</span>
    </span>
  );

  // Expanded types
  if (q.kind === 'encyclopedia_fourth') {
    return (
      <span className="inline-flex items-center gap-1.5 flex-wrap text-xs">
        <span className="font-semibold text-emerald-600">📜 {colorLabel(q.aspect)} article:</span>
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
            <span className={`text-[10px] font-bold ${e.sign==='+'?'text-green-600':'text-red-500'}`}>{e.sign}</span>
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
    const t = q.target;
    const potStr = t.type === 'neutral' ? 'Neutral' : `${t.color}${t.sign === '+' ? '+' : '−'}`;
    const grpLabel: Record<string, string> = {
      animators: 'animators', chest_only: 'chest-only reactors',
      ears_only: 'ears-only reactors', non_reactive: 'non-reactive',
      any_reactive: 'reactive ingredients',
    };
    return (
      <span className="text-xs font-semibold text-violet-600">
        🧿 Which ingredients can produce {potStr} with the {grpLabel[q.with_group]}?
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
      <span className="text-xs font-semibold text-violet-600">☀️ Solar or 🌙 Lunar?</span>
    </span>
  );

  return null;
}

// ─── Revealed answer ──────────────────────────────────────────────────────────

function RevealedAnswer({ q, answer }: { q: AnyQuestion; answer: AnyAnswer }) {
  const getIngredient = useExpandedIngredient();

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
          ${r==='solar'?'bg-orange-100 text-orange-800':'bg-gray-100 text-gray-500'}`}>
          {r==='solar'?'☀️ Solar':'🌙 Lunar'}
        </span>
      );
    }
    if (a.kind === 'hedge-color') {
      const dc = (answer as { kind: string; color: Color }).color;
      return <span className="inline-flex items-center gap-1.5"><ElemImage color={dc} size="L" width={36} /></span>;
    }
    if (a.kind === 'possible-potions') {
      const pots = (answer as { potions: string[] }).potions.map(k =>
        k === 'neutral' ? { type:'neutral' } as PotionResult
        : { type:'potion', color: k[0] as Color, sign: k[1] as '+' | '-' } as PotionResult
      );
      return <span className="inline-flex flex-wrap gap-1.5">{pots.map(p => <PotionImage key={potionKey(p)} result={p} width={36} />)}</span>;
    }
    if (a.kind === 'aspect-set' || a.kind === 'large-component') {
      const ids = (answer as { ingredients: number[] }).ingredients;
      return <span className="inline-flex flex-wrap gap-1.5">{ids.map(id => <IngredientIcon key={id} index={(id-1) as 0|1|2|3|4|5|6|7} width={32} />)}{ids.length===0&&<span className="text-xs text-gray-400 italic">None</span>}</span>;
    }
  }
  if (typeof answer === 'object' && answer !== null && 'kind' in answer && (answer as {kind:string}).kind === 'ingredient_set') {
    const ids = (answer as IngredientSetAnswer).ingredients;
    return <span className="inline-flex flex-wrap gap-1.5">{ids.map(id => <IngredientIcon key={id} index={(id-1) as 0|1|2|3|4|5|6|7} width={32} />)}{ids.length===0&&<span className="text-xs text-gray-400 italic">None</span>}</span>;
  }
  if (typeof answer === 'number') return <AlchemicalImage id={answer as AlchemicalId} width={40} />;
  if (typeof answer === 'object' && 'type' in (answer as object)) return <PotionImage result={answer as PotionResult} width={36} />;
  if (typeof answer === 'object' && 'sign' in (answer as object)) {
    const s = (answer as { sign: '+' | '-' }).sign;
    return <span className="font-bold text-2xl text-amber-700">{s==='+'?'＋':'－'}</span>;
  }
  return null;
}

// ─── Pickers ──────────────────────────────────────────────────────────────────

function PotionPicker({ selected, onSelect }: { selected: PotionResult | null; onSelect: (p: PotionResult) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup">
      {LOGICAL_POTIONS.map(p => {
        const key = potionKey(p); const active = selected ? potionKey(selected) === key : false;
        return (
          <button key={key} role="radio" aria-checked={active} aria-label={key} onClick={() => onSelect(p)}
            className={`flex items-center justify-center p-1.5 rounded-xl border-2 transition-all
              ${active?'border-indigo-500 bg-indigo-50 shadow-md scale-105':'border-transparent bg-gray-100 hover:bg-gray-200'}`}>
            <PotionImage result={p} width={36} />
          </button>
        );
      })}
    </div>
  );
}

function AlchemicalPicker({ selected, onSelect }: { selected: AlchemicalId | null; onSelect: (id: AlchemicalId) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup">
      {([1,2,3,4,5,6,7,8] as AlchemicalId[]).map(id => (
        <button key={id} role="radio" aria-checked={selected===id} aria-label={ALCHEMICALS[id].code} onClick={() => onSelect(id)}
          className={`flex items-center justify-center p-1.5 rounded-xl border-2 transition-all
            ${selected===id?'border-indigo-500 bg-indigo-50 shadow-md scale-105':'border-transparent bg-gray-100 hover:bg-gray-200'}`}>
          <AlchemicalImage id={id} width={46} />
        </button>
      ))}
    </div>
  );
}

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
            ${selected===val?(val==='solar'?'border-orange-500 bg-orange-50':'border-gray-400 bg-gray-100'):'border-transparent bg-gray-100 hover:bg-gray-200'}`}>
          <span className="text-2xl">{val==='solar'?'☀️':'🌙'}</span>
          <span className="text-xs font-semibold capitalize">{val}</span>
        </button>
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
            <div className="flex gap-3">
              {(['+','-'] as const).map(s => (
                <button key={s} role="radio" aria-checked={(value as {sign?:string}|null)?.sign===s}
                  onClick={() => onChange({ sign: s })}
                  className={`flex items-center justify-center w-20 h-16 rounded-xl border-2 text-3xl font-bold transition-all
                    ${(value as {sign?:string}|null)?.sign===s?'border-indigo-500 bg-indigo-50 shadow-md scale-105':'border-transparent bg-gray-100 hover:bg-gray-200'}`}>
                  {s==='+'?'＋':'－'}
                </button>
              ))}
            </div>
          )}
          {q.kind==='safe-publish' && (
            <div className="flex gap-2" role="radiogroup">
              {(['R','G','B'] as Color[]).map(c => {
                const active = (value as {color?:Color}|null)?.color===c;
                return (
                  <button key={c} role="radio" aria-checked={active} onClick={() => onChange({ kind:'hedge-color' as const, color:c })}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all
                      ${active?'border-indigo-500 bg-indigo-50 shadow-md scale-105':'border-transparent bg-gray-100 hover:bg-gray-200'}`}>
                    <ElemImage color={c} size="L" width={36} />
                    <span className="text-[10px] font-semibold text-gray-500">{{ R:'Red',G:'Green',B:'Blue' }[c]}</span>
                  </button>
                );
              })}
            </div>
          )}
          {q.kind==='possible-potions' && (() => {
            const cur = new Set<string>((value as {potions?:string[]}|null)?.potions ?? []);
            const toggle = (key: string) => {
              const next = new Set(cur);
              if (next.has(key)) next.delete(key); else next.add(key);
              onChange(next.size===0 ? null : { kind:'possible-potions' as const, potions:[...next].sort() });
            };
            return (
              <div className="flex flex-wrap gap-1.5">
                {LOGICAL_POTIONS.map(p => {
                  const key = potionKey(p); const active = cur.has(key);
                  return (
                    <button key={key} aria-pressed={active} onClick={() => toggle(key)}
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
            const key = (p: PotionResult) => p.type==='neutral'?'neutral':`${p.color}${p.sign}`;
            const cur = new Set<string>((value as {kind:string;potions:string[]}|null)?.potions ?? []);
            const toggle = (k: string) => {
              const next = new Set(cur);
              if (next.has(k)) next.delete(k); else next.add(k);
              onChange(next.size===0 ? null : { kind:'possible-potions', potions:[...next].sort() });
            };
            return (
              <div className="flex flex-wrap gap-1.5">
                {LOGICAL_POTIONS.map(p => {
                  const k = key(p); const active = cur.has(k);
                  return (
                    <button key={k} aria-pressed={active} onClick={() => toggle(k)}
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
        </>
      )}
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function ExpandedAnswerPanel({ onNext, isTutorial = false }: {
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
