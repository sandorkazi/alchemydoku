# Alchemydoku — Hint System Specification

> Covers the structured hint system (`hint_steps`), its JSON schema, generation
> algorithm, and TypeScript rendering architecture.
> The legacy flat-text `hints` field is documented in `PUZZLE_FORMAT.md`.

---

## 1. Overview

Puzzles can carry two hint fields:

| Field | Format | Purpose |
|---|---|---|
| `hints` | `{ level: number; text: string }[]` | Legacy flat-text hints (levels 1–3). Still supported. |
| `hint_steps` | `HintStep[]` | Structured reasoning walk (see §2). Takes precedence in the UI when present. |

`hint_steps` provides a step-by-step deduction walkthrough from an unconstrained
grid to the fully solved worldview. Each step has three human-readable narrative
parts, machine-readable highlight/impact data for UI animation, and hidden
world-count metadata for debugging.

---

## 2. `hint_steps` JSON Schema

One flat array on the puzzle object, covering all questions in sequence (same
question-ordering convention as `hints` level offsets).

### Step object

```jsonc
{
  // Three narrative sub-parts — rendered as labelled paragraphs in the UI
  "look_at": "clue 1 (ing1 and ing3 mix to R+) and clue 3 (ing1 has R−).",
  "means":   "When two ingredients mix to a colored potion, they share that color's sign. But clue 3 says ing1 is R−, not R+.",
  "so":      "ing3 must be R− as well — cross off all R+ alchemicals from ing3's column: pnP, npN, pNn, Ppn.",

  // What to visually highlight while this step is active
  "highlight": {
    "clue_indices": [0, 2],          // 0-based indices into puzzle.clues
    "ingredients":  [1, 3],          // 1-based ingredient slot IDs
    "grid_cells": [                  // specific (ingredient, alchemical) cells (optional)
      { "ingredient": 3, "alchemical": "pNn" }
    ]
  },

  // What changes in the grid after this step
  "impact": {
    "confirmed_aspects": [
      { "ingredient": 3, "color": "R", "sign": "-" }
    ],
    "confirmed_alchemicals": [],
    "eliminated_cells": [
      { "ingredient": 3, "alchemicals": ["pnP", "npN", "pNn", "Ppn"] }
    ]
  },

  // Marks the first step where the question's answer is deducible
  "reveals_answer": false,

  // Optional — only for indirect-proof step pairs
  "bifurcation": false,

  // Hidden metadata — rendered as data-attributes only, never displayed
  "worlds_before": 40320,
  "worlds_after":  5040
}
```

### Field rules

- Exactly one step per question must have `"reveals_answer": true`.
- For multi-question puzzles, steps are ordered: all steps for Q1, then Q2, etc.
  (same convention as `hints` level offsets).
- `look_at`, `means`, `so` must use visual tokens — never raw ingredient names.
  Tokens: `ing1`–`ing8`, `R+` / `R−` / `G+` / `G−` / `B+` / `B−`,
  alchemical codes (`npN`, `NNN`, …). See `PUZZLE_FORMAT.md §1` for the full list.
- `highlight.clue_indices` are 0-based into the puzzle's `clues` array. May be `[]`
  for derived-deduction steps that stem from transitivity rather than a single clue.
- `impact.eliminated_cells` lists only *newly* impossible cells for this step, not
  the cumulative total.
- `worlds_before` / `worlds_after` are stored in JSON but rendered only as
  `data-worlds-before` / `data-worlds-after` HTML attributes — visible in page
  source / DevTools, never in any visible UI text.
- Bifurcation steps come in pairs: the first introduces the assumption
  (`"Suppose ing3 were R+…"`), the companion concludes the contradiction and
  forced result. Both carry `"bifurcation": true`.

---

## 3. Generation Algorithm (Python, `alchemydoku.py`)

### Entry point

```python
gen_hint_steps(raw) -> list[dict]
```

`raw` is the same dict used by `gen_hints`: keys `clues`, `worlds`, `q`, `sol`,
`golem`. No new inputs are required — everything is derivable from the existing
puzzle data.

### Phase 0 — Setup

```python
restricted_worlds = apply_clues(all_worlds(), puzzle.clues)
```

This is the ground-truth "fully solved" worldview; used as the reference for
`deduction_report` comparisons.

### Phase 1 — Pedagogical clue ordering

1. **Dependency graph** — for each pair (A, B): if applying B after A produces more
   eliminations than applying B on its own, B "depends on" A.
2. **Greedy topological sort** — among clues with no pending dependencies, pick the
   one that most reduces the running worldset when applied next.
3. **Grouping heuristic** — aspect clues for the same ingredient stay together;
   mixing clues for a pair follow after that pair's aspect clues.

### Phase 2 — Step walk

```python
running_worlds = all_worlds()
prev_report    = deduction_report(running_worlds)

for clue in ordered_clues:
    new_worlds  = apply_clue(running_worlds, clue)
    new_report  = deduction_report(new_worlds)
    delta       = compute_delta(prev_report, new_report)   # newly confirmed/eliminated

    if delta:
        look_at, means, so = gen_step_texts(clue, delta, running_worlds)
        steps.append({
            'look_at':        look_at,
            'means':          means,
            'so':             so,
            'highlight':      clue_to_highlight(clue, delta),
            'impact':         delta_to_impact(delta),
            'reveals_answer': is_answer_deducible(new_worlds, q) and not already_revealed,
            'worlds_before':  len(running_worlds),
            'worlds_after':   len(new_worlds),
        })

    running_worlds = new_worlds
    prev_report    = new_report
```

`gen_step_texts` adapts the existing helpers (`_aspect_chain()`,
`gen_mixing_result_hints()`, etc.) — same **"eliminate the alternative"** quality
rule, never "try X → works → X". Each of the three strings is one short sentence
or short paragraph.

`clue_to_highlight` maps clue kind → highlight dict:

| Clue kind | `clue_indices` | `ingredients` | `grid_cells` |
|---|---|---|---|
| `aspect` | yes | `[ingredient]` | — |
| `mixing` | yes | `[i1, i2]` | — |
| `assignment` | yes | `[ingredient]` | `[(ingredient, alchemical)]` |
| `*_among` | yes | group members | — |

### Phase 3 — Derived (transitive) deductions

After all clue steps, emit extra steps for facts that became deducible by
elimination rather than by a single clue:

- Ingredient whose alchemical is now uniquely determined (7 of 8 candidates
  eliminated).
- Aspect confirmed because all other candidates share the same sign.

These steps have `"clue_indices": []`.

### Phase 4 — Bifurcation (last resort)

Only if `reveals_answer: true` has not yet been emitted after Phase 3:

1. Find the ingredient with fewest remaining possible alchemicals (prefer 2–3).
2. For each candidate alchemical: simulate assigning it, run the deduction walk,
   check for contradiction (0 worlds) or answer deducibility.
3. If a candidate leads to contradiction → emit an indirect-proof step pair.
4. Among answer-reaching candidates, pick the one needing fewest intermediate steps.

Both steps in a bifurcation pair carry `"bifurcation": true`.

### Phase 5 — Post-answer completion

After `reveals_answer: true`, continue the walk until the worldview matches the
fully restricted puzzle state. These steps are included in `hint_steps`; the UI
may collapse them behind an expand control.

---

## 4. Generator Subcommands

### `regen-hint-steps`

Mirrors `regen-hints`. Iterates puzzle files (`--all`, `--files`, `--missing-only`),
calls `gen_hint_steps(raw)` per question with level offsets, writes `hint_steps`
into each puzzle JSON in-place.

```bash
python scripts/alchemydoku.py regen-hint-steps --files src/data/puzzles/tutorial-balance-01.json
python scripts/alchemydoku.py regen-hint-steps --all --missing-only
```

### `check-hint-steps`

Validates the `hint_steps` field in one or all puzzle files:

- Exactly one `"reveals_answer": true` per question.
- The `so` text at that step references the answer using correct tokens.
- All ingredient/aspect/alchemical references use tokens (no raw names).

Exits with code 1 on any failure (suitable for CI / pre-commit).

```bash
python scripts/alchemydoku.py check-hint-steps
python scripts/alchemydoku.py check-hint-steps --files src/data/puzzles/tutorial-balance-01.json
```

---

## 5. TypeScript Types

```typescript
// src/types.ts  (or src/types/hints.ts)

export type HintHighlight = {
  clueIndices?: number[];
  ingredients?: IngredientId[];
  gridCells?:   Array<{ ingredient: IngredientId; alchemical: AlchemicalId }>;
};

export type HintImpact = {
  confirmedAlchemicals?: Array<{ ingredient: IngredientId; alchemical: AlchemicalId }>;
  confirmedAspects?:     Array<{ ingredient: IngredientId; color: Color; sign: Sign }>;
  eliminatedCells?:      Array<{ ingredient: IngredientId; alchemicals: AlchemicalId[] }>;
};

export type HintStep = {
  lookAt:         string;   // "Look at…"   — token-aware text
  means:          string;   // "That means…" — token-aware text
  so:             string;   // "So…"         — token-aware text
  highlight:      HintHighlight;
  impact:         HintImpact;
  revealsAnswer?: boolean;
  bifurcation?:   boolean;
  worldsBefore?:  number;   // hidden — rendered only as data-attribute
  worldsAfter?:   number;
};
```

`Puzzle` gains `hintSteps?: HintStep[]` (JSON key: `hint_steps`).
`ExpandedPuzzle` inherits it unchanged.

JSON ↔ TypeScript key mapping follows standard camelCase convention used
throughout the project (JSON snake_case fields are parsed by Vite's import
of `.json` files as-is; the TS interface must match).

---

## 6. UI — `HintStepViewer` Component

`src/components/HintStepViewer.tsx`:

- Replaces `HintDrawer` when `hintSteps` is present; falls back to `HintDrawer`
  when absent (backward-compatible).
- Steps are revealed one at a time with a "Next reasoning step" button.
- Each step renders its three narrative parts using the same `renderHint(text,
  displayMap)` token logic from `HintDrawer`:

  ```
  👁  Look at:     [look_at text with inline chips]
  💡 That means:  [means text with inline chips]
  ✏️  So:          [so text with inline chips]
  ```

- **Highlights** (active while a step is displayed):
  - `clueIndices` → CSS highlight class on clue-list rows (clue list must accept a
    `highlightedIndices` prop).
  - `ingredients` → amber glow on ingredient column headers in the grid.
  - `gridCells` → per-cell highlight in the ingredient grid.

- **Impact** (shown after the "So" part renders):
  - `confirmedAlchemicals` / `confirmedAspects` → ✓ badge on confirmed cells.
  - `eliminatedCells` → ✗ or fade on newly impossible cells.

- **World counts**: root step element carries `data-worlds-before` /
  `data-worlds-after` attributes — readable in DevTools / page source, invisible
  in the rendered UI.

- Steps with `revealsAnswer: true` show a visual marker ("Answer is now deducible").
- Steps with `bifurcation: true` render indented with an assumption label
  ("Suppose…").
- Player's current step index is stored in solver state (`hintStepIndex`) and
  persisted to the save file alongside `hintLevel`.

### SolverContext changes

```typescript
// New state field
hintStepIndex: number;   // 0 = no steps shown yet

// New action
{ type: 'NEXT_HINT_STEP' }
// reducer: Math.min(state.hintStepIndex + 1, puzzle.hintSteps.length)
```

`RESET` sets `hintStepIndex` back to 0.

---

## 7. Files Affected

| File | Change |
|---|---|
| `scripts/alchemydoku.py` | Add `gen_hint_steps()`, `regen-hint-steps`, `check-hint-steps`; adapt `_aspect_chain()` and per-kind helpers |
| `src/types.ts` | Add `HintStep`, `HintHighlight`, `HintImpact`; extend `Puzzle` |
| `src/expanded/types.ts` | `ExpandedPuzzle` inherits automatically |
| `src/components/HintStepViewer.tsx` | New component |
| `src/components/HintDrawer.tsx` | Fallback routing when `hintSteps` absent |
| `src/contexts/SolverContext.tsx` | `hintStepIndex` state, `NEXT_HINT_STEP` action |
| `src/expanded/contexts/ExpandedSolverContext.tsx` | Same additions |

TypeScript changes are deferred until the Python generator is producing correct
`hint_steps` output for at least one tutorial puzzle.

---

## 8. Golem Grid (Expanded Mode — Future Extension)

The alchemical grid impact described above is universal to all puzzles. For
expanded puzzles with golem clues, `impact` may later gain a
`confirmedGolemConfig` field to describe which golem-part assignments are newly
determined by a step. This extension is out of scope for the initial
implementation.
