/**
 * Shared clue-grouping logic and grouped card components, used by both
 * CluePanel (base game) and ExpandedCluePanel (expanded mode).
 *
 * Components that need ingredient display info accept a `getIngredient`
 * callback instead of calling a context hook directly, so this file has
 * zero context dependencies.
 */

import React, { useState } from 'react';
import { ALCHEMICALS } from '../data/alchemicals';
import { INGREDIENTS } from '../data/ingredients';
import { AlchemicalImage, IngredientIcon, SignedElemImage } from './GameSprites';
import type { AlchemicalId, Color, Sign } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Minimal clue shape needed for grouping — works for both Clue and AnyClue. */
type GroupableClue = { kind: string; ingredient?: number };
type AspectClue = { kind: 'aspect'; ingredient: number; color: string; sign: '+' | '-' };

export type ClueGroup<C extends GroupableClue = GroupableClue> =
  | { type: 'single'; clue: C }
  | { type: 'multi'; clues: AspectClue[] }
  | { type: 'full';  clues: AspectClue[] };

export type GetIngredient = (slotId: number) => { displayId: number; index: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 };

// ─── Grouping ─────────────────────────────────────────────────────────────────

export function groupClues<C extends GroupableClue>(clues: C[]): ClueGroup<C>[] {
  const aspectsByIng = new Map<number, AspectClue[]>();
  for (const c of clues) {
    if (c.kind === 'aspect') {
      const ac = c as unknown as AspectClue;
      const list = aspectsByIng.get(ac.ingredient) ?? [];
      list.push(ac);
      aspectsByIng.set(ac.ingredient, list);
    }
  }

  const consumed = new Set<GroupableClue>();
  const groups: ClueGroup<C>[] = [];

  for (const clue of clues) {
    if (consumed.has(clue)) continue;

    if (clue.kind !== 'aspect') {
      groups.push({ type: 'single', clue });
      continue;
    }

    const ac = clue as unknown as AspectClue;
    const siblings = aspectsByIng.get(ac.ingredient) ?? [];

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

// ─── Shared helpers ───────────────────────────────────────────────────────────

function alchemicalFromSigns(R: Sign, G: Sign, B: Sign): AlchemicalId | null {
  for (const [id, alch] of Object.entries(ALCHEMICALS) as [string, typeof ALCHEMICALS[1]][]) {
    if (alch.R.sign === R && alch.G.sign === G && alch.B.sign === B)
      return Number(id) as AlchemicalId;
  }
  return null;
}

// ─── Shared card components ───────────────────────────────────────────────────

const ASPECT_BADGE = 22;

/**
 * Ingredient icon with two aspect-orb badges overlapping the top edge.
 * getIngredient is passed as a prop so this is context-free.
 */
export function IngDualBadge({ slotId, badge1, badge2, title1, title2, ingWidth, getIngredient }: {
  slotId: number;
  badge1: React.ReactNode; badge2: React.ReactNode;
  title1: string; title2: string;
  ingWidth: number;
  getIngredient: GetIngredient;
}) {
  const { displayId, index } = getIngredient(slotId);
  const name = INGREDIENTS[displayId as 1]?.name ?? `#${slotId}`;
  const leftX  = ingWidth / 2 - 11;
  const rightX = ingWidth / 2 - 11 + 14;
  return (
    <div
      className="relative inline-block"
      style={{ paddingTop: ASPECT_BADGE / 2, width: ingWidth + 14 }}
      title={`${name}: ${title1}, ${title2}`}
      aria-label={`${name}: ${title1} and ${title2}`}
    >
      <div className="absolute z-10 drop-shadow" style={{ top: 0, left: leftX }}>{badge1}</div>
      <div className="absolute z-20 drop-shadow" style={{ top: 0, left: rightX }}>{badge2}</div>
      <div style={{ marginLeft: 7 }}>
        <IngredientIcon index={index} width={ingWidth} />
      </div>
    </div>
  );
}

/** "Known Components" card for 2 aspect clues on the same ingredient. */
export function MultiAspectGroupCard({ clues, ingWidth, getIngredient }: {
  clues: AspectClue[];
  ingWidth: number;
  getIngredient: GetIngredient;
}) {
  const colorNames: Record<string, string> = { R: 'Red', G: 'Green', B: 'Blue' };
  const [a, b] = clues;
  const t = (c: string, s: string) => `${colorNames[c]} ${s === '+' ? 'positive' : 'negative'}`;
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 text-blue-800 p-2 space-y-1.5 min-w-[100px]">
      <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70 flex items-center gap-1">
        📋 Known Components
      </div>
      <div className="text-sm">
        <IngDualBadge
          slotId={a.ingredient}
          badge1={<SignedElemImage color={a.color as Color} sign={a.sign} width={ASPECT_BADGE} />}
          badge2={<SignedElemImage color={b.color as Color} sign={b.sign} width={ASPECT_BADGE} />}
          title1={t(a.color, a.sign)}
          title2={t(b.color, b.sign)}
          ingWidth={ingWidth}
          getIngredient={getIngredient}
        />
      </div>
    </div>
  );
}

/** "Known Alchemical" card derived from 3 aspect clues. */
export function InferredAlchemicalGroupCard({ clues, ingWidth, getIngredient }: {
  clues: AspectClue[];
  ingWidth: number;
  getIngredient: GetIngredient;
}) {
  const slotId = clues[0].ingredient;
  const { displayId, index } = getIngredient(slotId);
  const name = INGREDIENTS[displayId as 1]?.name ?? `#${slotId}`;

  const signs: Partial<Record<Color, Sign>> = {};
  for (const c of clues) signs[c.color as Color] = c.sign;
  const alchId = alchemicalFromSigns(signs.R!, signs.G!, signs.B!);

  return (
    <div className="rounded-lg border border-green-200 bg-green-50 text-green-700 p-2 space-y-1.5 min-w-[100px]">
      <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70 flex items-center gap-1">
        📌 Known Alchemical
      </div>
      <div className="text-sm flex items-center gap-2 flex-wrap">
        <span title={name} aria-label={name}>
          <IngredientIcon index={index} width={ingWidth} />
        </span>
        <span className="text-gray-400 text-xs">→</span>
        {alchId
          ? <AlchemicalImage id={alchId} width={44} title={ALCHEMICALS[alchId].code} />
          : <span className="text-xs text-green-600 italic">3 aspects known</span>
        }
      </div>
    </div>
  );
}

// ─── Collapsible wrapper ──────────────────────────────────────────────────────

/** Short label shown in the collapsed pill for each group type / clue kind. */
export function clueGroupLabel(g: ClueGroup): string {
  if (g.type === 'full')  return '📌 Known Alchemical';
  if (g.type === 'multi') return '📋 Known Components';
  switch (g.clue.kind) {
    case 'mixing':                 return '🧪 Mixing Result';
    case 'aspect':                 return '📋 Known Component';
    case 'assignment':             return '📌 Known Alchemical';
    case 'sell':                   return '💰 Sell Result';
    case 'debunk':                 return '🔬 Debunking';
    case 'mixing_among':           return '🔎 Ambiguous Coverage';
    case 'mixing_count_among':     return '🔢 Ambiguous Coverage';
    case 'sell_result_among':      return '💰 Ambiguous Sale';
    case 'sell_among':             return '💰 Counted Sale';
    case 'book':                   return '📖 Book Token';
    case 'book_among':             return '📖 Book Token (Among)';
    case 'encyclopedia':           return '📜 Verified Publication';
    case 'encyclopedia_uncertain': return '📄 Uncertain Article';
    case 'debunk_apprentice':      return '🔍 Debunk — Apprentice';
    case 'debunk_master':          return '⚗️ Debunk — Master';
    case 'golem_test':             return '🧿 Golem Test';
    case 'golem_hint_color':
    case 'golem_hint_size':        return '🔬 Golem Research';
    case 'golem_reaction_among':   return '🤖 Observed Golem Test';
    default:                       return '📋 Clue';
  }
}

/**
 * Wraps a rendered clue card with a collapse/expand toggle.
 * When expanded: a "−" button appears on hover (top-right corner).
 * When collapsed: a compact pill shows the clue type label; clicking expands.
 */
export function CollapsibleClueWrapper({ label, children }: {
  label: string;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="w-full text-left rounded-lg border border-gray-200 px-2 py-1.5
                   flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide
                   text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors"
        title="Expand clue"
        aria-expanded={false}
      >
        <span aria-hidden="true" className="opacity-60 text-[8px]">▶</span>
        {label}
      </button>
    );
  }

  return (
    <div className="relative group">
      {children}
      <button
        onClick={() => setCollapsed(true)}
        className="absolute top-1 right-1 z-10 w-5 h-5 flex items-center justify-center
                   rounded text-base leading-none text-gray-400 hover:text-gray-700
                   opacity-0 group-hover:opacity-100 transition-opacity"
        title="Collapse clue"
        aria-label="Collapse clue"
        aria-expanded={true}
      >
        −
      </button>
    </div>
  );
}
