# Alchemydoku — Repository Structure

This document describes the canonical source layout, conventions, and rules that govern this repository. It is written from the perspective of the post-refactor steady state and should remain accurate after that refactor is complete.

---

## Overview

Alchemydoku is a React + TypeScript puzzle game built with Vite. It ships two game modes — **base** and **expanded** — that share a common engine. The repository is organized to make that boundary explicit: shared code lives under `src/shared/`, base-only code lives under `src/base/`, and expanded-only code lives under `src/expanded/`. The app shell that ties everything together lives directly under `src/`.

---

## Directory Layout

```
alchemydoku/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── CLAUDE.md
├── REPO.md
├── README.md
├── .env.example
│
├── src/
│   ├── main.tsx              # Vite entry point; calls runMigrations(), mounts React tree
│   ├── App.tsx               # Top-level shell; routes between base and expanded by alch-mode
│   ├── index.css
│   ├── vite-env.d.ts
│   │
│   ├── shared/               # Engine code reused by both modes (no mode-specific imports)
│   │   ├── types.ts          # Core domain model (Alchemical, WorldSet, Clue union, etc.)
│   │   ├── compliance.ts     # NON_COMPLIANT_* sets for both modes
│   │   ├── logic/
│   │   │   ├── alchemicals.ts
│   │   │   ├── deducer.ts
│   │   │   ├── mixer.ts
│   │   │   ├── sellValidator.ts
│   │   │   ├── worldPack.ts
│   │   │   └── worldSet.ts
│   │   ├── data/
│   │   │   ├── alchemicals.ts
│   │   │   ├── ingredients.ts
│   │   │   └── sprites.ts
│   │   ├── components/       # UI primitives shared by both modes
│   │   │   ├── AlchemicalDisplay.tsx
│   │   │   ├── AtlasSprite.tsx
│   │   │   ├── BuildStamp.tsx
│   │   │   ├── DriveSync.tsx
│   │   │   ├── GameSprites.tsx
│   │   │   ├── HintStepViewer.tsx
│   │   │   ├── MixSimulator.tsx
│   │   │   ├── PuzzleToolbar.tsx
│   │   │   ├── SaveSetupBanner.tsx
│   │   │   ├── SettingsModal.tsx
│   │   │   ├── StarBurst.tsx
│   │   │   └── WhatsNewBanner.tsx
│   │   ├── contexts/
│   │   │   ├── DriveContext.tsx
│   │   │   └── TutorialContext.tsx
│   │   ├── utils/
│   │   │   ├── penColors.ts
│   │   │   ├── permalink.ts
│   │   │   ├── releaseNotes.ts
│   │   │   ├── saveFileTransfer.ts
│   │   │   ├── saveProgress.ts
│   │   │   ├── settings.ts
│   │   │   ├── solverStorage.ts
│   │   │   └── syncPreference.ts
│   │   ├── services/
│   │   │   └── googleDrive.ts
│   │   └── data/
│   │       └── releaseNotes.ts
│   │
│   ├── base/                 # Base game mode (8-ingredient, 8-alchemical)
│   │   ├── types.ts          # Base-specific type extensions
│   │   ├── components/
│   │   │   ├── AnswerPanel.tsx
│   │   │   ├── AnswerPickers.tsx
│   │   │   ├── ClueCard.tsx
│   │   │   ├── ClueGrouping.tsx
│   │   │   ├── CluePanel.tsx
│   │   │   ├── DebunkAnswerPanel.tsx
│   │   │   ├── HintDrawer.tsx
│   │   │   ├── IngredientGrid.tsx
│   │   │   ├── InterfaceQuickReference.tsx
│   │   │   ├── RulesQuickReference.tsx
│   │   │   └── ShufflePickerModal.tsx
│   │   ├── contexts/
│   │   │   └── SolverContext.tsx
│   │   ├── logic/
│   │   │   └── debunk.ts
│   │   ├── pages/
│   │   │   ├── PuzzleSolverPage.tsx
│   │   │   └── TutorialPage.tsx
│   │   ├── puzzles/
│   │   │   └── schema.ts
│   │   └── data/
│   │       ├── index.ts          # Puzzle registry: imports all base puzzle JSONs
│   │       ├── collections.json  # Collection definitions
│   │       ├── tutorials/
│   │       │   ├── aspect-balance.ts
│   │       │   ├── debunk-apprentice.ts
│   │       │   ├── debunk-master.ts
│   │       │   ├── mixing.ts
│   │       │   ├── selling.ts
│   │       │   └── two-color.ts
│   │       └── puzzles/          # Base puzzle JSON files (filenames are cosmetic)
│   │           └── *.json
│   │
│   └── expanded/             # Expanded game mode (adds golem, solar/lunar, encyclopedia)
│       ├── types.ts          # Expanded-specific type extensions and new clue/question kinds
│       ├── components/
│       │   ├── ExpandedAnswerPanel.tsx
│       │   ├── ExpandedClueCard.tsx
│       │   ├── ExpandedCluePanel.tsx
│       │   ├── ExpandedDebunkAnswerPanel.tsx
│       │   ├── ExpandedHintDrawer.tsx
│       │   ├── ExpandedIngredientGrid.tsx
│       │   ├── ExpandedInterfaceQuickReference.tsx
│       │   ├── ExpandedMixSimulator.tsx
│       │   └── ExpandedRulesQuickReference.tsx
│       ├── contexts/
│       │   └── ExpandedSolverContext.tsx
│       ├── logic/
│       │   ├── debunkExpanded.ts
│       │   ├── golem.ts
│       │   ├── solarLunar.ts
│       │   └── worldSetExpanded.ts
│       ├── pages/
│       │   └── ExpandedPuzzleSolverPage.tsx
│       ├── puzzles/
│       │   └── schemaExpanded.ts
│       └── data/
│           ├── puzzlesIndex.ts   # Puzzle registry: imports all expanded puzzle JSONs
│           └── puzzles/          # Expanded puzzle JSON files (filenames are cosmetic)
│               └── *.json
│
├── tests/
│   ├── shared/
│   │   └── logic/
│   │       ├── deducer.test.ts
│   │       ├── mixer.test.ts
│   │       ├── sellValidator.test.ts
│   │       └── worldSet.test.ts
│   ├── base/
│   │   └── puzzles/
│   │       └── answers.test.ts
│   ├── expanded/
│   │   ├── logic/
│   │   │   └── solarLunar.test.ts
│   │   └── puzzles/
│   │       └── expanded-answers.test.ts
│   └── utils/
│       └── migrations.test.ts
│
├── scripts/
│   ├── alchemydoku.py        # Puzzle generation and tooling
│   └── check_puzzles.py      # Structural and integrity validation
│
├── specs/                    # Design documents and feature specs
│
└── public/                   # Static assets served at the Vite base path
```

---

## Module Boundary Rules

These rules prevent the architecture from drifting back toward the mixed state.

1. **`src/shared/` has no imports from `src/base/` or `src/expanded/`.**
   Shared code must remain mode-agnostic. If a shared component needs mode-specific behavior, accept it via props or a React context — do not import from a sibling mode tree.

2. **`src/base/` may import from `src/shared/` but not from `src/expanded/`.**

3. **`src/expanded/` may import from `src/shared/` and from `src/base/` only for pure logic that has no expanded equivalent.**
   Prefer promoting reused base logic into `src/shared/` over creating a cross-mode dependency. If a component from `src/base/components/` is reused unchanged, move it to `src/shared/components/` instead.

4. **`src/App.tsx` is the only file allowed to import from both `src/base/` and `src/expanded/` simultaneously.**
   It is the router seam and nothing else.

5. **Test files mirror the source tree.** A test for `src/shared/logic/mixer.ts` lives at `tests/shared/logic/mixer.test.ts`. A test for `src/base/puzzles/schema.ts` lives at `tests/base/puzzles/answers.test.ts`.

---

## Puzzle Data Conventions

### JSON anatomy

Every puzzle JSON file — base or expanded — must contain an `id` field that is the canonical, permanent identifier for that puzzle:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "difficulty": "medium",
  "complexity": { "raw": 2.4, "score": 3 },
  "clues": [...],
  "questions": [...],
  "solution": [...]
}
```

### The `id` field is the source of truth

The filename is a developer convenience. It may be renamed, reorganized, or prefixed for sorting without any effect on the game. The `id` field — never the filename, never the array index in the registry — is what the save system stores, what test suites reference, and what the generator records.

The `id` must be a stable UUID (version 4) assigned once at generation time and never regenerated. Puzzle regeneration (new clues, different solution) requires a new UUID — it produces a logically different puzzle.

### Registry files

`src/base/data/index.ts` and `src/expanded/data/puzzlesIndex.ts` are static import registries. They import puzzle JSON files and export a flat array. The game reads the `id` field from each imported object — it does not derive the ID from the module path or variable name.

```ts
// src/base/data/index.ts — illustrative
import p1 from './puzzles/mix-easy-01.json';
import p2 from './puzzles/mix-easy-02.json';
// ...

export const ALL_BASE_PUZZLES: Puzzle[] = [p1, p2, ...];
```

### Filenames as cosmetic labels

Because IDs are UUIDs embedded in the JSON, filenames carry no semantic weight. Naming conventions exist only to help humans navigate the `puzzles/` directory. The recommended convention is:

```
<mechanic>-<difficulty>-<sequence>.json
```

Examples: `mix-easy-01.json`, `debunk-hard-03.json`, `golem-medium-07.json`.

The sequence number is just a counter within that mechanic/difficulty bucket; it carries no identity. Two files may be renumbered freely.

---

## Save Progress and Stable IDs

`src/shared/utils/saveProgress.ts` stores player progress keyed by puzzle `id`. Because IDs are UUIDs, no filename change or registry reordering can orphan saved progress.

`SAVE_VERSION` in `saveProgress.ts` is the canonical migration version. Bump it whenever a data migration is needed. `runMigrations()` in `main.tsx` runs all pending migrations before React mounts.

The `ID_RENAMES` map — used in past migrations to handle filename-derived IDs that changed — should never need a new entry after the UUID migration is complete. Its entries may be preserved indefinitely for backward compatibility with saves written before that migration.

---

## Scripts

| Script | Purpose |
|---|---|
| `scripts/alchemydoku.py` | Puzzle generation, hint generation, complexity analysis |
| `scripts/check_puzzles.py` | Structural + integrity validation (run by pre-commit) |

The generator assigns a UUID to each new puzzle and writes it into the JSON at creation time. It also handles registration in the appropriate index file.

---

## Migration

This section describes the one-time transition from the pre-refactor layout to the structure described in this document. It is the only section that discusses the state of the repository before the refactor.

### Pre-refactor state

Before this refactor:

- The shared engine lived implicitly inside `src/` alongside the base game, with no formal `shared/` boundary. Base-only and shared code were co-mingled at the same level.
- The expanded game lived at `src/expanded/` and imported directly from `src/` (the base tree), creating an invisible coupling. Any file at the root of `src/` was effectively shared by convention, not by structure.
- Puzzle IDs were derived from filenames. A puzzle at `src/data/puzzles/mix-2001.json` had the ID `mix-2001` as a human-readable string. When puzzles were reorganized or renamed (e.g., to remove difficulty from the ID), an explicit `ID_RENAMES` table had to be maintained in `saveProgress.ts` to preserve player progress. This was error-prone and required a `SAVE_VERSION` bump for every rename batch.
- Tests for shared logic lived in `tests/logic/` (alongside base tests), with no `tests/shared/` equivalent.

### Migration phases

#### Phase 0 — Prerequisites

Before restructuring any files:
1. Ensure all existing tests pass (`npm run test`).
2. Ensure `python3 scripts/check_puzzles.py` passes clean.
3. Commit the green baseline.

#### Phase 1 — Assign stable UUIDs to all puzzles

This is the most important phase. The critical constraint: the save migration function must work correctly even if a user's last visit was before Phase 1 shipped — i.e., it must not rely on the registry being in any particular state when the migration runs.

1. Write a script (or extend `alchemydoku.py`) that iterates every puzzle JSON in `src/data/puzzles/` and `src/expanded/data/puzzles/`, assigns a fresh UUID v4 to each, rewrites the JSON (`id` becomes the UUID), and simultaneously emits a TypeScript constant file:

   ```ts
   // src/shared/utils/legacyPuzzleIds.ts — generated once, never regenerated
   export const LEGACY_ID_TO_UUID: Record<string, string> = {
     "mix-2001": "550e8400-e29b-41d4-a716-446655440000",
     "ded-9001": "f47ac10b-58fa-4372-a567-0e02b2c3d479",
     // ... all ~400 puzzles
   };
   ```

   This file is the permanent translation table. It is generated from the pre-migration state of the registry, committed to source control, and never modified again. It must be generated **before** the puzzle JSONs are rewritten, so the mapping is captured while the old IDs still exist.

2. In `saveProgress.ts`, write a migration step (new `SAVE_VERSION`) that rewrites every stored puzzle ID from the old human-readable string to the UUID, using `LEGACY_ID_TO_UUID` as the lookup. Unknown keys (IDs not in the table) are left as-is; they will naturally fail to match any puzzle in the registry, which is equivalent to the puzzle never having been played.

3. Update the generator to emit a `uuid()` value for `id` at puzzle creation time for all future puzzles.

4. Verify that `ID_RENAMES` entries in the save migration chain are superseded (they still run for saves older than the UUID migration, but no new entries are ever needed).

Because the lookup table is a hardcoded compile-time constant, this migration is fully self-contained: it produces the same result whether the user last visited before Phase 1, between Phase 1 and Phase 2, or only after Phase 2. Phases 1 and 2 may therefore ship as a single release.

#### Phase 2 — Restructure directories

Move files according to the target layout. This is a pure rename/move operation — no logic changes.

1. Create `src/shared/`, `src/base/`.
2. Move files that are used by both modes from `src/` into `src/shared/`:
   - `src/types.ts` → `src/shared/types.ts`
   - `src/logic/` → `src/shared/logic/`
   - `src/data/alchemicals.ts`, `ingredients.ts`, `sprites.ts` → `src/shared/data/`
   - `src/utils/` → `src/shared/utils/`
   - `src/services/` → `src/shared/services/`
   - `src/contexts/DriveContext.tsx`, `TutorialContext.tsx` → `src/shared/contexts/`
   - Shared components (AtlasSprite, GameSprites, MixSimulator, PuzzleToolbar, HintStepViewer, BuildStamp, DriveSync, SaveSetupBanner, SettingsModal, StarBurst, WhatsNewBanner) → `src/shared/components/`
   - `src/data/releaseNotes.ts` → `src/shared/data/releaseNotes.ts`
   - `src/compliance.ts` → `src/shared/compliance.ts`
3. Move base-only files into `src/base/`:
   - Base-only components (AnswerPanel, AnswerPickers, ClueCard, ClueGrouping, CluePanel, DebunkAnswerPanel, HintDrawer, IngredientGrid, InterfaceQuickReference, RulesQuickReference, ShufflePickerModal, AlchemicalDisplay) → `src/base/components/`
   - `src/contexts/SolverContext.tsx` → `src/base/contexts/`
   - `src/pages/` → `src/base/pages/`
   - `src/puzzles/schema.ts` → `src/base/puzzles/schema.ts`
   - `src/data/puzzles/` → `src/base/data/puzzles/`
   - `src/data/index.ts` → `src/base/data/index.ts`
   - `src/data/collections.json` → `src/base/data/collections.json`
   - `src/data/tutorials/` → `src/base/data/tutorials/`
4. Move `src/expanded/` to remain at `src/expanded/` — its internal structure is already correct, only its import paths change.
5. Update all import paths throughout the codebase to reflect the new locations (TypeScript path aliases in `tsconfig.json` can ease this: add `@shared/*`, `@base/*`, `@expanded/*`).

#### Phase 3 — Enforce module boundaries

1. Add an ESLint rule (or a lightweight import-boundary check in `check_puzzles.py` / a separate script) that fails if any file under `src/shared/` imports from `src/base/` or `src/expanded/`, or if any file under `src/base/` imports from `src/expanded/`.
2. Add this check to the pre-commit hook alongside the existing type-check and puzzle validation.

#### Phase 4 — Restructure tests

Move test files to mirror the new source tree:

- `tests/logic/` → `tests/shared/logic/`
- `tests/puzzles/answers.test.ts` → `tests/base/puzzles/answers.test.ts`
- `tests/puzzles/expanded-answers.test.ts` → `tests/expanded/puzzles/expanded-answers.test.ts`
- `tests/expanded/logic/` stays at `tests/expanded/logic/`
- `tests/utils/` stays at `tests/utils/` (shared utils)

#### Phase 5 — Cleanup

1. Remove the old `ID_RENAMES` comment block from `saveProgress.ts` if desired (keep the entries — remove only if confirmed that no live save can predate the earliest `ID_RENAMES` entry, which is unlikely).
2. Delete any dead re-export shims added during the move.
3. Run the full test suite and `check_puzzles.py` to confirm a clean state.
4. Bump `SAVE_VERSION` one final time if Phase 1 required a save migration, and write the corresponding migration function.

### Rollback strategy

Each phase above is independently committable. If any phase introduces regressions:

- Phase 1 (UUID assignment) is reversible: the old human-readable IDs are captured in `LEGACY_ID_TO_UUID` before the JSONs are rewritten, so a reverse migration from UUID → human-readable is trivially possible.
- Phases 2–4 (file moves) are pure renames with no logic change; reverting is a git checkout of the affected paths.
- Phase 3 (boundary enforcement) is additive; removing the lint rule reverts it.
