/**
 * expanded/components/ExpandedCluePanel.tsx
 *
 * Renders the expanded-mode clue list. Aspect clues for the same ingredient
 * are compacted using the shared groupClues logic:
 *   2 aspects → MultiAspectGroupCard
 *   3 aspects → InferredAlchemicalGroupCard
 */

import { ExpandedClueCard } from './ExpandedClueCard';
import { groupClues, MultiAspectGroupCard, InferredAlchemicalGroupCard } from '../../components/ClueGrouping';
import { useExpandedIngredient } from '../contexts/ExpandedSolverContext';
import type { AnyClue } from '../types';

export function ExpandedCluePanel({ clues }: { clues: AnyClue[] }) {
  const getIngredient = useExpandedIngredient();

  if (clues.length === 0) return null;

  const groups = groupClues(clues);

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
        Clues ({clues.length})
      </h3>
      <div className="flex flex-col gap-2">
        {groups.map((g, i) => {
          if (g.type === 'full')  return <InferredAlchemicalGroupCard key={i} clues={g.clues} ingWidth={28} getIngredient={getIngredient} />;
          if (g.type === 'multi') return <MultiAspectGroupCard        key={i} clues={g.clues} ingWidth={28} getIngredient={getIngredient} />;
          return <ExpandedClueCard key={i} clue={g.clue as AnyClue} />;
        })}
      </div>
    </div>
  );
}
