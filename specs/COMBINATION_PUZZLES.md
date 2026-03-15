# Combination Puzzle Collections

## 1. Purpose

These two collections serve as capstone challenges for each game mode, exercising the full
vocabulary of clue types available in that mode.  A player who completes them has demonstrated
fluency with every mechanic the game exposes.

---

## 2. Base collection — `combo-base` / "The Full Arsenal"

### Clue types used
| Kind | Notes |
|---|---|
| `mixing` | Base: pair mix result |
| `aspect` | Base: sign of one colour for one ingredient |
| `sell` | New: see §6 |
| `debunk` (apprentice, master-success) | New: see §6 |
| `mixing_among` | New: see §6 |

### Question types
| Question kind | Profile(s) |
|---|---|
| `mixing-result` | `combo_b_easy` |
| `aspect` | `combo_b_med_asp` |
| `neutral-partner` | `combo_b_med_np` |
| `possible-potions` | `combo_b_hard_pp` |
| `ingredient-potion-profile` | `combo_b_hard_ip` |

### Profile table
| Profile key | id_prefix | mechanics | question_kind | difficulty | max_clues | count |
|---|---|---|---|---|---|---|
| `combo_b_easy` | `combo-b-easy` | `['base','sell']` | `mixing-result` | easy | 10 | 5 |
| `combo_b_med_asp` | `combo-b-med-asp` | `['base','sell','debunk']` | `aspect` | medium | 12 | 4 |
| `combo_b_med_np` | `combo-b-med-np` | `['base','sell','debunk']` | `neutral-partner` | medium | 12 | 4 |
| `combo_b_hard_pp` | `combo-b-hard-pp` | `['base','sell','debunk','among']` | `possible-potions` | hard | 14 | 4 |
| `combo_b_hard_ip` | `combo-b-hard-ip` | `['base','sell','debunk','among']` | `ingredient-potion-profile` | hard | 14 | 4 |

**Total: 21 base puzzles.**

---

## 3. Expanded collection — `combo-exp` / "Grand Synthesis"

### Clue types used
All base clue types plus:
| Kind | Notes |
|---|---|
| `book` | Solar/Lunar classification |
| `encyclopedia` | 3-entry aspect article |
| `golem_test` | Golem reaction result |
| `golem_hint_color` / `golem_hint_size` | Display-only; not filtered |

### Question types
| Question kind | Profile(s) |
|---|---|
| `encyclopedia_fourth` | `combo_exp_easy`, `combo_exp_med_all` |
| `solar_lunar` | `combo_exp_med_sl`, `combo_exp_hard_sl` |
| `encyclopedia_which_aspect` | `combo_exp_hard_wha` (first puzzles to use this type) |

### Profile table
| Profile key | id_prefix | mechanics | question_kind | difficulty | max_clues | has_golem | count |
|---|---|---|---|---|---|---|---|
| `combo_exp_easy` | `combo-exp-easy` | `['base','encyclopedia','solar_lunar']` | `encyclopedia_fourth` | easy | 12 | False | 5 |
| `combo_exp_med_sl` | `combo-exp-med-sl` | `['base','encyclopedia','solar_lunar']` | `solar_lunar` | medium | 13 | False | 4 |
| `combo_exp_med_all` | `combo-exp-med-all` | `['base','encyclopedia','solar_lunar','golem']` | `encyclopedia_fourth` | medium | 14 | True | 4 |
| `combo_exp_hard_wha` | `combo-exp-hard-wha` | `['base','encyclopedia','solar_lunar','golem']` | `encyclopedia_which_aspect` | hard | 16 | True | 4 |
| `combo_exp_hard_sl` | `combo-exp-hard-sl` | `['base','encyclopedia','solar_lunar','golem']` | `solar_lunar` | hard | 15 | True | 4 |

**Total: 21 expanded puzzles.**

---

## 4. New mechanic tags for `candidate_pool()`

### `'sell'` (priority 2)

For each pair `(i1, i2)` in C(8,2):
- Compute `actual = MIX_TABLE[sol[i1]][sol[i2]]`
- If neutral: add ONE candidate with `claimedResult={'type':'potion','color':'R','sign':'+'}`, `sellResult='neutral'`
- If non-neutral: for each of 6 claimed potions `(col, sgn)`:
  - `sellResult = 'total_match'` if `actual == (col, sgn)`
  - `sellResult = 'sign_ok'` if `actual[1] == sgn` and `actual != (col, sgn)`
  - `sellResult = 'opposite'` if `actual[1] != sgn`

Upper bound: 4 neutral pairs × 1 + 24 non-neutral pairs × 6 ≈ **148 candidates**.

### `'debunk'` (priority 3)

Apprentice (8 × 3 = 24):
```json
{"kind":"debunk","variant":"apprentice","ingredient":s,"color":col,
 "sign":<actual_sign>,"outcome":"success"}
```

Master-success (C(8,2) = 28):
```json
{"kind":"debunk","variant":"master","ingredient1":i1,"ingredient2":i2,
 "claimedPotion":<actual_result>,"outcome":"success"}
```

Total: **52 candidates**.

### `'among'` (priority 1)

3-ingredient groups only (C(8,3) = 56 groups), one `mixing_among` candidate per unique mix
result across the three pairs:
```json
{"kind":"mixing_among","ingredients":[a,b,c],"result":<result>}
```

Upper bound: 56 × 3 = **168 candidates**.

---

## 5. `encyclopedia_which_aspect` deduction contract

The question presents 4 (ingredient, sign) pairs and asks: which colour aspect (R / G / B) do
all four entries belong to?

**Generation** (`build_question_anchor`):
- Pick a random colour `col` from R/G/B
- Sample 4 ingredient slots uniformly at random from SLOTS
- Each entry's sign is read from `ALCH_DATA[sol[s]][col][0]`
- `anchor = None` (no anchor clue needed)
- `blocked_enc = {col}` to prevent a direct encyclopedia clue from trivially revealing the answer colour

**Answer** (`answer` function):
```python
for col in COLORS:
    if all({ALCH_DATA[w[e['ingredient']-1]][col][0] for w in worlds} == {sgn_int(e['sign'])} for e in q['entries']):
        return col
return None
```

**TypeScript** (`computeEncyclopediaWhichAspect`):
Already implemented in `schemaExpanded.ts`.

**UI** (`ExpandedAnswerPanel.tsx`):
`AspectColorPicker` already renders three colour buttons for this question kind.

---

## 6. Hint generation — `encyclopedia_which_aspect`

Three levels:

| Level | Content |
|---|---|
| 1 | For each colour R/G/B, check whether all four entries hold across remaining worlds. |
| 2 | Eliminate any colour where at least one remaining world disagrees. Only one survives. |
| 3 | State the answer colour and explain why all four entries map to it. |

Example level 3:
> "The answer is G (Green): every remaining world maps all four entries onto the Green aspect."

---

## 7. Candidate pool sizes (summary)

| Tag | Approx. candidates |
|---|---|
| `base` mixing | 28 (C(8,2)) |
| `base` aspect | 24 (8×3) |
| `sell` | ≤148 |
| `debunk` | 52 |
| `among` | ≤168 |
| `solar_lunar` (book) | 8 |
| `encyclopedia` | varies (≤C(4,3)×3 colors per sign ≈ 24) |
| `golem_test` | 8 |

The greedy loop samples 100 candidates per iteration (unchanged), so large pools are fine.

---

## 8. Deferred items

- **`sell_among`**: no Python `filter_clue` implementation; excluded from all profiles.
- **Debunk-failure variants**: `outcome='failure'` candidates not generated (overly complex).
- **4-ingredient `mixing_among`**: only 3-ingredient groups generated here.
- **Multiple questions per puzzle**: all combination profiles have exactly one question.
