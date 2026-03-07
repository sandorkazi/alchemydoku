import { AlchemicalImage } from './GameSprites';
import { ALCHEMICALS } from '../data/alchemicals';
import type { AlchemicalId } from '../types';

/**
 * Renders the single canonical sprite that identifies an alchemical
 * (its unique large-aspect sign sprite, or the book sprite for NNN/PPP).
 * Optionally appends the 3-letter code.
 */
export function AlchemicalDisplay({
  id,
  elemWidth = 88,
  showCode = false,
}: {
  id: AlchemicalId;
  elemWidth?: number;
  showCode?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <AlchemicalImage id={id} width={elemWidth} />
    </span>
  );
}
