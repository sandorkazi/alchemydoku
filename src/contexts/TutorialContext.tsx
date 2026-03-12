import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

// ─── Step types ───────────────────────────────────────────────────────────────

export type ExplainStep = {
  kind: 'explain';
  id: string;
  title: string;
  body: string;         // plain text, newlines become paragraphs
  emoji?: string;
};

export type PuzzleStep = {
  kind: 'puzzle';
  id: string;
  puzzleId: string;     // must exist in PUZZLE_MAP
  banner: string;       // short instruction shown above the solver
};

export type TutorialStep = ExplainStep | PuzzleStep;

export type TutorialId = 'mixing' | 'selling' | 'two-color' | 'debunk-apprentice' | 'debunk-master';

export type TutorialStatus = 'locked' | 'available' | 'complete';

// ─── Persistence ──────────────────────────────────────────────────────────────

function loadCompleted(): Set<TutorialId> {
  try {
    const raw = localStorage.getItem('alch-tutorials-done');
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

function saveCompleted(ids: Set<TutorialId>) {
  try {
    localStorage.setItem('alch-tutorials-done', JSON.stringify([...ids]));
  } catch { /* ignore */ }
}

// ─── Context ──────────────────────────────────────────────────────────────────

type TutorialContextValue = {
  completedTutorials: Set<TutorialId>;
  markTutorialDone: (id: TutorialId) => void;
  getStatus: (id: TutorialId) => TutorialStatus;
};

const TutorialContext = createContext<TutorialContextValue | null>(null);

export function TutorialProvider({ children }: { children: ReactNode }) {
  const [completedTutorials, setCompleted] = useState<Set<TutorialId>>(loadCompleted);

  const markTutorialDone = useCallback((id: TutorialId) => {
    setCompleted(prev => {
      const next = new Set(prev);
      next.add(id);
      saveCompleted(next);
      return next;
    });
  }, []);

  const getStatus = useCallback((id: TutorialId): TutorialStatus => {
    if (completedTutorials.has(id)) return 'complete';
    // selling unlocks after mixing is complete
    if (id === 'selling' && !completedTutorials.has('mixing')) return 'locked';
    // debunk-master unlocks after debunk-apprentice is complete
    if (id === 'debunk-master' && !completedTutorials.has('debunk-apprentice')) return 'locked';
    return 'available';
  }, [completedTutorials]);

  return (
    <TutorialContext.Provider value={{ completedTutorials, markTutorialDone, getStatus }}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error('useTutorial must be used within TutorialProvider');
  return ctx;
}
