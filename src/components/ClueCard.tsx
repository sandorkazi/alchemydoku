import React from 'react';
import { PotionImage, AlchemicalImage, SignedElemImage, IngredientIcon,
         SellIcon, SellResultIcon, DebunkIcon, CorrectIcon, IncorrectIcon } from './GameSprites';
import { ALCHEMICALS } from '../data/alchemicals';
import { INGREDIENTS } from '../data/ingredients';
import { useIngredient, useSolver } from '../contexts/SolverContext';
import type { Clue, SellResult, DebunkClue, AlchemicalId, Color, Sign, MixingAmongClue, SellAmongClue, SellResultAmongClue, MixingCountAmongClue } from '../types';

const ING_W        = 36;  // ingredient icon — matches grid header
const ASPECT_BADGE = 22;  // aspect orb badge — half overlaps top of ingredient
const ALCH_W       = 44;  // alchemical molecule — matches grid cell watermark
const POT_W        = 40;  // potion image in clue cards

// ─── Ingredient sub-components ───────────────────────────────────────────────

/** Icon-only ingredient — name lives in title/aria only. */
function Ing({ slotId }: { slotId: number }) {
  const getIngredient = useIngredient();
  const { displayId, index } = getIngredient(slotId);
  const name = INGREDIENTS[displayId as 1].name;
  return (
    <span title={name} aria-label={name} style={{ display: 'inline-flex', flexShrink: 0 }}>
      <IngredientIcon index={index} width={ING_W} />
    </span>
  );
}

/**
 * Ingredient icon with a badge (aspect orb or alchemical sprite) whose vertical
 * midpoint sits at the TOP edge of the ingredient — half hangs above, half covers
 * the top of the card, making the association immediately obvious.
 */
function IngBadge({
  slotId, badge, badgeH, badgeTitle,
}: { slotId: number; badge: React.ReactNode; badgeH: number; badgeTitle: string }) {
  const getIngredient = useIngredient();
  const { displayId, index } = getIngredient(slotId);
  const name = INGREDIENTS[displayId as 1].name;
  return (
    <div
      className="relative inline-block"
      style={{ paddingTop: badgeH / 2 }}
      title={`${name}: ${badgeTitle}`}
      aria-label={`${name}: ${badgeTitle}`}
    >
      {/* badge centre sits on the top edge of the ingredient card */}
      <div
        className="absolute left-1/2 -translate-x-1/2 z-10 drop-shadow"
        style={{ top: 0 }}
      >
        {badge}
      </div>
      <IngredientIcon index={index} width={ING_W} />
    </div>
  );
}

/**
 * Ingredient icon with TWO aspect badges — their centres sit on the top edge,
 * left badge offset left-of-centre, right badge offset right-of-centre.
 * Both orbs are fully visible and slightly overlap.
 */
function IngDualBadge({
  slotId,
  badge1, badge2,
  title1, title2,
}: {
  slotId: number;
  badge1: React.ReactNode; badge2: React.ReactNode;
  title1: string; title2: string;
}) {
  const getIngredient = useIngredient();
  const { displayId, index } = getIngredient(slotId);
  const name = INGREDIENTS[displayId as 1].name;
  // ING_W=36, BADGE=22 → left centre at 7, right centre at 29 (22px apart, 4px overlap each side)
  const leftX  = ING_W / 2 - 11;   // left badge left edge
  const rightX = ING_W / 2 - 11 + 14; // right badge left edge (14px gap between left edges)
  return (
    <div
      className="relative inline-block"
      style={{ paddingTop: ASPECT_BADGE / 2, width: ING_W + 14 }}
      title={`${name}: ${title1}, ${title2}`}
      aria-label={`${name}: ${title1} and ${title2}`}
    >
      <div className="absolute z-10 drop-shadow" style={{ top: 0, left: leftX }}>{badge1}</div>
      <div className="absolute z-20 drop-shadow" style={{ top: 0, left: rightX }}>{badge2}</div>
      <div style={{ marginLeft: 7 }}>
        <IngredientIcon index={index} width={ING_W} />
      </div>
    </div>
  );
}

/** One card for 2 aspect clues on the same ingredient. */
export function MultiAspectClueCard({ clues }: { clues: Array<Extract<Clue, { kind: 'aspect' }>> }) {
  const colorNames: Record<string, string> = { R: 'Red', G: 'Green', B: 'Blue' };
  const [a, b] = clues;
  const t = (c: Color, s: Sign) => `${colorNames[c]} ${s === '+' ? 'positive' : 'negative'}`;
  return (
    <Card icon="📋" label="Known Components" accent="blue">
      <IngDualBadge
        slotId={a.ingredient}
        badge1={<SignedElemImage color={a.color} sign={a.sign} width={ASPECT_BADGE} />}
        badge2={<SignedElemImage color={b.color} sign={b.sign} width={ASPECT_BADGE} />}
        title1={t(a.color, a.sign)}
        title2={t(b.color, b.sign)}
      />
    </Card>
  );
}

function Card({
  icon, label, children, accent = 'amber',
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  accent?: 'amber' | 'blue' | 'green' | 'purple' | 'red';
}) {
  const accents = {
    amber:  'border-amber-200  bg-amber-50  text-amber-700',
    blue:   'border-blue-200   bg-blue-50   text-blue-700',
    green:  'border-green-200  bg-green-50  text-green-700',
    purple: 'border-purple-200 bg-purple-50 text-purple-700',
    red:    'border-red-200    bg-red-50    text-red-700',
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

// ─── IngMarkable — ingredient icon with click-to-cycle ✗/✓ annotation ─────────

const MARK_BADGE = 16;

function IngMarkable({ slotId, clueIndex }: { slotId: number; clueIndex: number }) {
  const getIngredient = useIngredient();
  const { state, dispatch } = useSolver();
  const { displayId, index } = getIngredient(slotId);
  const name = INGREDIENTS[displayId as 1].name;
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

// ─── Clue cards ───────────────────────────────────────────────────────────────

function MixingClueCard({ clue }: { clue: Extract<Clue, { kind: 'mixing' }> }) {
  return (
    <Card icon="🧪" label="Mixing Result" accent="amber">
      <div className="flex items-center gap-1 flex-wrap">
        <Ing slotId={clue.ingredient1} />
        <span className="text-gray-400 text-xs">+</span>
        <Ing slotId={clue.ingredient2} />
        <span className="text-gray-400 text-xs">→</span>
        <PotionImage result={clue.result} width={POT_W} />
      </div>
    </Card>
  );
}

function AspectClueCard({ clue }: { clue: Extract<Clue, { kind: 'aspect' }> }) {
  const dc = clue.color;
  const ds = clue.sign;
  const colorNames: Record<string, string> = { R: 'Red', G: 'Green', B: 'Blue' };
  const badgeTitle = `${colorNames[dc] ?? dc} ${ds === '+' ? 'positive' : 'negative'}`;
  return (
    <Card icon="📋" label="Known Component" accent="blue">
      <IngBadge
        slotId={clue.ingredient}
        badge={<SignedElemImage color={dc} sign={ds} width={ASPECT_BADGE} />}
        badgeH={ASPECT_BADGE}
        badgeTitle={badgeTitle}
      />
    </Card>
  );
}

function AssignmentClueCard({ clue }: { clue: Extract<Clue, { kind: 'assignment' }> }) {
  const getIngredient = useIngredient();
  const alchId = clue.alchemical as AlchemicalId;
  const { displayId, index } = getIngredient(clue.ingredient);
  const name = INGREDIENTS[displayId as 1].name;
  return (
    <Card icon="📌" label="Known Alchemical" accent="green">
      <div className="flex items-center gap-2 flex-wrap">
        <span title={name} aria-label={name}>
          <IngredientIcon index={index} width={ING_W} />
        </span>
        <span className="text-gray-400 text-xs">→</span>
        <AlchemicalImage id={alchId} width={ALCH_W} title={ALCHEMICALS[alchId].code} />
      </div>
    </Card>
  );
}

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

function SellClueCard({ clue }: { clue: Extract<Clue, { kind: 'sell' }> }) {
  return (
    <Card icon={<SellIcon width={18} />} label="Sell Result" accent="purple">
      <div className="space-y-1.5">
        <div className="flex items-center gap-1 flex-wrap">
          <Ing slotId={clue.ingredient1} />
          <span className="text-gray-400 text-xs">+</span>
          <Ing slotId={clue.ingredient2} />
          <span className="text-gray-500 text-[10px] ml-1">claimed:</span>
          <PotionImage result={clue.claimedResult} width={POT_W} />
        </div>
        <div className="flex items-center gap-1.5">
          <SellResultIcon result={clue.sellResult} width={32} />
          <div>
            <div className="text-[11px] font-semibold text-purple-800 leading-tight">
              {SELL_RESULT_LABEL[clue.sellResult]}
            </div>
            <div className="text-[9px] text-gray-500 leading-tight">
              {SELL_RESULT_DESC[clue.sellResult]}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function DebunkClueCard({ clue }: { clue: DebunkClue }) {
  const label  = clue.variant === 'master' ? 'Master Debunking' : 'Debunking';

  if (clue.variant === 'apprentice') {
    const accent = clue.outcome === 'success' ? 'red' : 'amber';
    const dc = clue.color;
    const ds = clue.sign;
    const colorNames: Record<string, string> = { R: 'Red', G: 'Green', B: 'Blue' };
    const signWord = ds === '+' ? 'positive' : 'negative';
    const outcomeNote = clue.outcome === 'success' ? 'theory wrong' : 'theory confirmed';
    const badgeTitle = `${colorNames[dc] ?? dc} ${signWord} — ${outcomeNote}`;
    return (
      <Card icon={<DebunkIcon width={18} />} label={label} accent={accent}>
        <div className="space-y-1.5">
          <IngBadge
            slotId={clue.ingredient}
            badge={<SignedElemImage color={dc} sign={ds} width={ASPECT_BADGE} />}
            badgeH={ASPECT_BADGE}
            badgeTitle={badgeTitle}
          />
          <div className="flex items-center gap-1.5">
            {clue.outcome === 'success'
              ? <><CorrectIcon width={24} /><span className="text-[10px] font-semibold">Theory disproved</span></>
              : <><IncorrectIcon width={24} /><span className="text-[10px] font-semibold">True sign confirmed</span></>
            }
          </div>
        </div>
      </Card>
    );
  }

  // Master variant — mix result confirmed or denied
  const accent = clue.outcome === 'success' && clue.claimedPotion.type !== 'neutral' ? 'red' : 'amber';
  return (
    <Card icon={<DebunkIcon width={18} />} label={label} accent={accent}>
      <div className="space-y-1.5">
        <div className="flex items-center gap-1 flex-wrap">
          <Ing slotId={clue.ingredient1} />
          <span className="text-gray-400 text-xs">+</span>
          <Ing slotId={clue.ingredient2} />
          <span className="text-gray-500 text-[10px] ml-1">claimed:</span>
          <PotionImage result={clue.claimedPotion} width={POT_W} />
        </div>
        <div className="flex items-center gap-1.5">
          {clue.outcome === 'success' && clue.claimedPotion.type === 'neutral'
            ? <><IncorrectIcon width={24} /><span className="text-[10px] font-semibold">Inconclusive — theories in conflict</span></>
            : clue.outcome === 'success'
              ? <><CorrectIcon width={24} /><span className="text-[10px] font-semibold">Theory disproved</span></>
              : <><IncorrectIcon width={24} /><span className="text-[10px] font-semibold">Mix result ruled out</span></>
          }
        </div>
      </div>
    </Card>
  );
}


// ─── MixingAmong clue card ────────────────────────────────────────────────────

function MixingAmongClueCard({ clue, clueIndex }: { clue: MixingAmongClue; clueIndex: number }) {
  const n = clue.ingredients.length;
  const pairCount = (n * (n - 1)) / 2;
  return (
    <Card icon="🔎" label="Ambiguous Coverage" accent="blue">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-gray-500 shrink-0">
          at least 1 of {pairCount} possible combinations results in
        </span>
        <PotionImage result={clue.result} width={POT_W} />
      </div>
      <div className="flex flex-wrap gap-1 mt-1">
        {clue.ingredients.map(id => <IngMarkable key={id} slotId={id} clueIndex={clueIndex} />)}
      </div>
    </Card>
  );
}

// ─── SellAmong clue card ──────────────────────────────────────────────────────

function SellAmongClueCard({ clue, clueIndex }: { clue: SellAmongClue; clueIndex: number }) {
  const n = clue.ingredients.length;
  const pairCount = (n * (n - 1)) / 2;
  return (
    <Card icon={<SellIcon width={18} />} label="Counted Sale" accent="purple">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-gray-500 shrink-0">
          {clue.count} of {pairCount} pairs sold
        </span>
        <SignedElemImage color={clue.claimedPotion.color} sign={clue.claimedPotion.sign} width={22} />
        <span className="text-[10px] text-gray-500 shrink-0">→</span>
        <SellResultIcon result={clue.result} width={26} />
        <span className="text-[10px] font-semibold text-gray-700 shrink-0">
          {SELL_RESULT_LABEL[clue.result]}
        </span>
      </div>
      <p className="text-[9px] text-gray-400 mt-0.5">{SELL_RESULT_DESC[clue.result]}</p>
      <div className="flex flex-wrap gap-1 mt-1">
        {clue.ingredients.map(id => <IngMarkable key={id} slotId={id} clueIndex={clueIndex} />)}
      </div>
    </Card>
  );
}

// ─── MixingCountAmong clue card ───────────────────────────────────────────────

function MixingCountAmongClueCard({ clue, clueIndex }: { clue: MixingCountAmongClue; clueIndex: number }) {
  const n = clue.ingredients.length;
  const pairCount = (n * (n - 1)) / 2;
  return (
    <Card icon="🔢" label="Ambiguous Coverage" accent="blue">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-gray-500 shrink-0">
          {clue.count} of {pairCount} possible combinations result in
        </span>
        <PotionImage result={clue.result} width={POT_W} />
      </div>
      <div className="flex flex-wrap gap-1 mt-1">
        {clue.ingredients.map(id => <IngMarkable key={id} slotId={id} clueIndex={clueIndex} />)}
      </div>
    </Card>
  );
}

// ─── SellResultAmong clue card ─────────────────────────────────────────────────

function SellResultAmongClueCard({ clue, clueIndex }: { clue: SellResultAmongClue; clueIndex: number }) {
  const count = clue.ingredients.length;
  const ambigLabel = count === 2 ? 'One of these 2 pairs' : `A pair from these ${count}`;
  return (
    <Card icon={<SellIcon width={18} />} label="Ambiguous Sale" accent="purple">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-gray-500 shrink-0">{ambigLabel} sold</span>
        <SignedElemImage color={clue.claimedPotion.color} sign={clue.claimedPotion.sign} width={22} />
        <span className="text-[10px] text-gray-500 shrink-0">→</span>
        <SellResultIcon result={clue.sellResult} width={26} />
        <span className="text-[10px] font-semibold text-gray-700 shrink-0">
          {SELL_RESULT_LABEL[clue.sellResult]}
        </span>
      </div>
      <p className="text-[9px] text-gray-400 mt-0.5">{SELL_RESULT_DESC[clue.sellResult]}</p>
      <div className="flex flex-wrap gap-1 mt-1">
        {clue.ingredients.map(id => <IngMarkable key={id} slotId={id} clueIndex={clueIndex} />)}
      </div>
    </Card>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function ClueCard({ clue, clueIndex = 0 }: { clue: Clue; clueIndex?: number }) {
  switch (clue.kind) {
    case 'mixing':              return <MixingClueCard            clue={clue} />;
    case 'aspect':              return <AspectClueCard            clue={clue} />;
    case 'assignment':          return <AssignmentClueCard        clue={clue} />;
    case 'sell':                return <SellClueCard              clue={clue} />;
    case 'debunk':              return <DebunkClueCard            clue={clue} />;
    case 'mixing_among':        return <MixingAmongClueCard       clue={clue} clueIndex={clueIndex} />;
    case 'sell_among':          return <SellAmongClueCard         clue={clue} clueIndex={clueIndex} />;
    case 'mixing_count_among':  return <MixingCountAmongClueCard  clue={clue} clueIndex={clueIndex} />;
    case 'sell_result_among':   return <SellResultAmongClueCard   clue={clue} clueIndex={clueIndex} />;
  }
}
