/**
 * expanded/components/ExpandedClueCard.tsx
 *
 * Renders expanded-mode clue cards. Encyclopedia cards display per-ingredient
 * sign entries (ingredient icon + +/− badge) on a single aspect.
 * Debunk cards distinguish apprentice (shows truth) from master (shows claim).
 */

import { useExpandedIngredient } from '../contexts/ExpandedSolverContext';
import { INGREDIENTS } from '../../data/ingredients';
import { IngredientIcon, ElemImage, SignedElemImage } from '../../components/GameSprites';
import type {
  AnyClue, EncyclopediaClue, EncyclopediaUncertainClue,
  DebunkApprenticeClue, DebunkMasterClue,
  BookClue, EncyclopediaEntry,
  GolemTestClue, GolemHintColorClue, GolemHintSizeClue,
} from '../types';
import type { Color } from '../../types';

const ING_W = 28;
const COLOR_LABEL: Record<Color, string> = { R: 'Red', G: 'Green', B: 'Blue' };

// ─── Shared primitives ────────────────────────────────────────────────────────

function Card({ icon, label, accent = 'amber', children }: {
  icon: string;
  label: string;
  accent?: 'amber' | 'blue' | 'green' | 'purple' | 'rose';
  children: React.ReactNode;
}) {
  const accents = {
    amber:  'border-amber-200  bg-amber-50  text-amber-800',
    blue:   'border-blue-200   bg-blue-50   text-blue-800',
    green:  'border-green-200  bg-green-50  text-green-800',
    purple: 'border-purple-200 bg-purple-50 text-purple-800',
    rose:   'border-rose-200   bg-rose-50   text-rose-800',
  };
  return (
    <div className={`rounded-lg border p-2 ${accents[accent]} space-y-1.5 min-w-[100px]`}>
      <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70 flex items-center gap-1">
        {icon} {label}
      </div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function Ing({ slotId }: { slotId: number }) {
  const getIngredient = useExpandedIngredient();
  const { displayId, index } = getIngredient(slotId);
  const name = INGREDIENTS[displayId as 1]?.name ?? `#${slotId}`;
  return <span title={name} aria-label={name} className="inline-flex shrink-0"><IngredientIcon index={index} width={ING_W} /></span>;
}

const BADGE_W = 22;

function IngBadge({ slotId, color, sign }: { slotId: number; color: Color; sign: '+' | '-' }) {
  const getIngredient = useExpandedIngredient();
  const { displayId, index } = getIngredient(slotId);
  const name = INGREDIENTS[displayId as 1]?.name ?? `#${slotId}`;
  const colorNames: Record<Color, string> = { R: 'Red', G: 'Green', B: 'Blue' };
  const badgeTitle = `${colorNames[color]} ${sign === '+' ? 'positive' : 'negative'}`;
  return (
    <div
      className="relative inline-block"
      style={{ paddingTop: BADGE_W / 2 }}
      title={`${name}: ${badgeTitle}`}
      aria-label={`${name}: ${badgeTitle}`}
    >
      <div className="absolute left-1/2 -translate-x-1/2 z-10 drop-shadow" style={{ top: 0 }}>
        <SignedElemImage color={color} sign={sign} width={BADGE_W} />
      </div>
      <IngredientIcon index={index} width={ING_W} />
    </div>
  );
}

function SignBadge({ sign }: { sign: '+' | '-' }) {
  return (
    <span className={`inline-flex items-center justify-center w-5 h-5 rounded font-black text-sm leading-none
      ${sign === '+' ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-red-100 text-red-700 border border-red-300'}`}>
      {sign === '+' ? '＋' : '－'}
    </span>
  );
}

function AspectIcon({ color }: { color: Color }) {
  return <ElemImage color={color} size="S" width={16} />;
}

// ─── Encyclopedia entry grid ──────────────────────────────────────────────────

function EntryGrid({ aspect, entries }: { aspect: Color; entries: EncyclopediaEntry[] }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
      {entries.map((e, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          <Ing slotId={e.ingredient} />
          <SignedElemImage color={aspect} sign={e.sign} width={20} />
        </span>
      ))}
    </div>
  );
}

// ─── Expanded clue cards ──────────────────────────────────────────────────────

function BookClueCard({ clue }: { clue: BookClue }) {
  const getIngredient = useExpandedIngredient();
  const { displayId, index } = getIngredient(clue.ingredient);
  const name = INGREDIENTS[displayId as 1]?.name ?? `#${clue.ingredient}`;
  const isSolar = clue.result === 'solar';
  return (
    <Card icon="📖" label="Book Token" accent="purple">
      <div className="flex items-center gap-2">
        <span title={name}><IngredientIcon index={index} width={ING_W} /></span>
        <span className="text-xs font-semibold">is</span>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold
          ${isSolar ? 'bg-orange-100 text-orange-800 border border-orange-300' : 'bg-gray-100 text-gray-500 border border-gray-300'}`}>
          {isSolar ? '☀️ Solar' : '🌙 Lunar'}
        </span>
      </div>
    </Card>
  );
}

function EncyclopediaClueCard({ clue }: { clue: EncyclopediaClue }) {
  return (
    <Card icon="📜" label={`Verified Publication — ${COLOR_LABEL[clue.aspect]}`} accent="green">
      <p className="text-[10px] opacity-60 mb-0.5">All entries guaranteed correct</p>
      <EntryGrid aspect={clue.aspect} entries={[...clue.entries]} />
    </Card>
  );
}

function EncyclopediaUncertainClueCard({ clue }: { clue: EncyclopediaUncertainClue }) {
  return (
    <Card icon="📄" label={`Uncertain Article — ${COLOR_LABEL[clue.aspect]}`} accent="amber">
      <p className="text-[10px] opacity-70 mb-0.5">≥ 3 of 4 entries are correct</p>
      <EntryGrid aspect={clue.aspect} entries={[...clue.entries]} />
    </Card>
  );
}

/**
 * Apprentice debunk: the sign shown IS the truth.
 * Label makes clear this is verified fact, not a claim.
 */
function DebunkApprenticeCard({ clue }: { clue: DebunkApprenticeClue }) {
  const status = clue.successful
    ? <span className="text-green-700 font-semibold">✓ Debunk succeeded</span>
    : <span className="text-amber-700 font-semibold">⚠ Blocked by hedge</span>;
  return (
    <Card icon="🔍" label="Debunk — Apprentice (truth)" accent="rose">
      <div className="flex items-center gap-1.5 flex-wrap text-xs mb-1">
        {status}
      </div>
      <div className="flex items-center gap-1.5">
        <Ing slotId={clue.ingredient} />
        <span className="text-xs opacity-70">true</span>
        <AspectIcon color={clue.aspect} />
        <span className="text-xs opacity-70">sign:</span>
        <SignBadge sign={clue.sign} />
      </div>
    </Card>
  );
}

/**
 * Master debunk: only the CLAIM is shown.
 * True result is not revealed (especially when unsuccessful).
 */
function DebunkMasterCard({ clue }: { clue: DebunkMasterClue }) {
  const cr = clue.claimed_result;
  const resultLabel = cr.type === 'neutral' ? 'Neutral' : `${cr.color}${cr.sign === '+' ? '+' : '−'}`;
  const status = clue.successful
    ? <span className="text-green-700 font-semibold">✓ Debunk succeeded</span>
    : <span className="text-rose-600 font-semibold">✗ Claim rejected</span>;
  return (
    <Card icon="⚗️" label="Debunk — Master (claim)" accent="rose">
      <div className="flex items-center gap-1.5 flex-wrap text-xs mb-1">
        {status}
      </div>
      <div className="flex items-center gap-1.5 text-xs">
        <Ing slotId={clue.ingredient1} />
        <span className="text-gray-400">+</span>
        <Ing slotId={clue.ingredient2} />
        <span className="text-gray-400">→ claimed:</span>
        <span className="font-bold">{resultLabel}</span>
      </div>
    </Card>
  );
}

// ─── Base clue fallback (no base SolverContext available) ─────────────────────

function ExpandedBaseClueCard({ clue }: { clue: AnyClue }) {
  const getIngredient = useExpandedIngredient();
  const ingIcon = (slotId: number) => {
    const { index } = getIngredient(slotId);
    return <IngredientIcon index={index} width={ING_W} />;
  };

  if (clue.kind === 'mixing') {
    const r = clue.result;
    const label = r.type === 'neutral' ? 'Neutral' : `${r.color}${r.sign}`;
    return (
      <Card icon="🧪" label="Mixing Result" accent="amber">
        <div className="flex items-center gap-1 flex-wrap text-xs">
          {ingIcon(clue.ingredient1)}<span className="text-gray-400">+</span>{ingIcon(clue.ingredient2)}
          <span className="text-gray-400">→</span><span className="font-bold">{label}</span>
        </div>
      </Card>
    );
  }
  if (clue.kind === 'aspect') {
    return (
      <Card icon="📋" label="Known Component" accent="blue">
        <IngBadge slotId={clue.ingredient} color={clue.color as Color} sign={clue.sign} />
      </Card>
    );
  }
  if (clue.kind === 'sell') {
    const SELL: Record<string, string> = { total_match: 'Total match', sign_ok: 'Sign matches', neutral: 'Neutral', opposite: 'Opposite' };
    return (
      <Card icon="💰" label="Sell Result" accent="amber">
        <div className="flex items-center gap-1 text-xs">
          {ingIcon(clue.ingredient1)}<span className="text-gray-400">+</span>{ingIcon(clue.ingredient2)}
          <span className="text-gray-400">→</span><span className="font-semibold">{SELL[clue.sellResult]}</span>
        </div>
      </Card>
    );
  }
  if (clue.kind === 'assignment') {
    const { displayId } = getIngredient(clue.ingredient);
    const name = INGREDIENTS[displayId as 1]?.name ?? `#${clue.ingredient}`;
    return (
      <Card icon="📌" label="Assignment" accent="purple">
        <div className="text-xs">{name} = alch {clue.alchemical}</div>
      </Card>
    );
  }
  return null;
}

// ─── Golem clue cards ────────────────────────────────────────────────────────

function GolemTestCard({ clue }: { clue: GolemTestClue }) {
  function Badge({ reacted, label }: { reacted: boolean; label: string }) {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold
        ${reacted
          ? 'bg-green-100 text-green-700 border border-green-300'
          : 'bg-gray-100 text-gray-400 border border-gray-200'}`}>
        {label} {reacted ? '✓' : '✗'}
      </span>
    );
  }
  return (
    <Card icon="🧿" label="Golem Test" accent="blue">
      <div className="flex items-center gap-2 flex-wrap">
        <Ing slotId={clue.ingredient} />
        <div className="flex gap-1.5">
          <Badge reacted={clue.chest_reacted} label="☁️ Chest" />
          <Badge reacted={clue.ears_reacted}  label="👂 Ears"  />
        </div>
      </div>
    </Card>
  );
}

function GolemHintColorCard({ clue }: { clue: GolemHintColorClue }) {
  const partLabel = clue.part === 'chest' ? '☁️ Chest' : '👂 Ears';
  const colorLabel = { R: 'Red', G: 'Green', B: 'Blue' }[clue.color];
  const colorClass = { R: 'text-red-600', G: 'text-green-600', B: 'text-blue-600' }[clue.color];
  return (
    <Card icon="🔬" label="Golem Research" accent="blue">
      <p className="text-xs">
        {partLabel} reacts to a{' '}
        <span className={`font-bold ${colorClass}`}>{colorLabel}</span>{' '}
        aspect.
      </p>
    </Card>
  );
}

function GolemHintSizeCard({ clue }: { clue: GolemHintSizeClue }) {
  const partLabel = clue.part === 'chest' ? '☁️ Chest' : '👂 Ears';
  const sizeLabel = clue.size === 'L' ? 'Large' : 'Small';
  return (
    <Card icon="🔬" label="Golem Research" accent="blue">
      <p className="text-xs">
        {partLabel} reacts to a <span className="font-bold">{sizeLabel}</span> aspect.
      </p>
    </Card>
  );
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

export function ExpandedClueCard({ clue }: { clue: AnyClue }) {
  switch (clue.kind) {
    case 'book':                   return <BookClueCard clue={clue} />;
    case 'encyclopedia':           return <EncyclopediaClueCard clue={clue} />;
    case 'encyclopedia_uncertain': return <EncyclopediaUncertainClueCard clue={clue} />;
    case 'debunk_apprentice':      return <DebunkApprenticeCard clue={clue} />;
    case 'debunk_master':          return <DebunkMasterCard clue={clue} />;
    case 'golem_test':             return <GolemTestCard clue={clue} />;
    case 'golem_hint_color':       return <GolemHintColorCard clue={clue} />;
    case 'golem_hint_size':        return <GolemHintSizeCard clue={clue} />;
    default:                       return <ExpandedBaseClueCard clue={clue} />;
  }
}
