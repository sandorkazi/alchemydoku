import { useState } from 'react';
import { useSolver } from '../contexts/SolverContext';
import { computeColorAspects } from '../logic/deducer';
import { deduceAspect } from '../logic/deducer';
import { IngredientIcon, SignedElemImage } from './GameSprites';
import type { Color, IngredientId, Sign } from '../types';
import type { DisplayMap } from '../utils/solverStorage';
import type { WorldSet, Clue } from '../types';

const COLORS: Color[] = ['R', 'G', 'B'];

const COLOR_LABEL: Record<Color, string> = { R: 'Red', G: 'Green', B: 'Blue' };

// ─── IngredientChip ───────────────────────────────────────────────────────────

function IngredientChip({ ing, displayMap }: { ing: IngredientId; displayMap: DisplayMap }) {
  const displayId = displayMap[ing] ?? ing;
  const index = (displayId - 1) as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  return (
    <span className="inline-flex items-center gap-0.5 bg-gray-100 rounded-full px-1.5 py-0.5 text-xs text-gray-700">
      <IngredientIcon index={index} width={16} />
      <span>{ing}</span>
    </span>
  );
}

// ─── BucketRow ────────────────────────────────────────────────────────────────

function BucketRow({
  size,
  sign,
  chips,
  displayMap,
}: {
  size: 'L' | 'S';
  sign: Sign;
  chips: IngredientId[];
  displayMap: DisplayMap;
}) {
  const full = chips.length === 2;
  return (
    <div className={`flex items-center gap-2 py-0.5 px-1.5 rounded ${full ? 'bg-amber-50 border border-amber-200' : ''}`}>
      <span className="text-[10px] font-semibold text-gray-400 w-12 shrink-0">
        {size === 'L' ? 'Large' : 'Small'}{sign}
      </span>
      <div className="flex items-center gap-1 flex-wrap">
        {chips.map(ing => (
          <IngredientChip key={ing} ing={ing} displayMap={displayMap} />
        ))}
        {chips.length < 2 && Array.from({ length: 2 - chips.length }).map((_, i) => (
          <span
            key={i}
            className="inline-block w-7 h-5 rounded-full border border-dashed border-gray-300"
            aria-hidden="true"
          />
        ))}
        {full && <span className="text-amber-500 text-[10px] font-bold ml-1" aria-label="bucket full">✦</span>}
      </div>
    </div>
  );
}

// ─── ColorSection ─────────────────────────────────────────────────────────────

function ColorSection({
  color,
  displayMap,
  worlds,
}: {
  color: Color;
  displayMap: DisplayMap;
  worlds: WorldSet;
}) {
  const buckets = computeColorAspects(worlds, color);
  const hasData = buckets['L+'].length > 0 || buckets['L-'].length > 0
    || buckets['S+'].length > 0 || buckets['S-'].length > 0
    || buckets.signPlusOnly.length > 0 || buckets.signMinusOnly.length > 0;
  const [open, setOpen] = useState(hasData);

  // Re-open when data appears (derived from buckets changing)
  // (useState doesn't re-init on re-render, which is fine — user can collapse manually)

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100
                   transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        aria-expanded={open}
      >
        <SignedElemImage color={color} sign="+" width={16} />
        <SignedElemImage color={color} sign="-" width={16} />
        <span className="text-xs font-semibold text-gray-700">{COLOR_LABEL[color]}</span>
        {!hasData && <span className="text-[10px] text-gray-400 ml-1">(no data)</span>}
        <span className={`ml-auto text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="px-2 py-1.5 space-y-0.5">
          <BucketRow size="L" sign="+" chips={buckets['L+']} displayMap={displayMap} />
          <BucketRow size="L" sign="-" chips={buckets['L-']} displayMap={displayMap} />
          <BucketRow size="S" sign="+" chips={buckets['S+']} displayMap={displayMap} />
          <BucketRow size="S" sign="-" chips={buckets['S-']} displayMap={displayMap} />

          {buckets.signPlusOnly.length > 0 && (
            <div className="flex items-center gap-2 py-0.5 px-1.5 mt-1">
              <span className="text-[10px] text-gray-400 w-12 shrink-0">Sign+, size?</span>
              <div className="flex items-center gap-1 flex-wrap">
                {buckets.signPlusOnly.map(ing => (
                  <IngredientChip key={ing} ing={ing} displayMap={displayMap} />
                ))}
              </div>
            </div>
          )}
          {buckets.signMinusOnly.length > 0 && (
            <div className="flex items-center gap-2 py-0.5 px-1.5">
              <span className="text-[10px] text-gray-400 w-12 shrink-0">Sign−, size?</span>
              <div className="flex items-center gap-1 flex-wrap">
                {buckets.signMinusOnly.map(ing => (
                  <IngredientChip key={ing} ing={ing} displayMap={displayMap} />
                ))}
              </div>
            </div>
          )}
          {buckets.unknown.length > 0 && (
            <div className="flex items-center gap-2 py-0.5 px-1.5">
              <span className="text-[10px] text-gray-400 w-12 shrink-0">Unknown</span>
              <div className="flex items-center gap-1 flex-wrap">
                {buckets.unknown.map(ing => (
                  <IngredientChip key={ing} ing={ing} displayMap={displayMap} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── NeutralPairsSection ──────────────────────────────────────────────────────

function NeutralPairsSection({
  worlds,
  clues,
  displayMap,
}: {
  worlds: WorldSet;
  clues: readonly Clue[];
  displayMap: DisplayMap;
}) {
  const [open, setOpen] = useState(false);

  const neutralPairs = clues.filter(
    (c): c is Extract<Clue, { kind: 'mixing' }> =>
      c.kind === 'mixing' && c.result.type === 'neutral',
  );

  if (neutralPairs.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100
                   transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        aria-expanded={open}
      >
        <span className="text-xs font-semibold text-gray-700">
          Neutral Pairs ({neutralPairs.length})
        </span>
        <span className={`ml-auto text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="px-2 py-1.5 space-y-2">
          {neutralPairs.map((clue, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center gap-1.5">
                <IngredientChip ing={clue.ingredient1} displayMap={displayMap} />
                <span className="text-[10px] text-gray-400">⇔ neutral</span>
                <IngredientChip ing={clue.ingredient2} displayMap={displayMap} />
              </div>
              <div className="pl-2 space-y-0.5">
                {COLORS.map(color => {
                  const a1 = deduceAspect(worlds, clue.ingredient1, color);
                  const a2 = deduceAspect(worlds, clue.ingredient2, color);
                  const fmt = (d: ReturnType<typeof deduceAspect>) =>
                    d ? `${color}${d.sign}${d.size ? ` (${d.size === 'L' ? 'Large' : 'Small'})` : ''}` : `${color}?`;
                  return (
                    <div key={color} className="flex items-center gap-1 text-[10px] text-gray-500">
                      <SignedElemImage color={color} sign={a1?.sign ?? '+'} width={12} />
                      <span>{fmt(a1)}</span>
                      <span className="text-gray-300">↔</span>
                      <SignedElemImage color={color} sign={a2?.sign ?? '+'} width={12} />
                      <span>{fmt(a2)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── AspectBoard ──────────────────────────────────────────────────────────────

export function AspectBoard() {
  const { state } = useSolver();
  const { worlds, puzzle, displayMap } = state;

  return (
    <div className="space-y-2 text-sm">
      {COLORS.map(color => (
        <ColorSection
          key={color}
          color={color}
          worlds={worlds}
          displayMap={displayMap}
        />
      ))}
      <NeutralPairsSection
        worlds={worlds}
        clues={puzzle.clues}
        displayMap={displayMap}
      />
    </div>
  );
}
