/**
 * components/DebunkAnswerPanel.tsx
 *
 * Interactive plan builder for debunk-planning puzzle questions.
 * Shows the publications board and a step sequence editor with live simulation.
 */

import { useState } from 'react';
import { useSolver, useIngredient } from '../contexts/SolverContext';
import { IngredientIcon, AlchemicalImage, ElemImage, CorrectIcon, IncorrectIcon } from './GameSprites';
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
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Aspect</span>
      <div className="flex gap-1">
        {colors.map(c => (
          <button
            key={c}
            onClick={() => onChange(c)}
            title={{ R: 'Red', G: 'Green', B: 'Blue' }[c]}
            className={`p-1.5 rounded-lg border-2 transition-all ${
              value === c
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-200 hover:border-gray-400'
            }`}
          >
            <ElemImage color={c} size="L" width={28} />
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
  index, draft, outcome, onUpdate, onRemove, isConflictOnly, showOutcome, isTutorial,
}: {
  index: number;
  draft: DraftStep;
  outcome?: { removed: IngredientId[]; conflicts: IngredientId[] };
  onUpdate: (d: DraftStep) => void;
  onRemove: () => void;
  isConflictOnly: boolean;
  showOutcome: boolean;
  isTutorial: boolean;
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
        <span className="text-xs font-bold text-gray-500">
          Step {index + 1}
          <span className="ml-1.5 normal-case font-normal text-gray-400 capitalize">{draft.kind}</span>
        </span>
        <button
          onClick={onRemove}
          className="text-gray-300 hover:text-red-400 transition-colors text-sm font-bold leading-none"
          title="Remove step"
        >
          ×
        </button>
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
      {draft.kind === 'master' && isTutorial && (
        <p className="text-[10px] text-gray-400 italic">
          The true mix result is publicly declared automatically — no potion selection needed.
        </p>
      )}

      {/* Live outcome */}
      {showOutcome && outcome && (
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

// ─── Visual solution step ─────────────────────────────────────────────────────

function SolutionStep({ step, index }: { step: DebunkStep; index: number }) {
  const getIngredient = useIngredient();
  if (step.kind === 'apprentice') {
    const { index: ingIndex } = getIngredient(step.ingredient);
    return (
      <div className="text-xs text-indigo-700 flex items-center gap-1.5 flex-wrap">
        <span className="font-bold shrink-0">{index + 1}.</span>
        <span className="font-semibold text-indigo-400">Apprentice</span>
        <span className="text-indigo-300">—</span>
        <span>reveal</span>
        <ElemImage color={step.color} size="L" width={20} />
        <span>aspect of</span>
        <IngredientIcon index={ingIndex} width={20} />
      </div>
    );
  }
  const { index: idx1 } = getIngredient(step.ingredient1);
  const { index: idx2 } = getIngredient(step.ingredient2);
  return (
    <div className="text-xs text-indigo-700 flex items-center gap-1.5 flex-wrap">
      <span className="font-bold shrink-0">{index + 1}.</span>
      <span className="font-semibold text-indigo-400">Master</span>
      <span className="text-indigo-300">—</span>
      <span>mix</span>
      <IngredientIcon index={idx1} width={20} />
      <span className="text-indigo-400">+</span>
      <IngredientIcon index={idx2} width={20} />
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

  const isMasterOnly = !isConflictOnly && !isApprenticeOnly;

  const initialDraft = (): DraftStep => isConflictOnly || isMasterOnly
    ? { kind: 'master', ingredient1: isConflictOnly ? fixedIngredient : null, ingredient2: null }
    : { kind: 'apprentice', ingredient: null, color: null };

  const [drafts, setDrafts] = useState<DraftStep[]>([initialDraft()]);
  const [showStepFeedback, setShowStepFeedback] = useState(isTutorial);
  const [showFeedbackConfirm, setShowFeedbackConfirm] = useState(false);

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

  function addStep(kind: 'apprentice' | 'master') {
    const newDraft: DraftStep = kind === 'master'
      ? { kind: 'master', ingredient1: null, ingredient2: null }
      : { kind: 'apprentice', ingredient: null, color: null };
    setDrafts(prev => [...prev, newDraft]);
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

      {/* Step-feedback confirmation modal (non-tutorial only) */}
      {showFeedbackConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
             onClick={() => setShowFeedbackConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4"
               onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900">Enable Step Feedback?</h3>
            <p className="text-sm text-gray-600">
              Step feedback shows the effect of each step as you build your plan — how many publications each action removes or conflicts.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
              Recommended only if you're stuck. Seeing live feedback reduces the challenge.
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowFeedbackConfirm(false)}
                className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-semibold
                           text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowFeedbackConfirm(false); setShowStepFeedback(true); }}
                className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold
                           hover:bg-indigo-700 transition-colors"
              >
                Enable
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plan builder */}
      {!completed && !showSolution && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              {isConflictOnly ? 'Demonstrate a conflict' : isApprenticeOnly ? 'Apprentice plan' : 'Debunk plan'}
            </span>
            <div className="flex items-center gap-3">
              {isConflictOnly
                ? outcomes.length > 0 && outcomes[0].conflicts.length > 0 && (
                  <span className="text-[10px] text-green-600 font-semibold">✓ Conflict produced</span>
                )
                : remainingPubs.length === 0 && drafts.length > 0 && (
                  <span className="text-[10px] text-green-600 font-semibold">✓ All publications covered</span>
                )
              }
              {!isTutorial && (
                <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                  <span className={showStepFeedback ? 'text-indigo-600 font-semibold' : 'text-gray-400'}>
                    Step hints
                  </span>
                  <button
                    role="switch"
                    aria-checked={showStepFeedback}
                    onClick={() => {
                      if (!showStepFeedback) setShowFeedbackConfirm(true);
                      else setShowStepFeedback(false);
                    }}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
                      ${showStepFeedback ? 'bg-indigo-600' : 'bg-gray-200'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow
                      transition-transform ${showStepFeedback ? 'translate-x-4' : 'translate-x-1'}`} />
                  </button>
                </label>
              )}
            </div>
          </div>

          <p className="text-xs text-gray-500">
            {isConflictOnly
              ? 'Find a single master mix that simultaneously contradicts both publications without removing either.'
              : isApprenticeOnly
                ? 'Remove all false publications using only apprentice debunks, in as few steps as possible.'
                : 'Remove all false publications in as few steps as possible.'}
          </p>

          {drafts.map((draft, i) => (
            <StepEditor
              key={i}
              index={i}
              draft={draft}
              outcome={isComplete(draft) ? outcomes[completedSteps.indexOf(draft as DebunkStep)] : undefined}
              onUpdate={d => updateStep(i, d)}
              onRemove={() => removeStep(i)}
              isConflictOnly={isConflictOnly && i === 0}
              showOutcome={showStepFeedback}
              isTutorial={isTutorial}
            />
          ))}

          {/* Add step buttons — hidden for conflict-only (exactly 1 step) */}
          {!isConflictOnly && (
            <div className="flex gap-2">
              {isApprenticeOnly && (
                <button
                  onClick={() => addStep('apprentice')}
                  className="flex-1 border-2 border-dashed border-gray-200 hover:border-indigo-300
                             text-gray-400 hover:text-indigo-500 rounded-lg py-2 text-xs font-semibold
                             transition-colors"
                >
                  + Apprentice step
                </button>
              )}
              {isMasterOnly && (
                <button
                  onClick={() => addStep('master')}
                  className="flex-1 border-2 border-dashed border-gray-200 hover:border-indigo-300
                             text-gray-400 hover:text-indigo-500 rounded-lg py-2 text-xs font-semibold
                             transition-colors"
                >
                  + Master step
                </button>
              )}
            </div>
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
            <SolutionStep key={i} step={step} index={i} />
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
