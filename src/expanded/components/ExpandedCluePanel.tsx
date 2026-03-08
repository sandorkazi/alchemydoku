/**
 * expanded/components/ExpandedCluePanel.tsx
 */

import { ExpandedClueCard } from './ExpandedClueCard';
import type { AnyClue } from '../types';

export function ExpandedCluePanel({ clues }: { clues: AnyClue[] }) {
  if (clues.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
        Clues ({clues.length})
      </h3>
      {clues.map((c, i) => (
        <ExpandedClueCard key={i} clue={c} />
      ))}
    </div>
  );
}
