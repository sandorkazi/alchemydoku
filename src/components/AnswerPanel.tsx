import { useState } from 'react';
import { ALCHEMICALS } from '../data/alchemicals';
import { PotionImage, AlchemicalImage, ElemImage, CorrectIcon, IncorrectIcon, IngredientIcon } from './GameSprites';
import { useSolver, useIngredient } from '../contexts/SolverContext';
import { computeAnswers } from '../puzzles/schema';
import type { PotionResult, AlchemicalId, Color } from '../types';
import type { PuzzleAnswer } from '../puzzles/schema';
import type { QuestionTarget } from '../types';

// ─── Potion helpers ───────────────────────────────────────────────────────────

const LOGICAL_POTIONS: PotionResult[] = [
  { type:'potion',color:'R',sign:'+' }, { type:'potion',color:'R',sign:'-' },
  { type:'potion',color:'G',sign:'+' }, { type:'potion',color:'G',sign:'-' },
  { type:'potion',color:'B',sign:'+' }, { type:'potion',color:'B',sign:'-' },
  { type:'neutral' },
];
function potionKey(p: PotionResult) {
  return p.type === 'neutral' ? 'neutral' : `${p.color}${p.sign}`;
}

// ─── Ingredient icon (slot-aware) ─────────────────────────────────────────────

function Ing({ slotId, size = 28 }: { slotId: number; size?: number }) {
  const getIngredient = useIngredient();
  const { displayId, index } = getIngredient(slotId);
  void displayId;
  return (
    <span className="inline-flex shrink-0">
      <IngredientIcon index={index} width={size} />
    </span>
  );
}

// ─── Question header (icons only) ─────────────────────────────────────────────

function QuestionHeader({ q }: { q: QuestionTarget }) {
  const colorLabel = (c: Color) => ({ R:'Red', G:'Green', B:'Blue' }[c]);

  if (q.kind === 'mixing-result') return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <Ing slotId={q.ingredient1} />
      <span className="text-indigo-400 font-bold text-base">+</span>
      <Ing slotId={q.ingredient2} />
      <span className="text-indigo-300 mx-0.5">→</span>
      <span className="text-xs font-semibold text-indigo-500">what potion?</span>
    </span>
  );

  if (q.kind === 'alchemical') return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <span className="text-xs font-semibold text-indigo-500">alchemical of</span>
      <Ing slotId={q.ingredient} />
      <span className="text-indigo-400">?</span>
    </span>
  );

  if (q.kind === 'safe-publish') return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <span className="text-xs font-semibold text-indigo-500">publishing</span>
      <Ing slotId={q.ingredient} />
      <span className="text-indigo-300 mx-0.5">—</span>
      <span className="text-xs font-semibold text-indigo-500">which aspect to hedge?</span>
    </span>
  );

  if (q.kind === 'possible-potions') return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <Ing slotId={q.ingredient1} />
      <span className="text-indigo-400 font-bold text-base">+</span>
      <Ing slotId={q.ingredient2} />
      <span className="text-indigo-300 mx-0.5">→</span>
      <span className="text-xs font-semibold text-indigo-500">all possible potions?</span>
    </span>
  );

  if (q.kind === 'aspect-set') return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <span className="text-xs font-semibold text-indigo-500">which ingredients have</span>
      <span className={`font-bold text-xs px-1.5 py-0.5 rounded ${
        q.color === 'R' ? 'bg-red-100 text-red-700' :
        q.color === 'G' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
      }`}>{q.color}{q.sign}</span>
      <span className="text-indigo-400">?</span>
    </span>
  );

  if (q.kind === 'large-component') return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <span className="text-xs font-semibold text-indigo-500">which have Large</span>
      <span className={`font-bold text-xs px-1.5 py-0.5 rounded ${
        q.color === 'R' ? 'bg-red-100 text-red-700' :
        q.color === 'G' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
      }`}>{colorLabel(q.color)}</span>
      <span className="text-indigo-500 text-xs font-semibold">component?</span>
    </span>
  );

  // aspect (legacy tutorials only)
  if (q.kind === 'aspect') return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <span className="text-xs font-semibold text-indigo-500">{colorLabel(q.color)} aspect of</span>
      <Ing slotId={q.ingredient} />
      <span className="text-indigo-400">?</span>
    </span>
  );

  return null;
}

// ─── Revealed answer ──────────────────────────────────────────────────────────

function RevealedAnswer({ q, answer }: { q: QuestionTarget; answer: PuzzleAnswer }) {

  if (q.kind === 'mixing-result') {
    return <PotionImage result={answer as PotionResult} width={36} />;
  }
  if (q.kind === 'alchemical') {
    return <AlchemicalImage id={answer as AlchemicalId} width={40} />;
  }
  if (q.kind === 'aspect') {
    const ds = (answer as { sign: '+' | '-' }).sign;
    return <span className="font-bold text-2xl text-amber-700">{ds === '+' ? '＋' : '－'}</span>;
  }
  if (q.kind === 'safe-publish') {
    const dc = (answer as { kind: string; color: Color }).color;
    return (
      <span className="inline-flex items-center gap-1.5">
        <ElemImage color={dc} size="L" width={36} />
        <span className="text-xs font-semibold text-amber-700">
          {{ R:'Red', G:'Green', B:'Blue' }[dc]} aspect
        </span>
      </span>
    );
  }
  if (q.kind === 'possible-potions') {
    const pots = (answer as { potions: string[] }).potions.map(k =>
      k === 'neutral' ? { type:'neutral' } as PotionResult
      : { type:'potion', color: k[0] as Color, sign: k[1] as '+' | '-' } as PotionResult
    );
    return (
      <span className="inline-flex flex-wrap gap-1.5">
        {pots.map(p => <PotionImage key={potionKey(p)} result={p} width={36} />)}
      </span>
    );
  }
  if (q.kind === 'aspect-set' || q.kind === 'large-component') {
    const ids = (answer as { ingredients: number[] }).ingredients;
    return (
      <span className="inline-flex flex-wrap gap-1.5">
        {ids.map(id => <IngredientIcon key={id} index={id - 1} width={32} />)}
        {ids.length === 0 && <span className="text-xs text-gray-400 italic">None</span>}
      </span>
    );
  }
  return null;
}

// ─── Answer pickers ───────────────────────────────────────────────────────────

function PotionPicker({ choices, selected, onSelect }: {
  choices: PotionResult[]; selected: PotionResult | null; onSelect: (p: PotionResult) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup">
      {choices.map(p => {
        const key = potionKey(p);
        const active = selected ? potionKey(selected) === key : false;
        return (
          <button key={key} role="radio" aria-checked={active} aria-label={key}
            onClick={() => onSelect(p)}
            className={`flex items-center justify-center p-1.5 rounded-xl border-2 transition-all press-sm
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
              ${active ? 'border-indigo-500 bg-indigo-50 shadow-md scale-105'
                       : 'border-transparent bg-gray-100 hover:bg-gray-200 hover:border-gray-300'}`}
          ><PotionImage result={p} width={36} /></button>
        );
      })}
    </div>
  );
}

function AlchemicalPicker({ selected, onSelect }: {
  selected: AlchemicalId | null; onSelect: (id: AlchemicalId) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup">
      {([1,2,3,4,5,6,7,8] as AlchemicalId[]).map(id => {
        const active = selected === id;
        return (
          <button key={id} role="radio" aria-checked={active} aria-label={ALCHEMICALS[id].code}
            onClick={() => onSelect(id)}
            className={`flex items-center justify-center p-1.5 rounded-xl border-2 transition-all press-sm
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
              ${active ? 'border-indigo-500 bg-indigo-50 shadow-md scale-105'
                       : 'border-transparent bg-gray-100 hover:bg-gray-200 hover:border-gray-300'}`}
          ><AlchemicalImage id={id} width={46} /></button>
        );
      })}
    </div>
  );
}

function AspectPicker({ selected, onSelect }: {
  selected: '+' | '-' | null; onSelect: (s: '+' | '-') => void;
}) {
  return (
    <div className="flex gap-3" role="radiogroup">
      {(['+', '-'] as const).map(s => (
        <button key={s} role="radio" aria-checked={selected === s}
          aria-label={s === '+' ? 'Positive' : 'Negative'} onClick={() => onSelect(s)}
          className={`flex items-center justify-center w-20 h-16 rounded-xl border-2 text-3xl
            font-bold transition-all press-sm
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
            ${selected === s ? 'border-indigo-500 bg-indigo-50 shadow-md scale-105'
                             : 'border-transparent bg-gray-100 hover:bg-gray-200 hover:border-gray-300'}`}
        >{s === '+' ? '＋' : '－'}</button>
      ))}
    </div>
  );
}

function HedgeColorPicker({ displayColors, selected, onSelect }: {
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
            ${selected === color ? 'border-indigo-500 bg-indigo-50 shadow-md scale-105'
                                 : 'border-transparent bg-gray-100 hover:bg-gray-200 hover:border-gray-300'}`}
        >
          <ElemImage color={color} size="L" width={36} />
          <span className="text-[10px] font-semibold text-gray-500">{label}</span>
        </button>
      ))}
    </div>
  );
}

function PossiblePotionsPicker({ displayChoices, selected, onToggle }: {
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
                ${active ? 'border-indigo-500 bg-indigo-50 shadow-md scale-105'
                         : 'border-transparent bg-gray-100 hover:bg-gray-200 hover:border-gray-300'}`}
            >
              <PotionImage result={p} width={36} />
              <span className={`text-[9px] font-bold leading-none h-2.5 ${active ? 'text-indigo-600' : 'text-transparent'}`}>✓</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function IngredientSetPicker({ selected, onToggle }: {
  selected: Set<number>;
  onToggle: (slotId: number) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] text-gray-400 italic">Select all that apply</p>
      <div className="flex flex-wrap gap-1.5" role="group">
        {[1,2,3,4,5,6,7,8].map(slotId => {
          const active = selected.has(slotId);
          return (
            <button key={slotId} aria-pressed={active} onClick={() => onToggle(slotId)}
              className={`flex flex-col items-center gap-0.5 px-2 pt-1.5 pb-1 rounded-xl border-2 transition-all
                press-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
                ${active ? 'border-indigo-500 bg-indigo-50 shadow-md scale-105'
                         : 'border-transparent bg-gray-100 hover:bg-gray-200 hover:border-gray-300'}`}
            >
              <Ing slotId={slotId} size={36} />
              <span className={`text-[9px] font-bold leading-none h-2.5 ${active ? 'text-indigo-600' : 'text-transparent'}`}>✓</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── One question+answer row ───────────────────────────────────────────────────

function QuestionRow({ q, index, total, value, onChange, correctAnswer, showSolution }: {
  q: QuestionTarget;
  index: number;
  total: number;
  value: PuzzleAnswer | null;
  onChange: (a: PuzzleAnswer | null) => void;
  correctAnswer: PuzzleAnswer | null;
  showSolution: boolean;
}) {

  const displayPotions = LOGICAL_POTIONS.map(p => p.type === 'neutral' ? p : p);
  const displayHedgeColors = (['R','G','B'] as Color[]).map(lc => ({
    color: lc,
    label: { R:'Red', G:'Green', B:'Blue' }[lc],
  }));

  const revealed = showSolution && correctAnswer !== null;

  return (
    <div className={`space-y-2 ${total > 1 ? 'border-t border-indigo-100 first:border-t-0 pt-3 first:pt-0' : ''}`}>

      {/* Question header: icons + label + (if revealed) answer inline */}
      <div className="flex items-center gap-2 flex-wrap">
        {total > 1 && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 shrink-0 w-4">
            {index + 1}.
          </span>
        )}
        <QuestionHeader q={q} />
        {revealed && correctAnswer && (
          <>
            <span className="text-indigo-300 font-bold">→</span>
            <RevealedAnswer q={q} answer={correctAnswer} />
          </>
        )}
      </div>

      {/* Picker — hidden once solution is shown */}
      {!revealed && (
        <>
          {q.kind === 'mixing-result' && (() => {
            const cur = value as PotionResult | null;
            return (
              <PotionPicker
                choices={displayPotions}
                selected={cur ? cur : null}
                onSelect={p => onChange(p)}
              />
            );
          })()}

          {q.kind === 'alchemical' && (
            <AlchemicalPicker
              selected={value as AlchemicalId | null}
              onSelect={id => onChange(id)}
            />
          )}

          {q.kind === 'aspect' && (() => {
            const cur = (value as { sign: '+' | '-' } | null)?.sign ?? null;
            return (
              <AspectPicker
                selected={cur !== null ? cur : null}
                onSelect={ds => onChange({ sign: ds })}
              />
            );
          })()}

          {q.kind === 'safe-publish' && (() => {
            const cur = (value as { kind: string; color: Color } | null)?.color ?? null;
            return (
              <HedgeColorPicker
                displayColors={displayHedgeColors}
                selected={cur ? cur : null}
                onSelect={dc => onChange({ kind: 'hedge-color' as const, color: dc })}
              />
            );
          })()}

          {q.kind === 'possible-potions' && (() => {
            const currentLogical = new Set<string>(
              (value as { potions?: string[] } | null)?.potions ?? []
            );
            const togglePotion = (displayKey: string) => {
              const dp = displayPotions.find(p => potionKey(p) === displayKey);
              if (!dp) return;
              const lk = potionKey(dp.type === 'neutral' ? dp : dp);
              const next = new Set(currentLogical);
              if (next.has(lk)) next.delete(lk); else next.add(lk);
              onChange(next.size === 0 ? null : { kind: 'possible-potions' as const, potions: [...next].sort() });
            };
            const displaySelected = new Set<string>();
            for (const lk of currentLogical) {
              const lp = LOGICAL_POTIONS.find(p => potionKey(p) === lk);
              if (lp) displaySelected.add(potionKey(lp.type === 'neutral' ? lp : lp));
            }
            return (
              <PossiblePotionsPicker
                displayChoices={displayPotions}
                selected={displaySelected}
                onToggle={togglePotion}
              />
            );
          })()}

          {(q.kind === 'aspect-set' || q.kind === 'large-component') && (() => {
            const currentIds = new Set<number>(
              (value as { ingredients?: number[] } | null)?.ingredients ?? []
            );
            const toggleIng = (slotId: number) => {
              const next = new Set(currentIds);
              if (next.has(slotId)) next.delete(slotId); else next.add(slotId);
              const sorted = [...next].sort((a,b) => a-b);
              onChange(sorted.length === 0 ? null : { kind: q.kind as 'aspect-set' | 'large-component', ingredients: sorted });
            };
            return <IngredientSetPicker selected={currentIds} onToggle={toggleIng} />;
          })()}
        </>
      )}
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function AnswerPanel({ onNext, isTutorial = false }: {
  onNext?: () => void;
  isTutorial?: boolean;
}) {
  const { state, dispatch } = useSolver();
  const { puzzle, completed, wrongAttempts, showSolution, answers } = state;
  const qs = puzzle.questions;
  void answers;

  const [pending, setPending] = useState<(PuzzleAnswer | null)[]>(() => qs.map(() => null));
  const setPendingAt = (i: number, a: PuzzleAnswer | null) =>
    setPending(prev => prev.map((x, j) => j === i ? a : x));

  const allAnswered = pending.every(a => a !== null);
  const correctAnswers = (showSolution || completed) ? computeAnswers(puzzle) : null;

  return (
    <div className="space-y-4">

      {/* Question + answer rows — always visible */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 space-y-3">
        {qs.map((q, i) => (
          <QuestionRow
            key={i}
            q={q} index={i} total={qs.length}
            value={pending[i]}
            onChange={a => setPendingAt(i, a)}
            correctAnswer={correctAnswers ? correctAnswers[i] : null}
            showSolution={showSolution || completed}
          />
        ))}
      </div>

      {/* Correct */}
      {completed && (
        <div className="rounded-xl bg-green-50 border border-green-300 p-4 flex items-center
                        justify-between gap-3 flex-wrap animate-fadein">
          <span className="flex items-center gap-2 text-green-800 font-semibold">
            <CorrectIcon width={28} /> Correct! Well deduced.
          </span>
          {onNext && (
            <button onClick={onNext}
              className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700
                         transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400">
              {isTutorial ? 'Continue →' : 'Next →'}
            </button>
          )}
        </div>
      )}

      {/* Wrong attempt */}
      {!completed && wrongAttempts > 0 && !showSolution && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 space-y-2 animate-fadein">
          <div className="flex items-center gap-2 text-red-700 font-semibold">
            <IncorrectIcon width={24} /> Not quite — try again.
          </div>
          {wrongAttempts >= 3 && (
            <button onClick={() => dispatch({ type: 'REVEAL_SOLUTION' })}
              className="text-xs text-red-600 underline hover:no-underline">
              Show solution
            </button>
          )}
        </div>
      )}

      {/* Submit */}
      {!completed && !showSolution && (
        <button
          onClick={() => { if (allAnswered) dispatch({ type: 'SUBMIT_ANSWER', answers: pending }); }}
          disabled={!allAnswered}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold
                     hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed
                     transition-colors focus-visible:outline-none focus-visible:ring-2
                     focus-visible:ring-indigo-400 active:scale-[0.99]"
        >
          {qs.length > 1 ? `Submit ${qs.length} Answers` : 'Submit Answer'}
        </button>
      )}
    </div>
  );
}
