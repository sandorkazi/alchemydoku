import React from 'react';
import { AlchemicalImage, IngredientIcon, SignedElemImage } from '@shared/components/GameSprites';
import { INGREDIENTS } from '@shared/data/ingredients';
import type { AlchemicalId, Color, Sign, HintStep } from '@shared/types';
import type { DisplayMap } from '@shared/utils/solverStorage';

// ─── Token rendering (shared with HintDrawer) ─────────────────────────────────

const ALCH_CODE_MAP: Record<string, AlchemicalId> = {
  npN: 1, pnP: 2, pNn: 3, nPp: 4, Nnp: 5, Ppn: 6, NNN: 7, PPP: 8,
};

const ALCH_LABEL: Record<AlchemicalId, string> = {
  1: 'R−G+B−', 2: 'R+G−B+', 3: 'R+G−B−', 4: 'R−G+B+',
  5: 'R−G−B+', 6: 'R+G+B−', 7: 'All−',    8: 'All+',
};

const COLOR_NAME: Record<Color, string> = { R: 'Red', G: 'Green', B: 'Blue' };

export function renderHintTokens(text: string, displayMap: DisplayMap): React.ReactNode {
  const TOKEN = /([Ii]ngredient\s+[1-8]|ing[1-8]|NNN|PPP|npN|pnP|pNn|nPp|Nnp|Ppn|[RGB][+\-−])/g;
  const parts = text.split(TOKEN);

  return (
    <>
      {parts.map((part, i) => {
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

        if (/^[RGB][+\-−]$/.test(part)) {
          const color = part[0].toUpperCase() as Color;
          const sign  = (part[1] === '−' ? '-' : part[1]) as Sign;
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

// ─── Single step display ──────────────────────────────────────────────────────

function StepCard({
  step,
  stepNumber,
  displayMap,
}: {
  step: HintStep;
  stepNumber: number;
  displayMap: DisplayMap;
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2.5 text-sm leading-relaxed space-y-1.5
                  ${step.bifurcation
                    ? 'bg-indigo-50 border-indigo-200 ml-3'
                    : 'bg-amber-50 border-amber-200'}`}
      data-worlds-before={step.worlds_before}
      data-worlds-after={step.worlds_after}
    >
      {step.bifurcation && (
        <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-400">
          Suppose…
        </p>
      )}

      <div className="flex gap-2">
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-amber-500 pt-0.5 w-20">
          👁 Look at:
        </span>
        <span className="text-amber-900">
          {renderHintTokens(step.look_at, displayMap)}
        </span>
      </div>

      <div className="flex gap-2">
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-amber-500 pt-0.5 w-20">
          💡 Means:
        </span>
        <span className="text-amber-900">
          {renderHintTokens(step.means, displayMap)}
        </span>
      </div>

      <div className="flex gap-2">
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-amber-500 pt-0.5 w-20">
          ✏️ So:
        </span>
        <span className="text-amber-900">
          {renderHintTokens(step.so, displayMap)}
        </span>
      </div>

      {step.reveals_answer && (
        <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 pt-0.5">
          ✓ Answer is now deducible
        </p>
      )}

      <p className="text-[9px] text-gray-300 text-right">step {stepNumber}</p>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HintStepViewer({
  steps,
  hintStepIndex,
  displayMap,
  onNext,
  completed,
}: {
  steps: HintStep[];
  hintStepIndex: number;
  displayMap: DisplayMap;
  onNext: () => void;
  completed: boolean;
}) {
  const visibleSteps = steps.slice(0, hintStepIndex);
  const hasMore      = hintStepIndex < steps.length && !completed;

  if (hintStepIndex === 0 && completed) return null;

  return (
    <div className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Hints</h2>

      {visibleSteps.length > 0 && (
        <div className="space-y-2">
          {visibleSteps.map((step, i) => (
            <StepCard
              key={i}
              step={step}
              stepNumber={i + 1}
              displayMap={displayMap}
            />
          ))}
        </div>
      )}

      {hasMore && (
        <button
          onClick={onNext}
          className="text-xs text-amber-600 border border-amber-300 rounded-lg px-3 py-1.5
                     hover:bg-amber-50 transition-colors focus-visible:outline-none
                     focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          {hintStepIndex === 0 ? '💡 Show hint' : '💡 Next reasoning step'}
          {' '}({steps.length - hintStepIndex} remaining)
        </button>
      )}

      {hintStepIndex >= steps.length && !completed && (
        <p className="text-[10px] text-gray-400">All reasoning steps shown.</p>
      )}
    </div>
  );
}
