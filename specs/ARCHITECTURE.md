# Alchemydoku — Architecture Specification

> Covers project structure, context system, routing model, localStorage layout,
> and the isolation contract between base game and expanded mode.

---

## 1. Project Structure

```
alchemydoku/
├── specs/                    ← design specifications (this folder)
├── tests/
│   └── logic/                ← unit tests (vitest)
│       ├── deducer.test.ts   ← deduceMixingResult, deduceAlchemical, getPossibleAlchemicals
│       ├── mixer.test.ts     ← mix(), potionToString(), isDirectOpposite()
│       └── worldSet.test.ts  ← generateAllWorlds, filterByClue, applyClues
├── scripts/                  ← Python tooling (puzzle generation, analysis)
├── public/                   ← static assets (SVG sprites, favicon)
├── src/
│   ├── types.ts              ← all base game TypeScript types
│   ├── main.tsx              ← React entry point
│   ├── App.tsx               ← top-level routing, mode switcher
│   │
│   ├── data/
│   │   ├── alchemicals.ts    ← ALCHEMICALS record (canonical truth for alch data)
│   │   ├── ingredients.ts    ← INGREDIENTS record (names, icon indices)
│   │   ├── sprites.ts        ← atlas sprite metadata
│   │   └── puzzles/
│   │       ├── index.ts      ← ALL_PUZZLES, PUZZLE_MAP, COLLECTIONS
│   │       └── *.json        ← individual puzzle files
│   │
│   ├── logic/
│   │   ├── worldPack.ts      ← WORLD_DATA, SIGN_TABLE, SIZE_TABLE, MIX_TABLE, filterWorlds
│   │   ├── worldSet.ts       ← generateAllWorlds, applyClues, per-clue filters
│   │   ├── deducer.ts        ← deduceMixingResult, deduceAlchemical, deduceAspect, etc.
│   │   ├── mixer.ts          ← mix(), mixIngredients(), potionResultsEqual()
│   │   ├── alchemicals.ts    ← isDirectOpposite(), helper functions
│   │   ├── sellValidator.ts  ← sell outcome logic
│   │   └── index.ts          ← re-exports
│   │
│   ├── puzzles/
│   │   └── schema.ts         ← PuzzleAnswer type, computeAnswerFromWorlds, checkAnswers
│   │
│   ├── contexts/
│   │   ├── SolverContext.tsx    ← base game solver state + reducer
│   │   └── TutorialContext.tsx  ← tutorial step tracking
│   │
│   ├── components/           ← base game UI components (all use useSolver())
│   │   ├── IngredientGrid.tsx
│   │   ├── ClueCard.tsx / CluePanel.tsx
│   │   ├── AnswerPanel.tsx
│   │   ├── HintDrawer.tsx
│   │   ├── MixSimulator.tsx
│   │   ├── AlchemicalDisplay.tsx
│   │   └── GameSprites.tsx   ← all image primitives (AlchemicalImage, PotionImage, etc.)
│   │
│   ├── pages/
│   │   ├── PuzzleSolverPage.tsx  ← wraps SolverProvider, composes base components
│   │   └── TutorialPage.tsx
│   │
│   └── expanded/             ← ISOLATED: only App.tsx may import from here
│       ├── types.ts
│       ├── ExpandedHome.tsx
│       ├── contexts/
│       │   └── ExpandedSolverContext.tsx
│       ├── components/
│       │   ├── ExpandedIngredientGrid.tsx
│       │   ├── ExpandedClueCard.tsx / ExpandedCluePanel.tsx
│       │   ├── ExpandedAnswerPanel.tsx
│       │   ├── ExpandedHintDrawer.tsx
│       │   └── ExpandedMixSimulator.tsx
│       ├── contexts/
│       ├── data/
│       │   ├── puzzlesIndex.ts
│       │   └── puzzles/*.json
│       ├── logic/
│       │   ├── solarLunar.ts
│       │   └── worldSetExpanded.ts
│       ├── pages/
│       │   └── ExpandedPuzzleSolverPage.tsx
│       └── puzzles/
│           └── schemaExpanded.ts
```

---

## 2. Isolation Contract

The expanded mode is **fully isolated** from the base game:

- **Only `App.tsx` imports from `src/expanded/`** — no base game component, context,
  or logic file may import from the expanded subtree.
- The expanded solver context (`ExpandedSolverProvider`) is entirely separate from
  `SolverProvider` and cannot be nested or substituted.
- Components that need context (`HintDrawer`, `MixSimulator`) have expanded clones
  (`ExpandedHintDrawer`, `ExpandedMixSimulator`) in `expanded/components/` that call
  `useExpandedSolver()` instead of `useSolver()`.
- Shared pure logic (world packing, deduction, sprite rendering) lives in base game modules
  and may be freely imported by expanded code — data flows down only.

To verify: `grep -r "from '.*expanded/" src/` should return only `App.tsx`.

---

## 3. Routing Model

There is no URL router. Navigation state is held in `App.tsx` via `useState<View>`.

```ts
type View =
  | { kind: 'home' }
  | { kind: 'collection'; colId: string }
  | { kind: 'puzzle'; puzzleId: string; colId: string }
  | { kind: 'tutorial'; tutorialId: string };
```

Mode (base vs expanded) is a separate state dimension: `mode: 'base' | 'expanded'`.
- `mode === 'base'` → renders the base game home/collection/puzzle views
- `mode === 'expanded'` → renders `<ExpandedHome>` which manages its own internal
  navigation (activePuzzle state, collection browsing)

Mode persisted in `localStorage` under key `alch-mode`.

---

## 4. Solver Context (Base Game)

`SolverContext.tsx` provides:

```ts
type ExpandedSolverState = {
  puzzle: Puzzle;
  worlds: WorldSet;           // current filtered world set (from clues, not grid)
  gridState: GridState;       // player's cell marks: Record<slot, Record<alch, CellState>>
  displayMap: DisplayMap;     // slot → displayed ingredient id mapping
  hintLevel: number;          // how many hints have been revealed
  completed: boolean;
  wrongAttempts: number;
  showSolution: boolean;      // revealed after too many wrong attempts
};

type Action =
  | { type: 'TOGGLE_CELL'; slotId: number; alchId: number }
  | { type: 'SET_CONFIRMED'; slotId: number; alchId: number }
  | { type: 'RESET' }
  | { type: 'REQUEST_HINT' }
  | { type: 'SUBMIT_ANSWERS'; answers: (PuzzleAnswer | null)[] }
  | { type: 'REVEAL_SOLUTION' };
```

Auto-deduction runs after every action: if every remaining world agrees that slot S maps
to alchemical A, that cell is auto-confirmed and all other cells in that row/column are
auto-eliminated.

State persisted in `localStorage`:
- `solver-${puzzleId}` → `gridState`, `hintLevel`, `completed`, `wrongAttempts`
- `display-map-${puzzleId}` → `displayMap`

---

## 5. Solver Context (Expanded Game)

`ExpandedSolverContext.tsx` mirrors the base context with additions:

```ts
type ExpandedSolverState = base state fields + {
  solarLunarMarks: Record<number, SolarLunarMark>;
  // SolarLunarMark = { solar: CellState; lunar: CellState }
  // Solar and Lunar marks are independent; each tracks its own CellState.
  // (Earlier versions used 'solar' | 'lunar' | null — replaced to support independent marks.)
};

additional action:
  | { type: 'SET_SOLAR_LUNAR_MARK'; slotId: number; mark: SolarLunarMark }
```

Persisted under `exp-solver-${id}` and `exp-display-map-${id}` to avoid key collisions
with base game progress.

---

## 6. Progress Tracking

Per-mode progress is tracked in `App.tsx` for the base game and `ExpandedHome.tsx` for
the expanded game.

| Key                      | Value                      | Scope    |
|--------------------------|----------------------------|----------|
| `alch-mode`              | `'base'` \| `'expanded'`   | global   |
| `alch-completed-base`    | JSON array of puzzle IDs   | base     |
| `alch-last-puzzle-base`  | last opened puzzle ID      | base     |
| `alch-completed-expanded`| JSON array of puzzle IDs   | expanded |
| `alch-last-puzzle-expanded` | last opened puzzle ID   | expanded |
| `solver-${id}`           | grid + hint state          | per-puzzle base |
| `display-map-${id}`      | displayMap                 | per-puzzle base |
| `exp-solver-${id}`       | expanded grid + hint state | per-puzzle expanded |
| `exp-display-map-${id}`  | expanded displayMap        | per-puzzle expanded |
| `alch-gamification`      | `'true'` \| `'false'`      | global   |
| `alch-free-play-base`    | `'true'` \| `'false'`      | base     |
| `alch-free-play-expanded`| `'true'` \| `'false'`      | expanded |

---

## 7. Reset Behaviour

"Reset all progress" buttons appear on both home screens. Each:
1. Clears the mode-specific completed set and last-puzzle key from localStorage.
2. Clears all per-puzzle `solver-${id}` and `display-map-${id}` (or `exp-` prefixed) keys.
3. Increments a `resetVersion` counter in React state.

The `resetVersion` is included in the `key` prop of `PuzzleSolverPage` /
`ExpandedPuzzleSolverPage`, forcing a full React remount even if the same puzzle is
currently open. Without this, in-memory solver state would survive the localStorage clear.

---

## 8. Build & Deploy

- **Build tool:** Vite
- **Base path:** `/alchemydoku/` (set in `vite.config.ts` for GitHub Pages)
- **Deploy target:** `https://sandorkazi.github.io/alchemydoku/`
- All asset URLs must use `import.meta.env.BASE_URL` prefix for production correctness.

```ts
// Correct
const url = `${import.meta.env.BASE_URL}sprites/ingredients.png`;

// Wrong (breaks on GitHub Pages)
const url = `/sprites/ingredients.png`;
```
---

## 9. Tests

Unit tests live in `tests/logic/` and run via **Vitest** (no browser environment needed).

```bash
npm test          # run once
npm run test:watch  # watch mode
```

| File                  | Covers                                                    |
|-----------------------|-----------------------------------------------------------|
| `worldSet.test.ts`    | `generateAllWorlds`, `filterByClue` (mixing/aspect/assignment), `applyClues` |
| `mixer.test.ts`       | `mix()`, `potionToString()`, `isDirectOpposite()`         |
| `deducer.test.ts`     | `deduceAlchemical`, `deduceMixingResult`, `getPossibleAlchemicals`, `getEliminatedCells` |

Tests import directly from `src/logic/` — no component rendering. They cover the core
deduction and mixing logic that all puzzle solving depends on. Expanded logic
(`solarLunar.ts`, `worldSetExpanded.ts`, `golem.ts`) does not currently have dedicated
tests; correctness is verified via puzzle validation (`scripts/alchemydoku.py validate`).
