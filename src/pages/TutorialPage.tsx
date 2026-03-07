import { useState } from 'react';
import { useTutorial, type TutorialId } from '../contexts/TutorialContext';
import { PuzzleSolverPage } from './PuzzleSolverPage';
import { PUZZLE_MAP } from '../data/puzzles/index';
import type { TutorialStep } from '../contexts/TutorialContext';

// ─── Explain card ─────────────────────────────────────────────────────────────

function ExplainCard({
  step,
  onNext,
  isLast,
}: {
  step: Extract<TutorialStep, { kind: 'explain' }>;
  onNext: () => void;
  isLast: boolean;
}) {
  const lines = step.body.split('\n').filter(l => l.trim() !== '');
  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center pt-12 px-4 pb-10 animate-fadein">
      <div className="w-full max-w-lg space-y-6">
        <div className="bg-white rounded-2xl border shadow-sm p-6 sm:p-8 space-y-5">
          <div className="text-center space-y-2">
            <div className="text-5xl" aria-hidden="true">{step.emoji ?? '📖'}</div>
            <h2 className="text-xl font-bold text-gray-900">{step.title}</h2>
          </div>
          <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
            {lines.map((line, i) => <p key={i}>{line}</p>)}
          </div>
          <button
            onClick={onNext}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold
                       hover:bg-indigo-700 transition-colors active:scale-[0.99]
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            {isLast ? 'Done ✓' : 'Continue →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function TutorialProgress({
  current,
  total,
  onBack,
}: {
  current: number;
  total: number;
  onBack: () => void;
}) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="bg-white border-b sticky top-0 z-20">
      <div className="max-w-lg mx-auto px-4 py-2.5 flex items-center gap-3">
        <button
          onClick={onBack}
          aria-label="Exit tutorial"
          className="text-sm text-gray-500 hover:text-gray-800 transition-colors shrink-0
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded"
        >
          ← Exit
        </button>
        <div
          className="flex-1 bg-gray-100 rounded-full h-1.5"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Tutorial progress: step ${current + 1} of ${total}`}
        >
          <div
            className="h-1.5 rounded-full bg-indigo-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs text-gray-400 shrink-0 tabular-nums">
          {current + 1}/{total}
        </span>
      </div>
    </div>
  );
}

// ─── Tutorial banner shown above puzzle steps ─────────────────────────────────

function TutorialBanner({ text }: { text: string }) {
  return (
    <div className="bg-purple-50 border-b border-purple-100 px-4 py-2 sticky top-[49px] z-10">
      <div className="max-w-6xl mx-auto flex items-start gap-2">
        <span className="text-purple-400 text-sm shrink-0 mt-0.5" aria-hidden="true">💡</span>
        <p className="text-sm text-purple-800">{text}</p>
      </div>
    </div>
  );
}

// ─── TutorialPage ─────────────────────────────────────────────────────────────

export function TutorialPage({
  tutorialId,
  steps,
  onBack,
  onDone,
}: {
  tutorialId: TutorialId;
  steps: TutorialStep[];
  onBack: () => void;
  onDone: () => void;
}) {
  const { markTutorialDone } = useTutorial();
  // Step index is local state — context only tracks completion, not current step
  const [stepIndex, setStepIndex] = useState(0);

  const step = steps[stepIndex];

  function handleNext() {
    const next = stepIndex + 1;
    if (next >= steps.length) {
      markTutorialDone(tutorialId);
      onDone();
    } else {
      setStepIndex(next);
    }
  }

  if (!step) {
    markTutorialDone(tutorialId);
    onDone();
    return null;
  }

  const isLastStep = stepIndex === steps.length - 1;

  return (
    <>
      <TutorialProgress current={stepIndex} total={steps.length} onBack={onBack} />

      {step.kind === 'explain' && (
        <ExplainCard step={step} onNext={handleNext} isLast={isLastStep} />
      )}

      {step.kind === 'puzzle' && (() => {
        const puzzle = PUZZLE_MAP[step.puzzleId];
        if (!puzzle) return (
          <div className="p-8 text-center text-red-500">
            Puzzle "{step.puzzleId}" not found.
            <button onClick={handleNext} className="block mx-auto mt-4 text-indigo-500 underline">
              Skip
            </button>
          </div>
        );
        return (
          <>
            {step.banner && <TutorialBanner text={step.banner} />}
            <PuzzleSolverPage
              puzzle={puzzle}
              onBack={onBack}
              onNext={handleNext}
              isTutorial
            />
          </>
        );
      })()}
    </>
  );
}
