import React from 'react';
import { AlchemicalImage, IngredientIcon, SignedElemImage } from './GameSprites';
import { useSolver } from '../contexts/SolverContext';
import { INGREDIENTS } from '../data/ingredients';
import type { AlchemicalId, Color, Sign } from '../types';
import type { DisplayMap } from '../contexts/SolverContext';

// ─── Alch code → ID ──────────────────────────────────────────────────────────

const ALCH_CODE_MAP: Record<string, AlchemicalId> = {
  npN: 1, pnP: 2, pNn: 3, nPp: 4, Nnp: 5, Ppn: 6, NNN: 7, PPP: 8,
};

// Friendly short labels shown next to alchemical images in hint text
const ALCH_LABEL: Record<AlchemicalId, string> = {
  1: 'R−G+B−', 2: 'R+G−B+', 3: 'R+G−B−', 4: 'R−G+B+',
  5: 'R−G−B+', 6: 'R+G+B−', 7: 'All−',    8: 'All+',
};

// Friendly color names for potion / sign tokens
const COLOR_NAME: Record<Color, string> = { R: 'Red', G: 'Green', B: 'Blue' };

// ─── Token rendering ──────────────────────────────────────────────────────────

function renderHint(text: string, displayMap: DisplayMap): React.ReactNode {
  // Order matters: longer / more specific patterns first
  const TOKEN = /([Ii]ngredient\s+[1-8]|ing[1-8]|NNN|PPP|npN|pnP|pNn|nPp|Nnp|Ppn|[RGB][+\-\u2212])/g;
  const parts = text.split(TOKEN);

  return (
    <>
      {parts.map((part, i) => {
        // ── Alchemical code ──────────────────────────────────────────────────
        // Normalise case for lookup (codes are mixed-case)
        const normalised = part.replace(/nnn/i, 'NNN').replace(/ppp/i, 'PPP')
          .replace(/npn/i, 'npN').replace(/pnp/i, 'pnP')
          .replace(/pnn/i, 'pNn').replace(/npp/i, 'nPp')
          .replace(/nnp/i, 'Nnp').replace(/ppn/i, 'Ppn');
        const alchId = ALCH_CODE_MAP[normalised];
        if (alchId !== undefined) {
          return (
            <span
              key={i}
              className="inline-flex items-center align-middle mx-0.5
                         bg-slate-100 border border-slate-200 rounded px-1 py-0.5 leading-none"
              title={ALCH_LABEL[alchId]}
            >
              <AlchemicalImage id={alchId} width={20} />
            </span>
          );
        }

        // ── ingredient N / ingN ───────────────────────────────────────────────
        const ingMatch = part.match(/^(?:ingredient\s+|ing)([1-8])$/i);
        if (ingMatch) {
          const slotId    = parseInt(ingMatch[1], 10);
          const displayId = displayMap[slotId] ?? slotId;
          const iconIdx   = (displayId - 1) as 0|1|2|3|4|5|6|7;
          const name      = INGREDIENTS[displayId as keyof typeof INGREDIENTS]?.name ?? `#${slotId}`;
          return (
            <span
              key={i}
              className="inline-flex items-center gap-1 align-middle mx-0.5
                         bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5
                         text-[11px] font-semibold text-amber-800 leading-none"
            >
              <IngredientIcon index={iconIdx} width={16} />
              <span>{name}</span>
            </span>
          );
        }

        // ── Color + sign  e.g. R−  G+  B- ───────────────────────────────────
        if (/^[RGB][+\-\u2212]$/.test(part)) {
          const color = part[0].toUpperCase() as Color;
          const sign  = (part[1] === '\u2212' ? '-' : part[1]) as Sign;
          const label = `${COLOR_NAME[color]}${sign === '+' ? '+' : '−'}`;
          return (
            <span
              key={i}
              className="inline-flex items-center align-middle mx-0.5
                         bg-white border border-gray-200 rounded px-1 py-0.5 leading-none"
              title={label}
            >
              <SignedElemImage color={color} sign={sign} width={20} />
            </span>
          );
        }

        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HintDrawer({ hints }: { hints?: { level: number; text: string }[] }) {
  const { state, dispatch } = useSolver();
  const { hintLevel, completed, displayMap } = state;

  if (!hints || hints.length === 0) return null;

  const maxLevel     = hints.length;
  const visibleHints = hints.filter(h => h.level <= hintLevel);
  const hasMore      = hintLevel < maxLevel && !completed;

  if (hintLevel === 0 && completed) return null;

  return (
    <div className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Hints</h2>

      {visibleHints.length > 0 && (
        <div className="space-y-2">
          {visibleHints.map(h => (
            <div
              key={h.level}
              className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-900 leading-relaxed"
            >
              <span className="text-xs font-semibold text-amber-500 uppercase tracking-wide mr-2">
                Hint {h.level}
              </span>
              {renderHint(h.text, displayMap)}
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <button
          onClick={() => dispatch({ type: 'REQUEST_HINT' })}
          className="text-xs text-amber-600 border border-amber-300 rounded-lg px-3 py-1.5
                     hover:bg-amber-50 transition-colors focus-visible:outline-none
                     focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          {hintLevel === 0 ? '💡 Show hint' : '💡 Next hint'}
          {' '}({maxLevel - hintLevel} remaining)
        </button>
      )}

      {hintLevel >= maxLevel && !completed && (
        <p className="text-[10px] text-gray-400">All hints shown.</p>
      )}
    </div>
  );
}
