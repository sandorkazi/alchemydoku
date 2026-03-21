/**
 * expanded/components/ExpandedDebunkAnswerPanel.tsx
 *
 * Interactive plan builder for expanded-mode debunk puzzles.
 * Mirrors DebunkAnswerPanel but uses the expanded solver context and
 * additionally shows the encyclopedia articles board alongside publications.
 */

import { useState } from 'react';
import { useExpandedSolver, useExpandedIngredient } from '../contexts/ExpandedSolverContext';
import { IngredientIcon, AlchemicalImage, ElemImage, SignedElemImage, PotionImage, CorrectIcon, IncorrectIcon } from '../../components/GameSprites';
import { PotionPicker } from '../../components/AnswerPickers';
import { simulateExpandedPlan, simulateExpandedPlanForDisplay } from '../logic/debunkExpanded';
import type { DebunkStep, IngredientId, Color, Publication, PotionResult } from '../../types';
import type { DebunkArticle } from '../types';

// ─── Ingredient picker ────────────────────────────────────────────────────────

function IngPicker({
  label, value, exclude, onChange,
}: {
  label: string;
  value: IngredientId | null;
  exclude?: IngredientId | null;
  onChange: (id: IngredientId) => void;
}) {
  const getIngredient = useExpandedIngredient();
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

// ─── Locked ingredient display (conflict-only) ────────────────────────────────

function LockedIngDisplay({ slotId }: { slotId: IngredientId | null }) {
  const getIngredient = useExpandedIngredient();
  if (!slotId) return null;
  const { index } = getIngredient(slotId);
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Mix with…</span>
      <div className="flex gap-1 items-center">
        <div className="rounded border-2 border-indigo-400 bg-indigo-50 p-0.5 opacity-70 cursor-not-allowed">
          <IngredientIcon index={index} width={24} />
        </div>
        <span className="text-[10px] text-indigo-400 font-semibold">+ ?</span>
      </div>
    </div>
  );
}

// ─── Color picker ─────────────────────────────────────────────────────────────

function ColorPicker({ value, onChange }: { value: Color | null; onChange: (c: Color) => void }) {
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

// ─── Step editor ──────────────────────────────────────────────────────────────

type DraftStep =
  | { kind: 'apprentice'; ingredient: IngredientId | null; color: Color | null }
  | { kind: 'master'; ingredient1: IngredientId | null; ingredient2: IngredientId | null; claimedPotion?: PotionResult | null };

function isComplete(s: DraftStep): s is DebunkStep {
  if (s.kind === 'apprentice') return s.ingredient !== null && s.color !== null;
  return s.ingredient1 !== null && s.ingredient2 !== null && s.claimedPotion != null;
}

// ─── Visual solution step ─────────────────────────────────────────────────────

function SolutionStep({ step, index }: { step: DebunkStep; index: number }) {
  const getIngredient = useExpandedIngredient();
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
      {step.claimedPotion && (
        <>
          <span className="text-indigo-300">claiming</span>
          <PotionImage result={step.claimedPotion} width={20} />
        </>
      )}
    </div>
  );
}

// ─── Step editor ──────────────────────────────────────────────────────────────

function StepEditor({
  index, draft, outcome, onUpdate, onRemove, isConflictOnly, isIngredientLocked, isApprenticeOnly, showOutcome,
}: {
  index: number;
  draft: DraftStep;
  outcome?: { removedPubs: IngredientId[]; removedArts: string[]; conflicts: IngredientId[] };
  onUpdate: (d: DraftStep) => void;
  onRemove: () => void;
  isConflictOnly: boolean;
  isIngredientLocked: boolean;
  isApprenticeOnly?: boolean;
  showOutcome: boolean;
}) {
  const totalRemoved = (outcome?.removedPubs.length ?? 0) + (outcome?.removedArts.length ?? 0);

  const outcomeLabel = (() => {
    if (!outcome) return null;
    if (totalRemoved > 0) {
      const parts: string[] = [];
      if (outcome.removedPubs.length > 0)
        parts.push(`${outcome.removedPubs.length} publication${outcome.removedPubs.length > 1 ? 's' : ''}`);
      if (outcome.removedArts.length > 0)
        parts.push(`${outcome.removedArts.length} article${outcome.removedArts.length > 1 ? 's' : ''}`);
      return (
        <span className="text-green-700 text-xs font-semibold">
          ✓ Removes {parts.join(' + ')}
        </span>
      );
    }
    if (outcome.conflicts.length > 0) {
      return (
        <span className={`text-xs font-semibold ${isConflictOnly ? 'text-green-700' : 'text-amber-600'}`}>
          {isConflictOnly ? '✓ Conflict — counts towards cover' : '⚡ Conflict — neither publication removed'}
        </span>
      );
    }
    return <span className="text-red-400 text-xs">No effect — try a different action</span>;
  })();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-500">Step {index + 1}</span>
        <div className="flex items-center gap-2">
          {!isConflictOnly && !isApprenticeOnly && (
            <div className="flex rounded overflow-hidden border border-gray-200 text-xs">
              {(['apprentice', 'master'] as const).map(k => (
                <button
                  key={k}
                  onClick={() => {
                    if (draft.kind === k) return;
                    onUpdate(k === 'apprentice'
                      ? { kind: 'apprentice', ingredient: null, color: null }
                      : { kind: 'master', ingredient1: null, ingredient2: null, claimedPotion: null });
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

      {draft.kind === 'apprentice' && (
        <div className="flex flex-wrap gap-3">
          <IngPicker label="Ingredient" value={draft.ingredient}
            onChange={id => onUpdate({ ...draft, ingredient: id })} />
          <ColorPicker value={draft.color} onChange={c => onUpdate({ ...draft, color: c })} />
        </div>
      )}

      {draft.kind === 'master' && (
        <div className="flex flex-wrap gap-3">
          {isIngredientLocked ? (
            <LockedIngDisplay slotId={(draft as { kind: 'master'; ingredient1: IngredientId | null }).ingredient1} />
          ) : (
            <IngPicker label="Ingredient 1" value={draft.ingredient1} exclude={draft.ingredient2}
              onChange={id => onUpdate({ ...draft, ingredient1: id })} />
          )}
          <IngPicker
            label={isIngredientLocked ? 'Mix with' : 'Ingredient 2'}
            value={draft.ingredient2}
            exclude={draft.ingredient1}
            onChange={id => onUpdate({ ...draft, ingredient2: id })}
          />
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Claimed Potion</span>
            <PotionPicker
              selected={draft.claimedPotion ?? null}
              onSelect={p => onUpdate({ ...draft, claimedPotion: p })}
              potionWidth={32}
            />
          </div>
        </div>
      )}

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
  publications, removedPubSet, conflictedPubSet,
}: {
  publications: Publication[];
  removedPubSet: Set<IngredientId>;
  conflictedPubSet: Set<IngredientId>;
}) {
  const getIngredient = useExpandedIngredient();
  if (publications.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
        Publications on board
      </span>
      <div className="flex flex-wrap gap-2">
        {publications.map(pub => {
          const removed = removedPubSet.has(pub.ingredient);
          const conflicted = !removed && conflictedPubSet.has(pub.ingredient);
          const { index } = getIngredient(pub.ingredient);
          return (
            <div
              key={pub.ingredient}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-semibold
                transition-all ${
                  removed
                    ? 'border-green-200 bg-green-50 text-green-400 line-through opacity-50'
                    : conflicted
                      ? 'border-amber-200 bg-amber-50 text-amber-700'
                      : 'border-red-200 bg-red-50 text-red-700'
                }`}
            >
              <IngredientIcon index={index} width={36} />
              <span className="text-gray-300 font-normal">→</span>
              <span className="inline-flex">
                <AlchemicalImage id={pub.claimedAlchemical} width={44} />
              </span>
              {removed && <span className="text-green-500 ml-0.5">✓</span>}
              {conflicted && <span className="ml-0.5">⚡</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Articles board ───────────────────────────────────────────────────────────

const ASPECT_COLOR_CLS: Record<string, string> = {
  R: 'bg-red-50 border-red-200 text-red-700',
  G: 'bg-green-50 border-green-200 text-green-700',
  B: 'bg-blue-50 border-blue-200 text-blue-700',
};


function ArticlesBoard({
  articles, removedArtSet,
}: {
  articles: DebunkArticle[];
  removedArtSet: Set<string>;
}) {
  const getIngredient = useExpandedIngredient();
  if (articles.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
        Encyclopedia articles on board
      </span>
      <div className="flex flex-wrap gap-2">
        {articles.map(art => {
          const removed = removedArtSet.has(art.id);
          const artCls = ASPECT_COLOR_CLS[art.aspect] ?? 'bg-gray-50 border-gray-200 text-gray-700';
          return (
            <div
              key={art.id}
              className={`px-2 py-1.5 rounded-lg border text-xs transition-all ${
                removed
                  ? 'border-green-200 bg-green-50 opacity-50'
                  : artCls
              }`}
            >
              <div className={`flex items-center gap-1 mb-1 ${removed ? 'line-through text-green-400' : ''}`}>
                <ElemImage color={art.aspect as 'R'|'G'|'B'} size="S" width={12} />
                <span className="font-bold text-[10px] uppercase tracking-widest">article</span>
                {removed && <span className="text-green-500 ml-0.5">✓</span>}
              </div>
              <div className={`flex flex-wrap gap-1 ${removed ? 'opacity-60' : ''}`}>
                {art.entries.map((entry, ei) => {
                  const { index } = getIngredient(entry.ingredient);
                  return (
                    <span key={ei} className="flex items-center gap-0.5">
                      <IngredientIcon index={index} width={16} />
                      <SignedElemImage color={art.aspect as 'R'|'G'|'B'} sign={entry.sign} width={14} />
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

type QuestionPlan = {
  drafts: DraftStep[];
  isConflictOnly: boolean;
  isApprenticeOnly: boolean;
  fixedIngredient: IngredientId | null;
};

function makeInitialPlan(q: { kind: string; fixedIngredient?: IngredientId }): QuestionPlan {
  const isConflictOnly = q.kind === 'debunk_conflict_only';
  const isApprenticeOnly = q.kind === 'debunk_apprentice_plan';
  const fixedIngredient = isConflictOnly ? (q.fixedIngredient ?? null) : null;
  const initialDraft: DraftStep = isConflictOnly
    ? { kind: 'master', ingredient1: fixedIngredient, ingredient2: null, claimedPotion: null }
    : { kind: 'apprentice', ingredient: null, color: null };
  return { drafts: [initialDraft], isConflictOnly, isApprenticeOnly, fixedIngredient };
}

export function ExpandedDebunkAnswerPanel({ onNext, isTutorial = false }: {
  onNext?: () => void;
  isTutorial?: boolean;
}) {
  const { state, dispatch } = useExpandedSolver();
  const { puzzle, completed, wrongAttempts, showSolution, worlds } = state;

  const publications: Publication[] = (puzzle.publications ?? []).filter(Boolean) as Publication[];
  const articles: DebunkArticle[] = puzzle.articles ?? [];
  const debunkQuestions = puzzle.questions.filter(
    q => q.kind === 'debunk_min_steps' || q.kind === 'debunk_apprentice_plan' || q.kind === 'debunk_conflict_only'
  ) as Array<{ kind: string; fixedIngredient?: IngredientId }>;

  const [plans, setPlans] = useState<QuestionPlan[]>(
    () => debunkQuestions.map(q => makeInitialPlan(q))
  );
  const [showStepFeedback, setShowStepFeedback] = useState(isTutorial);
  const [showFeedbackConfirm, setShowFeedbackConfirm] = useState(false);

  function updatePlan(qi: number, newDrafts: DraftStep[]) {
    setPlans(prev => prev.map((p, i) => i === qi ? { ...p, drafts: newDrafts } : p));
  }

  // Simulate all plans sequentially against a shared board state
  // (each question's plan acts on the result of the previous question's plan)
  // Actually, questions are INDEPENDENT — each validated separately against the full board.
  // Simulation for display: show per-plan outcomes independently.
  const simulations = plans.map(plan => {
    const completedSteps = plan.drafts.filter(isComplete) as DebunkStep[];
    return simulateExpandedPlan(completedSteps, puzzle.solution, publications, articles, worlds, plan.isConflictOnly);
  });

  // Display sets: based on all publications + claims only, never the hidden truth
  const allCompletedSteps = plans.flatMap(p => p.drafts.filter(isComplete) as DebunkStep[]);
  const displayOutcomes = simulateExpandedPlanForDisplay(allCompletedSteps, puzzle.solution, publications, worlds);
  const removedPubSet = new Set<IngredientId>(displayOutcomes.flatMap(o => o.removedPubs));
  const conflictedPubSet = new Set<IngredientId>(displayOutcomes.flatMap(o => o.conflicts));
  // Article removals still require the worlds set (definitively-known check), use validation sim
  const removedArtSet = new Set<string>(
    simulations.flatMap(s => s.outcomes.flatMap(o => o.removedArts))
  );

  const allStepsComplete = plans.every(p => p.drafts.length > 0 && p.drafts.every(isComplete));

  function handleSubmit() {
    if (!allStepsComplete) return;
    const answers = plans.map(plan => ({
      kind: 'debunk-plan' as const,
      steps: plan.drafts.filter(isComplete) as DebunkStep[],
    }));
    dispatch({ type: 'SUBMIT_ANSWER', answers });
  }

  return (
    <div className="space-y-4">

      {/* Board */}
      <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 space-y-3">
        <PublicationsBoard publications={publications} removedPubSet={removedPubSet} conflictedPubSet={conflictedPubSet} />
        <ArticlesBoard articles={articles} removedArtSet={removedArtSet} />
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

      {/* One plan section per debunk question */}
      {!completed && !showSolution && plans.map((plan, qi) => {
        const sim = simulations[qi];
        const completedSteps = plan.drafts.filter(isComplete) as DebunkStep[];
        const refAnswer = plan.isConflictOnly
          ? puzzle.debunk_answers?.debunk_conflict_only
          : plan.isApprenticeOnly
            ? puzzle.debunk_answers?.debunk_apprentice_plan
            : puzzle.debunk_answers?.debunk_min_steps;
        const refLen = refAnswer?.length ?? 1;

        const conflictCoveredIds = new Set<IngredientId>(sim.outcomes.flatMap(o => o.conflicts));
        const falsePubIngredients = plan.isConflictOnly
          ? publications
              .filter(p => puzzle.solution[p.ingredient] !== p.claimedAlchemical)
              .map(p => p.ingredient)
          : [];
        const allCoveredForQ = plan.isConflictOnly
          ? falsePubIngredients.length > 0 && falsePubIngredients.every(id => conflictCoveredIds.has(id))
          : sim.remainingPubs.length === 0 && sim.remainingArts.length === 0;

        function addStep() {
          const initialDraft: DraftStep = plan.isApprenticeOnly
            ? { kind: 'apprentice', ingredient: null, color: null }
            : { kind: 'master', ingredient1: null, ingredient2: null, claimedPotion: null };
          updatePlan(qi, [...plan.drafts, initialDraft]);
        }

        return (
          <div key={qi} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                {debunkQuestions.length > 1 ? `Q${qi + 1}: ` : ''}
                {plan.isConflictOnly ? 'Demonstrate a conflict' : plan.isApprenticeOnly ? 'Apprentice plan' : 'Debunk plan'}
              </span>
              <div className="flex items-center gap-3">
                {showStepFeedback && allCoveredForQ && plan.drafts.length > 0 && (
                  <span className="text-[10px] text-green-600 font-semibold">
                    {plan.isConflictOnly ? '✓ All publications in conflict' : '✓ All targets covered'}
                  </span>
                )}
                {!isTutorial && qi === 0 && (
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
              {plan.isConflictOnly
                ? 'Find a minimal number of master mixes which will cover all incorrect publications with contradictions (at least 1 for each), without removing any. The covered publications shown are those whose claims are contradicted by the mix — not removals. An ingredient can help disprove another\'s publication without its own claim being contested.'
                : plan.isApprenticeOnly
                  ? 'Remove all false publications using only apprentice debunks, in as few steps as possible.'
                  : 'Remove all false publications in as few steps as possible.'}
            </p>

            {plan.drafts.map((draft, i) => {
              const stepIdx = completedSteps.indexOf(draft as DebunkStep);
              return (
                <StepEditor
                  key={i}
                  index={i}
                  draft={draft}
                  outcome={isComplete(draft) && stepIdx >= 0 ? sim.outcomes[stepIdx] : undefined}
                  onUpdate={d => {
                    const newDrafts = plan.drafts.map((x, j) => j === i ? d : x);
                    updatePlan(qi, newDrafts);
                  }}
                  onRemove={() => updatePlan(qi, plan.drafts.filter((_, j) => j !== i))}
                  isConflictOnly={plan.isConflictOnly}
                  isIngredientLocked={plan.isConflictOnly && i === 0}
                  isApprenticeOnly={plan.isApprenticeOnly}
                  showOutcome={showStepFeedback}
                />
              );
            })}

            <button
              onClick={addStep}
              className="w-full border-2 border-dashed border-gray-200 hover:border-indigo-300
                         text-gray-400 hover:text-indigo-500 rounded-lg py-2 text-xs font-semibold
                         transition-colors"
            >
              + Add step
            </button>

            {/* Wrong attempt hint for this question */}
            {!completed && wrongAttempts > 0 && !showSolution && (
              <p className="text-[10px] text-red-400">
                {plan.isConflictOnly
                  ? (plan.drafts.length < refLen
                    ? `Q${qi + 1}: plan uses ${plan.drafts.length} step${plan.drafts.length !== 1 ? 's' : ''} — at least ${refLen} are needed.`
                    : plan.drafts.length > refLen
                      ? `Q${qi + 1}: plan uses ${plan.drafts.length} step${plan.drafts.length !== 1 ? 's' : ''} — needs exactly ${refLen}.`
                      : `Q${qi + 1}: plan doesn't cover all publications with conflicts.`)
                  : `Q${qi + 1}: plan uses ${plan.drafts.length} step${plan.drafts.length !== 1 ? 's' : ''}${refLen ? ` (optimal: ${refLen})` : ''}.`
                }
              </p>
            )}
          </div>
        );
      })}

      {/* Solution reveal */}
      {showSolution && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 space-y-3">
          {debunkQuestions.map((_q, qi) => {
            const plan = plans[qi];
            const refAnswer = plan.isConflictOnly
              ? puzzle.debunk_answers?.debunk_conflict_only
              : plan.isApprenticeOnly
                ? puzzle.debunk_answers?.debunk_apprentice_plan
                : puzzle.debunk_answers?.debunk_min_steps;
            const solutionSteps = refAnswer ?? [];
            return (
              <div key={qi}>
                {debunkQuestions.length > 1 && (
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                    Q{qi + 1}: {plan.isConflictOnly ? 'Conflict' : 'Min steps'}
                  </span>
                )}
                <div className="space-y-1 mt-1">
                  {solutionSteps.map((step, i) => (
                    <SolutionStep key={i} step={step} index={i} />
                  ))}
                </div>
              </div>
            );
          })}
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
            <IncorrectIcon width={24} /> One or more plans are incorrect — review each plan above.
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
          Submit {plans.length > 1 ? `${plans.length} Plans` : 'Plan'}
        </button>
      )}
    </div>
  );
}
