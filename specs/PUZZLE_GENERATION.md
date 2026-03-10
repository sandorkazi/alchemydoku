# Alchemydoku — Puzzle Generation Specification

> Covers: constraint composition rules, mechanic combinations, difficulty scoring
> for expanded clue types, the generalized Python generation algorithm, and the
> authoring validity checklist.
>
> Prerequisites: GAME_MECHANICS.md, EXPANDED.md, GOLEM.md, DIFFICULTY.md.

---

## 1. World Filtering — How Clues Compose

All clue types reduce the world set independently and commutatively. The order
in which clues are applied does not matter — the result is always the intersection.
This holds across all clue families.

```
worlds = ALL_40320_WORLDS
for clue in puzzle.clues:
    worlds = applyClue(worlds, clue, ctx)
```

`ctx` carries the golem params when golem clues are present.

### 1a. Filter strengths by clue type

| Clue kind               | Theoretical max eliminated | Typical bits |
|-------------------------|----------------------------|--------------|
| `assignment`            | 7/8 worlds                 | 3.0          |
| `mixing` (exact)        | ~6/7 of current            | 2.8          |
| `sell` → total_match    | ~6/7 of current            | 2.8          |
| `encyclopedia` (trusted)| varies — see §1b           | 1.5–4.5      |
| `book`                  | ~1/2                       | 1.0          |
| `aspect`                | ~1/2                       | 1.0          |
| `sell` → sign_ok        | ~4/6 remaining             | 1.6          |
| `sell` → opposite       | ~3/6 remaining             | 1.0          |
| `golem_test` (both)     | depends on params          | 1.5–2.5      |
| `golem_test` (one)      | depends on params          | 0.8–1.5      |
| `encyclopedia_uncertain`| weaker than trusted        | 0.5–3.5      |
| `sell` → neutral        | ~1/7                       | 0.2          |
| `debunk_master` failure | ~1/7                       | 0.2          |
| `golem_hint_color`      | 0 (display only)           | 0.0          |
| `golem_hint_size`       | 0 (display only)           | 0.0          |

### 1b. Encyclopedia clue strength depends on sign distribution

An encyclopedia clue covers 4 ingredients on one aspect. Each entry pins a `(ingredient,
color, sign)` triple. The strength depends on how many of those ingredients were already
constrained:

- Fresh ingredients, balanced signs (2+/2−): highest strength (~4.5 bits combined)
- All same sign: weaker — half the world-set already knew the distribution (~2.5 bits)
- Uncertain variant: apply only if at least 3 of 4 hold → strength reduced by ~0.5 bits
  due to the 1-in-4 slack

Practical rule: **an encyclopedia clue is equivalent to 2–4 aspect clues**, depending
on sign distribution and overlap with existing constraints.

### 1c. Golem test filter mechanics

`golem_test` does **not** filter the world set alone. It filters worlds that are
consistent with both the ingredient assignment and the golem params:

```
keep world W if:
    golemReacts(W[ingredient], golemParams, 'chest') === chest_reacted
  AND
    golemReacts(W[ingredient], golemParams, 'ears') === ears_reacted
```

Crucially: the filter chains through the golem params, which are puzzle-level constants,
not world variables. This means:

- Golem tests constrain the ingredient → alchemical assignment indirectly by ruling out
  alchemicals whose size-on-color doesn't match the test result.
- A test result of `(chest=true, ears=true)` (animator) pins the ingredient to the 2
  alchemicals in the animator group → very strong (~2.2 bits) if the group is small.
- A test result of `(chest=false, ears=false)` (non-reactive) is the weakest, pinning
  to the 2 non-reactive alchemicals only (~1.0 bits before other constraints).

---

## 2. Mechanic Combinations — Rules and Interactions

### 2a. Legal combinations

All mechanic combinations are legal unless explicitly ruled out below.
The following table shows which mechanics can appear in the same puzzle:

| Combination                          | Legal? | Notes                                        |
|--------------------------------------|--------|----------------------------------------------|
| Base + Solar/Lunar                   | ✓      | Book clues are solar/lunar markers           |
| Base + Encyclopedia                  | ✓      | Standard expanded puzzle                     |
| Base + Golem                         | ✓      | Golem tests sit alongside aspect/mix clues   |
| Solar/Lunar + Encyclopedia           | ✓      | Powerful: article + solar/lunar can chain    |
| Solar/Lunar + Golem                  | ✓      | See §2b — rich interaction                   |
| Encyclopedia + Golem                 | ✓      | See §2c                                      |
| Encyclopedia + Uncertain             | ✓      | Max one uncertain article per puzzle         |
| Debunk + any                         | ✓      | Debunk clues act as aspect/mix clues         |
| Uncertain + Golem                    | ✓ (care)| Uncertain article leaves slack; golem tests  |
|                                      |        | must compensate. Validate carefully.         |
| Two uncertain articles               | ✗      | Too much ambiguity; never unique             |

### 2b. Solar/Lunar ↔ Golem interactions

This is the most important cross-mechanic interaction in the expanded set.

**Reaction group membership is Solar/Lunar-correlated.** The golem params
`(color, size)` define which alchemicals are animators. Because the alchemical
sign/size structure is fixed, animator group membership often correlates strongly
with Solar/Lunar class.

Example with chest = `{R, L}`:
- Alchemicals with R+ Large: {6(+L), 8(+L)} → both are Lunar? No — 6 is Lunar, 8 is Lunar.
  Actually 6=Ppn (Lunar), 8=PPP (Lunar). So knowing an ingredient is Lunar is a strong hint
  toward being chest-reactive when chest reacts to R+L.

**Practical rule for puzzle authors:**
When a puzzle includes both a `book` clue (solar/lunar) and `golem_test` clues,
check whether the book clue on its own pins the ingredient to a specific reaction group.
If it does, the golem test for that ingredient is redundant — use it as a confirming
clue (good for tutorials) or remove it (leaner puzzle).

**Deduction path example:**
1. Book clue: ingredient A is Solar → A ∈ {alch 1, 3, 5, 7}
2. Golem test on A: chest=true, ears=false → A is chest_only
3. Chest reacts to G+L. Solar alchemicals with G+L: only alch 8 (PPP) — wait, 8 is Lunar.
   Solar with G+L: none? This shows a constraint is very tight and the deduction resolves
   quickly.

**Solver tip for generation:** always compute which Solar/Lunar classes overlap each
reaction group before deciding how many golem_test clues to include.

### 2c. Encyclopedia ↔ Golem interactions

Encyclopedia clues pin sign (not size) on a color aspect. Golem tests reveal size-on-color
indirectly (via reaction). These are **orthogonal** in information terms:

- Encyclopedia: "ingredient A has R+"
- Golem test: "ingredient A is chest-reactive" (chest = {R, L}) → "ingredient A has R+L or
  R−L" — but combined with the encyclopedia clue → "ingredient A has R+L"
  → this pins alchemical completely! (Only one alch has R+L: alch 6 = Ppn)

**Cross-mechanic forcing:** An encyclopedia entry combined with a golem test on the same
ingredient and the same color can fully pin the alchemical in one step. This creates a
satisfying "aha" deduction but must be used carefully — it may bypass intended difficulty.

**Practical rule:** When combining encyclopedia + golem, ensure that no single ingredient
has both an encyclopedia sign constraint and a golem reaction constraint on the same
color aspect, unless that pin is intentional and the rest of the puzzle requires it.

### 2d. Debunk clues as recycled constraints

Debunk clues produce the same world-set filter as their underlying base clue types:
- `debunk_apprentice` → equivalent to `aspect` clue
- `debunk_master` success → equivalent to `mixing` clue
- `debunk_master` failure → negative mixing constraint (rare, weak)

They can freely substitute for base clues when the narrative calls for it. No special
interaction with golem or encyclopedia. They should not be the *sole* source of
world filtering in a golem puzzle (too weak for typical golem question requirements).

### 2e. Uncertain articles in combined puzzles

When an uncertain article coexists with golem tests, the solver must hold open the
possibility that one entry is wrong. This means:

- Some worlds that would be eliminated by a trusted article survive
- The golem tests may or may not close the gap depending on which entry is wrong

**Rule:** If a puzzle uses `encyclopedia_uncertain`, run the world-filter with the
weaker 3-of-4 logic and verify that the question answer is still unique. If not,
add a compensating clue (an aspect clue, book clue, or additional golem test).

---

## 3. Difficulty Scoring — Expanded Clue Types

This extends DIFFICULTY.md Axis 1 with expanded-clue strength weights.

### 3a. Clue strength adjustments

| Clue kind                       | Strength formula                                    |
|---------------------------------|-----------------------------------------------------|
| `book`                          | log2(worlds_before / worlds_after) — same as aspect |
| `encyclopedia` (trusted)        | sum of log2(w_before / w_after) across all 4 entries |
|                                 | divided by 1 (it's one clue card, but ~4× aspect)   |
| `encyclopedia_uncertain`        | 0.75 × trusted strength (25% slack discount)        |
| `golem_test` (chest+ears both)  | log2(worlds_before / worlds_after) normally          |
| `golem_test` (one flag)         | log2(worlds_before / worlds_after) normally          |
| `golem_hint_color`              | 0 (display only, no world filter)                   |
| `golem_hint_size`               | 0 (display only, no world filter)                   |
| `debunk_apprentice`             | same as `aspect`                                    |
| `debunk_master` success         | same as `mixing`                                    |
| `debunk_master` failure         | same as `sell` → neutral                            |

### 3b. Cross-mechanic complexity surcharge

When a puzzle mixes two or more mechanic families, add a surcharge to the raw score:

| Combination                  | Surcharge |
|------------------------------|-----------|
| Base only                    | 0.0       |
| + Solar/Lunar (book clue)    | +0.3      |
| + Encyclopedia               | +0.5      |
| + Golem tests                | +0.8      |
| + Uncertain article          | +1.0      |
| Golem + Encyclopedia         | +0.5 extra (on top of individual) |
| Golem + Solar/Lunar          | +0.3 extra                        |
| All three (enc + golem + s/l)| +0.8 extra                        |

Rationale: combining mechanics requires the solver to mentally track multiple
filtering dimensions simultaneously, increasing cognitive load independent of
chain depth.

### 3c. Question-type surcharges

| Question kind              | Surcharge |
|----------------------------|-----------|
| `alchemical`               | 0.0       |
| `mixing-result`            | 0.0       |
| `aspect`                   | 0.0       |
| `solar_lunar`              | +0.2      |
| `encyclopedia_fourth`      | +0.3      |
| `encyclopedia_which_aspect`| +0.5      |
| `golem_group` (animators)  | +0.5      |
| `golem_group` (other)      | +0.3      |
| `golem_animate_potion`     | +0.8      |
| `golem_mix_potion`         | +1.0      |
| `golem_possible_potions`   | +1.2      |
| `possible-potions` (base)  | +0.8      |
| `aspect-set`               | +0.5      |

### 3d. Extended composite score formula

```
raw_score = (
    (1 / (avg_clue_strength + 0.5)) * 4.0   # weak clues → high score
  + chain_depth * 1.5                         # deduction depth
  + complement_penalty * 2.0                  # X-Wing / complement-set
  + enumeration_penalty * 1.0                 # enumeration required
  + residual_worlds_penalty                   # log2(remaining/8) if > 0
  + cross_mechanic_surcharge                  # from §3b
  + question_type_surcharge                   # from §3c
)
```

---

## 4. Generation Algorithm

### 4a. Overview

The Python generation approach has three phases:

1. **Construction**: choose a target mechanics profile, generate a valid puzzle
2. **Minimization**: remove redundant clues while preserving uniqueness
3. **Annotation**: trace the deduction path and write hints

### 4b. Phase 1 — Construction

```python
def generate_puzzle(profile: PuzzleProfile) -> RawPuzzle:
    # 1. Sample a random solution (bijection of 8 slots to 8 alchemicals)
    solution = random_bijection()

    # 2. If golem puzzle: sample golem params such that chest_color != ears_color
    if profile.has_golem:
        golem = sample_golem_params()  # chest_color != ears_color; sizes independent

    # 3. Sample a question target
    question = sample_question(profile, solution, golem)

    # 4. Build worlds = all 40320 worlds (pre-filter by solution not needed)
    worlds = ALL_WORLDS

    # 5. Add clues one at a time from a ranked candidate pool until the
    #    question answer is unique in the remaining world set.
    clues = []
    while not is_unique(worlds, question, solution, golem):
        candidate = pick_best_clue(profile, worlds, solution, golem, clues)
        clues.append(candidate)
        worlds = apply_clue(worlds, candidate, golem)

    return RawPuzzle(solution, golem, clues, question)
```

**`pick_best_clue`** should:
- Prefer clues of the mechanics families declared in `profile`
- Among candidates, pick the one that reduces worlds most (greedy)
- Avoid redundant clues: if removing a previous clue still leaves worlds unique, skip
- Respect ingredient diversity: don't use the same ingredient in 4+ clues (looks
  artificial)

**`is_unique`** checks that across all remaining worlds consistent with the clues,
the question answer is always the same value.

### 4c. Phase 2 — Minimization

After construction, remove any clue whose removal still leaves the answer unique.
Always check removal from last added to first (LIFO order is usually fastest).

```python
def minimize(puzzle: RawPuzzle) -> RawPuzzle:
    clues = list(puzzle.clues)
    changed = True
    while changed:
        changed = False
        for i in range(len(clues) - 1, -1, -1):
            reduced = clues[:i] + clues[i+1:]
            worlds = apply_all_clues(reduced, puzzle.golem)
            if is_unique(worlds, puzzle.question, puzzle.solution, puzzle.golem):
                clues = reduced
                changed = True
                break  # restart
    return puzzle._replace(clues=clues)
```

This guarantees a **minimal clue set** — no clue can be removed without breaking
uniqueness.

### 4d. Phase 3 — Hint generation

Hints must be derived **only from the clue set and solution** — never written by
hand. The hint generator traces the human deduction path:

```python
def generate_hints(puzzle: MinimalPuzzle) -> list[Hint]:
    hints = []
    confirmed = {}
    worlds = apply_all_clues(puzzle.clues, puzzle.golem)

    # Level 1: restate what the clues directly tell you
    hints.append(Hint(level=1, text=summarize_direct_constraints(puzzle.clues)))

    # Level 2: trace the first forced deduction
    step = find_first_forced(worlds, confirmed)
    if step:
        hints.append(Hint(level=2, text=explain_forced(step, puzzle.clues)))
        confirmed.update(step)
        worlds = narrow(worlds, confirmed)

    # Level 3: trace to the question answer
    answer_path = trace_to_answer(worlds, confirmed, puzzle.question, puzzle.solution)
    hints.append(Hint(level=3, text=explain_path(answer_path)))

    return hints
```

**For golem puzzles**, Level 1 should summarize which reaction groups are partially
or fully determined, Level 2 traces which group the question target belongs to, and
Level 3 confirms the final answer.

### 4e. Profile definitions

A `PuzzleProfile` declares the intended mechanics, difficulty tier, and question type:

```python
@dataclass
class PuzzleProfile:
    mechanics: list[str]        # e.g. ['base', 'encyclopedia']
    question_kind: str          # e.g. 'encyclopedia_fourth'
    difficulty: str             # 'tutorial' | 'easy' | 'medium' | 'hard'
    max_clues: int              # upper bound (minimization may go lower)
    require_solar_lunar: bool   # must include at least one book clue
    has_golem: bool             # puzzle has golem params
```

### 4f. Suggested profiles by difficulty

| Difficulty | Mechanics                  | Clue budget | Notes                               |
|------------|----------------------------|-------------|-------------------------------------|
| tutorial   | base only                  | 3–5         | Single ingredient target, depth 1   |
| tutorial   | golem only                 | 3–4 tests + 1 hint | Group question, depth 1      |
| easy       | base + encyclopedia        | 4–7         | One encyclopedia clue               |
| easy       | base + solar/lunar         | 4–7         | Two book clues + mix clue           |
| easy       | golem + base               | 4–6         | animator group, depth 1–2           |
| medium     | enc + solar/lunar          | 6–9         | Two mechanics, depth 2–3            |
| medium     | golem + encyclopedia       | 5–8         | Cross-mechanic forcing allowed      |
| medium     | golem + solar/lunar        | 5–8         | Animator potion question            |
| hard       | all three (enc+golem+s/l)  | 7–12        | Depth 3+, possible complement-set   |
| hard       | uncertain + golem          | 8–12        | Uncertain article adds ambiguity    |

---

## 5. Authoring Validity Checklist

Before publishing any puzzle, verify all of the following:

### 5a. Universal checks (all puzzles)

- [ ] **Unique answer**: across all worlds consistent with all clues, the question
      answer is always the same value.
- [ ] **Minimal clue set**: removing any single clue breaks uniqueness (run minimizer).
- [ ] **Solution consistency**: `puzzle.solution` is a valid bijection; applying all
      clues yields a world set that includes the solution world.
- [ ] **No redundant display clues**: `golem_hint_color` and `golem_hint_size` are
      informative to the human but invisible to the world filter — verify they don't
      substitute for a clue that's actually needed for uniqueness.
- [ ] **Ingredient diversity**: no single ingredient appears in more than 3 clues
      (cosmetic rule — prevents lopsided puzzle feel).
- [ ] **Hints derivable**: all hints follow from the clue set alone with no extra knowledge.

### 5b. Encyclopedia puzzle checks

- [ ] **Article consistency**: all 4 entries agree with the solution (for trusted variant).
- [ ] **Uncertain article**: at least 3 of 4 entries agree with solution. Mark exactly
      which entry is wrong in puzzle metadata (for hint generation).
- [ ] **Aspect diversity**: if two encyclopedia clues are present, they cover different
      aspects.
- [ ] **Fourth-ingredient uniqueness**: for `encyclopedia_fourth` questions, verify
      that the missing ingredient is uniquely determined — not just that 3 known
      entries plus the sign identifies it across remaining worlds, but that no other
      ingredient also has the missing sign on the aspect in all remaining worlds.

### 5c. Golem puzzle checks

- [ ] **Golem params validity**: `chest.color != ears.color`. Sizes may be equal.
- [ ] **Group size**: with the given solution and params, each group
      (animators, chest_only, ears_only, non_reactive) has exactly 2 members.
      Verify before using the solution — if params yield degenerate groups, resample.
- [ ] **Test coverage**: at minimum 2 `golem_test` clues spanning at least 2 different
      reaction groups. A puzzle with all tests from the same group provides insufficient
      signal.
- [ ] **Non-trivial answer**: for `golem_possible_potions`, the answer must not be all
      7 potion types. Flag and discard if so.
- [ ] **Golem uniqueness independent of world uniqueness**: it is possible for the world
      set to be unique (single world remains) but the golem question to be trivially
      answered before that. Ensure the question requires actual deduction and isn't
      answered by the first golem test alone (unless the puzzle is a tutorial).
- [ ] **Hint color/size clues match params**: `golem_hint_color` and `golem_hint_size`
      values must match `puzzle.golem.chest` / `puzzle.golem.ears`.

### 5d. Combined mechanics checks

- [ ] **Cross-mechanic forcing is intentional**: if an encyclopedia entry + golem test
      on the same ingredient × color fully pins an alchemical (see §2c), mark this as
      the intended key deduction step and reference it in Level 2 hint.
- [ ] **Solar/Lunar and golem group overlap computed**: run the overlap check from §2b
      before finalizing clue counts. If a book clue alone determines group membership,
      a golem test for that ingredient is redundant — verify via minimizer.
- [ ] **Uncertain article compensated**: if an uncertain article is present, verify
      uniqueness under the 3-of-4 filter, not the 4-of-4 filter.
- [ ] **No two uncertain articles**: enforced by rule (see §2a).

---

## 6. Worked Example — Cross-Mechanic Puzzle

**Target:** medium difficulty, mechanics = golem + solar/lunar, question = animators group.

**Solution** (identity mapping for simplicity): slot i → alch i.

**Golem params**: chest = {G, L}, ears = {B, S}.

**Step 1 — compute reaction groups:**

| Alch | G size | B size | chest (G+L)? | ears (B+S)? | group        |
|------|--------|--------|--------------|-------------|--------------|
| 1    | +S     | −L     | ✗            | ✗           | non_reactive |
| 2    | −S     | +L     | ✗            | ✗           | non_reactive |
| 3    | −L     | −S     | ✗            | ✓           | ears_only    |
| 4    | +L     | +S     | ✓            | ✓           | animator     |
| 5    | −S     | +S     | ✗            | ✓           | ears_only    |
| 6    | +S     | −S     | ✗            | ✗           | non_reactive |
| 7    | −L     | −L     | ✗            | ✗           | non_reactive |
| 8    | +L     | +L     | ✓            | ✓           | animator     |

Wait — this gives 4 non_reactive, 2 ears_only, 0 chest_only, 2 animator. Invalid
(chest_only must have exactly 2). This params choice is degenerate — resample.

Try chest = {G, L}, ears = {R, S}:

| Alch | G size | R size | chest (G+L)? | ears (R+S)? | group        |
|------|--------|--------|--------------|-------------|--------------|
| 1    | +S     | −S     | ✗            | ✓           | ears_only    |
| 2    | −S     | +S     | ✗            | ✓           | ears_only    |
| 3    | −L     | +S     | ✗            | ✓           | ears_only    |
| 4    | +L     | −S     | ✓            | ✗           | chest_only   |
| 5    | −S     | −L     | ✗            | ✗           | non_reactive |
| 6    | +S     | +L     | ✗            | ✗           | non_reactive |
| 7    | −L     | −L     | ✗            | ✗           | non_reactive |
| 8    | +L     | +L     | ✓            | ✗           | chest_only   |

Still degenerate (3 ears_only, 0 animator). This illustrates §5c: always verify
group sizes before proceeding. The generation script must resample params until
groups are (2,2,2,2).

**Step 2 — after finding valid params, run construction:**

Add golem tests for ingredients in different groups, a book clue tying solar/lunar
to one group boundary, and minimize. Verify that the animator question is unique
across remaining worlds.

**Step 3 — compute hints:**

- Level 1: summarize which test results directly rule out which groups.
- Level 2: show the solar/lunar deduction that narrows candidates.
- Level 3: confirm the two animators.

---

## 7. File and Naming Conventions

| Pattern                  | Example                     | Notes                            |
|--------------------------|-----------------------------|----------------------------------|
| `exp-tutorial-{type}-{n}`| `exp-tutorial-golem-01`     | First tutorial for that mechanic |
| `exp-easy-{type}-{n}`    | `exp-easy-enc-02`           | Easy single-mechanic             |
| `exp-easy-{t1}{t2}-{n}`  | `exp-easy-golem-enc-01`     | Easy combined mechanics          |
| `exp-medium-{type}-{n}`  | `exp-medium-golem-sl-01`    | Medium; sl = solar/lunar         |
| `exp-hard-{type}-{n}`    | `exp-hard-all-01`           | Hard combined                    |

Mechanic abbreviations in IDs:
- `enc` — encyclopedia
- `sl` — solar/lunar (book clues)
- `golem` — golem tests
- `deb` — debunk clues
- `unc` — uncertain article
- `all` — three or more combined

---

## 8. Resolved Design Decisions

1. **Golem questions can target exact params, not just group membership.**
   The following question types are valid and in scope:
   - "What color does the chest (or ears) react to?" → answer is `golem.chest.color`
   - "What size does the chest (or ears) react to?" → answer is `golem.chest.size`
   - "Which two ingredients animate the golem?" → answer is the `animators` group
     (already covered by `golem_group` with `group: 'animators'`)
   - "What are the full chest params (color + size)?" → answer is `{color, size}` pair
   These are pure golem deduction puzzles. The world-set filter still applies (it
   constrains which ingredients map to which alchemicals), but the question answer
   is resolved via golem param deduction from test results, not from the assignment.

2. **Golem tests are fully independent of article status.**
   A golem test is a direct physical act (feeding an ingredient to the golem) and
   produces public, certain information. It is never affected by whether an article
   is trusted, uncertain, or debunked. In particular:
   - An uncertain article's slack (one entry may be wrong) never contaminates golem
     test results — they are orthogonal information sources.
   - Golem tests may *help deduce* assignment facts that also appear in a verified
     (trusted) article, but that is just two independent constraints pointing at the
     same truth — not a dependency.
   - **Rule for puzzle generation:** golem tests and uncertain articles may coexist
     in the same puzzle, but the uniqueness check must treat them as entirely separate
     filter chains. Do not use a golem test to "fix" ambiguity introduced by an
     uncertain article — resolve uncertain-article ambiguity with aspect/book/mix
     clues instead.

3. **Multi-question puzzles are already supported and in use.**
   Puzzles may have 1–3 (or more) questions. Each question is answered independently
   against the same final world set. Generation should ensure *each* question is
   uniquely answerable from the clue set, not just one of them. When generating
   combined-mechanic puzzles, use multiple questions to exercise different aspects
   of the same deduction — e.g. one ingredient assignment question + one golem group
   question on the same puzzle.

4. **Difficulty surcharges are fixed for now; re-calibration deferred indefinitely.**
   The values in §3b stand until explicitly revised based on evidence. Do not block
   puzzle generation on playtesting data.

5. **`golem_mix_potion` and `golem_possible_potions` require a fully determined golem.**
   These question types are only valid when the golem params (chest and ears, both
   color and size) are uniquely deducible from the clue set *before* the question
   is reached in the solving path. The generation script must verify:
   - After applying all clues, every remaining world agrees on the full golem params.
   - The mix/potion question is then answered against the (now fixed) group membership.
   This sidesteps the double-quantifier complexity: group membership is determined
   first, potion enumeration second. If the params are not fully constrained, use
   `golem_group` or `golem_animate_potion` instead.
---

## 9. CLI Usage (`scripts/alchemydoku.py`)

The toolchain is a single Python 3.8+ script with no external dependencies.
Run all commands from the project root.

### generate

```bash
python scripts/alchemydoku.py generate --profile <name> [--count N] [--seed S] [--verbose]
python scripts/alchemydoku.py generate --profiles   # list all available profiles
```

| Profile           | Mechanics                          |
|-------------------|------------------------------------|
| `tutorial_golem`  | Golem tutorial                     |
| `easy_enc`        | Encyclopedia only                  |
| `easy_sl`         | Solar/Lunar only                   |
| `easy_golem`      | Golem only                         |
| `medium_enc_sl`   | Encyclopedia + Solar/Lunar         |
| `medium_golem_enc`| Golem + Encyclopedia               |
| `medium_golem_sl` | Golem + Solar/Lunar                |
| `hard_all`        | All three mechanics                |
| `hard_golem_mix`  | Golem-heavy mix                    |

Output files land in `src/expanded/data/puzzles/` with auto-incremented filenames
(e.g. `exp-easy-enc-05.json`).

### validate

```bash
python scripts/alchemydoku.py validate
```

Validates every `*.json` in `src/expanded/data/puzzles/`. Reports `ERROR` and `WARNING`
per puzzle. Generated puzzles should be clean; hand-crafted tutorials may produce
expected warnings.

### analyze

```bash
python scripts/alchemydoku.py analyze
```

Rescores all puzzles in `src/data/puzzles/*.json` and writes `complexity` metadata back
into each file.

---

## 10. Post-Generation: Registering Puzzles

The generator writes JSON files but does **not** update the index. After generating,
manually edit `src/expanded/data/puzzlesIndex.ts`:

```ts
// 1. Add an import
import expEasyEnc05 from './puzzles/exp-easy-enc-05.json';

// 2. Add to ALL_EXPANDED_PUZZLES array
export const ALL_EXPANDED_PUZZLES: ExpandedPuzzle[] =
  [ ...existing..., expEasyEnc05 ] as unknown as ExpandedPuzzle[];

// 3. Add the puzzle ID to the relevant collection in EXPANDED_COLLECTIONS
{
  id: 'exp-easy',
  puzzleIds: ['exp-easy-solar-01', 'exp-easy-enc-01', 'exp-easy-enc-05'],
}
```

> ⚠️ As of the current codebase, 18 generated puzzle files exist in `src/expanded/data/puzzles/`
> that are not yet registered (enc-02..07, golem-02..03, sl-02..03, medium-enc-sl-02..03,
> medium-golem-enc-02..03, medium-golem-sl-02..03, hard-all-02, hard-golem-mix-02).
> They are valid and passing `validate`, but invisible in-game until added to `puzzlesIndex.ts`.
