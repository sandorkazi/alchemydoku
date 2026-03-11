import type React from 'react';
import { AtlasSprite } from './AtlasSprite';
import {
  INGREDIENT_SPRITES,
  POTION_SPRITES,
  ELEM_SPRITES,
  SIGN_SPRITES,
  ALCHEMICAL_SPRITES,
  UI_SPRITES,
  ACTION_SPRITES,
} from '../data/sprites';
import type { PotionResult, Color, Sign, Size, AlchemicalId } from '../types';

// ─── Ingredient ───────────────────────────────────────────────────────────────

type IngredientIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export function IngredientCard({ index, width = 80 }: { index: IngredientIndex; width?: number }) {
  return <AtlasSprite sprite={INGREDIENT_SPRITES[index]} width={width} />;
}

export function IngredientIcon({ index, width = 80 }: { index: IngredientIndex; width?: number }) {
  return <AtlasSprite sprite={INGREDIENT_SPRITES[index]} width={width} />;
}

// ─── Potion ───────────────────────────────────────────────────────────────────

export function PotionImage({ result, width = 60, title }: { result: PotionResult; width?: number; title?: string }) {
  const key = result.type === 'neutral' ? 'neutral' : `${result.color}${result.sign}` as keyof typeof POTION_SPRITES;
  return <AtlasSprite sprite={POTION_SPRITES[key]} width={width} title={title ?? key} />;
}

/** Icon representing one of the 4 sell outcomes */
export function SellResultIcon({ result, width = 40 }: {
  result: 'total_match' | 'sign_ok' | 'neutral' | 'opposite';
  width?: number;
}) {
  const keyMap = {
    total_match: 'correct',
    sign_ok:     'sign_ok',
    neutral:     'neutral',
    opposite:    'sign_wrong',
  } as const;
  return <AtlasSprite sprite={POTION_SPRITES[keyMap[result]]} width={width} title={result} />;
}

/** @deprecated use SellResultIcon */
export function PotionSignIcon({ ok, width = 40 }: { ok: boolean; width?: number }) {
  return <SellResultIcon result={ok ? 'sign_ok' : 'opposite'} width={width} />;
}

// ─── Alchemical aspect element ────────────────────────────────────────────────

export function ElemImage({ color, size = 'L', width = 36 }: { color: Color; size?: Size; width?: number }) {
  const key = `${color}_${size}` as keyof typeof ELEM_SPRITES;
  return <AtlasSprite sprite={ELEM_SPRITES[key]} width={width} title={key} />;
}

/** Orb + white ＋/－ overlay, exactly like the rulebook sign indicator. */
export function SignedElemImage({ color, sign, width = 72 }: { color: Color; sign: Sign; width?: number }) {
  const barThick = Math.max(3, Math.round(width * 0.13));
  const barLen   = Math.round(width * 0.54);
  const barStyle: React.CSSProperties = {
    position: 'absolute', background: 'white',
    borderRadius: barThick,
    boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
  };
  return (
    <span style={{ position: 'relative', display: 'inline-block', width, height: width, flexShrink: 0 }}>
      <ElemImage color={color} size="L" width={width} />
      <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ ...barStyle, width: barLen, height: barThick, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
        {sign === '+' && (
          <span style={{ ...barStyle, width: barThick, height: barLen, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
        )}
      </span>
    </span>
  );
}

// ─── Sign indicator ───────────────────────────────────────────────────────────

export function SignImage({ color, sign, width = 28 }: { color: Color; sign: Sign; width?: number }) {
  const key = `${color}${sign}` as keyof typeof SIGN_SPRITES;
  return <AtlasSprite sprite={SIGN_SPRITES[key]} width={width} title={key} />;
}

// ─── Alchemical identity ──────────────────────────────────────────────────────

export function AlchemicalImage({ id, width = 40, title }: { id: AlchemicalId; width?: number; title?: string }) {
  return <AtlasSprite sprite={ALCHEMICAL_SPRITES[id as keyof typeof ALCHEMICAL_SPRITES]} width={width} title={title} />;
}

// ─── UI icons ─────────────────────────────────────────────────────────────────

export function UnknownIcon({ width = 50 }: { width?: number }) {
  return <AtlasSprite sprite={UI_SPRITES.unknown} width={width} />;
}

// ─── Action / outcome icons ───────────────────────────────────────────────────

export function TasterIcon({ width = 48 }: { width?: number }) {
  return <AtlasSprite sprite={ACTION_SPRITES.taster} width={width} />;
}

export function SellIcon({ width = 40 }: { width?: number }) {
  return <AtlasSprite sprite={ACTION_SPRITES.sell_icon} width={width} />;
}

export function DebunkIcon({ width = 40 }: { width?: number }) {
  return <AtlasSprite sprite={ACTION_SPRITES.debunk_icon} width={width} />;
}

export function CorrectIcon({ width = 40 }: { width?: number }) {
  return <AtlasSprite sprite={ACTION_SPRITES.correct} width={width} />;
}

export function IncorrectIcon({ width = 40 }: { width?: number }) {
  return <AtlasSprite sprite={ACTION_SPRITES.incorrect} width={width} />;
}
