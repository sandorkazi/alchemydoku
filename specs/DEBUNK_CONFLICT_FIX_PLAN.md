# Debunk Conflict Fix — Implementation Plan

## Summary

The conflict-only semantics have a bug: a master step where one or both claimed alchemicals
are **result-incompatible** with the actual mix result is incorrectly treated as a conflict.
It should be treated as a direct disproval (removal).

**Correct conflict condition** (all four required — see DEBUNK_PUZZLES.md §4c):
1. Both ingredients are published.
2. Neither claim is result-incompatible: `∃A: mix(c_1, A) = actual` AND `∃B: mix(B, c_2) = actual`.
3. Not exactly one ingredient is definitively known (either both known or neither known is fine; exactly one known → unambiguous removal instead).
4. `mix(c_1, c_2) ≠ actual`.

**Result-incompatibility** (§2b): a claimed alchemical `c` is result-incompatible with result Z
if `∀A: mix(c, A) ≠ Z`. The audience can verify this from the result alone, without knowing any
other ingredient's true alchemical — so result-incompatible claims are always directly disproved
(removed), never conflicted.

A secondary fix applies to regular plan evaluation (`simulateStep`): when both published
ingredients are result-incompatible with the actual result, both should be **removed** (not
placed in "conflict"). Currently both end up in the conflict bucket (neither removed) — wrong.

---

## Affected files

### 1. `src/logic/debunk.ts`

**New helper** — add after `claimedMixCode`:
```typescript
/**
 * Returns true if there exists any partner alchemical P such that
 * mix(claimedAlch, P) produces resultCode.
 * When false, claimedAlch is "result-incompatible" with resultCode — directly disproved.
 */
function canProduceResult(claimedAlch: AlchemicalId, resultCode: number): boolean {
  const rowStart = (claimedAlch - 1) * 8;
  for (let j = 0; j < 8; j++) {
    if (MIX_TABLE[rowStart + j] === resultCode) return true;
  }
  return false;
}
```

**Fix `simulateStep`** — in the `step.kind === 'master'` branch, before the existing
blame-based logic, add a direct-disproval pass:

```typescript
// --- Direct disproval (result-incompatibility) ---
const pub1 = activePubs.has(ingredient1);
const pub2 = activePubs.has(ingredient2);
const c1Compatible = !pub1 || canProduceResult(activePubs.get(ingredient1)!, trueCode);
const c2Compatible = !pub2 || canProduceResult(activePubs.get(ingredient2)!, trueCode);

if (pub1 && !c1Compatible) { removed.push(ingredient1); activePubs.delete(ingredient1); }
if (pub2 && !c2Compatible) { removed.push(ingredient2); activePubs.delete(ingredient2); }

// --- Blame-based logic (only for result-compatible claims still active) ---
// ... existing conflict1/conflict2 logic, unchanged ...
```

Effect: result-incompatible publications are removed directly. The existing blame-based
code then runs only for the remaining (result-compatible) publications.

**Fix `simulateConflictOnlyStep`** — add the individual compatibility guard:

```typescript
if (activePubs.has(ingredient1) && activePubs.has(ingredient2)) {
  const trueCode = trueMixCode(solution, ingredient1, ingredient2);
  const claimed1 = activePubs.get(ingredient1)!;
  const claimed2 = activePubs.get(ingredient2)!;
  const c1CanProduce = canProduceResult(claimed1, trueCode);
  const c2CanProduce = canProduceResult(claimed2, trueCode);
  if (c1CanProduce && c2CanProduce && claimedMixCode(claimed1, claimed2) !== trueCode) {
    conflicts.push(ingredient1, ingredient2);
  }
  // If either is result-incompatible: direct disproval → not a conflict (return empty)
}
```

### 2. `src/expanded/logic/debunkExpanded.ts`

Same two fixes as `debunk.ts` (add `canProduceResult` helper, fix `simulateExpandedStep`
and `simulateConflictOnlyExpandedStep`). The helper can be inlined or imported from debunk.ts
if it's exported.

### 3. `scripts/alchemydoku.py`

**New helper** in the debunk section:
```python
def _can_produce_result(c: int, result_code: int) -> bool:
    """True if claimedAlch c (0-indexed) can produce result_code with any partner."""
    return any(MIX_TABLE[c][j] == result_code for j in range(8))
```

**Fix `_find_conflict_cover`** — replace the existing pair-validity check:
```python
# Old (wrong):
if claimed_r != true_r:
    valid_pairs.append((ing_c, ing_d))

# New (correct):
c_i = pub_map[ing_c]   # 0-indexed
c_j = pub_map[ing_d]
if (
    _can_produce_result(c_i, true_r)      # c_i individually compatible
    and _can_produce_result(c_j, true_r)  # c_j individually compatible
    and MIX_TABLE[c_i][c_j] != true_r     # together they're wrong
):
    valid_pairs.append((ing_c, ing_d))
```

Note: also verify that `_find_conflict_cover` already excludes definitively-known pairs
(condition 3). If not, add that check.

### 4. Puzzle JSON files — analysis and remediation

**Step A: Identify all affected puzzles.**

Run a script that, for each puzzle with `debunk_conflict_only` answers, re-evaluates the
reference answer steps under the corrected definition. Specifically, for each step in the
`debunk_conflict_only` answer array, check condition 2 (individual compatibility).

Files to scan:
- `src/data/puzzles/debunk-plan-conflict-01.json`
- `src/data/puzzles/mixed-debunk-r-{02..11}.json` (those with `debunk_conflict_only`)
- `src/data/puzzles/mixed-base-debunk-{02..51}.json` (those with `debunk_conflict_only`)
- `src/expanded/data/puzzles/debunk-02.json`
- `src/expanded/data/puzzles/mixed-exp-debunk-{02..21}.json` (those with `debunk_conflict_only`)

**Step B: For each puzzle, classify the current reference answer(s).**

Each step in `debunk_conflict_only` is either:
- **Valid conflict**: both claims individually compatible AND both not definitively known AND
  `mix(c1, c2) ≠ actual` → keep as-is.
- **Invalid (double disproval)**: at least one claim is result-incompatible → this step was
  incorrectly accepted; the answer is wrong.
- **Invalid (single removal)**: one claim is result-incompatible, one is not → the step would
  be a single removal, not a conflict.

**Step C: Fix each invalid puzzle.**

Option 1: Run `_find_conflict_cover` (with corrected logic) to find valid conflict pairs.
  - If valid pairs exist and cover all false publications → update `debunk_conflict_only` answer.
  - If no valid full cover exists → **remove the `debunk_conflict_only` question entirely**
    from that puzzle's `questions` array and `debunk_answers`.

Option 2 (for `mixed-debunk-r-02.json` "The Revealed Formula"): analysis already showed no
valid full-cover conflict exists → remove the `debunk_conflict_only` question from this puzzle.

**Step D: Re-check `debunk_min_steps` optimal lengths.**

After fixing `simulateStep` to directly remove result-incompatible claims, check whether any
`debunk_min_steps` puzzle now has a shorter optimal solution:
- Find all puzzles with two published ingredients where a single "double direct disproval" step
  could replace two separate removal steps.
- If any puzzle's optimal length decreases, update the reference answer length and steps.

This is expected to be rare (puzzle authors typically avoid putting two result-incompatible
publications in positions where a single mix hits both), but must be verified.

---

## Verification

1. `npm run test` — all existing tests pass (debunk validators, answer tests).
2. `python3 scripts/check_puzzles.py --deep` — no validation errors.
3. Manual: play `debunk-plan-conflict-01.json` ("Mutual Suspicion") — should still produce
   a conflict (neither claim is result-incompatible with neutral result).
4. Manual: play `mixed-debunk-r-02.json` ("The Revealed Formula") — should no longer have
   a `debunk_conflict_only` question after the fix (or should require a valid new answer).
5. The corrected `simulateConflictOnlyStep` rejects steps (1,2) and (5,8) from the old
   "The Revealed Formula" conflict answer (both were result-incompatible double-disprovals).

---

## Why "Mutual Suspicion" (debunk-plan-conflict-01) remains valid

- True result: neutral (code 0).
- P1 claims `pNn` (alch3): `mix(pNn, nPp) = neutral` ✓ → result-compatible (condition 2).
- P2 claims `Nnp` (alch5): `mix(Nnp, Ppn) = neutral` ✓ → result-compatible (condition 2).
- `mix(pNn, Nnp) = G-` ≠ neutral ✓ → together wrong (condition 4).
- Condition 3: the clue set gives all 6 aspect clues (3 per ingredient), so **both** ingredients
  are definitively known. "Not exactly one known" ← both known ✓. Per §2b "both blame-disproved"
  row → CONFLICT, neither removed.

The conflict outcome holds because both claims are individually result-compatible (each *could*
produce neutral with some partner), so neither is directly disproved. The audience observes
a mutual contradiction but cannot single out the liar.

---

## Implementation order

1. Fix `debunk.ts` (add helper + fix both `simulate*` functions)
2. Fix `debunkExpanded.ts` (same)
3. Fix `alchemydoku.py` (add helper + fix `_find_conflict_cover`)
4. Run the Python migration/analysis script to classify all conflict-only puzzles
5. Update all invalid puzzle JSON files
6. Run `npm run test` and `python3 scripts/check_puzzles.py`
