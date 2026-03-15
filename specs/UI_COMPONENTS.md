# Alchemydoku — UI Components Specification

> Describes each UI component, its props, context dependencies, and rendering contract.
> This is a reference for contributors, not a tutorial.

---

## 0. Icon Size Standards

Canonical pixel widths used consistently across all components:

| Element             | Width (px) | Notes                                         |
|---------------------|-----------|-----------------------------------------------|
| Grid cell watermark | 48        | Background alchemical molecule in each cell   |
| Alchemical molecule | 44        | AlchemicalImage in cards, pickers, answers    |
| Ingredient icon     | 36        | IngredientIcon in cards, pickers, answers     |
| Potion image        | 40        | PotionImage in cards, pickers, answers        |
| Aspect badge        | 22        | Small ElemImage / SignedElemImage inline      |
| Golem part icon     | varies    | Default 40px in cards; see GolemPartIcon      |

### Solar / Lunar symbol standard

Use **text characters** (not emoji) so CSS `color` applies:

| Symbol | Unicode | Text   | CSS class          |
|--------|---------|--------|--------------------|
| ☀      | U+2600  | Sun    | `text-orange-400`  |
| ☽      | U+263D  | Crescent | `text-slate-400` |

**Do not use** `☀️` (U+2600 + U+FE0F variation selector) or `🌙` — these render as full-color
emoji and ignore CSS `color`. The plain text forms above are CSS-colorable.

---

## 1. Primitive Image Components (`GameSprites.tsx`)

All image rendering goes through these primitives. They read from SVG sprite sheets
hosted under `public/`.

| Component          | Props                              | Renders                                   |
|--------------------|------------------------------------|-------------------------------------------|
| `AlchemicalImage`  | `id: AlchemicalId, width: number`  | Molecule SVG for that alchemical          |
| `IngredientIcon`   | `index: 0–7, width: number`        | Ingredient icon (SVG sprite sheet)        |
| `PotionImage`      | `result: PotionResult, width`      | Colored potion or neutral flask SVG       |
| `ElemImage`        | `color, size, width`               | Colored element token (R/G/B, S/L)        |
| `SignedElemImage`  | `color, sign, width`               | Element token with embedded sign          |
| `CorrectIcon`      | `width`                            | Green checkmark                           |
| `IncorrectIcon`    | `width`                            | Red X                                     |

Asset URL pattern: `${import.meta.env.BASE_URL}sprites/<name>.s

**Golem part icons** — defined inline in `ExpandedClueCard.tsx` (not in `GameSprites.tsx`):

| Component       | Props                                  | Renders                                                         |
|-----------------|----------------------------------------|-----------------------------------------------------------------|
| `GolemPartIcon` | `part: 'chest'|'ears', size?: number`  | Circular PNG crop of the golem sprite, rendered as `<img>` with `border-radius: 50%` |

Source PNGs: `public/images/golem_chest_icon.png`, `public/images/golem_ears_icon.png`
(400×400 px each — largest center-crop circle from the 760×400 originals).
URL: `/alchemydoku/images/golem_*_icon.png`.vg`

---

## 2. IngredientGrid

**File:** `src/components/IngredientGrid.tsx`  
**Context:** `useSolver()` (base) or `useExpandedSolver()` (expanded clone)

An 8×8 grid where rows = alchemicals (1–8), columns = ingredient slots (1–8).

Each cell has one of four states: `unknown`, `possible`, `eliminated`, `confirmed`.

- Click cycles: `unknown → possible → eliminated → unknown`
- `confirmed` state is set programmatically by auto-deduction; clicking a confirmed cell
  does nothing (it's locked until the deduction no longer holds).

Column headers show ingredient icons using `displayMap` to map slot → display ingredient.  
Row headers show alchemical molecule SVGs.

**Tint colours** (applied as background tint per ingredient column):
`#6C4FA3, #8DBF3F, #6B5A3A, #D4A437, #3F6FB6, #979c91, #B23A2E, #23293D`

**Tint opacity varies by row** to create visual groupings that match neutral-potion pairs:
- Rows 1, 2, 5, 6 → opacity `0.13` (lighter)
- Rows 3, 4, 7, 8 → opacity `0.31` (standard)

**Neutral-pair decorators**: a half-sized (24×24 px) neutral potion image is positioned
halfway outside the right edge of the grid, rotated 45° CW, at the boundary between each
neutral-mixing pair (rows 1–2, 3–4, 5–6, 7–8). These are rendered behind the table
(`z-index: 0` vs table `z-index: 1`).

### Expanded variant (`ExpandedIngredientGrid`)
- Rows gain a **left border** (4px): amber/gold for Solar alchemicals (1,3,5,7),
  blue/indigo for Lunar (2,4,6,8). Note: Solar = odd IDs, Lunar = even IDs.
- Column headers gain **Solar/Lunar pill buttons** (`☀` orange-400 left, `☽` slate-400 right),
  one pair per column. Each button independently tracks a `CellState` mark.
  See `EXPANDED.md §4b` for full behaviour.
- Cells in Solar rows show the column's solar mark state in the **top-left corner**;
  cells in Lunar rows show the lunar mark state in the **top-right corner**.
- Tint opacity banding and neutral-pair decorators are identical to the base variant.

---

## 3. ClueCard / ExpandedClueCard

**File:** `src/components/ClueCard.tsx`  
**Context:** none (pure display, receives clue as prop via CluePanel)

Renders a single clue as a compact card. Each clue kind has a distinct visual treatment:

| Clue kind            | Icon | Accent   | Display                                        |
|----------------------|------|----------|------------------------------------------------|
| `mixing`             | 🧪   | amber    | Ingredient + Ingredient → Potion               |
| `aspect`             | 🔮   | blue     | Ingredient has Color+Sign badge                |
| `sell`               | 💰   | amber    | Ingredient + Ingredient → sell outcome label   |
| `debunk` apprentice  | 🔍   | rose     | Ingredient true Color Sign                     |
| `debunk` master      | ⚗️   | rose     | Ingredient + Ingredient → claimed result       |
| `assignment`         | 📌   | purple   | Ingredient = Alchemical                        |

**Expanded clue cards** additionally handle:

| Clue kind                  | Icon | Accent   | Display                                            |
|----------------------------|------|----------|----------------------------------------------------|
| `book`                     | 📖   | purple   | Ingredient is <span style="color:orange">☀</span> Solar / <span style="color:gray">☽</span> Lunar  |
| `encyclopedia`             | 📜   | green    | 4-entry grid (ingredient + aspect + sign each)     |
| `encyclopedia_uncertain`   | 📄   | amber    | Same grid + "≥ 3 of 4 correct" note               |
| `debunk_apprentice`        | 🔍   | rose     | True sign shown + success/hedge status            |
| `debunk_master`            | ⚗️   | rose     | Claimed result shown + success/rejected status    |
| `golem_test`               | 🧿   | blue     | Ingredient + Chest `GolemPartIcon` ✓/✗ + Ears `GolemPartIcon` ✓/✗ |
| `golem_hint_color`         | 🔬   | blue     | `GolemPartIcon` + "reacts to a Red/Green/Blue aspect" |
| `golem_hint_size`          | 🔬   | blue     | `GolemPartIcon` + "reacts to a Large/Small aspect" |

---

## 4. AnswerPanel / ExpandedAnswerPanel

**File:** `src/components/AnswerPanel.tsx`  
**Context:** `useSolver()` (base)

Renders one interactive picker per question in `puzzle.questions`. Pickers by question kind:

| Question kind          | Picker UI                                       |
|------------------------|-------------------------------------------------|
| `mixing-result`        | 7 potion buttons (6 colors + neutral)           |
| `alchemical`           | 8 alchemical molecule buttons                   |
| `aspect`               | 2 sign buttons: ＋ / －                         |
| `safe-publish`         | 3 color buttons: R / G / B                      |
| `possible-potions`     | 7 multi-select potion toggle buttons            |
| `aspect-set`           | 8 multi-select ingredient toggle buttons        |
| `large-component`      | 8 multi-select ingredient toggle buttons        |

Submit button is disabled until all questions have a pending answer.  
After wrong attempts ≥ 3 (or on demand), "Show Solution" reveals correct answers.

**Expanded additions** (`ExpandedAnswerPanel`):

| Question kind                | Picker UI                                            |
|------------------------------|------------------------------------------------------|
| `encyclopedia_fourth`        | 8 ingredient buttons (excluding `known` IDs)         |
| `encyclopedia_which_aspect`  | 3 aspect color buttons: R / G / B                   |
| `solar_lunar`                | 2 buttons: ☀ Solar (`text-orange-400`) / ☽ Lunar (`text-slate-400`) |

**Debunk questions** (base game) are routed to a separate `DebunkAnswerPanel` (see §4b).

---

## 4b. DebunkAnswerPanel (`src/components/DebunkAnswerPanel.tsx`)

Handles all three debunk question kinds: `debunk_min_steps`, `debunk_apprentice_plan`, and `debunk_conflict_only`.

| Question kind            | UI                                                                |
|--------------------------|-------------------------------------------------------------------|
| `debunk_min_steps`       | Multi-step plan builder: ordered list of steps, add/remove steps |
| `debunk_apprentice_plan` | Multi-step plan builder (apprentice steps only; master steps rejected at validation) |
| `debunk_conflict_only`   | Single locked step (kind=master, ingredient1 pre-filled)         |

Each step is one of:
- **Apprentice**: ingredient picker + color (R/G/B) picker
- **Master**: two ingredient pickers

For `debunk_conflict_only` the step is locked to `master` with ingredient1 fixed to
`fixedIngredient`; only ingredient2 is selectable.

The Submit button is disabled until every step has all required fields filled.

`AnswerPanel.tsx` acts as a routing wrapper: it renders `DebunkAnswerPanel` when any
question has kind `debunk_min_steps`, `debunk_apprentice_plan`, or `debunk_conflict_only`,
and `StandardAnswerPanel` for all other puzzles. This satisfies React's hooks constraint
(no conditional hook calls).

---

## 5. HintDrawer / ExpandedHintDrawer

**File:** `src/components/HintDrawer.tsx`  
**Context:** `useSolver()` (base) / `useExpandedSolver()` (expanded clone)

Renders progressive hints. Hints are hidden by default; the player reveals one at a time
via the "Show hint" button. The drawer is hidden entirely if no hints exist or the puzzle
is complete.

Hint text supports inline **rich tokens** that are rendered as visual badges:
- Alchemical codes (e.g. `pNn`) → molecule image + label
- `ingredient N` → ingredient icon + name (using displayMap)
- Color+sign tokens (e.g. `R+`, `G−`) → colored element image

---

## 6. MixSimulator / ExpandedMixSimulator

**File:** `src/components/MixSimulator.tsx`  
**Context:** `useSolver()` (base) / `useExpandedSolver()` (expanded clone)

Interactive potion calculator. Two ingredient selectors → shows what potion results are
possible given the current world-set.

Two modes (toggle):
- **Grid mode** (default): filters world-set through the player's current grid marks first,
  then computes. More constrained — respects player deductions.
- **Truth mode**: uses the clue-filtered world-set directly. May reveal more than the player
  has deduced. Protected by a confirmation dialog.

---

## 7. PuzzleSolverPage / ExpandedPuzzleSolverPage

**Files:** `src/pages/PuzzleSolverPage.tsx`, `src/expanded/pages/ExpandedPuzzleSolverPage.tsx`

Top-level page component for a single puzzle. Responsibilities:
- Wraps the appropriate `SolverProvider` / `ExpandedSolverProvider`
- Sticky header: puzzle title, back button, difficulty pips, world-count badge
- Collapsible sections: Clues, Grid, Mix Simulator
- Mobile: clue drawer (bottom sheet), desktop: sidebar layout
- `ExpandedPuzzleSolverPage` adds a "✨ Expanded" badge to the header

---

## 8. Home Screens

### Base game home (`App.tsx` — `HomeScreen` component)
- Collection cards with progress dots
- Last-played puzzle quick-resume card
- Free-play / Gamification toggles
- "Reset base game progress" button (only visible when progress exists)

### Expanded home (`expanded/ExpandedHome.tsx`)
- Mode switcher (Base / Expanded tabs)
- Legend panel explaining Solar/Lunar and encyclopedia mechanics
- Collection cards (exp-tutorials, exp-easy, etc.)
- "Reset expanded progress" button
- Internal routing: collection → puzzle view, back button, next-in-collection flow
