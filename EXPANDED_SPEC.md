# Alchemydoku — Expanded Rules: Design Specification

> Status: planning only — no code changes yet.  
> Golem Project mechanics: explicitly out of scope.  
> Hedging / seal mechanics: out of scope (teaching material only).

---

## 1. Solar / Lunar Classification

### Definition
Every alchemical is either **Solar** or **Lunar**, determined purely by counting its negative aspects:

| Negative aspects | Class  |
|-----------------|--------|
| 0               | Solar  |
| 1               | Lunar  |
| 2               | Solar  |
| 3               | Lunar  |

Rule of thumb from the rulebook: *two negatives cancel each other*, so even numbers → Solar, odd → Lunar.

### Derivation from existing data
No new data fields needed. `isSolar(alchId)` is a pure function:

```
isSolar(id) = (count of '-' signs in ALCH_DATA[id]) % 2 === 0
```

Canonical classification (derived, not stored):

| Alch | Code | Negatives | Class  |
|------|------|-----------|--------|
| 1    | npN  | 2 (R−B−)  | Solar  |
| 2    | pnP  | 1 (G−)    | Lunar  |
| 3    | pNn  | 2 (G−B−)  | Solar  |
| 4    | nPp  | 1 (R−)    | Lunar  |
| 5    | Nnp  | 2 (R−G−)  | Solar  |
| 6    | Ppn  | 1 (B−)    | Lunar  |
| 7    | NNN  | 3         | Lunar  |
| 8    | PPP  | 0         | Solar  |

Solar: {1, 3, 5, 8} — Lunar: {2, 4, 6, 7}

---

## 2. New Clue Types

### 2a. Book Token Clue
**What it means:** The player privately learned (via the card reader action) that a specific ingredient's alchemical is Solar or Lunar.

**Schema:**
```ts
{ type: 'book'; ingredient: IngredientId; result: 'solar' | 'lunar' }
```

**World-set effect:** Eliminate all worlds where `ingredient` maps to an alchemical of the opposite class.

**Display:** Rendered like other clues — ingredient icon + solar/lunar badge. No card-reader UI simulation needed.

---

### 2b. Encyclopedia Article Clue (trusted)
**What it means:** A published royal encyclopedia article asserts that a specific set of exactly 4 ingredients all share a particular sign on a particular aspect. All 4 are stated to be correct (trusted clue variant).

An article is defined as:
- One **aspect** (R, G, or B)
- One **sign** (+  or −)
- Exactly **4 ingredient IDs** that all have that sign on that aspect

**Schema:**
```ts
{
  type: 'encyclopedia';
  aspect: Color;          // 'R' | 'G' | 'B'
  sign: Sign;             // '+' | '-'
  ingredients: [IngredientId, IngredientId, IngredientId, IngredientId];
}
```

**World-set effect:** Eliminate all worlds where any of the 4 ingredients does not have `sign` on `aspect`.

**Note on the real game:** In actual play, articles may be wrong (hence debunking). For trainer puzzles, all clues are true by convention — the "untrusted" variant is a separate clue type (see 2c).

---

### 2c. Encyclopedia Article Clue (3-of-4 guaranteed)
**What it means:** A published article names 4 ingredients for an aspect+sign, but only **3 of the 4 are guaranteed correct** — one may be wrong (the article has not been debunked, but may be hedged or uncertain).

**Schema:**
```ts
{
  type: 'encyclopedia_uncertain';
  aspect: Color;
  sign: Sign;
  ingredients: [IngredientId, IngredientId, IngredientId, IngredientId];
}
```

**World-set effect:** Eliminate all worlds where **fewer than 3** of the 4 ingredients have `sign` on `aspect`. (i.e. at least 3 must match.)

This is strictly weaker than the trusted variant and requires enumeration reasoning.

---

### 2d. Encyclopedia Debunk Clue
**What it means:** A debunking attempt succeeded — it was proven that at least one of the 4 ingredients in a named article has the *wrong* sign for that aspect.

**Schema:**
```ts
{
  type: 'encyclopedia_debunk';
  aspect: Color;
  sign: Sign;             // the sign the article *claimed*
  ingredients: [IngredientId, IngredientId, IngredientId, IngredientId];
}
```

**World-set effect:** Eliminate all worlds where *all 4* ingredients have `sign` on `aspect`. (At least one must have the opposite sign.)

This is the logical negation of the trusted encyclopedia clue.

---

## 3. New Question / Answer Types

### 3a. Identify the Full Article
**Question:** "Which 4 ingredients share [sign] on the [aspect] axis?"  
**Answer:** A set of exactly 4 ingredient IDs.

```ts
{ type: 'encyclopedia_full'; aspect: Color; sign: Sign }
// answer: Set<IngredientId> of size 4
```

**Validation:** The answer set equals the 4 ingredients that truly have `sign` on `aspect` in the solution.

---

### 3b. Complete a Partial Article
**Question:** "Given these 2 ingredients with [sign] on [aspect], name the other 2."  
**Answer:** 2 ingredient IDs.

```ts
{
  type: 'encyclopedia_partial';
  aspect: Color;
  sign: Sign;
  given: [IngredientId, IngredientId];  // already known
}
// answer: Set<IngredientId> of size 2
```

**Validation:** `given ∪ answer` equals the true full set of 4.

---

### 3c. Identify the Valid Aspect
**Question:** "These 4 ingredients could form a valid royal encyclopedia article. Which aspect (and sign) makes that true?"  
**Answer:** An aspect+sign pair.

```ts
{
  type: 'encyclopedia_which_aspect';
  ingredients: [IngredientId, IngredientId, IngredientId, IngredientId];
}
// answer: { aspect: Color; sign: Sign }
```

**Validation:** All 4 ingredients truly share `sign` on `aspect` in the solution.

**Note:** There may be at most one valid aspect+sign for a given set of 4 (though the puzzle author should verify uniqueness).

---

### 3d. Find the Fourth Ingredient
**Question:** "Name a fourth ingredient to complete a valid royal encyclopedia article on the [aspect][sign] axis alongside these 3."  
**Answer:** One ingredient ID.

```ts
{
  type: 'encyclopedia_fourth';
  aspect: Color;
  sign: Sign;
  given: [IngredientId, IngredientId, IngredientId];
}
// answer: IngredientId
```

**Validation:** The answer truly has `sign` on `aspect`, and `answer` is not already in `given`.

---

## 4. Grid UI Changes

### 4a. Solar/Lunar row striping
All 8 grid rows are visually distinguished by the Solar/Lunar class of their alchemical:
- **Solar rows** (alch 1, 3, 5, 8): distinct border/background colour (warm gold tones)
- **Lunar rows** (alch 2, 4, 6, 7): distinct border/background colour (cool silver/blue tones)

Implementation: cell border colour driven by `isSolar(alchId)`. The alternating Solar/Lunar pattern in the canonical alch ordering (1=S, 2=L, 3=S, 4=L, 5=S, 6=L, 7=L, 8=S) is not perfectly alternating, so must be computed, not assumed.

### 4b. Solar/Lunar column sub-buttons
Each ingredient column header gains two small (half-height) toggle buttons below the ingredient icon:
- ☀️ **Solar** button
- 🌙 **Lunar** button

These act as per-ingredient deduction marks — the player can record "I've established this ingredient is Solar/Lunar" as a column-level annotation, separate from individual cell marks.

**State:** `solarLunarMark: Record<IngredientId, 'solar' | 'lunar' | null>`  
Persisted in the same `solver-${puzzleId}` localStorage blob.

**Styling:** Solar button styled with warm gold; Lunar with cool silver. When marked, the button fills; unmarked is outlined only.

**Auto-deduction:** If auto-deduction is on and exactly 1 Solar/Lunar class is consistent with the remaining worlds for a given ingredient, the mark is applied automatically (same pattern as cell auto-deduction).

---

## 5. Logic Engine Changes

### 5a. `isSolar` helper
```ts
function isSolar(alchId: AlchemicalId): boolean {
  const negCount = ALCH_DATA[alchId].filter(([,sign]) => sign === '-').length;
  return negCount % 2 === 0;
}
```

### 5b. World-set filter for book token
```ts
function applyBookClue(worlds: WorldSet, clue: BookClue): WorldSet {
  return filterWorlds(worlds, world => {
    const alch = world[clue.ingredient];
    return isSolar(alch) === (clue.result === 'solar');
  });
}
```

### 5c. World-set filter for encyclopedia clues
```ts
function applyEncyclopediaClue(worlds: WorldSet, clue: EncyclopediaClue): WorldSet {
  return filterWorlds(worlds, world =>
    clue.ingredients.every(ing =>
      getSign(world[ing], clue.aspect) === clue.sign
    )
  );
}

function applyEncyclopediaUncertainClue(worlds: WorldSet, clue: EncyclopediaUncertainClue): WorldSet {
  return filterWorlds(worlds, world => {
    const matching = clue.ingredients.filter(ing =>
      getSign(world[ing], clue.aspect) === clue.sign
    ).length;
    return matching >= 3;
  });
}

function applyEncyclopediaDebunkClue(worlds: WorldSet, clue: EncyclopediaDebunkClue): WorldSet {
  return filterWorlds(worlds, world =>
    clue.ingredients.some(ing =>
      getSign(world[ing], clue.aspect) !== clue.sign
    )
  );
}
```

### 5d. Solar/Lunar column auto-deduction
For each ingredient slot, after world filtering:
```ts
const possibleAlchs = getPossibleAlchemicals(worlds, ingredientSlot);
const allSolar = possibleAlchs.every(isSolar);
const allLunar = possibleAlchs.every(a => !isSolar(a));
if (allSolar) mark ingredient as Solar;
if (allLunar) mark ingredient as Lunar;
```

---

## 6. Open Questions / Deferred Decisions

- **encyclopedia_uncertain difficulty scoring**: the `analyze_difficulty.py` script will need a new axis for "requires 3-of-4 enumeration" — analogous to the existing `requires_complement_set` flag.
- **Answer UI for set-valued answers** (types 3a, 3b): need a multi-select ingredient picker in the answer panel — design TBD.
- **Puzzle authoring validation**: for `encyclopedia_which_aspect` questions, a puzzle validator should assert the answer is unique within the constrained world-set.
- **Solar/Lunar mark interaction with grid reset**: `solarLunarMark` should be cleared on RESET and CLEAR_GRID in the same way `gridState` is.
