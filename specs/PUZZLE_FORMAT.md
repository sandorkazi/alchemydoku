# Alchemydoku — Puzzle Format Specification

> Covers the base game puzzle JSON schema, collection structure, and ID conventions.
> Expanded puzzle format is covered in `EXPANDED.md`.

---

## 1. Puzzle JSON Schema

Every base-game puzzle is a `.json` file under `src/data/puzzles/`.

```jsonc
{
  "id": "easy-2003",           // string — must match filename stem
  "title": "The Wandering Monk",
  "description": "A brief flavour text shown in the puzzle header.",
  "difficulty": "easy",        // "tutorial" | "easy" | "medium" | "hard" | "expert"
  "clues": [ /* Clue[] — see GAME_MECHANICS.md §5 */ ],
  "questions": [ /* QuestionTarget[] — see GAME_MECHANICS.md §7 */ ],
  "solution": {
    "1": 3,    // ingredient slot 1 → alchemical 3
    "2": 6,
    "3": 1,
    "4": 4,
    "5": 5,
    "6": 2,
    "7": 7,
    "8": 8
  },
  "hints": [
    { "level": 1, "text": "Start by applying the mixing clue..." },
    { "level": 2, "text": "Ingredient 1 must be pNn because..." }
  ],
  "metadata": {               // optional, produced by generate scripts
    "generatedAt": "2025-03-07T12:00:00Z",
    "worldsAfterClues": 8,
    "minimumClues": true
  }
}
```

### Field rules

- `id` must be unique across all puzzles (base + expanded).
- `solution` keys are strings `"1"`–`"8"` (JSON object keys must be strings);
  values are `AlchemicalId` integers 1–8. Every key must be present — it is a
  complete bijection.
- `hints` are optional; levels must start at 1 and be contiguous integers.
- Hint text supports inline tokens that are rendered as visual badges:
  - Alchemical codes: `npN`, `pnP`, `pNn`, `nPp`, `Nnp`, `Ppn`, `NNN`, `PPP`
  - Ingredient references: `ingredient 3` (uses `displayMap` for icon/name)
  - Aspect signs: `R+`, `G−`, `B-` (both ASCII `-` and Unicode `−` accepted)

### Clue examples

```jsonc
// Mixing clue
{ "kind": "mixing", "ingredient1": 1, "ingredient2": 2, "result": { "type": "potion", "color": "G", "sign": "+" } }

// Aspect clue
{ "kind": "aspect", "ingredient": 3, "color": "R", "sign": "-" }

// Sell clue
{ "kind": "sell", "ingredient1": 4, "ingredient2": 5,
  "claimedResult": { "type": "potion", "color": "B", "sign": "+" },
  "sellResult": "sign_ok" }

// Apprentice debunk
{ "kind": "debunk", "variant": "apprentice", "ingredient": 2, "color": "G", "sign": "+", "outcome": "success" }

// Master debunk
{ "kind": "debunk", "variant": "master", "ingredient1": 3, "ingredient2": 6,
  "claimedPotion": { "type": "potion", "color": "R", "sign": "-" }, "outcome": "failure" }
```

---

## 2. Puzzle IDs and Filename Conventions

| Difficulty | ID range       | Example              |
|------------|----------------|----------------------|
| tutorial   | `tutorial-*`   | `tutorial-mix-01`    |
| easy       | `easy-2000+`   | `easy-2003`          |
| medium     | `medium-6000+` | `medium-6002`        |
| hard       | `hard-9000+`   | `hard-9001`          |
| expert     | `expert-1000+` | `expert-1005`        |

Tutorial IDs encode their mechanic: `tutorial-mix-*`, `tutorial-sell-*`, `tutorial-debunk-*`.

---

## 3. Collections

Puzzles are grouped into named collections. Each collection has a fixed ordered list of
puzzle IDs. Collections are defined in `src/data/puzzles/index.ts`.

```ts
type Collection = {
  id: string;          // e.g. "easy"
  title: string;       // e.g. "Easy Puzzles"
  difficulty: Difficulty;
  puzzleIds: string[];
};
```

Currently defined collections:
- `tutorial-mixing` — Mixing mechanics introduction (3 puzzles)
- `tutorial-selling` — Sell mechanics introduction (2 puzzles)
- `tutorial-debunking` — Debunk mechanics introduction (3 puzzles)
- `easy` — Easy puzzles (10 puzzles)
- `medium` — Medium puzzles (8 puzzles)
- `hard` — Hard puzzles (6 puzzles)
- `expert` — Expert puzzles (7 puzzles)

**Global indexes:** `ALL_PUZZLES: Puzzle[]` and `PUZZLE_MAP: Record<string, Puzzle>`
are also exported for O(1) lookup by ID.

---

## 4. Puzzle Validation Requirements

A puzzle is considered valid iff:
1. `applyClues(generateAllWorlds(), puzzle.clues)` produces a `WorldSet` of exactly 8
   worlds (one per alchemical as the solution's mapped ingredient, all valid bijections
   consistent with that assignment).
   *Practical target*: 8 remaining worlds (exactly the worlds matching the solution up to
   unspecified slots).
2. `computeAnswerFromWorlds(worlds, q)` returns a non-null answer for every question `q`.
3. The answer matches the expected answer derived from `puzzle.solution`.

The Python script `scripts/analyze_difficulty.py` runs this validation.

---

## 5. Puzzle Index Registration

To add a puzzle, it must be:
1. Added as a `.json` file under `src/data/puzzles/`
2. Imported and listed in `src/data/puzzles/index.ts`
3. Added to exactly one `Collection.puzzleIds` list

The index file is intentionally not auto-generated at build time — puzzles are curated
additions, not dynamically scanned.
