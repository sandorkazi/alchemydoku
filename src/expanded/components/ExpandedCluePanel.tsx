/**
 * expanded/components/ExpandedCluePanel.tsx
 *
 * Renders the expanded-mode clue list. Aspect clues for the same ingredient
 * are compacted using the shared groupClues logic:
 *   2 aspects → MultiAspectGroupCard
 *   3 aspects → InferredAlchemicalGroupCard
 */

import { ExpandedClueCard } from './ExpandedClueCard';
import { groupClues, MultiAspectGroupCard, InferredAlchemicalGroupCard, CollapsibleClueWrapper, clueGroupLabel } from '../../components/ClueGrouping';
import { useExpandedIngredient } from '../contexts/ExpandedSolverContext';
import type { AnyClue } from '../types';

/**
 * Replace each EncyclopediaClue with one synthetic AspectClue per entry so
 * the shared groupClues() logic can compact same-ingredient entries into
 * "Known Components" (2) or "Known Alchemical" (3) cards, exactly like real
 * aspect clues.  EncyclopediaUncertainClue entries stay as a single card.
 */
function flattenEncyclopedia(clues: AnyClue[]): AnyClue[] {
  const flat: AnyClue[] = [];
  for (const clue of clues) {
    if (clue.kind === 'encyclopedia') {
      for (const entry of clue.entries) {
        flat.push({ kind: 'aspect', ingredient: entry.ingredient, color: clue.aspect, sign: entry.sign } as AnyClue);
      }
    } else {
      flat.push(clue);
    }
  }
  return flat;
}

export function ExpandedCluePanel({ clues }: { clues: AnyClue[] }) {
  const getIngredient = useExpandedIngredient();

  if (clues.length === 0) return null;

  const groups = groupClues(flattenEncyclopedia(clues));

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
        Clues ({clues.length})
      </h3>
      <div className="flex flex-col gap-2">
        {groups.map((g, i) => (
          <CollapsibleClueWrapper key={i} label={clueGroupLabel(g)}>
            {g.type === 'full'
              ? <InferredAlchemicalGroupCard clues={g.clues} ingWidth={28} getIngredient={getIngredient} />
              : g.type === 'multi'
                ? <MultiAspectGroupCard clues={g.clues} ingWidth={28} getIngredient={getIngredient} />
                : <ExpandedClueCard clue={g.clue as AnyClue} clueIndex={clues.indexOf(g.clue as AnyClue)} />
            }
          </CollapsibleClueWrapper>
        ))}
      </div>
    </div>
  );
}
