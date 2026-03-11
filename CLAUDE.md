# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # install dependencies
npm run dev          # start dev server (Vite)
npm run build        # production build → dist/
npm run preview      # preview the built dist/
npm run test         # run all tests (vitest)
npm run test:watch   # watch mode
```

> **Dev server URL:** open at `http://localhost:5173/alchemydoku/` — the base path is `/alchemydoku/` (required for GitHub Pages). Images 404 at the root `/`.

### Puzzle toolchain (Python, no dependencies needed)

```bash
# Generate expanded puzzles
python scripts/alchemydoku.py generate --profile easy_enc --count 3
python scripts/alchemydoku.py generate --profiles   # list all profiles

# Validate all expanded puzzle JSON files
python scripts/alchemydoku.py validate

# Recompute complexity scores for base-game puzzles
python scripts/alchemydoku.py analyze
```

**After generating a puzzle**, register it in `src/expanded/data/puzzlesIndex.ts`: add an import and add the puzzle to `ALL_EXPANDED_PUZZLES` and optionally to `EXPANDED_COLLECTIONS`.

## Architecture

### Two independent game modes

The app has two completely separate runtime paths toggled by `alch-mode` in `localStorage`:

- **Base mode** (`src/`) — the original 8-ingredient, 8-alchemical puzzle set
- **Expanded mode** (`src/expanded/`) — adds three new mechanics on top of the base rules

`App.tsx` is the single-file router/home shell; it renders `PuzzleSolverPage` for base puzzles or hands off to `ExpandedHome` for expanded mode. There is no React Router — navigation is managed via a plain `View` union type in component state.

### Core domain model (`src/types.ts`)

- **Alchemical**: 8 unique symbols, each with R/G/B aspects (sign: `+`/`-`, size: `L`/`S`)
- **Assignment**: bijection from 8 ingredient slots → 8 alchemical IDs
- **WorldSet**: `Uint16Array` of indices into `WORLD_DATA` — represents the set of still-possible assignments given the clues
- **Clue**: union of `MixingClue | AspectClue | SellClue | DebunkClue | MixingAmongClue | SellAmongClue | SellResultAmongClue`

### Logic layer (`src/logic/`)

Performance-critical code using precomputed lookup tables:

- `worldPack.ts` — compacts all 40,320 permutations into `WORLD_DATA: Uint8Array` (320 KB). Lookup tables: `SIGN_TABLE`, `SIZE_TABLE`, `MIX_TABLE`. All filters operate on indices, never on JS objects.
- `worldSet.ts` — one `filterBy*` function per clue kind; `applyClues` chains them. Each filter calls `filterWorlds(worlds, predicate)` which returns a new `Uint16Array`.
- `deducer.ts` — reads a `WorldSet` to answer questions (deduce mixing result, alchemical, aspect sign, possible potions, etc.)
- `mixer.ts` — implements the mixing rule for a single pair of alchemicals
- `debunk.ts` — validates debunk-plan answers (min steps, conflict-only)

### Solver state machine (`src/contexts/SolverContext.tsx`)

`SolverProvider` wraps each puzzle page. State is managed by a `useReducer` with actions: `TOGGLE_CELL`, `SET_CELL`, `SUBMIT_ANSWER`, `REQUEST_HINT`, `TOGGLE_AUTO_DEDUCTION`, `REVEAL_SOLUTION`, `RESET`, `RESHUFFLE`, `CLEAR_GRID`, `SET_NOTE`, `LOAD_PROGRESS`.

Auto-deduction (`applyAutoDeduction`) runs after any state change when the toggle is on — it eliminates cells whose world-sets have no matching assignment and confirms the sole remaining possibility per ingredient.

Progress persists to `localStorage` under two keys: a legacy per-puzzle key `solver-<puzzleId>` and a unified `alch-save-base` blob (the unified key is authoritative).

### Expanded mechanics (`src/expanded/`)

Mirrors the base `src/` structure:

- `expanded/types.ts` — adds `ExpandedClue` (book/solar-lunar, encyclopedia, golem tests) and `ExpandedQuestion` types; `ExpandedPuzzle` extends base `Puzzle`
- `expanded/logic/` — `solarLunar.ts`, `golem.ts`, `worldSetExpanded.ts` (filter functions for expanded clues), `debunkExpanded.ts`
- `expanded/contexts/ExpandedSolverContext.tsx` — analogous to `SolverContext` but handles `AnyClue` and extra grid panels (solar/lunar marks)
- `expanded/data/puzzlesIndex.ts` — static registry of all expanded puzzle JSONs

### Puzzle JSON schema

Base puzzles live in `src/data/puzzles/*.json` and are registered in `src/data/puzzles/index.ts`. Expanded puzzles live in `src/expanded/data/puzzles/*.json`. Both share the shape described in `src/types.ts` (`Puzzle`) / `src/expanded/types.ts` (`ExpandedPuzzle`). The `solution` field is the ground-truth `Assignment`.

### Google Drive sync (`src/services/googleDrive.ts`)

Optional cloud save using GIS implicit token flow — no backend. Requires `VITE_GOOGLE_CLIENT_ID` in `.env`. The app saves to `drive.appDataFolder` (invisible in Drive UI). The `DriveProvider` / `DriveContext` wrap the entire app and expose `onPuzzleComplete` which triggers a sync.

### Tests

Unit tests live in `tests/logic/` and cover `mixer`, `worldSet`, and `deducer`. Run a single file with:

```bash
npx vitest run tests/logic/mixer.test.ts
```

TypeScript is strict (`strict`, `noUnusedLocals`, `noUnusedParameters`). Path alias `@/*` maps to `src/*`.
