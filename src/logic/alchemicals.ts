import { ALCHEMICALS } from '../data/alchemicals';
import type { AlchemicalId, Alchemical, Color, AspectValue } from '../types';

export function getAlchemical(id: AlchemicalId): Alchemical {
  return ALCHEMICALS[id];
}

export function getAspect(id: AlchemicalId, color: Color): AspectValue {
  return ALCHEMICALS[id][color];
}

/**
 * Returns true iff every colour aspect of `a` has the opposite sign to `b`.
 * (Size is irrelevant for this check.)
 * The 4 pairs: (1,2), (3,4), (5,6), (7,8)
 */
export function isDirectOpposite(a: AlchemicalId, b: AlchemicalId): boolean {
  const alchA = ALCHEMICALS[a];
  const alchB = ALCHEMICALS[b];
  return (
    alchA.R.sign !== alchB.R.sign &&
    alchA.G.sign !== alchB.G.sign &&
    alchA.B.sign !== alchB.B.sign
  );
}
