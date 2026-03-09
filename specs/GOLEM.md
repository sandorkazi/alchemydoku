# Alchemydoku — Golem Project: Design Specification

> Status: implemented (phase 11).
> Source: The Golem Project expansion rulebook.
> Multi-player board mechanics (approval tokens, progress reports, conferences,
> reputation scoring) are explicitly out of scope.

---

## 1. Golem Parameters

Every golem puzzle has a hidden golem configuration stored at the top level:

```ts
golem?: {
  chest: { color: Color; size: Size };  // e.g. { color: 'R', size: 'L' }
  ears:  { color: Color; size: Size };  // e.g. { color: 'G', size: 'S' }
}
```

The chest and ears always react to **different colors**. Sizes may coincide.

The golem params are **hidden from the solver** — they appear in the puzzle JSON for
answer computation but are never shown directly in the UI. Players must deduce them
from test results and hint clues.

---

## 2. Reaction Logic

The golem reacts to an ingredient based on **size** (not sign) of the ingredient's
alchemical on a specific color:

```
golemReacts(alch, params, 'chest')
  → SIZE_TABLE[alch0 * 3 + COLOR_INDEX[params.chest.color]] === (params.chest.size === 'L' ? 1 : 0)
```

### Reaction groups

Every ingredient belongs to exactly one group given the current world-set and golem params:

| Group          | Chest | Ears | Count (typical) |
|----------------|-------|------|-----------------|
| `animators`    | ✓     | ✓    | exactly 2       |
| `chest_only`   | ✓     | ✗    | exactly 2       |
| `ears_only`    | ✗     | ✓    | exactly 2       |
| `non_reactive` | ✗     | ✗    | exactly 2       |

`any_reactive` = union of `animators`, `chest_only`, `ears_only`.

The group counts follow from the alchemical structure: exactly 4 alchemicals have
the chest-size on the chest-color (split 2 animators + 2 chest_only), and exactly
4 have the ears-size on the ears-color (split 2 animators + 2 ears_only).

### Animation condition

An alchemical **animates the golem** if it belongs to the `animators` group.
There are always exactly **2 such alchemicals**. The puzzle is to identify
which 2 ingredients map to them.

---

## 3. Clue Types

### 3a. Golem Test (`kind: 'golem_test'`)

```ts
{
  kind: 'golem_test';
  ingredient: IngredientId;
  chest_reacted: boolean;
  ears_reacted: boolean;
}
```

Records the result of feeding one ingredient to the golem. Both flags can be
true (animator), one true (chest_only or ears_only), or both false (non_reactive).

**World filter:** Keep worlds where:
- `golemReacts(alch, params, 'chest') === chest_reacted`
- `golemReacts(alch, params, 'ears') === ears_reacted`

Requires `golem` params from puzzle context — `applyAnyClues` accepts an optional
`ctx: { golem?: GolemParams }` argument.

**Display:** Ingredient icon + ☁️ Chest badge (green=reacted, grey=no) +
👂 Ears badge (green=reacted, grey=no). Labelled "Golem Test".

---

### 3b. Golem Hint — Color (`kind: 'golem_hint_color'`)

```ts
{
  kind: 'golem_hint_color';
  part: 'chest' | 'ears';
  color: Color;
}
```

Reveals that the chest (or ears) reacts to a specific **color** aspect,
without revealing the size.

**World filter:** None — display only. Constrains golem params, not ingredient
assignments. (Q-C confirmed: golem params are puzzle metadata, not world variables.)

**Display:** "Chest / Ears reacts to [Red/Green/Blue] aspect." Labelled "Golem Research".

---

### 3c. Golem Hint — Size (`kind: 'golem_hint_size'`)

```ts
{
  kind: 'golem_hint_size';
  part: 'chest' | 'ears';
  size: Size;
}
```

Reveals that the chest (or ears) reacts to a **Large** or **Small** aspect,
without revealing the color.

**World filter:** None — display only.

**Display:** "Chest / Ears reacts to a [Large/Small] aspect." Labelled "Golem Research".

---

## 4. Question Types

All golem questions assume golem params are hidden; the player must deduce them.

### 4a. `golem_group` — Which ingredients are in group X?

```ts
{
  kind: 'golem_group';
  group: 'animators' | 'chest_only' | 'ears_only' | 'non_reactive' | 'any_reactive';
}
// Answer: IngredientSetAnswer — sorted IngredientId[]
```

**Computation:** For each ingredient slot, check if every remaining world places
it in the requested group. Return all such slots.

---

### 4b. `golem_animate_potion` — What potion do the two animators produce?

```ts
{ kind: 'golem_animate_potion' }
// Answer: PotionResult (single)
```

**Computation:** Identify the 2 animator ingredients (from world-set), compute
their mix. Returns null if not uniquely determined.

---

### 4c. `golem_mix_potion` — Which ingredients produce [target] with at least one member of [group]?

```ts
{
  kind: 'golem_mix_potion';
  target: PotionResult;
  with_group: 'animators' | 'chest_only' | 'ears_only' | 'non_reactive' | 'any_reactive';
}
// Answer: IngredientSetAnswer
```

**Computation:** For each ingredient not in `with_group`, check if there exists
at least one ingredient in `with_group` such that `mix(a, b)` could equal `target`
across all remaining worlds. Return all such ingredients.

---

### 4d. `golem_possible_potions` — What potions are achievable within/with group X?

```ts
{
  kind: 'golem_possible_potions';
  group: 'animators' | 'chest_only' | 'ears_only' | 'non_reactive' | 'any_reactive';
  partner?: IngredientId;  // if given: cross-mix group × partner; else intra-group all pairs
}
// Answer: { kind: 'possible-potions'; potions: string[] }
```

**Computation:** Enumerate all relevant pairs; collect union of all possible
`PotionResult`s across remaining worlds.

*Note for puzzle authors:* if the answer is all 7 potion types, discard the question
as trivial. The puzzle validator should flag this.

---

## 5. Answer Types

```ts
// New:
type IngredientSetAnswer = {
  kind: 'ingredient_set';
  ingredients: IngredientId[];  // always sorted ascending
};

// Reused from base:
// PotionResult — for golem_animate_potion
// { kind: 'possible-potions'; potions: string[] } — for golem_possible_potions
```

---

## 6. Grid UI — Golem Panel

A **Golem Tests** section appears inside the existing grid collapsible panel,
directly below the 8×8 ingredient grid. Only shown when the puzzle has `golem` params.

### Test results list

One row per `golem_test` clue:
```
[ingredient icon]  ☁️ Chest [✓/✗]   👂 Ears [✓/✗]
```
Green badge = reacted, grey badge = no reaction.

### Golem Notepad

Two pickers (Chest and Ears), each a 3×2 grid of `{color × size}` toggle buttons:

```
       S    L
Red   [ ]  [ ]
Green [ ]  [ ]
Blue  [ ]  [ ]
```

Player clicks to record their hypothesis. One button per picker can be active at a time.
Labelled "Your deduction — Chest" and "Your deduction — Ears".

**Auto-deduction:** If the world-set (after all clues) uniquely determines the golem
params, the notepad fills automatically (same logic as cell auto-deduction).

**State:** `golemNotepad: { chest: {color: Color; size: Size} | null; ears: {color: Color; size: Size} | null }`
added to `ExpandedSolverState`. Persisted inside `exp-solver-${id}` alongside grid state.

---

## 7. Puzzle JSON Format (Golem)

```jsonc
{
  "id": "exp-golem-tutorial-01",
  "mode": "expanded",
  "title": "The Awakening",
  "difficulty": "tutorial",
  "golem": {
    "chest": { "color": "R", "size": "L" },
    "ears":  { "color": "G", "size": "S" }
  },
  "clues": [
    { "kind": "golem_test", "ingredient": 1, "chest_reacted": true,  "ears_reacted": false },
    { "kind": "golem_test", "ingredient": 2, "chest_reacted": false, "ears_reacted": true  },
    { "kind": "golem_test", "ingredient": 3, "chest_reacted": true,  "ears_reacted": true  },
    { "kind": "golem_hint_color", "part": "chest", "color": "R" }
  ],
  "questions": [
    { "kind": "golem_group", "group": "animators" }
  ],
  "solution": { "1": 6, "2": 4, "3": 8, ... },
  "hints": [...]
}
```

---

## 8. Base Game Tutorial Additions (info-only)

Two static informational panels added to the **base game** tutorial/help area:

### Two-Colour Rule
When two alchemicals share a sign on a specific aspect, the resulting potion color follows:
- Matching **Red** aspect → **Red** or **Green** potion
- Matching **Green** aspect → **Green** or **Blue** potion
- Matching **Blue** aspect → **Blue** or **Red** potion

This is a consequence of the resolving-aspect mixing rule, not an independent rule.
Useful for master-variant debunking.

### Neutralizing Pairs
If two ingredients produce a Neutral potion, their alchemicals are direct opposites
(all three signs differ). This means they make identical reactions on both the golem's
chest and ears — knowing one is reactive tells you the other is also reactive in the
same way.

---

## 9. Scope Boundaries

**Out of scope:**
- Approval tokens, king's mood tiles, progress report scoring
- Multi-player action cube counts and conference reputation mechanics
- Golem animation success/failure as a scored game event
- Report tokens (chest/ears hypothesis submission with victory point stakes)
