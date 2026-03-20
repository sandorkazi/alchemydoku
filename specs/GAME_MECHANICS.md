# Alchemydoku — Core Game Mechanics

> Source of truth for the alchemical data model, mixing rules, sell rules,
> and all base-game clue types. Expanded rules are covered in `EXPANDED.md`.

---

## 1. Alchemicals

There are exactly **8 alchemicals**, each with three aspect values (Red, Green, Blue).
Each aspect has a **sign** (`+` or `−`) and a **size** (`S`mall or `L`arge).

### Canonical table

| ID | Code | R    | G    | B    |
|----|------|------|------|------|
| 1  | npN  | −S   | +S   | −L   |
| 2  | pnP  | +S   | −S   | +L   |
| 3  | pNn  | +S   | −L   | −S   |
| 4  | nPp  | −S   | +L   | +S   |
| 5  | Nnp  | −L   | −S   | +S   |
| 6  | Ppn  | +L   | +S   | −S   |
| 7  | NNN  | −L   | −L   | −L   |
| 8  | PPP  | +L   | +L   | +L   |

### Color coding (for display)

Each alchemical is rendered using its three aspect colours. Base hex per channel:

| Color | Base      | Lighter (L, ×1.10) | Darker (S, ×0.90) |
|-------|-----------|--------------------|--------------------|
| R     | `#ef4444` | `#fca5a5`          | `#7f1d1d`          |
| G     | `#16a34a` | `#86efac`          | `#14532d`          |
| B     | `#2563eb` | `#93c5fd`          | `#1e3a8a`          |

Sign encodes shade: `+` → lighter variant, `−` → darker variant.

---

## 2. Ingredients

There are exactly **8 ingredient slots** (IDs 1–8). Ingredients are a **display layer only** —
the solver logic works entirely with ingredient slot IDs. The mapping between slot IDs and
displayed ingredient names/icons is determined by the `displayMap` (see §6).

Current ingredient ordering (by icon index 0–7):
`Fern, Mushroom, Mandrake Root, Scorpion Tail, Toad, Feather, Nightshade, Raven's Feather`

---

## 3. Mixing Rules

Given two distinct alchemicals A and B, their mix produces a potion result:

1. **Neutral check**: If all three sign-bits are mutually opposite (R: A≠B, G: A≠B, B: A≠B),
   the result is **Neutral**.
2. **Resolving aspect**: Otherwise, find the unique color where `sign(A) == sign(B)` AND
   `size(A) != size(B)`. The result is a colored potion `{color, sign}` where `sign` is
   the shared sign of that aspect.

The resolving aspect is always unique for any non-opposite pair — the alchemical set
is designed to guarantee this.

### Two-colour rule (informational)
When two alchemicals share sign on a specific aspect, the result color follows:
- Matching Red → Red or Green potion
- Matching Green → Green or Blue potion
- Matching Blue → Blue or Red potion

This is a consequence of the resolving-aspect rule, not an independent rule.

---

## 4. Sell Rules

A sell action is a mixing action where the player **publicly claims** a potion result.
The observed outcome is one of four values:

| Outcome        | Meaning                                                      |
|----------------|--------------------------------------------------------------|
| `total_match`  | The actual mix result matches the claimed color AND sign     |
| `sign_ok`      | Same sign as claimed but different color (or different sign of same color) |
| `neutral`      | The actual result is Neutral                                 |
| `opposite`     | The actual result has the opposite sign from the claim       |

Formally, given `claimed = {color: C, sign: S}` and `actual`:
- `actual == neutral` → `neutral`
- `actual.color == C && actual.sign == S` → `total_match`
- `actual.sign == S && actual.color != C` → `sign_ok`
- `actual.sign != S` → `opposite`

---

## 5. Base Clue Types

All types defined in `src/types.ts`. All filters in `src/logic/worldSet.ts`.

### 5a. Mixing Result (`kind: 'mixing'`)
```ts
{ kind: 'mixing'; ingredient1: IngredientId; ingredient2: IngredientId; result: PotionResult }
```
**Filter:** Keep worlds where `mix(ingredient1, ingredient2) === result`.

### 5b. Aspect (`kind: 'aspect'`)
```ts
{ kind: 'aspect'; ingredient: IngredientId; color: Color; sign: Sign }
```
**Filter:** Keep worlds where `alch(ingredient).color.sign === sign`.
Note: **size is never revealed** by an aspect clue — only sign.

### 5c. Full Assignment (`kind: 'assignment'`)
```ts
{ kind: 'assignment'; ingredient: IngredientId; alchemical: AlchemicalId }
```
**Filter:** Keep worlds where `assignment[ingredient] === alchemical`.
Strongest possible clue — pins one ingredient completely.

### 5d. Sell Result (`kind: 'sell'`)
```ts
{
  kind: 'sell';
  ingredient1: IngredientId;
  ingredient2: IngredientId;
  claimedResult: { type: 'potion'; color: Color; sign: Sign };
  sellResult: SellResult;
}
```
**Filter:** See §4. Applies the sell outcome as a constraint on `mix(ingredient1, ingredient2)`.

### 5e. Debunk — Apprentice (`kind: 'debunk', variant: 'apprentice'`)
```ts
{
  kind: 'debunk'; variant: 'apprentice';
  ingredient: number; color: Color; sign: Sign;
  outcome: 'success' | 'failure';
}
```
**Filter:** Apply `sign` as a direct aspect constraint on `ingredient` (equivalent to an
aspect clue). Both `success` and `failure` reveal the same truth.

### 5f. Debunk — Master (`kind: 'debunk', variant: 'master'`)
```ts
{
  kind: 'debunk'; variant: 'master';
  ingredient1: number; ingredient2: number;
  claimedPotion: PotionResult;
  outcome: 'success' | 'failure';
}
```
**Filter:**
- `success` → treat as a `mixing` clue: `mix(i1, i2) === claimedPotion`
- `failure` → treat as a negative mixing constraint: `mix(i1, i2) !== claimedPotion`

Note: `claimedPotion` is what the debunker publicly claimed to produce. For `success` it equals the actual mix result; for `failure` the actual result is different (and not publicly known).

### 5g. "Among" clue variants (non-compliant — no board-game equivalent)

These clue types are registered in `NON_COMPLIANT_BASE_CLUE_KINDS` in `src/compliance.ts` and are only visible when "Allow unrealistic puzzles" is ON.

#### `kind: 'mixing_among'`
```ts
{ kind: 'mixing_among'; ingredients: IngredientId[]; result: PotionResult }
```
**Filter:** Keep worlds where at least one pair from `ingredients` produces `result`.

#### `kind: 'mixing_count_among'`
```ts
{ kind: 'mixing_count_among'; ingredients: IngredientId[]; result: PotionResult; count: number }
```
**Filter:** Keep worlds where exactly `count` of the C(n,2) pairs produce `result`.

#### `kind: 'sell_result_among'`
```ts
{ kind: 'sell_result_among'; ingredients: IngredientId[]; claimedPotion: { color, sign }; sellResult: SellResult }
```
**Filter:** Keep worlds where at least one pair from `ingredients` produces `sellResult` when sold as `claimedPotion`.

#### `kind: 'sell_among'`
```ts
{ kind: 'sell_among'; ingredients: IngredientId[]; claimedPotion: { color, sign }; result: SellResult; count: number }
```
**Filter:** Keep worlds where exactly `count` pairs produce `result` when sold as `claimedPotion`.

---

## 6. World Representation

All 40,320 possible assignments (bijections of 8 ingredients to 8 alchemicals) are stored
in a single `Uint8Array` (`WORLD_DATA`) of length 322,560. A `WorldSet` is a `Uint16Array`
of world indices into this flat store.

```
WORLD_DATA[w * 8 + (slot - 1)] = alch0   // alch0 is 0-indexed (actual id = alch0 + 1)
```

Precomputed lookup tables (all `Uint8Array`):
- `SIGN_TABLE[alch0 * 3 + colorIdx]` → 1 if `+`, 0 if `−`
- `SIZE_TABLE[alch0 * 3 + colorIdx]` → 1 if `L`, 0 if `S`
- `MIX_TABLE[a0 * 8 + b0]` → result code (0=neutral, 1=R+, 2=R−, 3=G+, 4=G−, 5=B+, 6=B−)

Starting world set for every puzzle: all 40,320 worlds. Clues are applied sequentially
via `applyClues(generateAllWorlds(), puzzle.clues)`.

---

## 7. Question / Answer Types (Base Game)

| Question kind               | Input                          | Answer type / notes                                                   |
|-----------------------------|--------------------------------|-----------------------------------------------------------------------|
| `mixing-result`             | two ingredient IDs             | `PotionResult`                                                        |
| `alchemical`                | one ingredient ID              | `AlchemicalId` (number 1–8)                                           |
| `aspect`                    | ingredient ID + color          | `{ sign: Sign }`                                                      |
| `safe-publish`              | ingredient ID                  | `Color` — which aspect color is safe to hedge                         |
| `possible-potions`          | two ingredient IDs             | `{ kind: 'possible-potions'; potions: string[] }` — all potions possible in any remaining world |
| `aspect-set`                | color + sign                   | `{ kind: 'aspect-set'; ingredients: IngredientId[] }` — ingredients every world agrees on |
| `large-component`           | color                          | `{ kind: 'large-component'; ingredients: IngredientId[] }` — ingredients with Large size every world agrees on |
| `neutral-partner`           | one ingredient ID              | `IngredientId` — unique partner that always mixes neutral with this ingredient |
| `ingredient-potion-profile` | one ingredient ID              | `PotionResult[]` — all potions certainly producible (same in every world); neutral always included |
| `group-possible-potions`    | list of ingredient IDs         | `PotionResult[]` — potions **certainly** achievable by at least one pair in the group (not just possible) |
| `most-informative-mix`      | one ingredient ID              | `IngredientId \| null` — partner maximising Shannon entropy of mix result distribution; `null` on ties |
| `guaranteed-non-producer`   | `PotionResult` target          | `IngredientId[] \| null` — ingredients that can never produce the target; `null` if set is empty |
| `debunk_min_steps`          | (debunk board)                 | validated via `debunk_answers` — see DEBUNK_PUZZLES.md                |
| `debunk_apprentice_plan`    | (debunk board)                 | validated via `debunk_answers`; only apprentice steps allowed         |
| `debunk_conflict_only`      | `fixedIngredient: IngredientId`| validated via `debunk_answers`; every step must create a conflict without removal |

`computeAnswerFromWorlds` returns `null` for all three debunk question kinds — answers are
validated externally via `debunk_answers` in the puzzle JSON.

For `possible-potions`, the answer is the set of potions possible in **any** remaining world.
For `group-possible-potions`, the answer is the set of potions certain in **every** remaining world for at least one pair — the stronger "certainly achievable" criterion.
For `aspect-set` and `large-component`, the answer is the subset every world agrees on.

---

## 8. Display Map

The `displayMap` (type `DisplayMap = Record<number, number>`) maps logical slot IDs
(1–8, determined by the puzzle's `solution` ordering) to display ingredient IDs (1–8,
used for icon/name lookup). This allows puzzles to shuffle which named ingredient appears
in which slot without changing puzzle logic.

Persisted per puzzle in `localStorage` under key `display-map-${puzzleId}`.
