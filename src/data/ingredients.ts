import type { IngredientId, Ingredient } from '../types';

/**
 * The 8 ingredients from the base game.
 * Names are for display only and do not affect logic.
 *
 * ⚠️  These names are best-guess placeholders — confirm against the physical game
 *     before using them in puzzle text or tutorial copy.
 */
// Sprite index = ingredient ID − 1.
// Mapping confirmed against atlas:
//   i0 = Fern, i1 = Bird Claw, i2 = Mushroom, i3 = Flower,
//   i4 = Mandrake (rotated in atlas), i5 = Scorpion,
//   i6 = Toad, i7 = Raven's Feather (rotated in atlas)
export const INGREDIENTS: Record<IngredientId, Ingredient> = {
  1: { id: 1, name: 'Fern' },
  2: { id: 2, name: 'Bird Claw' },
  3: { id: 3, name: 'Mushroom' },
  4: { id: 4, name: 'Flower' },
  5: { id: 5, name: 'Mandrake' },
  6: { id: 6, name: 'Scorpion' },
  7: { id: 7, name: 'Toad' },
  8: { id: 8, name: "Raven's Feather" },
};

export const INGREDIENT_IDS: IngredientId[] = [1, 2, 3, 4, 5, 6, 7, 8];
