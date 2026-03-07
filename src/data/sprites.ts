/**
 * Sprite definitions — standalone PNG files under /images/.
 */

export const INGREDIENT_SPRITES = {
  0: '/images/i0.png',
  1: '/images/i1.png',
  2: '/images/i2.png',
  3: '/images/i3.png',
  4: '/images/i4.png',
  5: '/images/i5.png',
  6: '/images/i6.png',
  7: '/images/i7.png',
} as const;

export const POTION_SPRITES = {
  'R+':         '/images/potion_red_plus.svg',
  'R-':         '/images/potion_red_minus.svg',
  'G+':         '/images/potion_green_plus.svg',
  'G-':         '/images/potion_green_minus.svg',
  'B+':         '/images/potion_blue_plus.svg',
  'B-':         '/images/potion_blue_minus.svg',
  'neutral':    '/images/potion_null.svg',
  'correct':    '/images/potion_correct.svg',
  'sign_ok':    '/images/potion_sign_ok.svg',
  'sign_wrong': '/images/potion_sign_wrong.svg',
} as const;

export type PotionKey = keyof typeof POTION_SPRITES;

export const ELEM_SPRITES = {
  'R_L': '/images/elem_R_L.svg',
  'R_S': '/images/elem_R_S.svg',
  'G_L': '/images/elem_G_L.svg',
  'G_S': '/images/elem_G_S.svg',
  'B_L': '/images/elem_B_L.svg',
  'B_S': '/images/elem_B_S.svg',
} as const;

export const SIGN_SPRITES = {
  'R+': '/images/sign_R_plus.svg',
  'R-': '/images/sign_R_minus.svg',
  'G+': '/images/sign_G_plus.svg',
  'G-': '/images/sign_G_minus.svg',
  'B+': '/images/sign_B_plus.svg',
  'B-': '/images/sign_B_minus.svg',
} as const;

// Alchemicals use sign sprites (s_*.png) — no dedicated alchemical images yet.
export const ALCHEMICAL_SPRITES = {
  1: '/images/alch_1.svg',   // npN  → B−
  2: '/images/alch_2.svg',    // pnP  → B+
  3: '/images/alch_3.svg',  // pNn  → G−
  4: '/images/alch_4.svg',   // nPp  → G+
  5: '/images/alch_5.svg',    // Nnp  → R−
  6: '/images/alch_6.svg',     // Ppn  → R+
  7: '/images/alch_7.svg',        // NNN
  8: '/images/alch_8.svg',         // PPP
} as const;

export const UI_SPRITES = {
  correct:   '/images/correct.svg',
  incorrect: '/images/incorrect.svg',
  unknown:   '/images/unknown.svg',
  plus:      '/images/plus.svg',
  minus:     '/images/minus.svg',
} as const;

export const ACTION_SPRITES = {
  taster:      '/images/uiresources/taster.png',
  sell_icon:   '/images/uiresources/sell.png',
  debunk_icon: '/images/uiresources/debunk.png',
  correct:     '/images/correct.svg',
  incorrect:   '/images/incorrect.svg',
} as const;
