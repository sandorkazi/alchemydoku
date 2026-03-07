import { ClueCard } from './ClueCard';
import type { Clue } from '../types';

type Props = {
  clues: Clue[];
};

export function CluePanel({ clues }: Props) {
  if (clues.length === 0) {
    return (
      <div className="text-sm text-gray-400 italic py-4 text-center">
        No clues given.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
        Given Clues
      </h2>
      <div className="flex flex-col gap-2">
        {clues.map((clue, i) => (
          <ClueCard key={i} clue={clue} />
        ))}
      </div>
    </div>
  );
}
