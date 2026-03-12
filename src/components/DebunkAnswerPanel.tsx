/**
 * components/DebunkAnswerPanel.tsx
 *
 * Interactive plan builder for debunk-planning puzzle questions.
 * Shows the publications board and a step sequence editor with live simulation.
 */

import { useState } from 'react';
import { useSolver, useIngredient } from '../contexts/SolverContext';
import { IngredientIcon, AlchemicalImage, CorrectIcon, IncorrectIcon } from './GameSprites';
import { simulatePlan } from '../logic/debunk';
import type { DebunkStep, IngredientId, Color, Publication } from '../types';

// ─── Ingredient picker ────────────────────────────────────────────────────────

function IngPicker({
  label, value, exclude, onChange,
}: {
  label: string;
  value: IngredientId | null;
  exclude?: IngredientId | null;
  onChange: (id: IngredientId) => void;
}) {
  const getIngredient = useIngredient();
  const slots = ([1, 2, 3, 4, 5, 6, 7, 8] as IngredientId[]).filter(id => id !== exclude);
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">{label}</span>
      <div className="flex gap-1 flex-wrap">
        {slots.map(slotId => {
          const { index } = getIngredient(slotId);
          const sel = value === slotId;
          return (
            <button
              key={slotId}
              onClick={() => onChange(slotId)}
              className={`rounded border-2 transition-all p-0.5 ${
                sel
                  ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-300'
                  : 'border-gray-200 hover:border-gray-400'
              }`}
              title={`Ingredient ${slotId}`}
            >
              <IngredientIcon index={index} width={24} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Locked ingredient display (for fixed ingredient in conflict-only) ────────

function LockedIngDisplay({ slotId }: { slotId: IngredientId | null }) {
  const getIngredient = useIngredient();
  if (!slotId) return null;
  const { index } = getIngredient(slotId);
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Mix with…</span>
      <div className="flex gap-1 items-center">
        <div className="rounded border-2 border-indigo-400 bg-indigo-50 p-0.5 opacity-70 cursor-not-allowed" title="Fixed ingredient">
          <IngredientIcon index={index} width={24} />
        </div>
        <span className="text-[10px] text-indigo-400 font-semibold">+ ?</span>
      </div>
    </div>
  );
}



function ColorPicker({
  value, onChange,
}: {
  value: Color | null;
  onChange: (c: Color) => void;
}) {
  const colors: Color[] = ['R', 'G', 'B'];
  const labels: Record<Color, string> = { R: 'Red', G: 'Green', B: 'Blue' };
  const activeCls: Record<Color, string> = {
    R: 'bg-red-500 text-white border-red-600',
    G: 'bg-green-600 text-white border-green-700',
    B: 'bg-blue-500 text-white border-blue-600',
  };
  const idleCls: Record<Color, string> = {
    R: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
    G: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
    B: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
  };
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Aspect</span>
      <div className="flex gap-1">
        {colors.map(c => (
          <button
            key={c}
            onClick={() => onChange(c)}
            className={`px-2 py-1 rounded border text-xs font-bold transition-all ${
              value === c ? activeCls[c] : idleCls[c]
            }`}
          >
            {labels[c]}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Step editor row ──────────────────────────────────────────────────────────

type DraftStep =
  | { kind: 'apprentice'; ingredient: IngredientId | null; color: Color | null }
  | { kind: 'master'; ingredient1: IngredientId | null; ingredient2: IngredientId | null };

function isComplete(s: DraftStep): s is DebunkStep {
  if (s.kind === 'apprentice') return s.ingredient !== null && s.color !== null;
  return s.ingredient1 !== null && s.ingredient2 !== null;
}

function StepEditor({
  index, draft, outcome, onUpdate, onRemove, isConflictOnly, isApprenticeOnly,
}: {
  index: number;
  draft: DraftStep;
  outcome?: { removed: IngredientId[]; conflicts: IngredientId[] };
  onUpdate: (d: DraftStep) => void;
  onRemove: () => void;
  isConflictOnly: boolean;
  isApprenticeOnly?: boolean;
}) {
  const getIngredient = useIngredient();
  void getIngredient;

  const outcomeLabel = (() => {
    if (!outcome) return null;
    if (outcome.removed.length > 0) {
      return (
        <span className="text-green-700 text-xs font-semibold">
          ✓ Removes {outcome.removed.length} publication{outcome.removed.length > 1 ? 's' : ''}
        </span>
      );
    }
    if (outcome.conflicts.length > 0) {
      return (
        <span className={`text-xs font-semibold ${isConflictOnly ? 'text-green-700' : 'text-amber-600'}`}>
          {isConflictOnly ? '✓ Conflict — both publications implicated' : '⚡ Conflict — neither publication removed'}
        </span>
      );
    }
    return (
      <span className="text-red-400 text-xs">No effect — try a different pair</span>
    );
  })();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-500">Step {index + 1}</span>
        <div className="flex items-center gap-2">
          {/* Switch type — locked for conflict_only (must be master) or apprentice_plan (must be apprentice) */}
          {!isConflictOnly && !isApprenticeOnly && (
            <div className="flex rounded overflow-hidden border border-gray-200 text-xs">
              {(['apprentice', 'master'] as const).map(k => (
                <button
                  key={k}
                  onClick={() => {
                    if (draft.kind === k) return;
                    onUpdate(k === 'apprentice'
                      ? { kind: 'apprentice', ingredient: null, color: null }
                      : { kind: 'master', ingredient1: null, ingredient2: null });
                  }}
                  className={`px-2 py-0.5 font-semibold capitalize transition-colors ${
                    draft.kind === k
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          )}
          {isConflictOnly && (
            <span className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold">Master only</span>
          )}
          {isApprenticeOnly && (
            <span className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold">Apprentice only</span>
          )}
          <button
            onClick={onRemove}
            className="text-gray-300 hover:text-red-400 transition-colors text-sm font-bold leading-none"
            title="Remove step"
          >
            ×
          </button>
        </div>
      </div>

      {/* Pickers */}
      {draft.kind === 'apprentice' && (
        <div className="flex flex-wrap gap-3">
          <IngPicker
            label="Ingredient"
            value={draft.ingredient}
            onChange={id => onUpdate({ ...draft, ingredient: id })}
          />
          <ColorPicker
            value={draft.color}
            onChange={c => onUpdate({ ...draft, color: c })}
          />
        </div>
      )}

      {draft.kind === 'master' && (
        <div className="flex flex-wrap gap-3">
          {/* For conflict-only the fixed ingredient is locked — only show it as a badge */}
          {isConflictOnly ? (
            <LockedIngDisplay slotId={(draft as { kind: 'master'; ingredient1: IngredientId | null }).ingredient1} />
          ) : (
            <IngPicker
              label="Ingredient 1"
              value={draft.ingredient1}
              exclude={draft.ingredient2}
              onChange={id => onUpdate({ ...draft, ingredient1: id })}
            />
          )}
          <IngPicker
            label={isConflictOnly ? 'Mix with' : 'Ingredient 2'}
            value={draft.ingredient2}
            exclude={draft.ingredient1}
            onChange={id => onUpdate({ ...draft, ingredient2: id })}
          />
        </div>
      )}
      {draft.kind === 'master' && (
        <p className="text-[10px] text-gray-400 italic">
          The true mix result is publicly declared automatically — no potion selection needed.
        </p>
      )}

      {/* Live outcome */}
      {outcome && (
        <div className="border-t border-gray-100 pt-1.5 flex items-center gap-1.5">
          <span className="text-[10px] text-gray-400">→</span>
          {outcomeLabel}
        </div>
      )}
    </div>
  );
}

// ─── Publications board ───────────────────────────────────────────────────────

function PublicationsBoard({
  publications, removedSet,
}: {
  publications: Publication[];
  removedSet: Set<IngredientId>;
}) {
  const getIngredient = useIngredient();
  return (
    <div className="space-y-1.5">
      <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
        Publications on board
      </span>
      <div className="flex flex-wrap gap-2">
        {publications.map(pub => {
          const removed = removedSet.has(pub.ingredient);
          const { index } = getIngredient(pub.ingredient);
          return (
            <div
              key={pub.ingredient}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-semibold
                transition-all ${
                  removed
                    ? 'border-green-200 bg-green-50 text-green-400 line-through opacity-50'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}
            >
              <IngredientIcon index={index} width={36} />
              <span className="text-gray-300 font-normal">→</span>
              <span className="inline-flex">
                <AlchemicalImage id={pub.claimedAlchemical} width={80} />
              </span>
              {removed && <span className="text-green-500 ml-0.5">✓</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function DebunkAnswerPanel({ onNext, isTutorial = false }: {
  onNext?: () => void;
  isTutorial?: boolean;
}) {
  const { state, dispatch } = useSolver();
  const { puzzle, completed, wrongAttempts, showSolution, worlds } = state;

  const publications: Publication[] = (puzzle.publications ?? []).filter(Boolean) as Publication[];

  const isConflictOnly = puzzle.questions.some(q => q.kind === 'debunk_conflict_only');
  const isApprenticeOnly = puzzle.questions.some(q => q.kind === 'debunk_apprentice_plan');
  const fixedIngredient = puzzle.questions.find(q => q.kind === 'debunk_conflict_only')
    ? (puzzle.questions.find(q => q.kind === 'debunk_conflict_only') as { fixedIngredient?: IngredientId }).fixedIngredient ?? null
    : null;

  const initialDraft = (): DraftStep => isConflictOnly
    ? { kind: 'master', ingredient1: fixedIngredient, ingredient2: null }
    : { kind: 'apprentice', ingredient: null, color: null };

  const [drafts, setDrafts] = useState<DraftStep[]>([initialDraft()]);

  const completedSteps = drafts.filter(isComplete) as DebunkStep[];
  const { outcomes, remainingPubs } = simulatePlan(
    completedSteps, puzzle.solution, publications, worlds
  );
  const removedSet = new Set<IngredientId>(
    outcomes.flatMap(o => o.removed)
  );

  const allStepsComplete = drafts.length > 0 && drafts.every(isComplete);
  const refAnswer = isConflictOnly
    ? puzzle.debunk_answers?.debunk_conflict_only
    : isApprenticeOnly
      ? puzzle.debunk_answers?.debunk_apprentice_plan
      : puzzle.debunk_answers?.debunk_min_steps;
  const refLen = refAnswer?.length ?? 1;

  function addStep() {
    setDrafts(prev => [...prev, initialDraft()]);
  }

  function removeStep(i: number) {
    setDrafts(prev => prev.filter((_, j) => j !== i));
  }

  function updateStep(i: number, d: DraftStep) {
    setDrafts(prev => prev.map((x, j) => j === i ? d : x));
  }

  function handleSubmit() {
    if (!allStepsComplete) return;
    dispatch({
      type: 'SUBMIT_ANSWER',
      answers: [{ kind: 'debunk-plan', steps: completedSteps }],
    });
  }

  // Build solution reveal
  const solutionSteps = refAnswer ?? [];

  return (
    <div className="space-y-4">

      {/* Publications board */}
      <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
        <PublicationsBoard publications={publications} removedSet={removedSet} />
      </div>

      {/* Plan builder */}
      {!completed && !showSolution && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Your plan</span>
            {isConflictOnly
              ? outcomes.length > 0 && outcomes[0].conflicts.length > 0 && (
                <span className="text-[10px] text-green-600 font-semibold">✓ Conflict produced</span>
              )
              : remainingPubs.length === 0 && drafts.length > 0 && (
                <span className="text-[10px] text-green-600 font-semibold">✓ All publications covered</span>
              )
            }
          </div>

          {drafts.map((draft, i) => (
            <StepEditor
              key={i}
              index={i}
              draft={draft}
              outcome={isComplete(draft) ? outcomes[completedSteps.indexOf(draft as DebunkStep)] : undefined}
              onUpdate={d => updateStep(i, d)}
              onRemove={() => removeStep(i)}
              isConflictOnly={isConflictOnly && i === 0}
              isApprenticeOnly={isApprenticeOnly}
            />
          ))}

          {/* Add step button — hidden for conflict-only (exactly 1 step) */}
          {!isConflictOnly && (
            <button
              onClick={addStep}
              className="w-full border-2 border-dashed border-gray-200 hover:border-indigo-300
                         text-gray-400 hover:text-indigo-500 rounded-lg py-2 text-xs font-semibold
                         transition-colors"
            >
              + Add step
            </button>
          )}
        </div>
      )}

      {/* Solution reveal */}
      {showSolution && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 space-y-2">
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
            Reference solution ({solutionSteps.length} step{solutionSteps.length !== 1 ? 's' : ''})
          </span>
          {solutionSteps.map((step, i) => (
            <div key={i} className="text-xs text-indigo-700 flex items-start gap-2">
              <span className="font-bold shrink-0">{i + 1}.</span>
              {step.kind === 'apprentice'
                ? <span>Apprentice — reveal <strong>{step.color}</strong> aspect on ingredient {step.ingredient}</span>
                : <span>Master — mix ingredients {step.ingredient1} + {step.ingredient2}</span>
              }
            </div>
          ))}
        </div>
      )}

      {/* Correct */}
      {completed && (
        <div className="rounded-xl bg-green-50 border border-green-300 p-4 flex items-center
                        justify-between gap-3 flex-wrap animate-fadein">
          <span className="flex items-center gap-2 text-green-800 font-semibold">
            <CorrectIcon width={28} /> Correct! Well debunked.
          </span>
          {onNext && (
            <button onClick={onNext}
              className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700
                         transition-colors focus-visible:outline-none focus-visible:ring-2
                         focus-visible:ring-green-400">
              {isTutorial ? 'Continue →' : 'Next →'}
            </button>
          )}
        </div>
      )}

      {/* Wrong attempt */}
      {!completed && wrongAttempts > 0 && !showSolution && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 space-y-2 animate-fadein">
          <div className="flex items-center gap-2 text-red-700 font-semibold">
            <IncorrectIcon width={24} />
            {isConflictOnly
              ? "That doesn't produce a conflict-only outcome — try again."
              : wrongAttempts < refLen
                ? `Plan has ${drafts.length} step${drafts.length !== 1 ? 's' : ''} — can you do it in ${refLen}?`
                : "That plan doesn't work — check each step removes at least one publication."
            }
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
          onClick={handleSubmit}
          disabled={!allStepsComplete}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold
                     hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed
                     transition-colors focus-visible:outline-none focus-visible:ring-2
                     focus-visible:ring-indigo-400 active:scale-[0.99]"
        >
          Submit Plan ({drafts.length} step{drafts.length !== 1 ? 's' : ''})
        </button>
      )}
    </div>
  );
}
