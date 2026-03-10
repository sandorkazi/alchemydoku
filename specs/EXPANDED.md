# Alchemydoku — Expanded Rules: Design Specification

> Status: fully implemented (phase 10d+).
> Golem Project mechanics: implemented — see GOLEM.md.
> Debunking puzzle type: designed — see DEBUNK_PUZZLES.md.

---

## 1. Solar / Lunar Classification

### Definition

Every alchemical is either **Solar** or **Lunar**, determined by its ID:

| ID  | Class |
|-----|-------|
| odd | Solar |
| even| Lunar |

### Canonical table

| Alch | Code | Class |
|------|------|-------|
| 1    | npN  | Solar |
| 2    | pnP  | Lunar |
| 3    | pNn  | Solar |
| 4    | nPp  | Lunar |
| 5    | Nnp  | Solar |
| 6    | Ppn  | Lunar |
| 7    | NNN  | Solar |
| 8    | PPP  | Lunar |

Solar: {1, 3, 5, 7} — Lunar: {2, 4, 6, 8}

### Implementation

`isSolar(alchId)` in `expanded/logic/solarLunar.ts` — `alchId % 2 === 1`.

---

## 2. Expanded Clue Types

All expanded clue types live in `expanded/types.ts` and are filtered in
`expanded/logic/worldSetExpanded.ts`.

### 2a. Book Token (`kind: 'book'`)

**Meaning:** The player privately learned (via the Card Reader action) that a specific
ingredient's alchemical is Solar or Lunar.

```ts
{
  kind: 'book';
  ingredient: IngredientId;
  result: 'solar' | 'lunar';
}
```

**World filter:** Keep only worlds where `ingredient` maps to an alchemical of `result` class.

**Display:** Ingredient icon + Solar/Lunar badge. Labelled "Book Token".

---

### 2b. Encyclopedia Article — Trusted (`kind: 'encyclopedia'`)

**Meaning:** A published Royal Encyclopedia article. Lists exactly 4 ingredients with their
true sign on one named aspect. All 4 entries are guaranteed correct.

**Article structure:**
- One **aspect** (`R`, `G`, or `B`)
- Exactly **4 entries**, each binding one ingredient to a sign (`+` or `−`) on that aspect
- The 4 signs can be any combination: all+, all−, 2+/2−, 3+/1−, etc.

```ts
{
  kind: 'encyclopedia';
  aspect: Color;
  entries: [
    { ingredient: IngredientId; sign: Sign },
    { ingredient: IngredientId; sign: Sign },
    { ingredient: IngredientId; sign: Sign },
    { ingredient: IngredientId; sign: Sign },
  ];
}
```

**World filter:** Keep only worlds where every entry's ingredient has the stated sign on
`aspect`.

**Display:** Grid of 4 ingredient+sign pairs under an aspect header. Labelled "Encyclopedia — [Color]".

---

### 2c. Encyclopedia Article — Uncertain (`kind: 'encyclopedia_uncertain'`)

**Meaning:** A published article that has not yet been debunked, but is not fully verified.
At least 3 of the 4 entries are correct; one may be wrong.

A player may physically hedge one slot with a coloured seal (face-down, hidden from others)
to protect themselves if exactly that ingredient's entry is proven wrong. **This hedging
mechanic is physical-only — it has no effect on world-set filtering.**

```ts
{
  kind: 'encyclopedia_uncertain';
  aspect: Color;
  entries: [EncyclopediaEntry, EncyclopediaEntry, EncyclopediaEntry, EncyclopediaEntry];
}
```

**World filter:** Keep only worlds where at least 3 of the 4 entries hold. This is strictly
weaker than the trusted variant.

**Display:** Same grid layout as trusted, with a note "≥ 3 of 4 entries are correct".
Labelled "Uncertain Article — [Color]".

---

### 2d. Debunk Clue — Apprentice Variant (`kind: 'debunk_apprentice'`)

**Meaning:** An article was challenged by revealing the **true** aspect sign of one
ingredient, which directly contradicts the article's claim for that slot.

The `sign` field carries the **truth** — what the ingredient's sign on `aspect` actually is.
The article claimed the opposite. This truth is always filterable regardless of `successful`.

`successful: true` means the debunk was accepted (the article was removed from the board).
`successful: false` means the article had a hedge seal covering that slot, so the article
survives — but the true sign is still public information.

```ts
{
  kind: 'debunk_apprentice';
  ingredient: IngredientId;
  aspect: Color;
  sign: Sign;           // the TRUE sign (contradicts the article's entry)
  successful: boolean;
}
```

**World filter:** Apply `sign` as a direct aspect constraint on `ingredient` — identical to
a base `aspect` clue. Both success and failure cases reveal the same truth.

**Display:** Ingredient icon + aspect icon + sign badge. Labelled "Debunk — Apprentice (truth)".
Status badge shows "✓ Debunk succeeded" or "⚠ Blocked by hedge".

---

### 2e. Debunk Clue — Master Variant (`kind: 'debunk_master'`)

**Meaning:** An article was challenged by producing a mixing result that contradicts one or
two entries via the game's potion logic (possibly via the two-colour rule).

Only the **claimed** result is shown — the true result of the mix is not public, especially
on an unsuccessful attempt. Therefore:

- `successful: true` → the claim was verified; the result is real and can constrain worlds.
- `successful: false` → the claim was rejected; no world information is extractable.

```ts
{
  kind: 'debunk_master';
  ingredient1: IngredientId;
  ingredient2: IngredientId;
  claimed_result: PotionResult;
  successful: boolean;
}
```

**World filter:** If `successful`, keep only worlds where `mix(ingredient1, ingredient2)`
produces `claimed_result`. If not successful, no filtering is applied.

**Display:** Two ingredient icons + claimed potion label. Labelled "Debunk — Master (claim)".
Status badge shows "✓ Debunk succeeded" or "✗ Claim rejected".

---

## 3. Expanded Question / Answer Types

### 3a. Fourth Ingredient (`kind: 'encyclopedia_fourth'`)

**Question:** Three entries of an article on `aspect` are known. The fourth slot has sign
`missing_sign`. Which ingredient fills it?

```ts
// Question
{
  kind: 'encyclopedia_fourth';
  aspect: Color;
  known: [EncyclopediaEntry, EncyclopediaEntry, EncyclopediaEntry];
  missing_sign: Sign;   // the sign the unknown ingredient has on aspect
}

// Answer: IngredientId (plain number, same representation as base alchemical answers)
```

**Computation:** Find the unique ingredient (not in `known`) that every remaining world
agrees has `missing_sign` on `aspect`. Returns `null` if not uniquely determined.

**Answer UI:** Grid of ingredient icons excluding `known` ingredients; click to select one.
The sign is displayed in the question header — the player only needs to identify the ingredient.

---

### 3b. Which Aspect (`kind: 'encyclopedia_which_aspect'`)

**Question:** These 4 (ingredient, sign) entries are known to form a valid article.
Which aspect (color) does the article cover?

```ts
// Question
{
  kind: 'encyclopedia_which_aspect';
  entries: [EncyclopediaEntry, EncyclopediaEntry, EncyclopediaEntry, EncyclopediaEntry];
}

// Answer
{ kind: 'aspect_color'; color: Color }
```

**Computation:** Find the unique Color where every remaining world agrees each entry's
ingredient has the stated sign on that color.

**Answer UI:** Three colored aspect buttons (R/G/B).

---

### 3c. Solar or Lunar (`kind: 'solar_lunar'`)

**Question:** Is this ingredient's alchemical Solar or Lunar?

```ts
// Question
{ kind: 'solar_lunar'; ingredient: IngredientId }

// Answer
{ kind: 'solar_lunar_answer'; result: 'solar' | 'lunar' }
```

**Computation:** Check whether every remaining world maps `ingredient` to an alchemical of
the same Solar/Lunar class.

**Answer UI:** Two buttons: ☀ Solar (`text-orange-400`) and ☽ Lunar (`text-slate-400`).

---

## 4. Grid UI Changes

### 4a. Solar/Lunar row striping

All 8 grid rows are visually distinguished by the Solar/Lunar class of their alchemical:

- **Solar rows** (alch 1, 3, 5, 8): amber/gold left border
- **Lunar rows** (alch 2, 4, 6, 7): blue/indigo left border

The canonical ordering (1=S, 2=L, 3=S, 4=L, 5=S, 6=L, 7=L, 8=S) is not perfectly
alternating — must be computed via `isSolar`, not assumed.

### 4b. Solar/Lunar column marks

Each ingredient column header gains two small pill-shaped toggle buttons:
- ☀ Solar button (`text-orange-400`, always orange) — left
- ☽ Lunar button (`text-slate-400`, always grey) — right

These let the player record their deduction about an ingredient's Solar/Lunar class.
Solar and Lunar marks are **fully independent** — both can be set simultaneously (e.g.
while narrowing candidates).

Each button cycles through the same four states as a regular cell:
`unknown → possible → eliminated → confirmed`, and is tool-aware:
- **mark tool**: cycles unknown → confirmed → eliminated → unknown
- **question tool**: toggles unknown ↔ possible
- **text tool**: behaves like mark tool

When a cell in a Solar row is confirmed, a small ☀ mark (`text-orange-400`) appears in the
cell's top-left corner reflecting the column's solar mark state. Lunar rows show ☽
(`text-slate-400`) in the top-right.

**State:** `solarLunarMarks: Record<number, SolarLunarMark>` in `ExpandedSolverState`,
where `SolarLunarMark = { solar: CellState; lunar: CellState }`.

> ⚠️ Earlier versions used `'solar' | 'lunar' | null` — this was replaced by the
> `{solar, lunar}` pair so both marks can be tracked independently per column.

**Auto-deduction:** When auto-deduction is on, if every remaining world agrees an ingredient
is Solar (or Lunar), the corresponding mark is auto-confirmed — same pattern as cell auto-deduction.

---

## 5. Isolation Rule

The expanded mode is fully isolated from the base game:

- All expanded files live under `src/expanded/`
- **Only `App.tsx` imports from `expanded/`** — no base game file imports from it
- The expanded solver context (`ExpandedSolverProvider`) is entirely separate from the
  base `SolverProvider` — they cannot be nested or mixed
- `ExpandedHintDrawer` and `ExpandedMixSimulator` are expanded-specific clones of their
  base counterparts that use `useExpandedSolver()` instead of `useSolver()`

---

## 6. Data Format — Expanded Puzzle JSON

```jsonc
{
  "id": "exp-easy-enc-01",          // must start with "exp-"
  "mode": "expanded",               // required marker
  "title": "...",
  "description": "...",
  "difficulty": "tutorial" | "easy" | "medium" | "hard",
  "clues": [ /* AnyClue[] — base clues or expanded clues */ ],
  "questions": [ /* AnyQuestion[] */ ],
  "solution": { "1": 3, "2": 6, ... },  // ingredient slot → alchemical id
  "hints": [
    { "level": 1, "text": "..." },
    { "level": 2, "text": "..." }
  ]
}
```

Encyclopedia clue example:
```jsonc
{
  "kind": "encyclopedia",
  "aspect": "R",
  "entries": [
    { "ingredient": 1, "sign": "+" },
    { "ingredient": 2, "sign": "+" },
    { "ingredient": 3, "sign": "-" },
    { "ingredient": 4, "sign": "-" }
  ]
}
```

Encyclopedia fourth question example:
```jsonc
{
  "kind": "encyclopedia_fourth",
  "aspect": "G",
  "known": [
    { "ingredient": 2, "sign": "+" },
    { "ingredient": 4, "sign": "-" },
    { "ingredient": 6, "sign": "+" }
  ],
  "missing_sign": "+"
}
```

---

## 7. Implemented Since Initial Design

- **Golem Project mechanics**: fully implemented — see `GOLEM.md`
- **Base-game debunking puzzles**: fully implemented. Four hand-crafted puzzles:
  - `debunk-plan-tutorial-01` — single apprentice, 1-step min
  - `debunk-plan-easy-01`, `debunk-plan-easy-02` — easy 1–2 step plans
  - `debunk-plan-conflict-01` — `debunk_conflict_only` question type
  Logic lives in `src/logic/debunk.ts`; schema validation in `src/puzzles/schema.ts`;
  UI in `src/components/DebunkAnswerPanel.tsx`.
- **Expanded debunking puzzle type**: three hand-crafted puzzles
  (`exp-debunk-tutorial-01`, `exp-debunk-easy-01`, `exp-debunk-medium-01`);
  generator not yet implemented.

## 8. Deferred / Out of Scope

- **Two-colour rule explanation**: pedagogical content only, no puzzle mechanic yet
- **Double-trouble**: simultaneous two-article debunk via a single mix — deferred
- **Uncertain article difficulty scoring**: `analyze` subcommand not yet updated for
  3-of-4 enumeration complexity
- **Debunk puzzle generator**: BFS-based generator described in `DEBUNK_PUZZLES.md`;
  not yet added to `scripts/alchemydoku.py`
- **Seal mechanic / own-publication strategy**: deferred indefinitely
