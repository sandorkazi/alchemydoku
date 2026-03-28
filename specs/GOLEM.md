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

The golem params are **hidden from the solver**. In **legacy-style** puzzles they
appear in the JSON as metadata for answer computation. In **joint-golem** puzzles
(the new style) the `golem` field is **omitted entirely** from the JSON — the config
is fully unknown and must be deduced from clues. Players must deduce the config from
test results and hint clues in both styles.

---

## 2. Reaction Logic

The golem reacts to an ingredient based on **size** (not sign) of the ingredient's
alchemical on a specific color:

```
golemReacts(alch, params, 'chest')
  → SIZE_TABLE[alch0 * 3 + COLOR_INDEX[params.chest.color]] === (params.chest.size === 'L' ? 1 : 0)
```

### Reaction groups (SIZE-based)

Every ingredient belongs to exactly one SIZE-based reaction group given the current
world-set and golem params:

| Group            | Chest | Ears | Count (typical) |
|------------------|-------|------|-----------------|
| `both_reactive`  | ✓     | ✓    | exactly 2       |
| `chest_only`     | ✓     | ✗    | exactly 2       |
| `ears_only`      | ✗     | ✓    | exactly 2       |
| `non_reactive`   | ✗     | ✗    | exactly 2       |

`any_reactive` = union of `both_reactive`, `chest_only`, `ears_only`.

The group counts follow from the alchemical structure: exactly 4 alchemicals have
the chest-size on the chest-color (split 2 both_reactive + 2 chest_only), and exactly
4 have the ears-size on the ears-color (split 2 both_reactive + 2 ears_only).

### Animation condition (SIGN-based)

Distinct from the SIZE-based reaction. An ingredient **ANIMATES the golem** if its
alchemical has the sign *implied* by each golem part's size on the corresponding color:
  Large (L) → `+`,  Small (S) → `−`

Example: golem `{ chest: G/L, ears: B/S }`
  → animation requires `G+` AND `B−`
  → exactly 2 alchemicals satisfy both conditions

The `golem_group:'animators'` question asks for these **SIGN-based animation ingredients**,
NOT the SIZE-based `both_reactive` group. An ingredient in `both_reactive` is NOT
necessarily an animator — it only means both golem parts reacted to its SIZE.

---

## 3. Clue Types

### 3a. Golem Test (`kind: 'golem_test'`)

```ts
{
  kind: 'golem_test';
  ingredient: IngredientId;
  chest_reacted: boolean | null;   // null = not observed (partial test)
  ears_reacted:  boolean | null;   // null = not observed
}
```

Records the result of feeding one ingredient to the golem. Both flags can be
true (both_reactive), one true (chest_only or ears_only), or both false (non_reactive).
A `null` value means that part was not observed (partial test) — its constraint
is skipped during world filtering.

**World filter:** Keep worlds where:
- `golemReacts(alch, params, 'chest') === chest_reacted`
- `golemReacts(alch, params, 'ears') === ears_reacted`

In **legacy-style** puzzles (with `puzzle.golem`), requires golem params from context.
In **joint-golem** puzzles, `applyCluesWithGolemState` applies this to all 24 configs
simultaneously, eliminating configs inconsistent with the observed reaction.

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

**World filter:** None — display only. In joint-golem mode, eliminates configs
where the given part's size doesn't match.

**Display:** "Chest / Ears reacts to a [Large/Small] aspect." Labelled "Golem Research".

---

### 3d. Golem Animation (`kind: 'golem_animation'`)

```ts
{
  kind: 'golem_animation';
  ingredient: IngredientId;
  is_animator: boolean;
}
```

Records whether an ingredient's alchemical satisfies the **SIGN-based** animation
condition (Large → `+`, Small → `−` on each part's color) for the true config.

**Filter (joint-golem):** For each surviving config, keep worlds where
`isAnimationIngredient(alch, config) === is_animator`.

**Display:** Ingredient icon + animated/not-animated badge. Labelled "Golem Animation".

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

**Note on `'animators'`:** The `animators` group here refers to the **SIGN-based
animation condition** (see "Animation condition" in Section 2), NOT the SIZE-based
`both_reactive` reaction group. An ingredient in `both_reactive` (reacts to both
parts) is not necessarily an animator — it may lack the correct SIGN.

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

### 4e. `golem_reaction_component` — What is the full golem configuration?

```ts
{ kind: 'golem_reaction_component' }
// Answer: GolemConfigAnswer — unique config if exactly 1 survives
```

**Computation (joint-golem):** Returns the unique surviving config, or `null` if
more than one config is still consistent with all clues.

---

### 4f. `golem_reaction_both_alch` — Which 2 alchemicals react to BOTH parts?

```ts
{ kind: 'golem_reaction_both_alch' }
// Answer: AlchemicalSetAnswer — sorted AlchemicalId[], length 2
```

**Computation:** All surviving configs must agree on the same 2 SIZE-based
`both_reactive` alchemicals. Returns `null` if configs disagree.

---

### 4g. `golem_reaction_both_ing` — Which 2 ingredient slots react to BOTH parts?

```ts
{ kind: 'golem_reaction_both_ing' }
// Answer: IngredientSetAnswer — sorted IngredientId[], length 2
```

**Computation:** Slot `s` is definite iff in EVERY surviving (config, world) pair,
the alchemical at slot `s` is `both_reactive` for that config. Returns exactly 2
such slots, or `null`.

---

### 4h. `golem_animation_alch` — Which 2 alchemicals animate the golem (SIGN-based)?

```ts
{ kind: 'golem_animation_alch' }
// Answer: AlchemicalSetAnswer — sorted AlchemicalId[], length 2
```

**Computation:** All surviving configs must agree on the same 2 SIGN-based animator
alchemicals. Returns `null` if configs disagree.

---

### 4i. `golem_animation_ing` — Which 2 ingredient slots animate the golem?

```ts
{ kind: 'golem_animation_ing' }
// Answer: IngredientSetAnswer — sorted IngredientId[], length 2
```

**Computation:** Slot `s` is definite iff in EVERY surviving (config, world) pair,
the alchemical at slot `s` satisfies the SIGN-based animation condition for that
config. Returns exactly 2 such slots, or `null`.

---

## 5. Answer Types

```ts
// Legacy (used by golem_group):
type IngredientSetAnswer = {
  kind: 'ingredient_set';
  ingredients: IngredientId[];  // always sorted ascending
};

// New (joint-golem):
type GolemConfigAnswer = {
  kind: 'golem_config';
  chest: { color: Color; size: Size };
  ears:  { color: Color; size: Size };
};

type AlchemicalSetAnswer = {
  kind: 'alchemical_set';
  alchemicals: AlchemicalId[];  // always sorted ascending, length 2
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
[ingredient icon]  [chest icon] ✓/✗   [ears icon] ✓/✗
```
Each part label uses `GolemPartIcon` (circular crop PNG) instead of an emoji.
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

### Legacy style (fixed config — `puzzle.golem` present)

Used by hand-crafted tutorial puzzles. The `golem` field is included as metadata
for display and validation. TypeScript uses it to constrain golem_test filtering.

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

### Joint-golem style (config unknown — `puzzle.golem` absent)

Used by generated puzzles. The `golem` field is **omitted**. TypeScript's
`needsJointGolemReasoning` detects golem clues without a fixed config and uses
`GolemSolverState` (24 configs × world indices) for joint reasoning.

```jsonc
{
  "id": "golem-02",
  "mode": "expanded",
  "title": "...",
  "difficulty": "easy",
  "clues": [
    { "kind": "mixing", "ingredient1": 1, "ingredient2": 4, "result": { "color": "R", "sign": "-" } },
    { "kind": "golem_test", "ingredient": 1, "chest_reacted": true, "ears_reacted": false },
    { "kind": "golem_animation", "ingredient": 3, "is_animator": true }
  ],
  "questions": [
    { "kind": "golem_animation_ing" }
  ],
  "solution": { "1": 8, ... },
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
