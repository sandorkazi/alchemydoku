import { ClueCard } from './ClueCard';
import { groupClues, MultiAspectGroupCard, InferredAlchemicalGroupCard } from './ClueGrouping';
import { useIngredient } from '../contexts/SolverContext';
import type { Clue } from '../types';

export function CluePanel({ clues }: { clues: Clue[] }) {
  const getIngredient = useIngredient();

  if (clues.length === 0) {
    return (
      <div className="text-sm text-gray-400 italic py-4 text-center">
        No clues given.
      </div>
    );
  }

  const groups = groupClues(clues);

  return (
    <div className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
        Given Clues
      </h2>
      <div className="flex flex-col gap-2">
        {groups.map((g, i) => {
          if (g.type === 'single') return <ClueCard key={i} clue={g.clue} />;
          if (g.type === 'multi')  return <MultiAspectGroupCard        key={i} clues={g.clues} ingWidth={36} getIngredient={getIngredient} />;
          return               <InferredAlchemicalGroupCard key={i} clues={g.clues} ingWidth={36} getIngredient={getIngredient} />;
        })}
      </div>
    </div>
  );
}
