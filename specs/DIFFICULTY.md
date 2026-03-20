# Puzzle Difficulty Scoring — Specification

## Overview

Puzzles are scored on a **[10, 100]** integer scale stored as `complexity.score`.
The score is the sum of three clamped components plus a base of 10:

```
score = 10 + clue_score + question_score + world_score
```

| Component | Range | Measures |
|---|---|---|
| `clue_score` | 0–50 | Structural difficulty of reading / applying each clue |
| `question_score` | 0–20 | Difficulty of the question type(s) |
| `world_score` | 0–20 | How constrained the answer ingredients are in the world set |

---

## Axis 1: Clue Complexity (0–50)

Accumulated over all clues; clamped to [0, 50].

| Clue kind | Points | Reason |
|---|---|---|
| `mixing`, `assignment`, `aspect`, `debunk*`, `book`, `encyclopedia`, `golem_test` | +0 | Clear, direct information |
| `sell` with `sign_ok` or `opposite` sellResult | +2 | Partial / indirect information |
| `encyclopedia_uncertain` | +5 | "At least 3 of 4 correct" — requires enumeration |
| `mixing_among`, `sell_result_among`, `book_among`, `golem_reaction_among` | +5 | Ambiguous group clue: X of Y ingredients |
| `mixing_count_among`, `sell_among` | +10 | Combinatoric group clue: exactly X of Y pairs |

---

## Axis 2: Question Complexity (0–20)

Accumulated over all questions; clamped to [0, 20].

| Condition | Points | Notes |
|---|---|---|
| `aspect` question | −5 | Binary sign choice — simplest question type |
| `large-component` question | −2 | Size rather than identity |
| Enumeration / multiple-choice question | +5 | Answer is a set: `possible-potions`, `aspect-set`, `group-possible-potions`, `ingredient-potion-profile`, `guaranteed-non-producer`, `golem_possible_potions`, `encyclopedia_which_aspect`, `encyclopedia_fourth` |
| Any debunk question present | +10 | Plan reasoning required (applied once per puzzle) |
| `debunk_conflict_only` present | +5 | Additional constraint on top of the +10 (applied once) |

---

## Axis 3: World Complexity (0–20)

Accumulated over all questions; clamped to [0, 20].

For each question, identify the ingredients it asks about and the mixing pair (if any),
then apply the following checks.

**Debunk questions** (`debunk_min_steps`, `debunk_apprentice_plan`, `debunk_conflict_only`):
flat +15 (full-board plan reasoning).

**All other question kinds:**

| Condition | Points |
|---|---|
| No clue directly shows the mixing result for the asked pair | +5 |
| Each ingredient in the question not directly constrained by any clue | +5 |
| Each ingredient in the question still having > 1 possible alchemical | +5 |

"Directly constrained" clues: `assignment`, `aspect`, `book`, `debunk` (apprentice), `debunk_apprentice` (expanded), `encyclopedia` (all four entries). `mixing` clues are **not** direct ingredient constraints — they only narrow the pair combination.

---

## Pip Conversion and Difficulty Labels

`complexity.score` ∈ [10, 100] is converted to a 1–5 pip tier for the `difficulty` field:

| Score range | Pip | Difficulty |
|---|---|---|
| 10–35 | 1 | `"easy"` |
| 36–45 | 2 | `"easy"` |
| 46–52 | 3 | `"medium"` |
| 53–58 | 4 | `"hard"` |
| 59–100 | 5 | `"expert"` |

Tutorial puzzles are exempt — their `difficulty` is always `"tutorial"` regardless of score.

`check_puzzles.py` check #15 enforces this: it fails if `complexity.score` is not an integer
in [10, 100] or if `difficulty` does not match the pip → label table above
(skipping puzzles with `difficulty == 'tutorial'`).

The same thresholds are encoded in `ComplexityPips` in `src/App.tsx` and
`src/expanded/ExpandedHome.tsx` so the UI dot display matches exactly.

---

## Output per puzzle

```json
{
  "complexity": {
    "score": 30,
    "clue_score": 0,
    "question_score": 0,
    "world_score": 20,
    "residual_worlds": 8
  }
}
```

The `difficulty` field at the top level is kept in sync with `score` by
`python scripts/alchemydoku.py analyze` (base) and `analyze-expanded` (expanded).

---

## Collection Re-ranking

`analyze` and `analyze-expanded` report collection pip distributions:

1. Compute pip for each puzzle in the collection.
2. Report median pip → maps to a difficulty label via the tier table.
3. Flag `← MISMATCH` if the collection's current `difficulty` label differs from the median-derived label.
4. Flag `← SPLIT SUGGESTED` if `max_pip − min_pip > 2` — the collection spans more than two difficulty levels and should be considered for splitting.
