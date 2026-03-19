# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # install dependencies
npm run dev          # start dev server (Vite)
npm run build        # production build → dist/  (runs tsc --noEmit first)
npm run preview      # preview the built dist/
npm run test         # run all tests (vitest)
npm run test:watch   # watch mode
```

> **Dev server URL:** open at `http://localhost:5173/alchemydoku/` — the base path is `/alchemydoku/` (required for GitHub Pages). Images 404 at the root `/`.

### Puzzle toolchain (Python, no dependencies needed)

```bash
# Generate base or expanded puzzles
python scripts/alchemydoku.py generate --profile easy_enc --count 3
python scripts/alchemydoku.py generate --profiles   # list all profiles

# Validate all puzzle JSON files (base + expanded, world-simulation)
python scripts/alchemydoku.py validate

# Structural + integrity checks (fast, ~0.1 s) — also run by pre-commit
python scripts/check_puzzles.py
python scripts/check_puzzles.py --deep    # + logical validation (slow)
python scripts/check_puzzles.py --files src/data/puzzles/easy-2000.json

# Recompute complexity scores for base-game puzzles
python scripts/alchemydoku.py analyze
```

**After generating a base puzzle**, register it in `src/data/puzzles/index.ts`.
**After generating an expanded puzzle**, register it in `src/expanded/data/puzzlesIndex.ts`: add an import and add the puzzle to `ALL_EXPANDED_PUZZLES` and optionally to `EXPANDED_COLLECTIONS`.

### Pre-commit hook (Husky)

The `.husky/pre-commit` hook runs on every commit:
1. `npx tsc --noEmit` — type-check
2. `python3 scripts/check_puzzles.py` — structural + trivial-answer + hint-token checks
3. `npm run test` — full vitest suite (181 tests)

## Deployment

- `main` → `https://sandorkazi.github.io/alchemydoku/`
- `develop` → `https://sandorkazi.github.io/alchemydoku/preview/`
- Uses `peaceiris/actions-gh-pages@v4` with `keep_files: true` and `destination_dir`
- GitHub Pages source must be: **Deploy from branch → `gh-pages` → `/ (root)`**
- Vite `base` is read from `VITE_BASE_PATH` env var (fallback `/alchemydoku/`)

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
- **Clue**: union of `MixingClue | AspectClue | FullAssignmentClue | SellClue | DebunkClue | MixingAmongClue | SellAmongClue | SellResultAmongClue`
- **QuestionTarget**: union of all question kinds (see table below)

#### QuestionTarget kinds

| Kind | Answer type | Description |
|---|---|---|
| `mixing-result` | `PotionResult` | What potion does mixing this pair produce? |
| `alchemical` | `AlchemicalId` | Which alchemical is this ingredient? |
| `aspect` | `Sign` | What is the sign of this ingredient's color aspect? |
| `aspect-set` | `IngredientSet` | Which ingredients have this color+sign aspect? |
| `large-component` | `IngredientSet` | Which ingredients have the Large component for this color? |
| `possible-potions` | `PossiblePotionsAnswer` | What potions can this pair possibly produce? |
| `safe-publish` | `Color` | Which aspect color is safe to hedge when publishing? |
| `neutral-partner` | `IngredientId` | Which ingredient always mixes neutrally with this one? |
| `ingredient-potion-profile` | `IngredientPotionProfile` | All certainly-producible potions for this ingredient |
| `group-possible-potions` | `GroupPossiblePotions` | All certainly-achievable potions by any pair in a group |
| `most-informative-mix` | `IngredientId` | Partner maximising Shannon entropy of mix result distribution |
| `guaranteed-non-producer` | `NonProducerSet` | Ingredients that can never produce the target potion |
| `debunk_min_steps` | (validated externally) | Min-step debunk plan (apprentice + master) |
| `debunk_apprentice_plan` | (validated externally) | Apprentice-only debunk plan |
| `debunk_conflict_only` | (validated externally) | Single master step producing a conflict without removal |

Debunk question types return `null` from `computeAnswerFromWorlds` — their answers are validated via `debunk_answers` in the puzzle JSON.

### Logic layer (`src/logic/`)

Performance-critical code using precomputed lookup tables:

- `worldPack.ts` — compacts all 40,320 permutations into `WORLD_DATA: Uint8Array` (320 KB). Lookup tables: `SIGN_TABLE`, `SIZE_TABLE`, `MIX_TABLE`. All filters operate on indices, never on JS objects.
- `worldSet.ts` — one `filterBy*` function per clue kind; `applyClues` chains them. Each filter calls `filterWorlds(worlds, predicate)` which returns a new `Uint16Array`.
- `deducer.ts` — reads a `WorldSet` to answer questions (deduce mixing result, alchemical, aspect sign, possible potions, neutral partner, potion profile, best mix, non-producers, etc.)
- `mixer.ts` — implements the mixing rule for a single pair of alchemicals
- `debunk.ts` — validates debunk-plan answers (min steps, conflict-only)
- `alchemicals.ts` — `getAlchemical`, `getAspect`, `isDirectOpposite` helpers
- `sellValidator.ts` — `isSellSuccess(claimed, actual, tier)` for weak/average/strong sell tiers

### Solver state machine (`src/contexts/SolverContext.tsx`)

`SolverProvider` wraps each puzzle page. State is managed by a `useReducer` with actions: `TOGGLE_CELL`, `SET_CELL`, `SUBMIT_ANSWER`, `REQUEST_HINT`, `TOGGLE_AUTO_DEDUCTION`, `REVEAL_SOLUTION`, `RESET`, `RESHUFFLE`, `CLEAR_GRID`, `SET_NOTE`, `LOAD_PROGRESS`, `ADD_DRAW_STROKE`, `CLEAR_DRAW_STROKES`.

Shared utilities (display map, grid state, unified store writes) live in `src/utils/solverStorage.ts`.

Auto-deduction (`applyAutoDeduction`) runs after any state change when the toggle is on — it eliminates cells whose world-sets have no matching assignment and confirms the sole remaining possibility per ingredient.

### Tutorial system (`src/contexts/TutorialContext.tsx`)

`TutorialProvider` wraps the entire app (inside `main.tsx`). Tracks completion of tutorial collections (`TutorialId`: `'mixing' | 'selling' | 'two-color' | 'debunk-apprentice' | 'debunk-master'`). Persists to `alch-tutorials-done` in localStorage.

### Progress persistence (`src/utils/saveProgress.ts`)

`SAVE_VERSION` is the canonical version number — bump it to trigger a one-time migration on the next page load.

localStorage keys:
- `alch-save-base` — `SaveFile<PuzzleProgress>` blob for all base puzzles
- `alch-save-expanded` — `SaveFile<ExpandedPuzzleProgress>` blob for all expanded puzzles
- `alch-completed-base` / `alch-completed-expanded` — JSON arrays of completed puzzle IDs
- `alch-tutorials-done` — JSON array of completed tutorial IDs
- `solver-<puzzleId>` — legacy per-puzzle key (still written for backwards compatibility)

`runMigrations()` is called from `main.tsx` before `ReactDOM.createRoot`. It reads the save version, applies any needed data migrations, and bumps the version.

### Expanded mechanics (`src/expanded/`)

Mirrors the base `src/` structure:

- `expanded/types.ts` — adds `ExpandedClue` (book/solar-lunar, encyclopedia, golem tests, encyclopedia_uncertain, golem_reaction_among) and `ExpandedQuestion` types (encyclopedia_fourth, encyclopedia_which_aspect, solar_lunar, golem_group, golem_animate_potion, golem_mix_potion, golem_possible_potions); `ExpandedPuzzle` extends base `Puzzle`
- `expanded/logic/` — `solarLunar.ts`, `golem.ts`, `worldSetExpanded.ts` (filter functions for expanded clues), `debunkExpanded.ts`
- `expanded/puzzles/schemaExpanded.ts` — `getExpandedPuzzleWorlds`, `computeExpandedAnswer`, `computeAllExpandedAnswers`, `checkExpandedAnswers`
- `expanded/contexts/ExpandedSolverContext.tsx` — analogous to `SolverContext` but handles `AnyClue` and extra grid panels (solar/lunar marks)
- `expanded/data/puzzlesIndex.ts` — static registry of all expanded puzzle JSONs

### Puzzle JSON schema

Base puzzles live in `src/data/puzzles/*.json` and are registered in `src/data/puzzles/index.ts`. Expanded puzzles live in `src/expanded/data/puzzles/*.json`. Both share the shape described in `src/types.ts` (`Puzzle`) / `src/expanded/types.ts` (`ExpandedPuzzle`). The `solution` field is the ground-truth `Assignment`.

Puzzle difficulties: `tutorial`, `easy`, `medium`, `hard`, `expert`.

Add `"trivial_answer_ok": true` to suppress the trivial-answer pre-commit check for puzzles where a clue intentionally gives away the answer (e.g. `tutorial-sell-01`).

### Google Drive sync (`src/services/googleDrive.ts`)

Optional cloud save using GIS implicit token flow — no backend. Requires `VITE_GOOGLE_CLIENT_ID` in `.env`. The app saves to `drive.appDataFolder` (invisible in Drive UI). The `DriveProvider` / `DriveContext` wrap the entire app and expose `onPuzzleComplete` which triggers a sync.

### Tests

Tests live in `tests/`:
- `tests/logic/` — unit tests for `mixer`, `worldSet`, `deducer`
- `tests/puzzles/answers.test.ts` — integration test: all base puzzles must have consistent clues and uniquely-answerable non-debunk questions
- `tests/puzzles/expanded-answers.test.ts` — same for all expanded puzzles

Run a single file with:

```bash
npx vitest run tests/logic/mixer.test.ts
```

TypeScript is strict (`strict`, `noUnusedLocals`, `noUnusedParameters`). Path alias `@/*` maps to `src/*`.

## Board-game compliance

`src/compliance.ts` is the authoritative registry of non-compliant clue kinds:

- `NON_COMPLIANT_BASE_CLUE_KINDS` — clue kinds that have no board-game equivalent in base mode
- `NON_COMPLIANT_EXPANDED_CLUE_KINDS` — same, extended for expanded mode

**Protocol for new clue kinds:**
1. Decide whether it maps to a real Alchemists board game action.
2. If NOT — add its `kind` string to the appropriate set in `src/compliance.ts`.
3. Tag any collection containing such puzzles with `boardGameCompliant: false` in `src/data/puzzles/collections.json` (base) or `src/expanded/data/puzzlesIndex.ts` (expanded).

The "Allow unrealistic (extra) puzzles" toggle is part of the **Settings modal** (⚙️ button in the mode-switcher row). When off (default), non-compliant collections are greyed out with a 🧩 icon. The "Among / Group Clues" card in `RulesQuickReference` is hidden unless the toggle is on.

## Settings

`src/utils/settings.ts` — `Settings` type with three booleans: `showLatestUpdates`, `showQuickRef`, `showPuzzleOnly`. Persisted to `alch-settings` in localStorage and included in the Google Drive save snapshot.

`src/components/SettingsModal.tsx` — modal rendered from both `AppInner` (base) and `ExpandedHome` (expanded) via a ⚙️ gear button next to the mode switcher. Contains the three display toggles plus Reset Progress buttons (base / expanded / all) with a two-step confirmation dialog. After a reset, if the user is signed into Drive, `uploadSnapshot()` is called to push the cleared state without downloading first.

## Hint text conventions

**Always use visual tokens in hint text — never raw ingredient names or non-token references.**

`HintDrawer.tsx` converts the following tokens to inline visual chips automatically:

| Token | Renders as |
|---|---|
| `ing1` … `ing8` | Ingredient icon + ingredient name (reshuffle-safe via `displayMap`) |
| `ingredient 1` … `ingredient 8` | Same as above |
| `R+` `R-` `G+` `G-` `B+` `B-` | Colored aspect orb (SignedElemImage) |
| `npN` `pnP` `pNn` `nPp` `Nnp` `Ppn` `NNN` `PPP` | Alchemical symbol image |

**Rules for puzzle authors:**
- Reference ingredients as `ing1`–`ing8` (or `ingredient 1`–`ingredient 8`) — never by name ("Fern", "Scorpion") and never as bare slot numbers
- Reference aspects as `R+`, `R-`, `G+`, `G-`, `B+`, `B-` (not "Red plus", not "red positive")
- Reference alchemicals by code (`npN`, `PPP`, etc.) — never as "alchemical 5" or plain text
- Potions and mixing results should be described using aspect tokens, not text strings like "G-"
- The renderer maps slot IDs through `displayMap` so chips stay correct after puzzle reshuffles
- The `check_puzzles.py` hint-token check enforces this: it fails if any ingredient name appears raw in hint text
