import { AlchemicalImage } from './GameSprites';
import type { AlchemicalId } from '../types';

/**
 * Renders the single canonical sprite that identifies an alchemical
 * (its unique large-aspect sign sprite, or the book sprite for NNN/PPP).
 */
export function AlchemicalDisplay({
  id,
  elemWidth = 88,
}: {
  id: AlchemicalId;
  elemWidth?: number;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <AlchemicalImage id={id} width={elemWidth} />
    </span>
  );
}
