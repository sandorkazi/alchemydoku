import { useState, useMemo } from 'react';
import { INGREDIENTS } from '../data/ingredients';
import { getPossibleResults, deduceMixingResult } from '../logic/deducer';
import { WORLD_DATA, FULL_INDICES } from '../logic/worldPack';
import { PotionImage } from './GameSprites';
import { useSolver, useIngredient } from '../contexts/SolverContext';
import type { IngredientId, PotionResult, WorldSet } from '../types';

// ─── Mode types ───────────────────────────────────────────────────────────────

type SimMode = 'grid' | 'truth';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function potionKey(p: PotionResult) {
  return p.type === 'neutral' ? 'neutral' : `${p.color}${p.sign}`;
}

/**
 * Filter the full world set to only those consistent with the player's grid.
 * Precomputes confirmed/eliminated constraints once, then does a single tight
 * typed-array pass — 5× faster than the old object-based approach.
 */
function buildGridFilteredWorlds(
  gridState: Record<number, Record<number, string>>,
): WorldSet {
  // Precompute per-slot constraints from gridState (O(64) = trivial)
  const confirmed = new Uint8Array(8); // 0 = no constraint, 1-8 = required alch
  const eliminated = new Uint8Array(8); // bitmask of excluded alch0 values (0-7)

  for (let s = 1; s <= 8; s++) {
    for (let a = 1; a <= 8; a++) {
      const cell = gridState[s]?.[a];
      if (cell === 'confirmed') confirmed[s - 1] = a;       // exact required alch (1-8)
      if (cell === 'eliminated') eliminated[s - 1] |= 1 << (a - 1); // bit for alch0
    }
  }

  // Single pass over all 40,320 worlds
  const buf = new Uint16Array(FULL_INDICES.length);
  let n = 0;
  for (let i = 0; i < FULL_INDICES.length; i++) {
    const w = FULL_INDICES[i];
    const base = w * 8;
    let ok = true;
    for (let s = 0; s < 8; s++) {
      const a0 = WORLD_DATA[base + s];
      if (confirmed[s] !== 0 && a0 + 1 !== confirmed[s]) { ok = false; break; }
      if (eliminated[s] & (1 << a0))                     { ok = false; break; }
    }
    if (ok) buf[n++] = w;
  }
  return buf.slice(0, n) as WorldSet;
}

// ─── Confirmation modal ───────────────────────────────────────────────────────

function TruthModeModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4">
        <h3 className="font-bold text-gray-900 text-base">Switch to Truth mode?</h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          Truth mode ignores your grid marks and shows all results consistent with the actual clue logic — potentially revealing more than you've deduced yourself.
        </p>
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Recommended only for checking your reasoning, not during active solving.
        </p>
        <div className="flex gap-3 pt-1">
          <button onClick={onCancel}
            className="flex-1 py-2 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors">
            Switch
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MixSimulator({ defaultI1 = 1, defaultI2 = 2 }: { defaultI1?: IngredientId; defaultI2?: IngredientId }) {
  const { state } = useSolver();
  const getIngredient = useIngredient();
  const [i1, setI1] = useState<IngredientId>(defaultI1);
  const [i2, setI2] = useState<IngredientId>(defaultI2);
  const [mode, setMode] = useState<SimMode>('grid');
  const [showConfirm, setShowConfirm] = useState(false);

  // Memoize grid-filtered worlds — only recomputes when gridState reference changes (cell click)
  const gridWorlds = useMemo(
    () => buildGridFilteredWorlds(state.gridState),
    [state.gridState],
  );

  const activeWorlds: WorldSet = mode === 'grid' ? gridWorlds : state.worlds;

  const same = i1 === i2;
  const singleResult = !same ? deduceMixingResult(activeWorlds, i1, i2) : null;
  const possible     = !same ? getPossibleResults(activeWorlds, i1, i2)  : [];

  const ingName = (slotId: IngredientId) =>
    INGREDIENTS[getIngredient(slotId).displayId as 1].name;

  function handleModeToggle() {
    if (mode === 'grid') {
      setShowConfirm(true);
    } else {
      setMode('grid');
    }
  }

  return (
    <>
      {showConfirm && (
        <TruthModeModal
          onConfirm={() => { setShowConfirm(false); setMode('truth'); }}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-end gap-2">
          <div className="flex items-center gap-1.5 text-xs">
            <span className={mode === 'grid' ? 'font-semibold text-indigo-600' : 'text-gray-400'}>Grid</span>
            <button
              role="switch"
              aria-checked={mode === 'truth'}
              onClick={handleModeToggle}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none
                ${mode === 'truth' ? 'bg-amber-500' : 'bg-indigo-500'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform
                ${mode === 'truth' ? 'translate-x-4' : 'translate-x-1'}`} />
            </button>
            <span className={mode === 'truth' ? 'font-semibold text-amber-600' : 'text-gray-400'}>Truth</span>
          </div>
        </div>

        <p className="text-[10px] text-gray-400 -mt-1">
          {mode === 'grid'
            ? 'Showing results consistent with your grid marks.'
            : 'Showing all results consistent with clues (ignores grid).'}
        </p>

        {/* Ingredient selectors */}
        <div className="flex items-center gap-2 flex-wrap">
          <select value={i1} onChange={e => setI1(Number(e.target.value) as IngredientId)}
            className="border rounded-lg px-2 py-1.5 text-sm bg-white shadow-sm">
            {([1,2,3,4,5,6,7,8] as IngredientId[]).map(id => (
              <option key={id} value={id}>{ingName(id)}</option>
            ))}
          </select>
          <span className="text-gray-400 font-bold">+</span>
          <select value={i2} onChange={e => setI2(Number(e.target.value) as IngredientId)}
            className="border rounded-lg px-2 py-1.5 text-sm bg-white shadow-sm">
            {([1,2,3,4,5,6,7,8] as IngredientId[]).map(id => (
              <option key={id} value={id}>{ingName(id)}</option>
            ))}
          </select>
        </div>

        {same && <p className="text-xs text-amber-600">Choose two different ingredients.</p>}

        {!same && singleResult && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <span className="text-xs text-green-700 font-medium">Determined:</span>
            <PotionImage result={singleResult} width={72} />
          </div>
        )}

        {!same && !singleResult && possible.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 space-y-1">
            <span className="text-xs text-amber-700 font-medium">
              {possible.length} possible result{possible.length > 1 ? 's' : ''}:
            </span>
            <div className="flex flex-wrap gap-2">
              {possible.map(p => (
                <PotionImage key={potionKey(p)} result={p} width={56} title={potionKey(p)} />
              ))}
            </div>
          </div>
        )}

        {!same && possible.length === 0 && (
          <p className="text-xs text-gray-400">
            {mode === 'grid'
              ? 'No worlds match your current grid marks for this pair.'
              : 'No remaining worlds match this pair.'}
          </p>
        )}
      </div>
    </>
  );
}
