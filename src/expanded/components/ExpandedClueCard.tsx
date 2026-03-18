/**
 * expanded/components/ExpandedClueCard.tsx
 *
 * Renders expanded-mode clue cards. Encyclopedia cards display per-ingredient
 * sign entries (ingredient icon + +/− badge) on a single aspect.
 * Debunk cards distinguish apprentice (shows truth) from master (shows claim).
 */

import { useExpandedIngredient, useExpandedSolver } from '../contexts/ExpandedSolverContext';
import { INGREDIENTS } from '../../data/ingredients';
import { ALCHEMICALS } from '../../data/alchemicals';
import { IngredientIcon, ElemImage, SignedElemImage, PotionImage, SellResultIcon, AlchemicalImage } from '../../components/GameSprites';
import type { AlchemicalId } from '../../types';
import type {
  AnyClue, EncyclopediaClue, EncyclopediaUncertainClue,
  DebunkApprenticeClue, DebunkMasterClue,
  BookClue, EncyclopediaEntry,
  GolemTestClue, GolemHintColorClue, GolemHintSizeClue, GolemReactionAmongClue, GolemReactionGroup,
} from '../types';
import type { Color, MixingAmongClue, SellAmongClue, MixingCountAmongClue, SellResultAmongClue, SellResult } from '../../types';

const ING_W = 28;

// ─── Shared primitives ────────────────────────────────────────────────────────

function Card({ icon, label, accent = 'amber', children }: {
  icon: string;
  label: React.ReactNode;
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

// ─── Golem part icon ──────────────────────────────────────────────────────────

const GOLEM_ICON_SRC: Record<'chest' | 'ears', string> = {
  chest: '/alchemydoku/images/golem_chest_icon.png',
  ears:  '/alchemydoku/images/golem_ears_icon.png',
};

function GolemPartIcon({ part, size = 20 }: { part: 'chest' | 'ears'; size?: number }) {
  const label = part === 'chest' ? 'Chest' : 'Ears';
  return (
    <img
      src={GOLEM_ICON_SRC[part]}
      alt={label}
      title={label}
      style={{ width: size, height: size, borderRadius: '50%', display: 'inline-block', flexShrink: 0, verticalAlign: 'middle' }}
    />
  );
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


// ─── IngMarkableExpanded — ingredient icon with click-to-cycle ✗/✓ annotation ─

const MARK_BADGE = 16;

const SELL_RESULT_LABEL: Record<SellResult, string> = {
  total_match: 'Total match',
  sign_ok:     'Sign match',
  neutral:     'Neutral (soup)',
  opposite:    'Opposite sign',
};

const SELL_RESULT_DESC: Record<SellResult, string> = {
  total_match: 'Actual result exactly matched the claim.',
  sign_ok:     'Different colour, same sign as claimed.',
  neutral:     'Actual result was neutral (soup).',
  opposite:    'Actual result had the opposite sign.',
};

function IngMarkableExpanded({ slotId, clueIndex }: { slotId: number; clueIndex: number }) {
  const getIngredient = useExpandedIngredient();
  const { state, dispatch } = useExpandedSolver();
  const { displayId, index } = getIngredient(slotId);
  const name = INGREDIENTS[displayId as 1]?.name ?? `#${slotId}`;
  const noteKey = `ck-${clueIndex}-${slotId}`;
  const mark = (state.notes[noteKey] ?? '') as '' | 'x' | 'c';
  const cycle = () => {
    const next = mark === '' ? 'x' : mark === 'x' ? 'c' : '';
    dispatch({ type: 'SET_NOTE', key: noteKey, value: next });
  };
  const markLabel = mark === 'x' ? 'Ruled out' : mark === 'c' ? 'Confirmed' : 'Unmark';
  return (
    <button
      onClick={cycle}
      className="relative inline-flex shrink-0 select-none cursor-pointer p-0 bg-transparent border-0"
      style={{ paddingRight: MARK_BADGE / 2, paddingBottom: MARK_BADGE / 2 }}
      title={`${name}: ${markLabel} (click to cycle)`}
      aria-label={`${name}: ${markLabel}`}
    >
      <IngredientIcon index={index} width={ING_W} />
      {mark !== '' && (
        <span
          className={`absolute bottom-0 right-0 z-10 flex items-center justify-center
            rounded-full text-white font-bold leading-none shadow
            ${mark === 'x' ? 'bg-red-500' : 'bg-green-500'}`}
          style={{ width: MARK_BADGE, height: MARK_BADGE, fontSize: 10 }}
          aria-hidden
        >
          {mark === 'x' ? '✗' : '✓'}
        </span>
      )}
    </button>
  );
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
          ${isSolar ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'bg-blue-100 text-blue-700 border border-blue-300'}`}>
          {isSolar ? <><span className="text-orange-400">☀</span> Solar</> : <><span className="text-slate-400">☽</span> Lunar</>}
        </span>
      </div>
    </Card>
  );
}

function EncyclopediaClueCard({ clue }: { clue: EncyclopediaClue }) {
  return (
    <Card icon="📜" label={<><ElemImage color={clue.aspect} size="S" width={12} /> Verified Publication</>} accent="green">
      <p className="text-[10px] opacity-60 mb-0.5">All entries guaranteed correct</p>
      <EntryGrid aspect={clue.aspect} entries={[...clue.entries]} />
    </Card>
  );
}

function EncyclopediaUncertainClueCard({ clue }: { clue: EncyclopediaUncertainClue }) {
  return (
    <Card icon="📄" label={<><ElemImage color={clue.aspect} size="S" width={12} /> Uncertain Article</>} accent="amber">
      <p className="text-[10px] opacity-70 mb-1">≥ 3 of {clue.entries.length} entries correct</p>
      <div className="flex flex-wrap gap-2">
        {clue.entries.map((e, i) => (
          <IngBadge key={i} slotId={e.ingredient} color={clue.aspect} sign={e.sign} />
        ))}
      </div>
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
        <span className="text-xs opacity-70">true sign:</span>
        <SignedElemImage color={clue.aspect} sign={clue.sign} width={22} />
      </div>
    </Card>
  );
}

/**
 * Master debunk: only the CLAIM is shown.
 * True result is not revealed (especially when unsuccessful).
 */
function DebunkMasterCard({ clue }: { clue: DebunkMasterClue }) {
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
        <PotionImage result={clue.claimed_result} width={24} />
      </div>
    </Card>
  );
}

// ─── Base clue fallback (no base SolverContext available) ─────────────────────

function ExpandedBaseClueCard({ clue, clueIndex = 0 }: { clue: AnyClue; clueIndex?: number }) {
  const getIngredient = useExpandedIngredient();
  const ingIcon = (slotId: number) => {
    const { index } = getIngredient(slotId);
    return <IngredientIcon index={index} width={ING_W} />;
  };

  if (clue.kind === 'mixing') {
    return (
      <Card icon="🧪" label="Mixing Result" accent="amber">
        <div className="flex items-center gap-1 flex-wrap text-xs">
          {ingIcon(clue.ingredient1)}<span className="text-gray-400">+</span>{ingIcon(clue.ingredient2)}
          <span className="text-gray-400">→</span><PotionImage result={clue.result} width={24} />
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
    return (
      <Card icon="💰" label="Sell Result" accent="amber">
        <div className="flex items-center gap-1 text-xs">
          {ingIcon(clue.ingredient1)}<span className="text-gray-400">+</span>{ingIcon(clue.ingredient2)}
          <span className="text-gray-400">→</span>
          <SellResultIcon result={clue.sellResult as 'total_match' | 'sign_ok' | 'neutral' | 'opposite'} width={24} />
        </div>
      </Card>
    );
  }
  if (clue.kind === 'assignment') {
    const alchId = clue.alchemical as AlchemicalId;
    return (
      <Card icon="📌" label="Known Alchemical" accent="green">
        <div className="flex items-center gap-2 flex-wrap">
          {ingIcon(clue.ingredient)}
          <span className="text-gray-400 text-xs">→</span>
          <AlchemicalImage id={alchId} width={32} title={ALCHEMICALS[alchId]?.code} />
        </div>
      </Card>
    );
  }
  if (clue.kind === 'mixing_among') {
    const c = clue as MixingAmongClue;
    const n = c.ingredients.length;
    const pairCount = (n * (n - 1)) / 2;
    return (
      <Card icon="🔎" label="Ambiguous Coverage" accent="blue">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-gray-500 shrink-0">
            at least 1 of {pairCount} possible combinations results in
          </span>
          <PotionImage result={c.result} width={24} />
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {c.ingredients.map(id => <IngMarkableExpanded key={id} slotId={id} clueIndex={clueIndex} />)}
        </div>
      </Card>
    );
  }
  if (clue.kind === 'sell_among') {
    const c = clue as SellAmongClue;
    const n = c.ingredients.length;
    const pairCount = (n * (n - 1)) / 2;
    return (
      <Card icon="💰" label="Ambiguous Sale" accent="purple">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-gray-500 shrink-0">
            {c.count} of {pairCount} pairs sold
          </span>
          <PotionImage result={{ type: 'potion', color: c.claimedPotion.color, sign: c.claimedPotion.sign }} width={24} />
          <span className="text-[10px] text-gray-500 shrink-0">→</span>
          <SellResultIcon result={c.result} width={26} />
          <span className="text-[10px] font-semibold text-gray-700 shrink-0">
            {SELL_RESULT_LABEL[c.result]}
          </span>
        </div>
        <p className="text-[9px] text-gray-400 mt-0.5">{SELL_RESULT_DESC[c.result]}</p>
        <div className="flex flex-wrap gap-1 mt-1">
          {c.ingredients.map(id => <IngMarkableExpanded key={id} slotId={id} clueIndex={clueIndex} />)}
        </div>
      </Card>
    );
  }
  if (clue.kind === 'mixing_count_among') {
    const c = clue as MixingCountAmongClue;
    const n = c.ingredients.length;
    const pairCount = (n * (n - 1)) / 2;
    return (
      <Card icon="🔢" label="Ambiguous Coverage" accent="blue">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-gray-500 shrink-0">
            {c.count} of {pairCount} possible combinations result in
          </span>
          <PotionImage result={c.result} width={24} />
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {c.ingredients.map(id => <IngMarkableExpanded key={id} slotId={id} clueIndex={clueIndex} />)}
        </div>
      </Card>
    );
  }
  if (clue.kind === 'sell_result_among') {
    const c = clue as SellResultAmongClue;
    const count = c.ingredients.length;
    const ambigLabel = count === 2 ? 'One of these 2 pairs' : `A pair from these ${count}`;
    return (
      <Card icon="💰" label="Ambiguous Sale" accent="purple">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-gray-500 shrink-0">{ambigLabel} sold</span>
          <PotionImage result={{ type: 'potion', color: c.claimedPotion.color, sign: c.claimedPotion.sign }} width={24} />
          <span className="text-[10px] text-gray-500 shrink-0">→</span>
          <SellResultIcon result={c.sellResult} width={26} />
          <span className="text-[10px] font-semibold text-gray-700 shrink-0">
            {SELL_RESULT_LABEL[c.sellResult]}
          </span>
        </div>
        <p className="text-[9px] text-gray-400 mt-0.5">{SELL_RESULT_DESC[c.sellResult]}</p>
        <div className="flex flex-wrap gap-1 mt-1">
          {c.ingredients.map(id => <IngMarkableExpanded key={id} slotId={id} clueIndex={clueIndex} />)}
        </div>
      </Card>
    );
  }
  return null;
}

// ─── Golem clue cards ────────────────────────────────────────────────────────

function GolemTestCard({ clue }: { clue: GolemTestClue }) {
  function Badge({ reacted, part }: { reacted: boolean; part: 'chest' | 'ears' }) {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold
        ${reacted
          ? 'bg-green-100 text-green-700 border border-green-300'
          : 'bg-gray-100 text-gray-400 border border-gray-200'}`}>
        <GolemPartIcon part={part} size={18} />
        {reacted ? '✓' : '✗'}
      </span>
    );
  }
  return (
    <Card icon="🧿" label="Golem Test" accent="blue">
      <div className="flex items-center gap-2 flex-wrap">
        <Ing slotId={clue.ingredient} />
        <div className="flex gap-1.5">
          <Badge reacted={clue.chest_reacted} part="chest" />
          <Badge reacted={clue.ears_reacted}  part="ears"  />
        </div>
      </div>
    </Card>
  );
}

function GolemHintColorCard({ clue }: { clue: GolemHintColorClue }) {
  return (
    <Card icon="🔬" label="Golem Research" accent="blue">
      <p className="text-xs flex items-center gap-1 flex-wrap">
        <GolemPartIcon part={clue.part} size={16} />{' '}reacts to a{' '}
        <ElemImage color={clue.color} size="L" width={20} />{' '}aspect.
      </p>
    </Card>
  );
}

function GolemHintSizeCard({ clue }: { clue: GolemHintSizeClue }) {
  const sizeLabel = clue.size === 'L' ? 'Large' : 'Small';
  return (
    <Card icon="🔬" label="Golem Research" accent="blue">
      <p className="text-xs flex items-center gap-1 flex-wrap">
        <GolemPartIcon part={clue.part} size={16} />{' '}reacts to a{' '}
        <span className="inline-flex items-center gap-0.5">
          <span style={{ opacity: clue.size === 'L' ? 1 : 0.3 }}><ElemImage color="R" size="L" width={18} /></span>
          <span style={{ opacity: clue.size === 'S' ? 1 : 0.3 }}><ElemImage color="R" size="S" width={12} /></span>
        </span>
        <span className="font-bold">{sizeLabel}</span> aspect.
      </p>
    </Card>
  );
}


const REACTION_LABEL: Record<GolemReactionGroup, string> = {
  animators:    'animator',
  chest_only:   'chest-only',
  ears_only:    'ears-only',
  non_reactive: 'non-reactive',
  any_reactive: 'reactive',
};

function GolemReactionAmongCard({ clue }: { clue: GolemReactionAmongClue }) {
  const getIngredient = useExpandedIngredient();
  const n = clue.ingredients.length;
  const label = REACTION_LABEL[clue.reaction];
  return (
    <Card icon="🤖" label="Observed Golem Test" accent="purple">
      <div className="text-xs text-gray-600 mb-1">
        {clue.count} of {n === 2 ? 'these 2' : `these ${n}`}{' '}
        triggered a <span className="font-semibold">{label}</span> reaction.
      </div>
      <div className="flex flex-wrap gap-1">
        {clue.ingredients.map(id => {
          const { index } = getIngredient(id);
          return <IngredientIcon key={id} index={index} width={ING_W} />;
        })}
      </div>
    </Card>
  );
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

export function ExpandedClueCard({ clue, clueIndex }: { clue: AnyClue; clueIndex?: number }) {
  switch (clue.kind) {
    case 'book':                   return <BookClueCard clue={clue} />;
    case 'encyclopedia':           return <EncyclopediaClueCard clue={clue} />;
    case 'encyclopedia_uncertain': return <EncyclopediaUncertainClueCard clue={clue} />;
    case 'debunk_apprentice':      return <DebunkApprenticeCard clue={clue} />;
    case 'debunk_master':          return <DebunkMasterCard clue={clue} />;
    case 'golem_test':             return <GolemTestCard clue={clue} />;
    case 'golem_hint_color':       return <GolemHintColorCard clue={clue} />;
    case 'golem_hint_size':           return <GolemHintSizeCard          clue={clue} />;
    case 'golem_reaction_among':      return <GolemReactionAmongCard       clue={clue} />;
    default:                       return <ExpandedBaseClueCard clue={clue} clueIndex={clueIndex} />;
  }
}
