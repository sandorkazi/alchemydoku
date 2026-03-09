import { ClueCard, MultiAspectClueCard } from './ClueCard';
import { ALCHEMICALS } from '../data/alchemicals';
import { useIngredient } from '../contexts/SolverContext';
import { AlchemicalImage, IngredientIcon } from './GameSprites';
import { INGREDIENTS } from '../data/ingredients';
import type { Clue, AlchemicalId, Color, Sign } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type AspectClue = Extract<Clue, { kind: 'aspect' }>;

function alchemicalFromSigns(R: Sign, G: Sign, B: Sign): AlchemicalId | null {
  for (const [id, alch] of Object.entries(ALCHEMICALS) as [string, typeof ALCHEMICALS[1]][]) {
    if (alch.R.sign === R && alch.G.sign === G && alch.B.sign === B)
      return Number(id) as AlchemicalId;
  }
  return null;
}

// ─── Known-alchemical card (derived from 3 aspect clues) ─────────────────────

function InferredAlchemicalCard({ clues }: { clues: AspectClue[] }) {
  const getIngredient = useIngredient();
  const slotId = clues[0].ingredient;
  const { displayId, index } = getIngredient(slotId);
  const name = INGREDIENTS[displayId as 1].name;

  const signs: Partial<Record<Color, Sign>> = {};
  for (const c of clues) signs[c.color] = c.sign;
  const alchId = alchemicalFromSigns(signs.R!, signs.G!, signs.B!);

  return (
    <div className="rounded-lg border border-green-200 bg-green-50 text-green-700 p-2 space-y-1.5 min-w-[100px]">
      <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70 flex items-center gap-1">
        📌 Known Alchemical
      </div>
      <div className="text-sm flex items-center gap-2 flex-wrap">
        <span title={name} aria-label={name}>
          <IngredientIcon index={index} width={36} />
        </span>
        <span className="text-gray-400 text-xs">→</span>
        {alchId
          ? <AlchemicalImage id={alchId} width={80} title={ALCHEMICALS[alchId].code} />
          : <span className="text-xs text-green-600 italic">3 aspects known</span>
        }
      </div>
    </div>
  );
}

// ─── Grouping ─────────────────────────────────────────────────────────────────

type ClueGroup =
  | { type: 'single'; clue: Clue }
  | { type: 'multi'; clues: AspectClue[] }   // 2 aspects, same ingredient
  | { type: 'full';  clues: AspectClue[] };  // 3 aspects, same ingredient

function groupClues(clues: Clue[]): ClueGroup[] {
  // Collect all aspect clues per ingredient
  const aspectsByIng = new Map<number, AspectClue[]>();
  for (const c of clues) {
    if (c.kind === 'aspect') {
      const list = aspectsByIng.get(c.ingredient) ?? [];
      list.push(c);
      aspectsByIng.set(c.ingredient, list);
    }
  }

  const consumed = new Set<Clue>();
  const groups: ClueGroup[] = [];

  for (const clue of clues) {
    if (consumed.has(clue)) continue;

    if (clue.kind !== 'aspect') {
      groups.push({ type: 'single', clue });
      continue;
    }

    const siblings = aspectsByIng.get(clue.ingredient) ?? [];
    if (siblings.length === 3 && !consumed.has(siblings[0])) {
      for (const s of siblings) consumed.add(s);
      groups.push({ type: 'full', clues: siblings });
    } else if (siblings.length === 2 && !consumed.has(siblings[0])) {
      for (const s of siblings) consumed.add(s);
      groups.push({ type: 'multi', clues: siblings });
    } else if (!consumed.has(clue)) {
      consumed.add(clue);
      groups.push({ type: 'single', clue });
    }
  }

  return groups;
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export function CluePanel({ clues }: { clues: Clue[] }) {
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
          if (g.type === 'multi')  return <MultiAspectClueCard key={i} clues={g.clues} />;
          return <InferredAlchemicalCard key={i} clues={g.clues} />;
        })}
      </div>
    </div>
  );
}
