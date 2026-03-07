import React from 'react';
import { AlchemicalImage, SignedElemImage } from './GameSprites';
import { useSolver } from '../contexts/SolverContext';
import type { AlchemicalId, Color, Sign } from '../types';

type Hint = { level: number; text: string };

// ─── Abbreviation → icon substitution ────────────────────────────────────────

const ALCH_CODE_MAP: Record<string, AlchemicalId> = {
  npN: 1, pnP: 2, pNn: 3, nPp: 4, Nnp: 5, Ppn: 6, NNN: 7, PPP: 8,
};

/**
 * Splits hint text on alchemical codes (npN, PPP …) and colour+sign tokens
 * (G+, R−, B- …) and replaces them with inline sprite icons.
 */
function renderHint(text: string): React.ReactNode {
  // Split on: alchemical codes | RGB followed by + or − (ASCII or unicode)
  const TOKEN = /(NNN|PPP|npN|pnP|pNn|nPp|Nnp|Ppn|[RGB][+\-\u2212])/g;
  const parts = text.split(TOKEN);
  return (
    <>
      {parts.map((part, i) => {
        const alchId = ALCH_CODE_MAP[part];
        if (alchId !== undefined) {
          return (
            <span
              key={i}
              className="inline-flex align-middle mx-0.5"
              title={part}
            >
              <AlchemicalImage id={alchId} width={18} />
            </span>
          );
        }
        if (/^[RGB][+\-\u2212]$/.test(part)) {
          const color = part[0] as Color;
          const sign  = (part[1] === '\u2212' ? '-' : part[1]) as Sign;
          return (
            <span key={i} className="inline-flex align-middle mx-0.5">
              <SignedElemImage color={color} sign={sign} width={18} />
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HintDrawer({ hints }: { hints?: Hint[] }) {
  const { state, dispatch } = useSolver();
  const { hintLevel, completed } = state;

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
              {renderHint(h.text)}
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
