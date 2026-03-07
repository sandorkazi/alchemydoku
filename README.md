# Alchemydoku

A logic puzzle trainer inspired by the deduction mechanics of a popular alchemy-themed board game.

🔗 **Play live:** [sandorkazi.github.io/alchemydoku/](https://sandorkazi.github.io/alchemydoku/)

---

## What is this?

In the board game this trainer is based on, each of 8 ingredients is secretly associated with a unique *alchemical* — a molecule-like symbol made of three coloured spheres (red, green, blue), each of which can be large or small, and carry a positive or negative charge.

When two ingredients are mixed, their alchemicals interact: for each colour axis, if one alchemical has a large sphere and the other has a small sphere *of opposite sign*, they cancel out. The colour that does **not** cancel produces a potion — its colour determined by the winning axis, its sign by whichever sphere was large. If all three axes cancel, the result is a neutral (grey) potion.

**Alchemydoku** gives you a set of observed mixing results (and occasionally sell or debunk results) as clues, and asks you to deduce which alchemical belongs to which ingredient. It is purely a logic puzzle — no luck, no hidden information beyond what the clues imply.

---

## How to play

### 1. Choose a puzzle

Puzzles are grouped into collections by difficulty and mechanic:

| Collection | Focus |
|---|---|
| Tutorial — Mixing | Step-by-step introduction to the mixing rule |
| Tutorial — Selling | How sell results work as clues |
| Tutorial — Possible Outcomes | Deducing what results *could* occur |
| Easy / Medium Mixing | Cross-referencing a handful of mix results |
| Hard Deduction | Chains of inference across multiple clues |
| Debunking | Using debunk results to eliminate alchemicals |
| Expert / Advanced | Multi-step deductions requiring full constraint tracking |

### 2. Read the clues

The left panel shows all given clues. Each one is an observed result from the game:

| Clue type | What it tells you |
|---|---|
| **Mixing result** | Mixing ingredient A + B produced this potion (or neutral) |
| **Sell result** | A player claimed a potion; the board confirmed total match, partial match, or no match |
| **Debunk** | A player tested a claimed potion against an ingredient; it succeeded or failed |

### 3. Use the ingredient grid

The central grid has **ingredients as columns** and **alchemicals as rows**. Use it to track what you know:

- **✗✔ mark tool** — click a cell to cycle it: blank → ✗ eliminated → ✔ confirmed. Shift+click always uses this tool regardless of active tool.
- **? question tool** — marks a cell as *possibly* correct, useful for narrowing candidates.
- **abc text tool** — type up to 3 characters of free notes in any cell.
- Press **Space** to cycle between tools, or click the toolbar buttons.
- **Auto** toggle — when on, the grid automatically eliminates logically impossible cells based on the clue set. Recommended once you are comfortable with the rules.
- **Clear** resets all marks. The 🔀 button re-randomises which ingredient icon appears in each column (ingredient identity is preserved — only the visual is shuffled).

### 4. Answer the question

Each puzzle has one or more questions at the top — for example: *"What potion results from mixing these two ingredients?"* or *"Which alchemical belongs to this ingredient?"*

Select your answer and press **Submit Answer**. The puzzle will confirm whether you are correct. For multiple-choice questions all options are shown as clickable potion or alchemical images.

### 5. Hints

Press **Show hint** if you are stuck. Each puzzle has a small number of hints; each one reveals a logical deduction step without giving the full answer away.

---

## The alchemical molecules

Each alchemical is displayed as a molecule with three coloured spheres arranged in a triangle:

- **Red** at the top, **green** at bottom-left, **blue** at bottom-right.
- A **large** sphere is slightly lighter in colour; a **small** sphere is slightly darker.
- A **+** symbol on the sphere means positive charge; **−** means negative.

**Mixing rule in brief:** for each colour axis, if one ingredient has a large sphere and the other has a small sphere of *opposite* sign on that axis, those two cancel. The first axis that does *not* cancel determines the potion colour and sign (the large sphere's sign wins). If all three axes cancel, the result is a neutral potion.

---

## Development

```bash
npm install
npm run dev
```

> **Important:** Because `base` is set to `/alchemydoku/` (required for GitHub Pages),
> open the dev server at **http://localhost:5173/alchemydoku/** — not the root URL.
> Images will 404 if you visit `localhost:5173/` directly.

## Build & deploy (GitHub Pages)

```bash
npm run build   # outputs to dist/
# push dist/ to the gh-pages branch
```

---

## Internal reference: ingredient sprite order

| ID | Name            | File   |
|----|-----------------|--------|
| 1  | Fern            | i0.png |
| 2  | Bird Claw       | i1.png |
| 3  | Mushroom        | i2.png |
| 4  | Flower          | i3.png |
| 5  | Mandrake        | i4.png |
| 6  | Scorpion        | i5.png |
| 7  | Toad            | i6.png |
| 8  | Raven's Feather | i7.png |
