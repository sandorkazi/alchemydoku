# Debunk Puzzles — Design Specification

*Status: DRAFT — data model and rules settled, generator not yet implemented.*

Debunk puzzles are a distinct puzzle type (alongside `alchemical`, `encyclopedia_fourth`, etc.)
where the player is given a solved world (via clues) plus a board state of wrong publications
and/or wrong encyclopedia articles, and must plan the optimal debunking sequence.

---

## 1. Scope and simplifications for v1

The following are explicitly **out of scope for v1**:

- **Seals / hedging** — all publications and articles behave as 0-seal (one conflict = removed).
  The seal mechanic (reputation loss on removal of hedged publications) is a rich design space
  but is deferred until the basic puzzle type is proven and has content.
- **Own publications** — all publications and articles on the board belong to opponents.
  Strategically removing one's own publications (to avoid reputation loss) is deferred.
- **Reputation scoring** — reputation earned per removal is not tracked in v1.  
  "Maximum reputation" questions (Q2) ask for the maximum *number of removals* achievable,
  which is equivalent to reputation when all seals are 1.

---

## 2. Core game rules (as they apply to puzzles)

### 2a. Apprentice debunk

The player reveals the **true** value of one colour aspect for one ingredient.

- Example: ingredient 3 has true alchemical `pNn` → its `G` aspect is `−` (Large).
  If any publication claims ingredient 3 has alchemical `PPP` (which has `G+`), revealing
  `G−` for ingredient 3 directly contradicts the publication → **publication removed**.
- **Always unambiguous**: an apprentice reveal names one ingredient exactly.
  If the revealed sign contradicts the claimed alchemical's sign for that colour, removal
  is immediate and certain regardless of what any other ingredient is.
- **One action, one step** regardless of how many articles/publications are simultaneously
  disproved by that single reveal (see §2c).
- In the base game an apprentice debunk targets publications only.
  In expanded mode it can additionally disprove encyclopedia article entries.

A debunk step is specified as:
```
{ kind: "apprentice", ingredient: IngredientId, color: Color }
```
The sign is implied by the true alchemical (it is the true sign). Any colour whose true sign
contradicts the publication/article is a valid answer; the puzzle accepts any valid
contradiction, not a specific one.

### 2b. Master debunk

The player mixes two ingredients and publicly declares the **true result** of that mix.

```
{ kind: "master", ingredient1: IngredientId, ingredient2: IngredientId }
```
The result is the true mix result (deterministic from the solution). It does not need to be
specified in the answer because it is uniquely determined by the pair and the solution.

**Conflict logic**: after declaring mix(A, B) = R, the audience compares R against every
publication on the board that involves A or B:

- For publication `P_A` (claims A = alch_X): compute `mix(alch_X, true_B)`.
  - `true_B` = the true alchemical for B, which the audience knows if B's publication
    is **definitively known** (see §2d). If B is not definitively known → P_A cannot be
    unambiguously blamed.
  - If `mix(alch_X, true_B) ≠ R` → P_A is in conflict.
  - Same logic for P_B symmetrically.

**Removal rule — unambiguous blame required**:

| Situation | Outcome |
|---|---|
| Only P_A is in conflict | P_A removed |
| Only P_B is in conflict | P_B removed |
| Both P_A and P_B are in conflict | Neither removed — audience cannot tell who is lying |
| Neither in conflict | No effect |

The "both conflicted, neither removed" case is what makes master debunking sequentially
interesting: the two conflicts are real and on record, but no removal occurs yet.

**Important**: this ambiguity is about *which publication is wrong*, not about the mix result
itself. The declared result is always true, so the mix result is public information regardless.

### 2c. Multi-target disproof in one action

A single apprentice reveal can simultaneously disprove:
- Multiple publications (if several claim the contradicted aspect for that ingredient)
- Multiple encyclopedia articles (if several articles have a wrong entry for that ingredient
  on that aspect)

A single master mix can simultaneously remove two publications (one for each ingredient, if
blame is unambiguous — see §2b) and/or disprove encyclopedia articles whose entries are
contradicted by the known mix result.

In all cases: **one action = one step** no matter how many targets it hits.

### 2d. What counts as "definitively known" (for master unambiguity)

Ingredient B's alchemical is definitively known if it can be **logically deduced from the
puzzle's clues** (the normal clue set given alongside the debunk board). It does NOT require
B to have a publication, and it does NOT use publications to establish knowledge —
publications are the things being debunked and cannot themselves be used as evidence.

Formally: after applying all puzzle clues (not publications, not articles) to the world set,
if the residual worlds all agree on B's alchemical, then B is definitively known.

This means:
- A fully solved puzzle → every ingredient is known → every master mix is unambiguous.
- A partially constrained puzzle → some ingredients may not be definitively known → master
  mixes involving them against wrong publications produce ambiguous outcomes.

### 2e. Encyclopedia article disproof (expanded mode)

An article makes claims about a colour aspect's sign for 2–4 ingredients. Entries may be
partially correct (correct entries and wrong entries can coexist in the same article).

**Removal rule**: an article is removed if **at least one entry** is directly and
unambiguously disproved. One factual contradiction is sufficient to invalidate an academic
claim.

An entry `(ingredient X, color C, sign S)` is disproved when:
- **Apprentice**: player reveals the true sign for `(X, C)` and it is `¬S`.
- **Master**: a mix result unambiguously implies `(X, C) = ¬S` (i.e. X is definitively
  known in the context of the mix — see §2d — and the mix result pins the aspect).

Unlike publications, which claim a complete alchemical, an article only claims one aspect sign
per ingredient. Therefore only the specific entries involved in a disproof matter; other
entries in the same article are irrelevant once one is disproved.

---

## 3. Puzzle structure

### 3a. JSON format

```jsonc
{
  "id": "debunk-easy-01",
  "kind": "debunk",
  "mode": "base" | "expanded",
  "title": "...",
  "difficulty": "easy" | "medium" | "hard",

  // Standard clue set — defines the solved world
  "clues": [ /* normal clue objects */ ],
  "solution": { "1": 4, "2": 6, "3": 1, "4": 8, "5": 3, "6": 5, "7": 2, "8": 7 },

  // Publications: 8-element array, null = no publication for that slot
  "publications": [
    { "ingredient": 1, "claimedAlchemical": 3 },
    { "ingredient": 4, "claimedAlchemical": 7 },
    null, null, null, null, null, null
  ],

  // Expanded mode only: encyclopedia articles with partially correct entries
  "articles": [
    {
      "id": "art-1",
      "aspect": "R",
      "entries": [
        { "ingredient": 1, "sign": "+" },   // may be correct or wrong
        { "ingredient": 3, "sign": "-" },
        { "ingredient": 5, "sign": "+" },
        { "ingredient": 6, "sign": "-" }
      ]
      // removed when any entry is directly and unambiguously disproved
    }
  ],

  "questions": [
    // One or more of the following question types:
    { "kind": "debunk_min_steps" },
    { "kind": "debunk_max_removals" },
    {
      "kind": "debunk_conflict_only",
      "variant": "master",         // always master in v1 (see §4c)
      "fixedIngredient": 4         // the ingredient to mix with
    }
  ]
}
```

### 3b. Constraints on publications and articles

- Publications claim an alchemical that is **wrong** (otherwise it cannot be debunked).
  All publications on the board are opponents' — they are all targets, not owned by the player.
- Articles may be **partially correct** — only entries that are wrong are debunkable, but
  a single wrong entry suffices to remove the entire article.
- No ingredient appears in more than 2 articles (game mechanical limit).
- No two articles cover exactly the same set of ingredients (game mechanical limit).
- Publications and articles are independent targets — a single action can address both.

---

## 4. Question types

### 4a. `debunk_min_steps` — fewest actions

Find the shortest valid debunking plan that removes **all** wrong publications and articles.

**Valid plan**: an ordered sequence of steps where:
1. Every step is a correctly formed debunk action (true aspect for apprentice, true mix for
   master).
2. Every step is **non-redundant**: it either removes at least one publication/article, or
   it is the last step in a chain where removing it would make a later removal impossible.
   In practice, with no seals, ambiguous master debunks (conflict-only outcomes) never
   enable later debunks (see §4c). Therefore for Q1/Q2 every step in the optimal plan
   must directly remove at least one publication or article.
3. The sequence removes everything by the end.

**Uniqueness**: multiple plans may achieve the same step count. Any plan with the minimum
step count is a valid answer, provided no step in it is redundant per rule 2.

**Difficulty guidance**: easy ≤ 2 steps, medium 3 steps, hard 4 steps. Above 4 steps is
administratively complex and not recommended for puzzles.

### 4b. `debunk_max_removals` — most removals

Find a valid plan that achieves the **maximum number of removals** (publications + articles
removed). With 0-seal rules this equals the total count of wrong publications and articles,
so this question is equivalent to "find a valid complete plan."

This question is most interesting when Q1 and Q2 have different answers — i.e. when there
exists a plan that completes in fewer steps but misses some targets, versus a longer plan
that removes everything. In v1 with all-wrong publications this doesn't arise (all must be
removed), so `debunk_max_removals` is meaningful primarily in puzzles where not all
publications/articles are guaranteed to be wrong.

*[DEFERRED for initial content: hold this question type until puzzles with correct
publications mixed in are designed.]*

### 4c. `debunk_conflict_only` — demonstrate a conflict without removal

**Variant**: master only in v1.

An apprentice reveal is always unambiguous and always removes. Therefore conflict-without-
removal only arises from master debunks where **both** publications involved are wrong, so
the audience cannot determine which is at fault → neither removed.

**What the question asks**: "Mix ingredient `fixedIngredient` with something to produce a
conflict on `fixedIngredient`'s publication without removing it."

**Why this is interesting**: the player must identify an ingredient whose publication is also
wrong, such that the true mix result contradicts both publications, producing the ambiguous
outcome. This serves as a strategic demonstration that both are wrong, which may be
useful information even if no removal occurs.

**Answer**: a single step:
```
{ kind: "master", ingredient1: fixedIngredient, ingredient2: <answer> }
```
`ingredient2` must have a wrong publication, and the true mix of the pair must contradict
both publications, and neither must be definitively known in a way that would make the
blame unambiguous. (If one *is* definitively known, the mix would unambiguously remove one
of them — that would not be a "conflict only" answer.)

**Important nuance**: "definitively known" (§2d) is determined from the puzzle clues alone.
If the clue set fully solves one ingredient, a master mix with that ingredient would always
be unambiguous — those pairs cannot be used for conflict-only.

---

## 5. Answer format

The answer to any debunk question is an **ordered sequence of steps**.

```jsonc
[
  { "kind": "apprentice", "ingredient": 2, "color": "R" },
  { "kind": "master", "ingredient1": 1, "ingredient2": 4 }
]
```

For `debunk_conflict_only` the answer is a single-step sequence.

**Validation rules**:
1. Every apprentice step: true sign at `(ingredient, color)` must contradict at least one
   active (not yet removed) publication or article entry at the time of that step.
2. Every master step: true mix result must conflict with at least one active publication or
   article entry at the time of that step. (A step that produces zero conflicts is invalid.)
3. No step targets only already-removed publications/articles (that would be redundant).
4. For `debunk_min_steps`: answer length equals the proven minimum.
5. For `debunk_conflict_only`: answer has length 1, outcome is conflict-without-removal.

---

## 6. Solver / validator logic sketch

```python
def evaluate_plan(steps, solution, publications, articles, clue_worlds):
    """
    Simulate a debunk plan. Returns list of per-step outcomes.
    clue_worlds: frozenset of worlds consistent with puzzle clues (not publications).
    """
    active_pubs = {p['ingredient']: p for p in publications if p is not None}
    active_arts = {a['id']: a for a in articles}
    outcomes = []

    for step in steps:
        removed = []
        conflicts = []

        if step['kind'] == 'apprentice':
            ing = step['ingredient']
            col = step['color']
            true_sign = ALCH_DATA[solution[ing]][col][0]  # +1 or -1

            # Check publications
            if ing in active_pubs:
                claimed_alch = active_pubs[ing]['claimedAlchemical']
                claimed_sign = ALCH_DATA[claimed_alch][col][0]
                if claimed_sign != true_sign:
                    removed.append(('publication', ing))
                    del active_pubs[ing]

            # Check article entries
            for art_id, art in list(active_arts.items()):
                if art['aspect'] == col:
                    for entry in art['entries']:
                        if entry['ingredient'] == ing and sgn_int(entry['sign']) != true_sign:
                            removed.append(('article', art_id))
                            del active_arts[art_id]
                            break

        elif step['kind'] == 'master':
            a, b = step['ingredient1'], step['ingredient2']
            true_result = MIX_TABLE[solution[a]][solution[b]]

            # Is each ingredient definitively known from clue_worlds?
            a_known = len({w[a-1] for w in clue_worlds}) == 1
            b_known = len({w[b-1] for w in clue_worlds}) == 1

            conflict_a = conflict_b = False

            if a in active_pubs and b_known:
                claimed_a = active_pubs[a]['claimedAlchemical']
                if MIX_TABLE[claimed_a][solution[b]] != true_result:
                    conflict_a = True

            if b in active_pubs and a_known:
                claimed_b = active_pubs[b]['claimedAlchemical']
                if MIX_TABLE[solution[a]][claimed_b] != true_result:
                    conflict_b = True

            # Removal only if unambiguous blame
            if conflict_a and not conflict_b:
                removed.append(('publication', a))
                del active_pubs[a]
            elif conflict_b and not conflict_a:
                removed.append(('publication', b))
                del active_pubs[b]
            elif conflict_a and conflict_b:
                conflicts.append(('publication', a))
                conflicts.append(('publication', b))
                # neither removed

            # Article entries: only when the relevant ingredient is definitively known
            # (so the mix result unambiguously implies the ingredient's aspect)
            # [detail TBD in implementation]

        outcomes.append({ 'removed': removed, 'conflicts': conflicts })

    return outcomes


def is_valid_min_steps_answer(steps, solution, publications, articles, clue_worlds):
    outcomes = evaluate_plan(steps, solution, publications, articles, clue_worlds)
    # Every step must remove something
    if any(len(o['removed']) == 0 for o in outcomes):
        return False
    # All publications and articles must be removed
    remaining_pubs = [p for p in publications if p is not None]
    remaining_arts = list(articles)
    # (check via final state of simulate)
    return True  # plus length check


def is_valid_conflict_only_answer(step, fixed_ing, solution, publications, articles, clue_worlds):
    outcomes = evaluate_plan([step], solution, publications, articles, clue_worlds)
    o = outcomes[0]
    return (
        len(o['removed']) == 0 and
        len(o['conflicts']) > 0 and
        any(c[1] == fixed_ing for c in o['conflicts'])
    )
```

---

## 7. Difficulty guidelines

| Difficulty | Steps | Publication count | Articles | Notes |
|---|---|---|---|---|
| Tutorial | 1 | 1–2 | 0 | Single apprentice or obvious master |
| Easy | 1–2 | 2–3 | 0–1 | No ambiguity needed |
| Medium | 2–3 | 3–4 | 1–2 | One ambiguous master step may appear |
| Hard | 3–4 | 4–5 | 2–3 | Ordering matters; ambiguity is a tool |

The debunk plan length is the primary difficulty driver; the number of targets and whether
ordering is forced (vs. any order works) are secondary.

A puzzle where Q1 (min steps) answer uses a double-removal master debunk, while the naive
approach takes one extra step, is ideal for medium/hard difficulty.

---

## 8. Deferred

- **Seals / hedging**: 1-seal, 2-seal publications; apprentice seals (reputation protection);
  own-publication removal strategy. Rich design space, reserved for after initial content.
- **Conflict-only Q3 for expanded articles**: a master mix that conflicts with an article
  entry but doesn't remove it (because the aspect implication is ambiguous). Deferred until
  the article disproof unambiguity rules are fully specified for partial knowledge states.
- **`debunk_max_removals` Q2**: meaningful once puzzles have correct publications mixed in
  with wrong ones, making "don't accidentally remove the right ones" a constraint.
- **Multi-step conflict chains**: using a conflict-only step to establish knowledge that
  enables a later unambiguous removal. Currently impossible with 0-seal rules (a conflicted
  publication stays on the board, so removing it later requires a separate unambiguous
  step — but the conflict status is irrelevant to that step). If seals are introduced,
  this becomes relevant.
- **Generator implementation**: Python generator for debunk puzzles. Will share the
  same `alchemydoku.py` toolchain structure.
