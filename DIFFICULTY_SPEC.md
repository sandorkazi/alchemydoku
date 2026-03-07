# Puzzle Difficulty Scoring — Specification

## Motivation

The original difficulty labels were based on clue count and collection grouping.
This spec replaces them with a computed score that reflects **human solving effort**,
modelled on three independent axes:

---

## Axis 1: Clue Strength (information content)

For each clue, measure how many worlds it eliminates:

    strength(clue) = log2(worlds_before / worlds_after)

High strength = informative clue = easier puzzle.
Weak clues force longer inference chains.

**Clue type priors** (theoretical maximum, used as sanity check):
| Clue type | Worlds eliminated | Strength |
|---|---|---|
| mix → exact result | ~6/7 | ~2.8 bits |
| sell → total_match | ~6/7 | ~2.8 bits |
| debunk success | ~6/7 | ~2.8 bits |
| sell → sign_ok | ~4/6 remaining | ~1.6 bits |
| sell → opposite | ~3/6 remaining | ~1.0 bits |
| sell → neutral | ~1/7 | ~0.2 bits |
| debunk failure | eliminates 1/7 outcomes | ~0.2 bits |
| aspect clue | pins one sign | ~1.0 bits |

**Score contribution:**
- `avg_clue_strength` = mean of strength(clue) across all clues
- Low average → weak clues → harder

---

## Axis 2: Deduction Chain Depth

Simulates a human solver who can only act on what is directly deducible
from the current world set. Models the "Naked Single" → propagation loop.

**Algorithm:**

```
confirmed = {}                  # ingredient → alchemical
worlds = applyClues(all_clues)

depth = 0
repeat:
    newly_confirmed = {}
    for each ingredient not yet confirmed:
        possible = getPossibleAlchemicals(worlds, ingredient)
        if len(possible) == 1:
            newly_confirmed[ingredient] = possible[0]

    if newly_confirmed is empty: break
    confirmed.update(newly_confirmed)
    depth += 1
    # Remove confirmed ingredients from further consideration
    # (humans eliminate that alchemical from other rows)

chain_depth = depth
```

**Interpretation:**
- depth 1: answer falls out directly (naked single)
- depth 2: one confirmation unlocks another
- depth 3+: multi-step cascade
- depth 0 / stuck: requires advanced technique (see Axis 3)

---

## Axis 3: Advanced Techniques Required

### Complement-Set Deduction (X-Wing analogue)

There are 4 alchemicals with R+ and 4 with R−. If a human has confirmed
3 of the R− alchemicals, they cannot yet confirm the 4th from the world set
alone — but once they confirm it, the remaining 4 automatically become R+.

Detection: after chain-depth simulation gets stuck, check if:
- For any (color, sign) pair, exactly 4 ingredients have that aspect
- If k of those are already world-set-confirmed, and (4-k) are unconfirmed
  but all remaining candidates for those slots share that aspect → complement applies

Flag: `requires_complement_set = True` adds to difficulty.

### Ambiguity Tolerance

If the question is `possible-potions` or `aspect-set`, the solver must reason
about *all consistent outcomes*, not just the single forced answer.
This is inherently harder even at the same chain depth.

Flag: `question_requires_enumeration = True` adds to difficulty.

---

## Composite Score Formula

```
raw_score = (
    (1 / (avg_clue_strength + 0.5)) * 4.0   # weak clues → high score
  + chain_depth * 1.5                         # depth penalty
  + complement_penalty * 2.0                  # X-Wing penalty
  + enumeration_penalty * 1.0                 # enumeration penalty
  + residual_worlds_penalty                   # log2(remaining_worlds/8) if > 0
)
```

Normalised to 1–5 pip scale after computing across all puzzles:
- Percentile 0–20   → 1 pip
- Percentile 20–40  → 2 pips
- Percentile 40–60  → 3 pips
- Percentile 60–80  → 4 pips
- Percentile 80–100 → 5 pips

---

## Output per puzzle

```json
{
  "difficulty": {
    "score": 3.2,
    "pips": 3,
    "avg_clue_strength": 1.84,
    "chain_depth": 2,
    "requires_complement_set": false,
    "question_requires_enumeration": false,
    "residual_worlds": 8,
    "notes": "Two-step cascade from sell clue"
  }
}
```

---

## Collection Re-ranking

After all puzzles are scored:
1. Sort each collection internally by `score`
2. Re-evaluate collection `difficulty` label by median score:
   - median < 1.5 → tutorial
   - 1.5–2.5 → easy
   - 2.5–3.5 → medium
   - 3.5–4.5 → hard
   - > 4.5 → expert
3. Flag any collection whose assigned label disagrees with median by > 1 tier
