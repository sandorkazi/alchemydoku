#!/usr/bin/env python3
"""
alchemydoku.py  —  Puzzle toolchain for Alchemydoku.

Subcommands:
  generate     Generate new expanded puzzles from a profile
  analyze      Score difficulty of base-game puzzles and write back
  validate     Validate existing expanded puzzles
  regen-hints  Regenerate hints for puzzle files
  check-hints  Detect wrong/stale hints in puzzle files

Usage:
  python scripts/alchemydoku.py generate --profile easy_enc --count 3
  python scripts/alchemydoku.py generate --profile tutorial_golem --seed 42 --verbose
  python scripts/alchemydoku.py generate --profiles
  python scripts/alchemydoku.py analyze
  python scripts/alchemydoku.py validate
  python scripts/alchemydoku.py regen-hints --all --missing-only
  python scripts/alchemydoku.py regen-hints src/data/puzzles/medium-pp-01.json
  python scripts/alchemydoku.py check-hints --all

Available generate profiles:
  tutorial_golem, easy_enc, easy_sl, easy_golem,
  medium_enc_sl, medium_golem_enc, medium_golem_sl,
  hard_all, hard_golem_mix,
  combo_b_easy, combo_b_med_asp, combo_b_med_np, combo_b_hard_pp, combo_b_hard_ip,
  combo_exp_easy, combo_exp_med_sl, combo_exp_med_all, combo_exp_hard_wha, combo_exp_hard_sl,
  mixed_base_debunk, mixed_exp_debunk
"""

import json, math, random, itertools, argparse, sys
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional
from collections import Counter

# ══════════════════════════════════════════════════════════════════════════════
# CANONICAL DATA  (shared by all subcommands)
# ══════════════════════════════════════════════════════════════════════════════

ALCH_DATA = {
    1: {'R': (-1, 0), 'G': (+1, 0), 'B': (-1, 1)},   # npN
    2: {'R': (+1, 0), 'G': (-1, 0), 'B': (+1, 1)},   # pnP
    3: {'R': (+1, 0), 'G': (-1, 1), 'B': (-1, 0)},   # pNn
    4: {'R': (-1, 0), 'G': (+1, 1), 'B': (+1, 0)},   # nPp
    5: {'R': (-1, 1), 'G': (-1, 0), 'B': (+1, 0)},   # Nnp
    6: {'R': (+1, 1), 'G': (+1, 0), 'B': (-1, 0)},   # Ppn
    7: {'R': (-1, 1), 'G': (-1, 1), 'B': (-1, 1)},   # NNN
    8: {'R': (+1, 1), 'G': (+1, 1), 'B': (+1, 1)},   # PPP
}
ALCH_CODES = {1: 'npN', 2: 'pnP', 3: 'pNn', 4: 'nPp',
              5: 'Nnp', 6: 'Ppn', 7: 'NNN', 8: 'PPP'}
ALL_ALCH = list(range(1, 9))
COLORS   = ['R', 'G', 'B']
SLOTS    = list(range(1, 9))

def is_solar(a: int) -> bool:
    # 0 or 2 negative aspects = solar; 1 or 3 = lunar
    return sum(1 for col in COLORS if ALCH_DATA[a][col][0] < 0) % 2 == 0
def sgn_str(s: int) -> str:   return '+' if s == 1 else '-'
def sgn_int(s: str) -> int:   return +1 if s == '+' else -1
def sz_int(s: str) -> int:    return 1 if s == 'L' else 0

def mix(a1: int, a2: int):
    if all(ALCH_DATA[a1][c][0] != ALCH_DATA[a2][c][0] for c in COLORS):
        return 'neutral'
    for c in COLORS:
        s1, z1 = ALCH_DATA[a1][c]
        s2, z2 = ALCH_DATA[a2][c]
        if s1 == s2 and z1 != z2:
            return (c, s1)
    return 'neutral'

MIX_TABLE = {a1: {a2: mix(a1, a2) for a2 in ALL_ALCH} for a1 in ALL_ALCH}

def fmt_r(r) -> str:
    return 'neutral' if r == 'neutral' else f"{r[0]}{sgn_str(r[1])}"

def r2d(r) -> dict:
    return {'type': 'neutral'} if r == 'neutral' else {'color': r[0], 'sign': sgn_str(r[1])}

def d2r(d):
    if isinstance(d, dict):
        return 'neutral' if d.get('type') == 'neutral' else (d['color'], sgn_int(d['sign']))
    return d

# ══════════════════════════════════════════════════════════════════════════════
# GOLEM HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def greacts(alch: int, params: dict, part: str) -> bool:
    return ALCH_DATA[alch][params[part]['color']][1] == sz_int(params[part]['size'])

def rgroup(alch: int, params: dict) -> str:
    c = greacts(alch, params, 'chest')
    e = greacts(alch, params, 'ears')
    if c and e:  return 'animators'
    if c:        return 'chest_only'
    if e:        return 'ears_only'
    return 'non_reactive'

def compute_groups(sol: dict, params: dict) -> dict:
    return {s: rgroup(sol[s], params) for s in SLOTS}

def groups_valid(groups: dict) -> bool:
    c = Counter(groups.values())
    return (c['animators'] == 2 and c['chest_only'] == 2
            and c['ears_only'] == 2 and c['non_reactive'] == 2)

def sample_valid_golem(sol: dict, rng: random.Random) -> dict:
    for _ in range(2000):
        cc = rng.choice(COLORS)
        ec = rng.choice([x for x in COLORS if x != cc])
        p = {'chest': {'color': cc, 'size': rng.choice(['L', 'S'])},
             'ears':  {'color': ec, 'size': rng.choice(['L', 'S'])}}
        if groups_valid(compute_groups(sol, p)):
            return p
    raise RuntimeError("Could not find valid golem params after 2000 attempts")

# ══════════════════════════════════════════════════════════════════════════════
# WORLDS & CLUE FILTERS  (handles all clue kinds: base + expanded)
# ══════════════════════════════════════════════════════════════════════════════

def all_worlds() -> frozenset:
    return frozenset(itertools.permutations(ALL_ALCH))

def filter_clue(worlds: frozenset, clue: dict, golem: Optional[dict] = None) -> frozenset:
    k = clue['kind']

    if k == 'mixing':
        i1, i2 = clue['ingredient1'] - 1, clue['ingredient2'] - 1
        exp = d2r(clue['result'])
        return frozenset(w for w in worlds if MIX_TABLE[w[i1]][w[i2]] == exp)

    if k == 'aspect':
        si = clue['ingredient'] - 1
        sgn = sgn_int(clue['sign'])
        return frozenset(w for w in worlds if ALCH_DATA[w[si]][clue['color']][0] == sgn)

    if k == 'assignment':
        si = clue['ingredient'] - 1
        return frozenset(w for w in worlds if w[si] == clue['alchemical'])

    if k == 'sell':
        i1, i2 = clue['ingredient1'] - 1, clue['ingredient2'] - 1
        cr = clue['claimedResult']
        col, sgn = cr['color'], sgn_int(cr['sign'])
        sr = clue['sellResult']
        res = set()
        for w in worlds:
            actual = MIX_TABLE[w[i1]][w[i2]]
            if   sr == 'total_match' and actual == (col, sgn):                                  res.add(w)
            elif sr == 'neutral'     and actual == 'neutral':                                   res.add(w)
            elif sr == 'sign_ok'     and actual != 'neutral' and actual != (col, sgn) and actual[1] == sgn: res.add(w)
            elif sr == 'opposite'    and actual != 'neutral' and actual[1] != sgn:              res.add(w)
        return frozenset(res)

    if k == 'debunk':
        # Legacy 'debunk' format from base-game puzzles
        if clue.get('variant') == 'apprentice':
            si = clue['ingredient'] - 1
            sgn = sgn_int(clue['sign'])
            return frozenset(w for w in worlds if ALCH_DATA[w[si]][clue['color']][0] == sgn)
        i1, i2 = clue['ingredient1'] - 1, clue['ingredient2'] - 1
        cp = clue['claimedPotion']
        claimed = 'neutral' if cp.get('type') == 'neutral' else (cp['color'], sgn_int(cp['sign']))
        if clue['outcome'] == 'success':
            return frozenset(w for w in worlds if MIX_TABLE[w[i1]][w[i2]] == claimed)
        return frozenset(w for w in worlds if MIX_TABLE[w[i1]][w[i2]] != claimed)

    if k == 'debunk_apprentice':
        si = clue['ingredient'] - 1
        sgn = sgn_int(clue['sign'])
        return frozenset(w for w in worlds if ALCH_DATA[w[si]][clue['color']][0] == sgn)

    if k == 'debunk_master':
        i1, i2 = clue['ingredient1'] - 1, clue['ingredient2'] - 1
        claimed = d2r(clue['claimedPotion'])
        if clue['outcome'] == 'success':
            return frozenset(w for w in worlds if MIX_TABLE[w[i1]][w[i2]] == claimed)
        return frozenset(w for w in worlds if MIX_TABLE[w[i1]][w[i2]] != claimed)

    if k == 'book':
        si = clue['ingredient'] - 1
        return frozenset(w for w in worlds if is_solar(w[si]) == (clue['result'] == 'solar'))

    if k == 'book_among':
        slots = [i - 1 for i in clue['ingredients']]
        want_solar = clue['result'] == 'solar'
        count = clue['count']
        return frozenset(
            w for w in worlds
            if sum(is_solar(w[s]) == want_solar for s in slots) == count
        )

    if k == 'encyclopedia':
        col = clue['aspect']
        entries = clue['entries']
        return frozenset(w for w in worlds
                         if all(ALCH_DATA[w[e['ingredient'] - 1]][col][0] == sgn_int(e['sign'])
                                for e in entries))

    if k == 'encyclopedia_uncertain':
        col = clue['aspect']
        entries = clue['entries']
        return frozenset(w for w in worlds
                         if sum(ALCH_DATA[w[e['ingredient'] - 1]][col][0] == sgn_int(e['sign'])
                                for e in entries) >= 3)

    if k == 'golem_test':
        if golem is None:
            return worlds
        si = clue['ingredient'] - 1
        return frozenset(w for w in worlds
                         if greacts(w[si], golem, 'chest') == clue['chest_reacted']
                         and greacts(w[si], golem, 'ears') == clue['ears_reacted'])

    if k == 'sell_among':
        slots = [i - 1 for i in clue['ingredients']]
        cp_col  = clue['claimedPotion']['color']
        cp_sgn  = sgn_int(clue['claimedPotion']['sign'])
        tgt     = clue['result']
        count   = clue['count']

        def _sr(mix_result, _cp_col=cp_col, _cp_sgn=cp_sgn, _tgt=tgt):
            if mix_result == 'neutral':                                      return 'neutral'
            act_col, act_sgn = mix_result
            if act_col == _cp_col and act_sgn == _cp_sgn:                   return 'total_match'
            if act_sgn == _cp_sgn:                                          return 'sign_ok'
            return 'opposite'

        return frozenset(w for w in worlds
                         if sum(_sr(MIX_TABLE[w[a]][w[b]]) == tgt
                                for a, b in itertools.combinations(slots, 2)) == count)

    if k == 'mixing_among':
        slots = [i - 1 for i in clue['ingredients']]
        exp = d2r(clue['result'])
        return frozenset(w for w in worlds
                         if any(MIX_TABLE[w[a]][w[b]] == exp
                                for a, b in itertools.combinations(slots, 2)))

    if k == 'mixing_count_among':
        slots = [i - 1 for i in clue['ingredients']]
        exp = d2r(clue['result'])
        count = clue['count']
        return frozenset(w for w in worlds
                         if sum(MIX_TABLE[w[a]][w[b]] == exp
                                for a, b in itertools.combinations(slots, 2)) == count)

    if k == 'sell_result_among':
        slots = [i - 1 for i in clue['ingredients']]
        cp = clue['claimedPotion']
        col, sgn = cp['color'], sgn_int(cp['sign'])
        sr = clue['sellResult']
        def sell_matches_among(actual, _col=col, _sgn=sgn, _sr=sr):
            if _sr == 'total_match': return actual == (_col, _sgn)
            if _sr == 'neutral':     return actual == 'neutral'
            if _sr == 'sign_ok':     return actual != 'neutral' and actual != (_col, _sgn) and actual[1] == _sgn
            if _sr == 'opposite':    return actual != 'neutral' and actual[1] != _sgn
            return False
        return frozenset(w for w in worlds
                         if any(sell_matches_among(MIX_TABLE[w[a]][w[b]])
                                for a, b in itertools.combinations(slots, 2)))

    if k == 'golem_reaction_among':
        if golem is None:
            return worlds
        slots = [i - 1 for i in clue['ingredients']]
        reaction = clue['reaction']
        count = clue['count']
        def matches_reaction(alch, _reaction=reaction, _golem=golem):
            g = rgroup(alch, _golem)
            return g != 'non_reactive' if _reaction == 'any_reactive' else g == _reaction
        return frozenset(w for w in worlds
                         if sum(matches_reaction(w[s]) for s in slots) == count)

    # Display-only: golem_hint_color, golem_hint_size — no world filtering
    return worlds

def apply_all(worlds: frozenset, clues: list, golem: Optional[dict] = None) -> frozenset:
    for c in clues:
        worlds = filter_clue(worlds, c, golem)
    return worlds

# ══════════════════════════════════════════════════════════════════════════════
# QUESTION ANSWERING  (base + expanded question kinds)
# ══════════════════════════════════════════════════════════════════════════════

def _entropy_table(worlds, si_0based: int) -> list:
    """Return [(entropy, s2_1based, dist_str), ...] sorted by entropy descending."""
    n = len(worlds)
    result = []
    for s2 in range(8):
        if s2 == si_0based:
            continue
        counts = Counter(MIX_TABLE[w[si_0based]][w[s2]] for w in worlds)
        entropy = -sum((c / n) * math.log2(c / n) for c in counts.values() if c > 0)
        dist = ', '.join(f"{fmt_r(r)}:{c}" for r, c in sorted(counts.items(), key=str))
        result.append((entropy, s2 + 1, dist))
    result.sort(reverse=True)
    return result


def answer(worlds: frozenset, q: dict, golem: Optional[dict] = None):
    """Return unique answer or None if not determined."""
    k = q['kind']

    if k == 'alchemical':
        v = {w[q['ingredient'] - 1] for w in worlds}
        return v.pop() if len(v) == 1 else None

    if k == 'solar_lunar':
        v = {is_solar(w[q['ingredient'] - 1]) for w in worlds}
        return ('solar' if v.pop() else 'lunar') if len(v) == 1 else None

    if k == 'aspect':
        v = {ALCH_DATA[w[q['ingredient'] - 1]][q['color']][0] for w in worlds}
        return v.pop() if len(v) == 1 else None

    if k == 'mixing-result':
        i1, i2 = q['ingredient1'] - 1, q['ingredient2'] - 1
        v = {MIX_TABLE[w[i1]][w[i2]] for w in worlds}
        return v.pop() if len(v) == 1 else None

    if k == 'safe-publish':
        si = q['ingredient'] - 1
        uncertain = [col for col in COLORS
                     if len({ALCH_DATA[w[si]][col][0] for w in worlds}) > 1]
        return uncertain[0] if len(uncertain) == 1 else None

    if k == 'possible-potions':
        i1, i2 = q['ingredient1'] - 1, q['ingredient2'] - 1
        pots = frozenset(MIX_TABLE[w[i1]][w[i2]] for w in worlds)
        # Return None when all 7 results are still possible — not a useful deduction
        return pots if len(pots) < 7 else None

    if k == 'aspect-set':
        col    = q['color']
        target = sgn_int(q['sign'])
        confirmed = [si + 1 for si in range(8)
                     if {ALCH_DATA[w[si]][col][0] for w in worlds} == {target}]
        return frozenset(confirmed) if len(confirmed) == 4 else None

    if k == 'large-component':
        col = q['color']
        confirmed = [si + 1 for si in range(8)
                     if {ALCH_DATA[w[si]][col][1] for w in worlds} == {1}]
        return frozenset(confirmed) if len(confirmed) == 4 else None

    if k == 'encyclopedia_fourth':
        col   = q['aspect']
        known = {e['ingredient'] for e in q['known']}
        ms    = sgn_int(q['missing_sign'])
        cands = [s for s in SLOTS if s not in known]
        matches = [s for s in cands
                   if {ALCH_DATA[w[s - 1]][col][0] for w in worlds} == {ms}]
        return matches[0] if len(matches) == 1 else None

    if k == 'encyclopedia_which_aspect':
        entries = q['entries']
        matches = [col for col in COLORS
                   if all({ALCH_DATA[w[e['ingredient'] - 1]][col][0] for w in worlds}
                          == {sgn_int(e['sign'])} for e in entries)]
        return matches[0] if len(matches) == 1 else None

    if k == 'golem_group':
        if golem is None:
            return None
        grp = q['group']
        slots = [s for s in SLOTS
                 if all(rgroup(w[s - 1], golem) == grp for w in worlds)]
        expected = 6 if grp == 'any_reactive' else 2
        return sorted(slots) if len(slots) == expected else None

    if k == 'golem_animate_potion':
        if golem is None:
            return None
        # The question only asks what potion the animators produce — not which
        # ingredients they are.  Require every world to have exactly 2 animators
        # and all those pairs to produce the same potion.
        potions = set()
        for w in worlds:
            anims = sorted(s for s in SLOTS if rgroup(w[s - 1], golem) == 'animators')
            if len(anims) != 2:
                return None
            potions.add(MIX_TABLE[w[anims[0] - 1]][w[anims[1] - 1]])
        return potions.pop() if len(potions) == 1 else None

    if k == 'golem_possible_potions':
        if golem is None:
            return None
        grp     = q['group']
        partner = q.get('partner')
        potions = set()
        for w in worlds:
            gslots = [s - 1 for s in SLOTS if rgroup(w[s - 1], golem) == grp]
            if partner is not None:
                pi = partner - 1
                for gi in gslots:
                    if gi != pi:
                        potions.add(MIX_TABLE[w[gi]][w[pi]])
            else:
                for gi, gj in itertools.combinations(gslots, 2):
                    potions.add(MIX_TABLE[w[gi]][w[gj]])
        return sorted(fmt_r(p) for p in potions) if len(potions) < 7 else None

    # Debunk plan questions require plan-search validation — not auto-checkable here
    if k in ('debunk_min_steps', 'debunk_conflict_only', 'debunk_apprentice_plan'):
        return 'not_validated'

    if k == 'neutral-partner':
        si = q['ingredient'] - 1
        candidates = []
        for s2 in range(8):
            if s2 == si:
                continue
            if all(MIX_TABLE[w[si]][w[s2]] == 'neutral' for w in worlds):
                candidates.append(s2 + 1)
        return candidates[0] if len(candidates) == 1 else None

    if k == 'ingredient-potion-profile':
        si = q['ingredient'] - 1
        # Neutral is always certain — every alchemical has a direct opposite.
        certain_potions = {'neutral'}
        for s2 in range(8):
            if s2 == si:
                continue
            results = {MIX_TABLE[w[si]][w[s2]] for w in worlds}
            if len(results) == 1:
                certain_potions.add(results.pop())
        # Return None if only neutral (trivially known, no useful puzzle info).
        return sorted(fmt_r(p) for p in certain_potions) if len(certain_potions) > 1 else None

    if k == 'group-possible-potions':
        slots = [i - 1 for i in q['ingredients']]
        certain_potions = set()
        for a, b in itertools.combinations(slots, 2):
            results = {MIX_TABLE[w[a]][w[b]] for w in worlds}
            if len(results) == 1:
                certain_potions.add(results.pop())
        return sorted(fmt_r(p) for p in certain_potions) if certain_potions else None

    if k == 'most-informative-mix':
        si = q['ingredient'] - 1
        entropies = _entropy_table(worlds, si)
        if not entropies:
            return None
        # Require a unique best partner (no ties)
        if len(entropies) > 1 and abs(entropies[1][0] - entropies[0][0]) < 1e-9:
            return None
        return entropies[0][1]  # already 1-based

    if k == 'most_informative_book':
        n = len(worlds)
        if n == 0:
            return None
        best_s, best_h, tie = None, -1.0, False
        for s in range(8):
            n_solar = sum(1 for w in worlds if is_solar(w[s]))
            p = n_solar / n
            h = (-p * math.log2(p) - (1 - p) * math.log2(1 - p)) if 0 < p < 1 else 0.0
            if h > best_h + 1e-9:
                best_h, best_s, tie = h, s + 1, False  # 1-based slot
            elif abs(h - best_h) < 1e-9 and (s + 1) != best_s:
                tie = True
        return best_s if (not tie and best_s is not None and best_h > 1e-9) else None

    if k == 'guaranteed-non-producer':
        target_r = d2r(q['potion'])
        non_producers = []
        for si in range(8):
            can_produce = any(
                MIX_TABLE[w[si]][w[sj]] == target_r
                for w in worlds for sj in range(8) if sj != si
            )
            if not can_produce:
                non_producers.append(si + 1)
        # Require at least one non-producer for a non-trivial puzzle
        return sorted(non_producers) if non_producers else None

    return None

def all_answered(worlds: frozenset, questions: list, golem: Optional[dict] = None) -> bool:
    return all(
        (ans := answer(worlds, q, golem)) is not None and ans != 'not_validated'
        for q in questions
    )

# ══════════════════════════════════════════════════════════════════════════════
# DEBUNK PLANNING HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _definitively_known(worlds: frozenset, sol: dict) -> set:
    """Return set of ingredient slots (1-based) whose alchemical is uniquely determined."""
    return {s for s in SLOTS if all(w[s - 1] == sol[s] for w in worlds)}


def _find_removal_plan(sol: dict, pub_map: dict, known: set) -> list:
    """BFS to find minimum master steps to remove all false publications.

    Mirrors TypeScript simulateStep semantics exactly:
    1. Result-incompatibility (§2b): if claimed alch cannot produce the observed
       result with *any* partner, that publication is removed immediately —
       independently for each ingredient in the mix.  Both can be removed at once.
    2. Blame-based (§2a): after result-incompatibility removals, if the remaining
       published ingredient predicted the wrong result given its partner's *true*
       alchemical (and that partner is definitively known), it gets blamed.
       Unambiguous blame → removal; mutual blame → conflict, neither removed.
    """
    from collections import deque

    def step_removals(ing_a: int, ing_b: int, state: frozenset) -> tuple:
        """(new_state, removed_set) for one master mix; removed may be empty."""
        true_r = MIX_TABLE[sol[ing_a]][sol[ing_b]]
        remaining = set(state)
        removed: set = set()

        # Phase 1 – result-incompatibility (both checked independently)
        for ing, partner_sol in ((ing_a, sol[ing_b]), (ing_b, sol[ing_a])):
            if ing in remaining and not _can_produce_result(pub_map[ing], true_r):
                removed.add(ing)
                remaining.discard(ing)
        del partner_sol  # silence linter

        # Phase 2 – blame-based (only for still-active pubs, only with known partner)
        conflict_a = (ing_a in remaining and ing_b in known
                      and MIX_TABLE[pub_map[ing_a]][sol[ing_b]] != true_r)
        conflict_b = (ing_b in remaining and ing_a in known
                      and MIX_TABLE[sol[ing_a]][pub_map[ing_b]] != true_r)
        if conflict_a and not conflict_b:
            removed.add(ing_a)
        elif conflict_b and not conflict_a:
            removed.add(ing_b)
        # both conflict → neither removed (conflict state, no blame)

        return frozenset(remaining - removed), removed

    initial = frozenset(pub_map.keys())
    if not initial:
        return []
    queue = deque([(initial, [])])
    visited = {initial}
    while queue:
        state, steps = queue.popleft()
        for ing_a, ing_b in itertools.combinations(SLOTS, 2):
            new_state, removed = step_removals(ing_a, ing_b, state)
            if not removed:
                continue
            new_step = {'kind': 'master', 'ingredient1': ing_a, 'ingredient2': ing_b}
            new_steps = steps + [new_step]
            if not new_state:
                return new_steps
            if new_state not in visited:
                visited.add(new_state)
                queue.append((new_state, new_steps))
    return None


def _can_produce_result(claimed_alch: int, true_r) -> bool:
    """True if claimed_alch (1-indexed) can produce true_r with any partner.
    When False, the claim is result-incompatible — directly disproved by the result alone."""
    return any(MIX_TABLE[claimed_alch][j] == true_r for j in ALL_ALCH)


def _find_conflict_cover(sol: dict, pub_map: dict, _known: set):
    """Find a minimal set of pairs that together cover all publications with conflicts.

    True conflict requires (DEBUNK_PUZZLES.md §4c):
    1. Both ingredients published.
    2. Neither claim is result-incompatible: each can produce the actual result with
       some partner (∃j: MIX_TABLE[c_i][j] == true_r AND ∃j: MIX_TABLE[c_j][j] == true_r).
    3. Together they predict the wrong result: MIX_TABLE[c_i][c_j] != true_r.

    Returns ordered list of (ing_c, ing_d) pairs (fixedIngredient = cover[0][0]), or None."""
    pub_keys = sorted(pub_map.keys())
    valid_pairs = []
    for i, ing_c in enumerate(pub_keys):
        for ing_d in pub_keys[i + 1:]:
            true_r = MIX_TABLE[sol[ing_c]][sol[ing_d]]
            c_i = pub_map[ing_c]  # claimed alchemical (1-indexed)
            c_j = pub_map[ing_d]
            if (
                _can_produce_result(c_i, true_r)       # c_i individually compatible
                and _can_produce_result(c_j, true_r)   # c_j individually compatible
                and MIX_TABLE[c_i][c_j] != true_r      # together they're wrong
            ):
                valid_pairs.append((ing_c, ing_d))
    if not valid_pairs:
        return None
    uncovered = set(pub_keys)
    selected = []
    available = list(valid_pairs)
    while uncovered:
        best = max(available, key=lambda p: len(uncovered & {p[0], p[1]}), default=None)
        if best is None or not (uncovered & {best[0], best[1]}):
            return None
        selected.append(best)
        uncovered -= {best[0], best[1]}
        available.remove(best)
    return selected


def _make_publications(sol: dict, known: set, n: int, rng: random.Random) -> dict:
    """Pick n slots from known, assign each a wrong alchemical. Returns {slot: wrong_alch_id}."""
    targets = rng.sample(sorted(known), min(n, len(known)))
    return {s: rng.choice([a for a in ALL_ALCH if a != sol[s]]) for s in targets}


def _make_articles(sol: dict, known: set, n_colors: int, rng: random.Random,
                   max_per_ingredient: int = 2) -> list:
    """Generate up to n_colors wrong articles (one per color), each with 4 entries (2+/2-).
    At least 1 entry per article is wrong. No ingredient appears in more than
    max_per_ingredient articles across all returned articles."""
    articles = []
    ing_count = Counter()
    colors_shuffled = list(COLORS)
    rng.shuffle(colors_shuffled)
    art_counter = [0]
    for col in colors_shuffled[:n_colors]:
        art_counter[0] += 1
        art_id = f"art-{col}-{art_counter[0]}"
        available = [s for s in SLOTS if ing_count[s] < max_per_ingredient]
        if len(available) < 4:
            break
        known_avail = [s for s in available if s in known]
        if not known_avail:
            break
        unknown_avail = [s for s in available if s not in known]
        # Need 4 total: at least 1 known
        for _ in range(50):
            n_known_pick = min(rng.randint(1, min(3, len(known_avail))), len(known_avail))
            n_unknown_pick = 4 - n_known_pick
            if n_unknown_pick > len(unknown_avail):
                n_known_pick = 4 - min(len(unknown_avail), 3)
                n_unknown_pick = 4 - n_known_pick
            if n_known_pick < 1 or n_known_pick > len(known_avail):
                continue
            if n_unknown_pick < 0 or n_unknown_pick > len(unknown_avail):
                continue
            chosen = sorted(
                rng.sample(known_avail, n_known_pick)
                + (rng.sample(unknown_avail, n_unknown_pick) if n_unknown_pick > 0 else [])
            )
            if len(chosen) < 4:
                continue
            # Try sign assignments: must be 2+/2- and at least 1 wrong
            slots_copy = list(chosen)
            for _ in range(20):
                rng.shuffle(slots_copy)
                assigned = {s: '+' for s in slots_copy[:2]}
                assigned.update({s: '-' for s in slots_copy[2:]})
                has_wrong = any(
                    (assigned[s] == '+') != (ALCH_DATA[sol[s]][col][0] == 1)
                    for s in chosen
                )
                if not has_wrong:
                    continue
                # Also require at least 1 known ingredient with a wrong entry (for debunkability)
                has_debunkable = any(
                    s in known and (assigned[s] == '+') != (ALCH_DATA[sol[s]][col][0] == 1)
                    for s in chosen
                )
                if not has_debunkable:
                    continue
                entries = [{'ingredient': s, 'sign': assigned[s]} for s in chosen]
                for s in chosen:
                    ing_count[s] += 1
                articles.append({'id': art_id, 'aspect': col, 'entries': entries})
                break
            break
    return articles


def _find_removal_plan_expanded(sol: dict, pub_map: dict, articles: list, known: set) -> list:
    """BFS to find minimum master steps to remove all publications AND articles.
    Returns list of step dicts or None."""
    from collections import deque
    # Precompute: for each known ingredient, which articles have a wrong entry for it?
    art_cleared_by_ing: dict = {}
    for art in articles:
        col = art['aspect']
        for entry in art['entries']:
            ing = entry['ingredient']
            if ing not in known:
                continue
            true_sgn_str = '+' if ALCH_DATA[sol[ing]][col][0] == 1 else '-'
            if entry['sign'] != true_sgn_str:
                art_cleared_by_ing.setdefault(ing, set()).add(art['id'])

    initial_pubs = frozenset(pub_map.keys())
    initial_arts = frozenset(a['id'] for a in articles)
    if not initial_pubs and not initial_arts:
        return []

    def step_effect(ing_a, ing_b, pubs):
        true_r = MIX_TABLE[sol[ing_a]][sol[ing_b]]
        a_known = ing_a in known
        b_known = ing_b in known
        remaining = set(pubs)
        removed_pubs: set = set()

        # Phase 1 – result-incompatibility (both checked independently)
        if ing_a in remaining and not _can_produce_result(pub_map[ing_a], true_r):
            removed_pubs.add(ing_a)
            remaining.discard(ing_a)
        if ing_b in remaining and not _can_produce_result(pub_map[ing_b], true_r):
            removed_pubs.add(ing_b)
            remaining.discard(ing_b)

        # Phase 2 – blame-based (only for still-active pubs, only with known partner)
        conflict_a = (ing_a in remaining and b_known
                      and MIX_TABLE[pub_map[ing_a]][sol[ing_b]] != true_r)
        conflict_b = (ing_b in remaining and a_known
                      and MIX_TABLE[sol[ing_a]][pub_map[ing_b]] != true_r)
        if conflict_a and not conflict_b:
            removed_pubs.add(ing_a)
        elif conflict_b and not conflict_a:
            removed_pubs.add(ing_b)

        # Only publications drive the BFS state and validity; articles are a bonus.
        return pubs - removed_pubs, bool(removed_pubs)

    # BFS over publication state only; articles clear as a side-effect during play.
    queue = deque([(initial_pubs, [])])
    visited = {initial_pubs}
    while queue:
        pubs, steps = queue.popleft()
        for ing_a, ing_b in itertools.combinations(SLOTS, 2):
            new_pubs, valid = step_effect(ing_a, ing_b, pubs)
            if not valid:
                continue
            new_step = {'kind': 'master', 'ingredient1': ing_a, 'ingredient2': ing_b}
            new_steps = steps + [new_step]
            if not new_pubs:
                return new_steps
            if new_pubs not in visited:
                visited.add(new_pubs)
                queue.append((new_pubs, new_steps))
    return None


DEBUNK_QUESTION_KINDS = {'debunk_min_steps', 'debunk_conflict_only', 'debunk_apprentice_plan'}


def _plan_debunk(profile, sol: dict, worlds: frozenset, rng: random.Random):
    """Plan publications, articles and debunk answers for a debunk profile.
    Returns a dict with publications/articles/questions/debunk_answers, or None on failure."""
    known = _definitively_known(worlds, sol)
    is_expanded = not is_base_profile(profile)
    if len(known) < 4:
        return None
    for n_pubs in [4, 3]:
        if n_pubs > len(known):
            continue
        for _ in range(30):
            pub_map = _make_publications(sol, known, n_pubs, rng)
            if is_expanded:
                articles = _make_articles(sol, known, 3, rng)
                plan = _find_removal_plan_expanded(sol, pub_map, articles, known)
            else:
                articles = []
                plan = _find_removal_plan(sol, pub_map, known)
            if plan is None:
                continue
            conflict_cover = _find_conflict_cover(sol, pub_map, known)
            questions = [{'kind': 'debunk_min_steps'}]
            if conflict_cover:
                ing_c = conflict_cover[0][0]
                questions.append({'kind': 'debunk_conflict_only', 'fixedIngredient': ing_c})
            pubs_array = [None] * 8
            for s, wrong_alch in pub_map.items():
                pubs_array[s - 1] = {'ingredient': s, 'claimedAlchemical': wrong_alch}
            debunk_answers = {'debunk_min_steps': plan}
            if conflict_cover:
                debunk_answers['debunk_conflict_only'] = [
                    {'kind': 'master', 'ingredient1': a, 'ingredient2': b}
                    for a, b in conflict_cover
                ]
            return {
                'publications': pubs_array,
                'articles': articles,
                'questions': questions,
                'debunk_answers': debunk_answers,
            }
    return None


# ══════════════════════════════════════════════════════════════════════════════
# DIFFICULTY SCORING  (used by both 'analyze' and 'generate')
# ══════════════════════════════════════════════════════════════════════════════
#
# Three-axis scoring.  Final score = 10 + clue_score + question_score + world_score.
# Range: [10, 100].  Each component is clamped to its declared max before summing.
#
# Clue complexity   [0–50]: structural difficulty of reading / applying each clue
# Question complexity [0–20]: difficulty of answering the specific question type
# World complexity   [0–20]: how constrained the answer ingredients are in the world set

# Question kinds that require enumerating a set of answers (multiple-choice)
_ENUM_Q_KINDS = frozenset({
    'possible-potions', 'aspect-set', 'group-possible-potions',
    'ingredient-potion-profile', 'guaranteed-non-producer',
    'golem_possible_potions', 'encyclopedia_which_aspect', 'encyclopedia_fourth',
})


def compute_difficulty(puzzle: dict) -> dict:
    """Unified difficulty scorer for base-game and expanded puzzles.

    Returns a dict with:
        score         — integer [10, 100], stored as complexity.score in JSON
        clue_score    — component 1 [0, 50]
        question_score — component 2 [0, 20]
        world_score   — component 3 [0, 20]
        residual_worlds — remaining world count after all clues
    """
    clues     = puzzle.get('clues', [])
    questions = puzzle.get('questions', [])
    golem     = puzzle.get('golem')

    # ── Axis 1: Clue complexity (0–50) ────────────────────────────────────────
    # +0  : mixing, assignment, aspect, debunk*, book, encyclopedia, golem_test — clear direct clues
    # +2  : sell with sign_ok or opposite result — partial / indirect information
    # +5  : ambiguous group clue (X of Y ingredients produces result)
    # +10 : combinatoric group clue (exactly X of Y pairs produces result)
    clue_score = 0
    for c in clues:
        kind = c['kind']
        if kind == 'sell':
            if c.get('sellResult') in ('sign_ok', 'opposite'):
                clue_score += 2
        elif kind == 'encyclopedia_uncertain':
            clue_score += 5   # "at least 3 of 4 correct" — requires enumeration
        elif kind in ('mixing_among', 'sell_result_among',
                      'book_among', 'golem_reaction_among'):
            clue_score += 5   # existential: X of Y group produces result
        elif kind in ('mixing_count_among', 'sell_among'):
            clue_score += 10  # combinatoric: exactly X of Y pairs
    clue_score = max(0, min(50, clue_score))

    # ── Axis 2: Question complexity (0–20) ────────────────────────────────────
    # -5  : aspect question (binary sign — easiest)
    # -2  : large-component question (size, still limited)
    # +5  : enumeration / multiple-choice question
    # +10 : any debunk question (plan reasoning required)
    # +5  : conflict-only debunk (additional constraint, in addition to debunk +10)
    q_score      = 0
    has_debunk   = False
    has_conflict = False
    for q in questions:
        kind = q['kind']
        if kind == 'aspect':
            q_score -= 5
        elif kind == 'large-component':
            q_score -= 2
        elif kind in _ENUM_Q_KINDS:
            q_score += 5
        elif kind == 'debunk_conflict_only':
            has_debunk   = True
            has_conflict = True
        elif kind in ('debunk_min_steps', 'debunk_apprentice_plan'):
            has_debunk = True
    if has_debunk:
        q_score += 10
    if has_conflict:
        q_score += 5
    q_score = max(0, min(20, q_score))

    # ── Axis 3: World complexity (0–20) ───────────────────────────────────────
    # Per question:
    #   +5 if no clue directly shows the mixing result for the asked pair
    #   +5 for each ingredient in question not directly constrained by any clue
    #   +5 for each ingredient in question still having multiple possible alchemicals
    # Debunk questions (full-board reasoning): +15 flat
    worlds = all_worlds()
    for c in clues:
        worlds = filter_clue(worlds, c, golem)

    # Build "shown" sets — clues that directly identify an ingredient's alchemical /
    # aspect, or establish a known mixing result for a specific pair.
    shown_ingredients: set = set()
    shown_pairs: set = set()
    for c in clues:
        kind = c['kind']
        if kind in ('assignment', 'aspect'):
            shown_ingredients.add(c['ingredient'])
        elif kind == 'book':
            shown_ingredients.add(c['ingredient'])
        elif kind == 'debunk':
            if c.get('variant') == 'apprentice':
                shown_ingredients.add(c['ingredient'])
            elif c.get('variant') == 'master' and c.get('outcome') == 'success':
                shown_pairs.add((min(c['ingredient1'], c['ingredient2']),
                                 max(c['ingredient1'], c['ingredient2'])))
        elif kind == 'debunk_apprentice':
            shown_ingredients.add(c['ingredient'])
        elif kind == 'debunk_master':
            if c.get('successful'):
                shown_pairs.add((min(c['ingredient1'], c['ingredient2']),
                                 max(c['ingredient1'], c['ingredient2'])))
        elif kind == 'mixing':
            shown_pairs.add((min(c['ingredient1'], c['ingredient2']),
                             max(c['ingredient1'], c['ingredient2'])))
        elif kind == 'encyclopedia':
            for entry in c.get('entries', []):
                shown_ingredients.add(entry['ingredient'])

    w_score = 0
    for q in questions:
        kind = q['kind']

        # Debunk questions require full-board plan reasoning
        if kind in ('debunk_min_steps', 'debunk_apprentice_plan', 'debunk_conflict_only'):
            w_score += 15
            continue

        # Extract ingredients and mixing pair from question
        q_ingredients: list = []
        q_pair = None
        if kind in ('alchemical', 'aspect', 'safe-publish', 'solar_lunar',
                    'neutral-partner', 'ingredient-potion-profile', 'most-informative-mix'):
            ing = q.get('ingredient')
            if ing:
                q_ingredients = [ing]
        elif kind in ('mixing-result', 'possible-potions'):
            i1, i2 = q.get('ingredient1'), q.get('ingredient2')
            if i1 and i2:
                q_ingredients = [i1, i2]
                q_pair = (min(i1, i2), max(i1, i2))
        elif kind == 'group-possible-potions':
            q_ingredients = list(q.get('ingredients', []))
        elif kind == 'encyclopedia_which_aspect':
            q_ingredients = [e['ingredient'] for e in q.get('entries', [])]

        # +5 if no clue directly shows the mixing result for the asked pair
        if q_pair is not None and q_pair not in shown_pairs:
            w_score += 5
        # +5 for each ingredient not directly constrained by any clue
        for ing in q_ingredients:
            if ing not in shown_ingredients:
                w_score += 5
        # +5 for each ingredient still having multiple possible alchemicals
        for ing in q_ingredients:
            slot = ing - 1  # 0-indexed
            if len({w[slot] for w in worlds}) > 1:
                w_score += 5

    w_score = max(0, min(20, w_score))

    raw = 10 + clue_score + q_score + w_score
    return {
        'score':          _scale_score(raw),
        'raw_score':      raw,
        'clue_score':     clue_score,
        'question_score': q_score,
        'world_score':    w_score,
        'residual_worlds': len(worlds),
    }


def _scale_score(raw: int) -> int:
    """Apply sqrt scaling to convert raw [10, 100] linear sum → final [10, 100] score.

    The raw sum clusters heavily at the low end (most puzzles score 10–35).
    Sqrt stretches the low end and compresses the high end, producing a more
    uniform distribution across the 1–5 pip tiers.
    """
    t = max(0.0, (raw - 10) / 90)
    return round(10 + 90 * math.sqrt(t))


TIER = {1: 'easy', 2: 'easy', 3: 'medium', 4: 'hard', 5: 'expert'}

# ── Compliance (mirrors src/compliance.ts) ─────────────────────────────────────
_NC_BASE_KINDS = frozenset({'mixing_among', 'mixing_count_among', 'sell_result_among', 'sell_among'})
_NC_EXP_KINDS  = _NC_BASE_KINDS | frozenset({'book_among', 'golem_reaction_among'})

def is_non_compliant(puz: dict) -> bool:
    """Mirror of isPuzzleNonCompliant() in src/compliance.ts."""
    nc = _NC_EXP_KINDS if puz.get('mode') == 'expanded' else _NC_BASE_KINDS
    if any(c['kind'] in nc for c in puz.get('clues', [])):
        return True
    pubs = [p for p in (puz.get('publications') or []) if p is not None]
    if pubs:
        alch = [p['claimedAlchemical'] for p in pubs]
        if len(set(alch)) < len(alch): return True
        ings = [p['ingredient'] for p in pubs]
        if len(set(ings)) < len(ings): return True
    arts = puz.get('articles') or []
    if arts:
        aspects = [a['aspect'] for a in arts]
        if len(set(aspects)) < len(aspects): return True
        ing_counts: dict = {}
        for a in arts:
            for e in a.get('entries', []):
                ing_counts[e['ingredient']] = ing_counts.get(e['ingredient'], 0) + 1
        if any(v > 2 for v in ing_counts.values()): return True
    return False


def difficulty_for(puz: dict, pip: int) -> str:
    """Return the correct difficulty label for a puzzle given its pip tier."""
    if pip == 5 and is_non_compliant(puz):
        return 'extreme'
    return TIER[pip]


def score_to_pip(score: int) -> int:
    """Convert [10–100] complexity score to 1–5 pip tier (mirrors ComplexityPips in App.tsx)."""
    if score <= 32: return 1
    if score <= 58: return 2
    if score <= 70: return 3
    if score <= 82: return 4
    return 5

# ══════════════════════════════════════════════════════════════════════════════
# VALIDATION  (§5 of PUZZLE_GENERATION.md)
# ══════════════════════════════════════════════════════════════════════════════

def validate_puzzle(puz: dict) -> list:
    """Returns list of 'ERROR: ...' and 'WARNING: ...' strings."""
    errs      = []
    clues     = puz.get('clues', [])
    questions = puz.get('questions', [])
    sol_raw   = puz.get('solution', {})
    golem     = puz.get('golem')

    if not sol_raw:
        return ['ERROR: no solution defined']

    sol = {int(k): v for k, v in sol_raw.items()}

    if sorted(sol.values()) != list(range(1, 9)):
        errs.append("ERROR: solution not a valid bijection")

    if golem:
        if golem['chest']['color'] == golem['ears']['color']:
            errs.append("ERROR: chest.color == ears.color (must differ)")
        groups = compute_groups(sol, golem)
        if not groups_valid(groups):
            errs.append(f"ERROR: golem groups not (2,2,2,2): {Counter(groups.values())}")

    worlds = apply_all(all_worlds(), clues, golem)
    sol_t  = tuple(sol[s] for s in SLOTS)
    if sol_t not in worlds:
        errs.append("ERROR: solution world eliminated by clues")

    for i, q in enumerate(questions):
        ans = answer(worlds, q, golem)
        if ans is None:
            errs.append(f"ERROR: question {i} ({q['kind']}) has no unique answer "
                        f"in {len(worlds)} residual worlds")

    # Anchor protection: encyclopedia clues that match a question's known-list are premises
    anchor_idx = set()
    for q in questions:
        if q['kind'] == 'encyclopedia_fourth':
            for i, c in enumerate(clues):
                if (c['kind'] == 'encyclopedia'
                        and c.get('aspect') == q.get('aspect')
                        and c.get('entries') == q.get('known')):
                    anchor_idx.add(i)

    redundant_idxs = []
    for i, c in enumerate(clues):
        if i in anchor_idx:
            continue
        reduced = clues[:i] + clues[i + 1:]
        w2 = apply_all(all_worlds(), reduced, golem)
        if all_answered(w2, questions, golem):
            redundant_idxs.append(i)
    is_tutorial = puz.get('id', '').startswith('tutorial')
    for i in redundant_idxs:
        c = clues[i]
        msg = f"clue {i} ({c['kind']}) is redundant"
        if not is_tutorial and len(redundant_idxs) >= 2:
            errs.append(f"ERROR: {msg}")
        else:
            errs.append(f"WARNING: {msg}")

    if golem:
        tests = [c for c in clues if c['kind'] == 'golem_test']
        if len(tests) < 2:
            errs.append("WARNING: fewer than 2 golem_test clues")
        if tests:
            test_groups = {compute_groups(sol, golem)[c['ingredient']] for c in tests}
            if len(test_groups) < 2:
                gq = next((q for q in questions
                           if q['kind'] in ('golem_group', 'golem_animate_potion')), None)
                if gq is None or answer(worlds, gq, golem) is None:
                    errs.append("WARNING: all golem tests in the same reaction group")

    enc_asp = [c['aspect'] for c in clues if c['kind'] == 'encyclopedia']
    if len(enc_asp) != len(set(enc_asp)):
        errs.append("WARNING: duplicate encyclopedia aspects")

    if sum(1 for c in clues if c['kind'] == 'encyclopedia_uncertain') > 1:
        errs.append("ERROR: more than one uncertain article — cannot be unique")

    ing_cnt: Counter = Counter()
    for c in clues:
        for f in ('ingredient', 'ingredient1', 'ingredient2'):
            if f in c:
                ing_cnt[c[f]] += 1
    for ing, cnt in ing_cnt.items():
        if cnt > 3:
            errs.append(f"WARNING: ingredient {ing} appears in {cnt} clues (max recommended: 3)")

    return errs

# ══════════════════════════════════════════════════════════════════════════════
# GENERATION  —  profiles, construction, minimization, hints
# ══════════════════════════════════════════════════════════════════════════════

@dataclass
class Profile:
    id_prefix:       str
    mechanics:       list
    question_kind:   str
    difficulty:      str
    max_clues:       int
    has_golem:       bool
    question_params: dict = field(default_factory=dict)
    mandatory_clues: list = field(default_factory=list)

PROFILES = {
    'tutorial_golem':    Profile('exp-tutorial-golem',    ['base', 'golem'],                      'golem_group',             'tutorial', 6,  True,  {'group': 'animators'}),
    'easy_enc':          Profile('exp-easy-enc',          ['base', 'encyclopedia'],               'encyclopedia_fourth',      'easy',     10, False),
    'easy_sl':           Profile('exp-easy-sl',           ['base', 'solar_lunar'],                'alchemical',               'easy',     7,  False),
    'easy_golem':        Profile('exp-easy-golem',        ['base', 'golem'],                      'golem_group',              'easy',     8,  True,  {'group': 'animators'}),
    'medium_enc_sl':     Profile('exp-medium-enc-sl',     ['base', 'encyclopedia', 'solar_lunar'], 'encyclopedia_fourth',     'medium',   12, False),
    'medium_golem_enc':  Profile('exp-medium-golem-enc',  ['base', 'encyclopedia', 'golem'],       'golem_group',             'medium',   12, True,  {'group': 'animators'}),
    'medium_golem_sl':   Profile('exp-medium-golem-sl',   ['base', 'golem', 'solar_lunar'],        'golem_animate_potion',    'medium',   10, True),
    'hard_all':          Profile('exp-hard-all',          ['base', 'encyclopedia', 'golem', 'solar_lunar'], 'golem_group',   'hard',     15, True,  {'group': 'animators'}),
    'hard_golem_mix':    Profile('exp-hard-golem-mix',    ['base', 'golem'],                       'golem_animate_potion',    'hard',     10, True),
    # Base-game new question profiles
    'q_neutral_partner': Profile('neutral-partner',       ['base'],                               'neutral-partner',          'medium',   8,  False),
    'q_ing_profile':     Profile('ing-profile',           ['base'],                               'ingredient-potion-profile','medium',   8,  False),
    'q_group_potions':   Profile('group-potions',         ['base'],                               'group-possible-potions',   'medium',   8,  False),
    'q_best_mix':        Profile('best-mix',              ['base'],                               'most-informative-mix',     'medium',   8,  False),
    'q_non_producer':    Profile('non-producer',          ['base'],                               'guaranteed-non-producer',  'medium',   8,  False),
    'q_among':           Profile('among',                 ['base', 'sell', 'among'],              'mixing-result',            'medium',   10, False),
    # Base combination profiles (The Full Arsenal)
    'combo_b_easy':      Profile('combo-b-easy',          ['base', 'sell'],                       'mixing-result',            'easy',     10, False),
    'combo_b_med_asp':   Profile('combo-b-med-asp',       ['base', 'sell', 'debunk'],             'aspect',                   'medium',   12, False),
    'combo_b_med_np':    Profile('combo-b-med-np',        ['base', 'sell', 'debunk'],             'neutral-partner',          'medium',   12, False),
    'combo_b_hard_pp':   Profile('combo-b-hard-pp',       ['base', 'sell', 'debunk', 'among'],    'possible-potions',         'hard',     14, False),
    'combo_b_hard_ip':   Profile('combo-b-hard-ip',       ['base', 'sell', 'debunk', 'among'],    'ingredient-potion-profile','hard',     14, False),
    # Mixed-clues profiles
    'mixed_base': Profile('mixed-base', ['base', 'sell', 'among'],                       'mixing-result',        'medium', 10, False,
        mandatory_clues=[{'kind': 'sell_result_among', 'sellResult': 'opposite'},
                         {'kind': 'sell_result_among', 'sellResult': 'sign_ok'},
                         {'kind': 'mixing_among'}]),
    'mixed_exp':  Profile('mixed-exp',  ['base', 'sell', 'among', 'solar_lunar', 'golem'], 'most_informative_book', 'hard', 14, True,
        mandatory_clues=[{'kind': 'sell_result_among', 'sellResult': 'opposite'},
                         {'kind': 'golem_reaction_among', 'count': 1},
                         {'kind': 'book_among', 'count': 1}]),
    'mixed_exp_mix':   Profile('mixed-exp-mix',   ['base', 'sell', 'among', 'solar_lunar', 'golem'], 'mixing-result',        'hard', 14, True,
        mandatory_clues=[{'kind': 'sell_result_among', 'sellResult': 'opposite'},
                         {'kind': 'golem_reaction_among', 'count': 1},
                         {'kind': 'book_among', 'count': 1}]),
    'mixed_exp_golem': Profile('mixed-exp-golem', ['base', 'sell', 'among', 'solar_lunar', 'golem'], 'golem_group', 'hard', 14, True,
        {'group': 'animators'},
        mandatory_clues=[{'kind': 'sell_result_among', 'sellResult': 'opposite'},
                         {'kind': 'golem_reaction_among', 'count': 1},
                         {'kind': 'book_among', 'count': 1}]),
    # Mixed-clue debunk profiles — realistic (board-game compliant)
    'mixed_debunk_r': Profile(
        'mixed-debunk-r',
        ['base', 'sell', 'debunk'],
        'debunk_min_steps',
        'expert', 14, False,
        mandatory_clues=[
            {'kind': 'debunk', 'variant': 'master'},    # witnessed mix outcome as evidence
            {'kind': 'sell', 'sellResult': 'opposite'}, # a strong sell result
        ]
    ),
    # Mixed-clue debunk profiles — unrealistic (among clues)
    'mixed_base_debunk': Profile(
        'mixed-base-debunk',
        ['base', 'sell', 'among'],
        'debunk_min_steps',
        'expert', 14, False,
        mandatory_clues=[
            {'kind': 'sell_result_among', 'sellResult': 'opposite'},
            {'kind': 'mixing_count_among'},
            {'kind': 'mixing_among'},
        ]
    ),
    'mixed_exp_debunk': Profile(
        'mixed-exp-debunk',
        ['base', 'sell', 'among', 'solar_lunar', 'golem'],
        'debunk_min_steps',
        'expert', 16, True,
        mandatory_clues=[
            {'kind': 'sell_result_among', 'sellResult': 'opposite'},
            {'kind': 'golem_reaction_among', 'count': 1},
            {'kind': 'book_among', 'count': 1},
        ]
    ),
    # Expanded combination profiles (Grand Synthesis)
    'combo_exp_easy':     Profile('combo-exp-easy',       ['base', 'encyclopedia', 'solar_lunar'],             'encyclopedia_fourth',      'easy',   12, False),
    'combo_exp_med_sl':   Profile('combo-exp-med-sl',     ['base', 'encyclopedia', 'solar_lunar'],             'solar_lunar',              'medium', 13, False),
    'combo_exp_med_all':  Profile('combo-exp-med-all',    ['base', 'encyclopedia', 'solar_lunar', 'golem'],    'encyclopedia_fourth',      'medium', 14, True),
    'combo_exp_hard_wha': Profile('combo-exp-wha',         ['base', 'encyclopedia', 'solar_lunar', 'golem'],    'encyclopedia_which_aspect','hard',   16, True),
    'combo_exp_hard_sl':  Profile('combo-exp-hard-sl',    ['base', 'encyclopedia', 'solar_lunar', 'golem'],    'solar_lunar',              'hard',   15, True),
}

# ── Clue pool ─────────────────────────────────────────────────────────────────

def _sell_sr(actual, cp_col: str, cp_sgn: int) -> str:
    """Sell result string for actual mix result vs claimed potion."""
    if actual == 'neutral':                                    return 'neutral'
    act_col, act_sgn = actual
    if act_col == cp_col and act_sgn == cp_sgn:                return 'total_match'
    if act_sgn == cp_sgn:                                      return 'sign_ok'
    return 'opposite'


def candidate_pool(mechanics: list, sol: dict, golem: Optional[dict],
                   blocked_enc: set, blocked_book: frozenset = frozenset()) -> list:
    """Returns list of (kind, priority, clue_dict)."""
    pool = []
    if 'base' in mechanics:
        for i1, i2 in itertools.combinations(SLOTS, 2):
            r = MIX_TABLE[sol[i1]][sol[i2]]
            pool.append(('mixing', 0, {'kind': 'mixing', 'ingredient1': i1,
                                        'ingredient2': i2, 'result': r2d(r)}))
        for s in SLOTS:
            for col in COLORS:
                sgn, _ = ALCH_DATA[sol[s]][col]
                pool.append(('aspect', 0, {'kind': 'aspect', 'ingredient': s,
                                            'color': col, 'sign': sgn_str(sgn)}))
    if 'solar_lunar' in mechanics:
        for s in SLOTS:
            if s in blocked_book:
                continue
            pool.append(('book', 8, {'kind': 'book', 'ingredient': s,
                                      'result': 'solar' if is_solar(sol[s]) else 'lunar'}))
        # book_among: exactly 1 of N ingredients is solar/lunar (ambiguous observation)
        non_blocked = [s for s in SLOTS if s not in blocked_book]
        for n_grp in [3, 4]:
            for group in itertools.combinations(non_blocked, n_grp):
                for result in ['solar', 'lunar']:
                    count = sum(1 for s in group if is_solar(sol[s]) == (result == 'solar'))
                    if count == 1:
                        pool.append(('book_among', 6, {
                            'kind': 'book_among',
                            'ingredients': sorted(list(group)),
                            'result': result,
                            'count': 1,
                        }))
    if 'encyclopedia' in mechanics:
        for col in COLORS:
            if col in blocked_enc:
                continue
            for st in ['+', '-']:
                ms = sgn_int(st)
                slots = [s for s in SLOTS if ALCH_DATA[sol[s]][col][0] == ms]
                if len(slots) < 3:
                    continue
                for combo in itertools.combinations(slots, 3):
                    pool.append(('encyclopedia', 5, {
                        'kind': 'encyclopedia', 'aspect': col,
                        'entries': [{'ingredient': s, 'sign': st} for s in sorted(combo)],
                    }))
    if 'sell' in mechanics:
        for i1, i2 in itertools.combinations(SLOTS, 2):
            actual = MIX_TABLE[sol[i1]][sol[i2]]
            if actual == 'neutral':
                pool.append(('sell', 2, {
                    'kind': 'sell', 'ingredient1': i1, 'ingredient2': i2,
                    'claimedResult': {'type': 'potion', 'color': 'R', 'sign': '+'},
                    'sellResult': 'neutral',
                }))
            else:
                for col in COLORS:
                    for sgn in [1, -1]:
                        if actual == (col, sgn):
                            sr = 'total_match'
                        elif actual[1] == sgn:
                            sr = 'sign_ok'
                        else:
                            sr = 'opposite'
                        pool.append(('sell', 2, {
                            'kind': 'sell', 'ingredient1': i1, 'ingredient2': i2,
                            'claimedResult': {'type': 'potion', 'color': col, 'sign': sgn_str(sgn)},
                            'sellResult': sr,
                        }))
    if 'debunk' in mechanics:
        for s in SLOTS:
            for col in COLORS:
                sgn, _ = ALCH_DATA[sol[s]][col]
                pool.append(('debunk', 3, {
                    'kind': 'debunk', 'variant': 'apprentice', 'ingredient': s,
                    'color': col, 'sign': sgn_str(sgn), 'outcome': 'success',
                }))
        for i1, i2 in itertools.combinations(SLOTS, 2):
            actual = MIX_TABLE[sol[i1]][sol[i2]]
            pool.append(('debunk', 3, {
                'kind': 'debunk', 'variant': 'master',
                'ingredient1': i1, 'ingredient2': i2,
                'claimedPotion': r2d(actual), 'outcome': 'success',
            }))
    if 'among' in mechanics:
        for n_grp in [3, 4]:
            for group in itertools.combinations(SLOTS, n_grp):
                # mixing_among (existential) + mixing_count_among (exact count)
                seen_results: set = set()
                result_counts: dict = {}
                for a, b in itertools.combinations(group, 2):
                    r = MIX_TABLE[sol[a]][sol[b]]
                    key = json.dumps(r2d(r), sort_keys=True)
                    result_counts[key] = result_counts.get(key, 0) + 1
                    if key not in seen_results:
                        seen_results.add(key)
                        pool.append(('among', 1, {
                            'kind': 'mixing_among',
                            'ingredients': sorted(list(group)),
                            'result': r2d(r),
                        }))
                for key, count in result_counts.items():
                    pool.append(('among', 1, {
                        'kind': 'mixing_count_among',
                        'ingredients': sorted(list(group)),
                        'result': json.loads(key),
                        'count': count,
                    }))
        # sell variants (only when 'sell' also in mechanics)
        if 'sell' in mechanics:
            for n_grp in [3, 4]:
                for group in itertools.combinations(SLOTS, n_grp):
                    # sell_result_among (existential)
                    seen_sra: set = set()
                    for a, b in itertools.combinations(group, 2):
                        actual = MIX_TABLE[sol[a]][sol[b]]
                        if actual == 'neutral':
                            key = 'neutral'
                            if key not in seen_sra:
                                seen_sra.add(key)
                                pool.append(('among', 1, {
                                    'kind': 'sell_result_among',
                                    'ingredients': sorted(list(group)),
                                    'claimedPotion': {'color': 'R', 'sign': '+'},
                                    'sellResult': 'neutral',
                                }))
                        else:
                            for cp_col in COLORS:
                                for cp_sgn in [1, -1]:
                                    sr = _sell_sr(actual, cp_col, cp_sgn)
                                    key = (cp_col, cp_sgn, sr)
                                    if key not in seen_sra:
                                        seen_sra.add(key)
                                        pool.append(('among', 1, {
                                            'kind': 'sell_result_among',
                                            'ingredients': sorted(list(group)),
                                            'claimedPotion': {'color': cp_col, 'sign': sgn_str(cp_sgn)},
                                            'sellResult': sr,
                                        }))
                    # sell_among (exact count)
                    seen_sa: set = set()
                    for cp_col in COLORS:
                        for cp_sgn in [1, -1]:
                            sr_counts: dict = {}
                            for a, b in itertools.combinations(group, 2):
                                actual = MIX_TABLE[sol[a]][sol[b]]
                                sr = _sell_sr(actual, cp_col, cp_sgn)
                                sr_counts[sr] = sr_counts.get(sr, 0) + 1
                            for sr, count in sr_counts.items():
                                if sr == 'neutral':
                                    key = ('neutral', count)
                                else:
                                    key = (cp_col, cp_sgn, sr, count)
                                if key not in seen_sa:
                                    seen_sa.add(key)
                                    pool.append(('among', 2, {
                                        'kind': 'sell_among',
                                        'ingredients': sorted(list(group)),
                                        'claimedPotion': {'color': cp_col, 'sign': sgn_str(cp_sgn)},
                                        'result': sr,
                                        'count': count,
                                    }))
    if 'golem' in mechanics and golem:
        for s in SLOTS:
            pool.append(('golem_test', 15, {
                'kind': 'golem_test', 'ingredient': s,
                'chest_reacted': greacts(sol[s], golem, 'chest'),
                'ears_reacted':  greacts(sol[s], golem, 'ears'),
            }))
        for part in ['chest', 'ears']:
            pool.append(('golem_hint_color', -999, {'kind': 'golem_hint_color',
                          'part': part, 'color': golem[part]['color']}))
            pool.append(('golem_hint_size',  -999, {'kind': 'golem_hint_size',
                          'part': part, 'size': golem[part]['size']}))
        # golem_reaction_among: ambiguous test — exactly 1 of N showed this reaction
        groups_map = compute_groups(sol, golem)
        for n_grp in [3, 4]:
            for group in itertools.combinations(SLOTS, n_grp):
                for reaction in ['animators', 'chest_only', 'ears_only', 'non_reactive']:
                    if sum(1 for s in group if groups_map[s] == reaction) == 1:
                        pool.append(('golem_reaction_among', 12, {
                            'kind': 'golem_reaction_among',
                            'ingredients': sorted(list(group)),
                            'reaction': reaction,
                            'count': 1,
                        }))
    return pool

# ── Question + anchor builder ─────────────────────────────────────────────────

def build_question_anchor(profile: Profile, sol: dict, golem: Optional[dict],
                           rng: random.Random):
    """Returns (question, anchor_or_None, blocked_enc_aspects)."""
    k = profile.question_kind

    if k == 'encyclopedia_fourth':
        for _ in range(100):
            col = rng.choice(COLORS)
            for st in ['+', '-']:
                ms = sgn_int(st)
                slots = [s for s in SLOTS if ALCH_DATA[sol[s]][col][0] == ms]
                if len(slots) < 4:
                    continue
                rng.shuffle(slots)
                missing = slots[0]
                known   = sorted(slots[1:4])
                known_e = [{'ingredient': s, 'sign': st} for s in known]
                return ({'kind': 'encyclopedia_fourth', 'aspect': col,
                          'known': known_e, 'missing_sign': st},
                         {'kind': 'encyclopedia', 'aspect': col, 'entries': known_e},
                         {col})
        return None, None, set()

    if k == 'encyclopedia_which_aspect':
        for _ in range(200):
            col    = rng.choice(COLORS)
            chosen = sorted(rng.sample(SLOTS, 4))
            plus   = sum(1 for s in chosen if ALCH_DATA[sol[s]][col][0] == 1)
            if plus not in (0, 2, 4):   # reject 3-1 distributions
                continue
            entries = [{'ingredient': s, 'sign': sgn_str(ALCH_DATA[sol[s]][col][0])} for s in chosen]
            q = {'kind': 'encyclopedia_which_aspect', 'entries': entries}
            return q, None, {col}
        return None, None, set()

    if k == 'mixing-result':
        i1, i2 = sorted(rng.sample(SLOTS, 2))
        return {'kind': 'mixing-result', 'ingredient1': i1, 'ingredient2': i2}, None, set()

    if k == 'aspect':
        s   = rng.choice(SLOTS)
        col = rng.choice(COLORS)
        return {'kind': 'aspect', 'ingredient': s, 'color': col}, None, set()

    if k == 'possible-potions':
        i1, i2 = sorted(rng.sample(SLOTS, 2))
        return {'kind': 'possible-potions', 'ingredient1': i1, 'ingredient2': i2}, None, set()

    if k == 'alchemical':
        return {'kind': 'alchemical', 'ingredient': rng.choice(SLOTS)}, None, set()

    if k == 'solar_lunar':
        return {'kind': 'solar_lunar', 'ingredient': rng.choice(SLOTS)}, None, set()

    if k == 'golem_group':
        grp = profile.question_params.get('group', 'animators')
        return {'kind': 'golem_group', 'group': grp}, None, set()

    if k == 'golem_animate_potion':
        return {'kind': 'golem_animate_potion'}, None, set()

    if k == 'neutral-partner':
        return {'kind': 'neutral-partner', 'ingredient': rng.choice(SLOTS)}, None, set()

    if k == 'ingredient-potion-profile':
        return {'kind': 'ingredient-potion-profile', 'ingredient': rng.choice(SLOTS)}, None, set()

    if k == 'group-possible-potions':
        size = rng.choice([2, 3])
        ingredients = sorted(rng.sample(SLOTS, size))
        return {'kind': 'group-possible-potions', 'ingredients': ingredients}, None, set()

    if k == 'most-informative-mix':
        return {'kind': 'most-informative-mix', 'ingredient': rng.choice(SLOTS)}, None, set()

    if k == 'guaranteed-non-producer':
        # Pick a random target potion from the 7 possible mix results
        potions = [
            {'type': 'neutral'},
            {'type': 'potion', 'color': 'R', 'sign': '+'},
            {'type': 'potion', 'color': 'R', 'sign': '-'},
            {'type': 'potion', 'color': 'G', 'sign': '+'},
            {'type': 'potion', 'color': 'G', 'sign': '-'},
            {'type': 'potion', 'color': 'B', 'sign': '+'},
            {'type': 'potion', 'color': 'B', 'sign': '-'},
        ]
        return {'kind': 'guaranteed-non-producer', 'potion': rng.choice(potions)}, None, set()

    if k == 'most_informative_book':
        return {'kind': 'most_informative_book'}, None, set()

    if k in DEBUNK_QUESTION_KINDS:
        # Placeholder; actual question list is built by _plan_debunk in construct()
        return {'kind': k}, None, set()

    return None, None, set()

# ── Construction ──────────────────────────────────────────────────────────────

def _ceq(a, b): return json.dumps(a, sort_keys=True) == json.dumps(b, sort_keys=True)
def _in(c, clues): return any(_ceq(c, x) for x in clues)

def construct(profile: Profile, rng: random.Random, verbose: bool = False):
    order = list(ALL_ALCH)
    rng.shuffle(order)
    sol = {s: a for s, a in zip(SLOTS, order)}

    golem = sample_valid_golem(sol, rng) if profile.has_golem else None

    q, anchor, blocked_enc = build_question_anchor(profile, sol, golem, rng)
    blocked_book = frozenset({q['ingredient']}) if q and q.get('kind') == 'solar_lunar' else frozenset()
    if q is None:
        return None

    clues  = []
    worlds = all_worlds()

    if anchor:
        clues.append(anchor)
        worlds = filter_clue(worlds, anchor, golem)
        if verbose:
            print(f"  anchor: {anchor['kind']}({anchor.get('aspect', '')}) → {len(worlds)} worlds")

    # Mandatory golem tests: one animator + one from a different group
    if profile.has_golem and golem:
        groups  = compute_groups(sol, golem)
        covered = set()
        for target in ['animators', None]:   # None = any non-animator group
            for s in sorted(SLOTS, key=lambda _: rng.random()):
                g = groups[s]
                if target is None and g == 'animators':
                    continue
                if target is not None and g != target:
                    continue
                if g in covered:
                    continue
                c = {'kind': 'golem_test', 'ingredient': s,
                     'chest_reacted': greacts(sol[s], golem, 'chest'),
                     'ears_reacted':  greacts(sol[s], golem, 'ears')}
                clues.append(c)
                worlds = filter_clue(worlds, c, golem)
                covered.add(g)
                if verbose:
                    print(f"  mandatory test ing{s} ({g}) → {len(worlds)} worlds")
                break

    pool = candidate_pool(profile.mechanics, sol, golem, blocked_enc, blocked_book)

    # Mandatory non-golem clues (from profile.mandatory_clues)
    mandatory_placed: list = []
    for spec in profile.mandatory_clues:
        candidates = [
            c2 for _kd, _pri, c2 in pool
            if c2['kind'] == spec['kind']
            and all(c2.get(k) == v for k, v in spec.items() if k != 'kind')
            and not _in(c2, clues)
        ]
        if not candidates:
            return None
        rng.shuffle(candidates)
        placed = False
        for c2 in candidates:
            nw = filter_clue(worlds, c2, golem)
            if len(nw) < len(worlds):
                clues.append(c2)
                worlds = nw
                mandatory_placed.append(c2)
                placed = True
                if verbose:
                    print(f"  mandatory {c2['kind']} → {len(worlds)} worlds")
                break
        if not placed:
            return None

    greedy = [(kd, pri, c2) for kd, pri, c2 in pool
              if kd not in ('golem_hint_color', 'golem_hint_size')]

    for _ in range(profile.max_clues * 5):
        if all_answered(worlds, [q], golem):
            break

        # Early break for debunk profiles: stop once enough ingredients are known
        if profile.question_kind in DEBUNK_QUESTION_KINDS:
            if len(_definitively_known(worlds, sol)) >= 4:
                break

        best_score = -float('inf')
        best_clue  = None
        sample = greedy if len(greedy) <= 100 else rng.sample(greedy, 100)

        for _, pri, c2 in sample:
            if _in(c2, clues):
                continue
            nw = filter_clue(worlds, c2, golem)
            elim = len(worlds) - len(nw)
            if elim <= 0:
                continue
            if elim + pri > best_score:
                best_score = elim + pri
                best_clue  = c2

        if best_clue is None:
            if verbose: print("  [greedy] stuck")
            return None

        clues.append(best_clue)
        worlds = filter_clue(worlds, best_clue, golem)
        if verbose:
            print(f"  [greedy] {best_clue['kind']} → {len(worlds)} worlds")

        if len(clues) > profile.max_clues:
            if verbose: print("  [greedy] exceeded max_clues")
            return None

    # Debunk profiles: plan publications, articles and answers
    if profile.question_kind in DEBUNK_QUESTION_KINDS:
        debunk_data = _plan_debunk(profile, sol, worlds, rng)
        if debunk_data is None:
            if verbose: print("  [debunk] could not plan publications/answers")
            return None
        return {
            'sol': sol, '_sol_str': {str(k): v for k, v in sol.items()},
            'golem': golem, 'clues': clues, '_anchor': anchor,
            '_mandatory': list(mandatory_placed),
            'q': debunk_data['questions'][0],
            '_debunk_questions': debunk_data['questions'],
            '_debunk_publications': debunk_data['publications'],
            '_debunk_articles': debunk_data['articles'],
            '_debunk_answers': debunk_data['debunk_answers'],
            'worlds': worlds,
        }

    if not all_answered(worlds, [q], golem):
        if verbose: print("  [greedy] no unique answer achieved")
        return None

    return {'sol': sol, '_sol_str': {str(k): v for k, v in sol.items()},
            'golem': golem, 'clues': clues, '_anchor': anchor,
            '_mandatory': list(mandatory_placed),
            'q': q, 'worlds': worlds}

# ── Minimization ──────────────────────────────────────────────────────────────

def minimize(raw: dict, profile=None, verbose: bool = False) -> dict:
    clues     = list(raw['clues'])
    golem     = raw['golem']
    q         = raw['q']
    anchor    = raw.get('_anchor')
    mandatory = raw.get('_mandatory', [])
    rng_fixed = random.Random(42)
    # Track latest debunk plan so it stays consistent with the clue set
    current_debunk = None

    changed = True
    while changed:
        changed = False
        for i in range(len(clues) - 1, -1, -1):
            if anchor and _ceq(clues[i], anchor):
                continue
            if any(_ceq(clues[i], m) for m in mandatory):
                continue
            reduced = clues[:i] + clues[i + 1:]
            w = apply_all(all_worlds(), reduced, golem)
            if raw.get('_debunk_questions') and profile is not None:
                trial_debunk = _plan_debunk(profile, raw['sol'], w, rng_fixed)
                valid = (trial_debunk is not None
                         and len(trial_debunk['questions']) >= len(raw['_debunk_questions']))
                if valid:
                    current_debunk = trial_debunk
            else:
                valid = all_answered(w, [q], golem)
            if valid:
                if verbose: print(f"  [minimize] removed {clues[i]['kind']}")
                clues   = reduced
                changed = True
                break

    raw = dict(raw)
    raw['clues']  = clues
    raw['worlds'] = apply_all(all_worlds(), clues, golem)
    # Update debunk plan if minimization changed it
    if current_debunk is not None:
        raw['_debunk_questions']    = current_debunk['questions']
        raw['_debunk_publications'] = current_debunk['publications']
        raw['_debunk_articles']     = current_debunk['articles']
        raw['_debunk_answers']      = current_debunk['debunk_answers']
        raw['q']                    = current_debunk['questions'][0]
    return raw

# ── Hint generation ───────────────────────────────────────────────────────────

def _dc(c: dict) -> str:
    k = c['kind']
    if k == 'aspect':        return f"ing{c['ingredient']} {c['color']}{c['sign']}"
    if k == 'mixing':        r = c['result']; return f"ing{c['ingredient1']}+ing{c['ingredient2']}={'neutral' if r.get('type')=='neutral' else r['color']+r['sign']}"
    if k == 'book':          return f"ing{c['ingredient']} is {c['result']}"
    if k == 'encyclopedia':  return f"enc({c['aspect']}, {len(c['entries'])} entries)"
    if k == 'golem_test':    cr = '✓' if c['chest_reacted'] else '✗'; er = '✓' if c['ears_reacted'] else '✗'; return f"golem(ing{c['ingredient']}: chest={cr} ears={er})"
    if k == 'golem_hint_color': return f"{c['part']} reacts to {c['color']}"
    if k == 'golem_hint_size':  return f"{c['part']} reacts to {c['size']}"
    return str(c)


def _aspect_chain(worlds, clues, slot_1based: int, color: str, sol: dict,
                  _depth: int = 0) -> list:
    """Return human-readable deduction steps explaining ingredient slot_1based's color sign."""
    si = slot_1based - 1
    signs = {ALCH_DATA[w[si]][color][0] for w in worlds}
    if len(signs) != 1:
        return [f"ing{slot_1based} {color}?: (sign undetermined)"]
    sgn = signs.pop()
    sgn_s = sgn_str(sgn)

    # Priority 1: direct aspect clue
    for c in clues:
        if c['kind'] == 'aspect' and c['ingredient'] == slot_1based and c['color'] == color:
            return [f"ing{slot_1based} {color}{sgn_s}: direct aspect clue"]

    # Priority 2: mixing clue producing this color result involving this slot
    for c in clues:
        if c['kind'] == 'mixing':
            r = d2r(c['result'])
            if r != 'neutral' and r[0] == color and r[1] == sgn:
                a, b = c['ingredient1'], c['ingredient2']
                if a == slot_1based or b == slot_1based:
                    return [f"ing{a}+ing{b}={color}{sgn_s}: both share {color}{sgn_s}"]

    # Priority 3: neutral partner chain (opposites, max depth 2)
    if _depth < 2:
        for c in clues:
            if c['kind'] == 'mixing':
                r = d2r(c['result'])
                if r == 'neutral':
                    a, b = c['ingredient1'], c['ingredient2']
                    partner = b if a == slot_1based else (a if b == slot_1based else None)
                    if partner is not None:
                        sub = _aspect_chain(worlds, clues, partner, color, sol, _depth + 1)
                        return sub + [f"ing{a}+ing{b}=neutral → ing{slot_1based} has {color}{sgn_s}"]

    # Fallback
    return [f"ing{slot_1based} has {color}{sgn_s}"]


def gen_mixing_result_hints(worlds, clues, q, sol, golem=None) -> list:
    i1, i2 = q['ingredient1'], q['ingredient2']
    a1, a2 = sol[i1], sol[i2]
    result = MIX_TABLE[a1][a2]
    result_str = fmt_r(result)
    hints = []
    hints.append({'level': 1, 'text': (
        f"To find the result of mixing ing{i1} and ing{i2}, apply the mixing rule: "
        f"scan colours R→G→B in order. The first colour where both ingredients share "
        f"the same sign determines the result potion. "
        f"If all three colours have opposing signs, the result is neutral."
    )})
    walk_lines = []
    resolved = False
    for color in COLORS:
        s1 = ALCH_DATA[a1][color][0]
        s2 = ALCH_DATA[a2][color][0]
        chain1 = '; '.join(_aspect_chain(worlds, clues, i1, color, sol))
        chain2 = '; '.join(_aspect_chain(worlds, clues, i2, color, sol))
        walk_lines.append(
            f"  {color}: ing{i1}={color}{sgn_str(s1)} ({chain1}), "
            f"ing{i2}={color}{sgn_str(s2)} ({chain2})"
        )
        if s1 == s2:
            walk_lines.append(f"      → SAME sign {sgn_str(s1)} → {color}{sgn_str(s1)} resolves.")
            resolved = True
            break
        else:
            walk_lines.append(f"      → opposite signs → skip.")
    if not resolved:
        walk_lines.append("  All colours opposite → neutral.")
    hints.append({'level': 2, 'text': "Step through each colour:\n" + "\n".join(walk_lines)})
    hints.append({'level': 3, 'text': (
        f"ing{i1}={ALCH_CODES[a1]}, ing{i2}={ALCH_CODES[a2]}. "
        f"Mix result: {result_str}."
    )})
    return hints


def gen_possible_potions_hints(worlds, clues, q, sol, golem=None) -> list:
    i1, i2 = q['ingredient1'], q['ingredient2']
    cands1 = sorted({w[i1 - 1] for w in worlds})
    cands2 = sorted({w[i2 - 1] for w in worlds})
    possible = sorted({MIX_TABLE[w[i1 - 1]][w[i2 - 1]] for w in worlds}, key=str)

    def sign_desc(cands, color):
        signs = {ALCH_DATA[a][color][0] for a in cands}
        if len(signs) == 1:
            return f"{color}{sgn_str(next(iter(signs)))} (confirmed)"
        return f"{color}+ or {color}-"

    walk_lines = []
    for color in COLORS:
        signs1 = {ALCH_DATA[a][color][0] for a in cands1}
        signs2 = {ALCH_DATA[a][color][0] for a in cands2}
        s1_desc = sign_desc(cands1, color)
        s2_desc = sign_desc(cands2, color)
        shared = signs1 & signs2
        if not shared:
            walk_lines.append(
                f"  {color}: ing{i1}={s1_desc}, ing{i2}={s2_desc} — always opposite → no {color} potion"
            )
        else:
            potions_here = []
            size_skip_possible = False
            for s in sorted(shared):
                z1 = {ALCH_DATA[a][color][1] for a in cands1 if ALCH_DATA[a][color][0] == s}
                z2 = {ALCH_DATA[a][color][1] for a in cands2 if ALCH_DATA[a][color][0] == s}
                if (0 in z1 and 1 in z2) or (1 in z1 and 0 in z2):
                    potions_here.append(f"{color}{sgn_str(s)}")
                if z1 & z2:
                    size_skip_possible = True
            opposite_possible = len(signs1) > 1 or len(signs2) > 1 or signs1 != signs2
            if potions_here:
                pot_str = ' or '.join(potions_here)
                line = f"  {color}: ing{i1}={s1_desc}, ing{i2}={s2_desc} — {pot_str} possible"
                if size_skip_possible or opposite_possible:
                    line += " (or skip)"
            else:
                line = f"  {color}: ing{i1}={s1_desc}, ing{i2}={s2_desc} — same sign but same size → skip"
            walk_lines.append(line)

    if any(r == 'neutral' for r in possible):
        walk_lines.append("  → Neutral: possible when no color finds a mixed-size pair")

    hints = []
    hints.append({'level': 1, 'text': (
        f"Find every potion ing{i1}+ing{i2} can possibly produce, given the "
        f"{len(cands1)} remaining candidate alchemical(s) for ing{i1} and "
        f"{len(cands2)} for ing{i2}. "
        f"Apply the mixing rule (R→G→B): the first color where both share the same sign "
        f"AND have different sizes gives the potion; if all colors are skipped, the result is neutral."
    )})
    hints.append({'level': 2, 'text': (
        "Color-by-color analysis:\n" + "\n".join(walk_lines)
    )})
    hints.append({'level': 3, 'text': (
        f"Possible potions for ing{i1}+ing{i2}: {sorted(fmt_r(r) for r in possible)}."
    )})
    return hints


def gen_aspect_hints(worlds, clues, q, sol, golem=None) -> list:
    slot = q['ingredient']
    color = q['color']
    a = sol[slot]
    sgn = ALCH_DATA[a][color][0]
    sgn_s = sgn_str(sgn)
    remaining = {w[slot - 1] for w in worlds}
    signs_in_remaining = {ALCH_DATA[alch][color][0] for alch in remaining}
    alch_signs = ', '.join(
        f"{ALCH_CODES[alch]}({color}{sgn_str(ALCH_DATA[alch][color][0])})"
        for alch in sorted(remaining)
    )
    hints = []
    hints.append({'level': 1, 'text': (
        f"Determine the {color} sign of ing{slot}. "
        f"There are {len(remaining)} alchemical{'s' if len(remaining) != 1 else ''} "
        f"still consistent with the clues for slot {slot}. "
        f"Check whether they all agree on the {color} sign."
    )})
    hints.append({'level': 2, 'text': (
        f"Remaining alchemicals for ing{slot}: {alch_signs}. "
        f"{'All share ' + color + sgn_s + '.' if len(signs_in_remaining) == 1 else 'Signs differ — reduce worlds further.'}"
    )})
    hints.append({'level': 3, 'text': f"ing{slot} has {color}{sgn_s}."})
    return hints


def gen_aspect_set_hints(worlds, clues, q, sol, golem=None) -> list:
    color = q['color']
    target_sign = sgn_int(q['sign'])
    target_sgn_s = q['sign']
    confirmed = [si + 1 for si in range(8)
                 if {ALCH_DATA[w[si]][color][0] for w in worlds} == {target_sign}]
    ans_slots = sorted(s for s in SLOTS if ALCH_DATA[sol[s]][color][0] == target_sign)
    clue_evidence = []
    for c in clues:
        if c['kind'] == 'mixing':
            r = d2r(c['result'])
            if r != 'neutral' and r[0] == color and r[1] == target_sign:
                clue_evidence.append(
                    f"ing{c['ingredient1']}+ing{c['ingredient2']}={color}{target_sgn_s}: "
                    f"both have {color}{target_sgn_s}"
                )
        elif c['kind'] == 'aspect':
            if c['color'] == color and sgn_int(c['sign']) == target_sign:
                clue_evidence.append(f"ing{c['ingredient']} {color}{target_sgn_s}: direct clue")
    hints = []
    hints.append({'level': 1, 'text': (
        f"Find the 4 ingredients with {color}{target_sgn_s}. "
        f"Exactly 4 of the 8 alchemicals carry each sign per colour. "
        f"A colored mixing result of {color}{target_sgn_s} directly reveals that both "
        f"mixed ingredients share {color}{target_sgn_s}."
    )})
    evidence_str = "\n".join(f"  {e}" for e in clue_evidence) if clue_evidence else "  (none direct — use elimination)"
    hints.append({'level': 2, 'text': (
        f"Evidence:\n{evidence_str}\nConfirmed {color}{target_sgn_s}: {confirmed}."
    )})
    hints.append({'level': 3, 'text': f"The 4 ingredients with {color}{target_sgn_s}: {ans_slots}."})
    return hints


def gen_large_component_hints(worlds, clues, q, sol, golem=None) -> list:
    color = q['color']
    confirmed = [si + 1 for si in range(8)
                 if {ALCH_DATA[w[si]][color][1] for w in worlds} == {1}]
    ans_slots = sorted(s for s in SLOTS if ALCH_DATA[sol[s]][color][1] == 1)
    size_evidence = []
    for c in clues:
        if c['kind'] == 'mixing':
            r = d2r(c['result'])
            if r != 'neutral' and r[0] == color:
                size_evidence.append(
                    f"ing{c['ingredient1']}+ing{c['ingredient2']}={fmt_r(r)}: "
                    f"one of these holds Large-{color}"
                )
    hints = []
    hints.append({'level': 1, 'text': (
        f"Find the 4 ingredients that hold the Large component of {color}. "
        f"When two ingredients share the same {color} sign, the Large one (vs Small) "
        f"produces the coloured potion. "
        f"Mixing clues with {color} results reveal which ingredients interact on this colour."
    )})
    evidence_str = "\n".join(f"  {e}" for e in size_evidence) if size_evidence else f"  (no direct {color} mixing clues)"
    hints.append({'level': 2, 'text': (
        f"Mixing clues for {color}:\n{evidence_str}\nConfirmed Large-{color} so far: {confirmed}."
    )})
    hints.append({'level': 3, 'text': f"The 4 Large-{color} ingredients: {ans_slots}."})
    return hints


def gen_safe_publish_hints(worlds, clues, q, sol, golem=None) -> list:
    slot = q['ingredient']
    certain = {}
    uncertain = []
    for color in COLORS:
        signs = {ALCH_DATA[w[slot - 1]][color][0] for w in worlds}
        if len(signs) == 1:
            certain[color] = sgn_str(signs.pop())
        else:
            uncertain.append(color)
    safe_color = uncertain[0] if len(uncertain) == 1 else None
    certain_strs = [f"{col}{certain[col]}" for col in COLORS if col in certain]
    hints = []
    hints.append({'level': 1, 'text': (
        f"When publishing a theory about ing{slot}, you hedge the one colour whose sign "
        f"is still uncertain — that protects you if you're wrong about it. "
        f"Check which of R, G, B still has an ambiguous sign across the remaining worlds."
    )})
    hints.append({'level': 2, 'text': (
        f"For ing{slot}: "
        f"confirmed aspects: {', '.join(certain_strs) if certain_strs else 'none'}. "
        f"Uncertain colour(s): {uncertain}."
    )})
    hints.append({'level': 3, 'text': f"Safe colour to hedge for ing{slot}: {safe_color}."})
    return hints


def gen_hints(raw: dict) -> list:
    clues = raw['clues']; q = raw['q']; golem = raw['golem']
    sol = raw['sol']; worlds = raw['worlds']; k = q['kind']; hints = []

    if k == 'encyclopedia_fourth':
        col = q['aspect']; known = {e['ingredient'] for e in q['known']}
        msign = q['missing_sign']; ms = sgn_int(msign)
        non_known = sorted(s for s in SLOTS if s not in known)

        hints.append({'level': 1, 'text': (
            f"The article on the {col} aspect has three known entries: "
            f"ingredients {sorted(known)} all have {col}{msign}. "
            f"There are exactly 4 alchemicals with {col}{msign}. "
            f"The fourth must be one of: {non_known}. "
            f"Use the other clues to eliminate candidates."
        )})
        lines = []
        for s in non_known:
            if ALCH_DATA[sol[s]][col][0] == ms:
                lines.append(f"  — ingredient {s}: survives")
            else:
                reason = "eliminated by constraints"
                for c in clues:
                    if c['kind'] == 'aspect' and c['ingredient'] == s:
                        reason = f"clue: {c['color']}{c['sign']}"
                        if c['color'] == col and sgn_int(c['sign']) != ms:
                            reason += " (directly contradicts)"
                        break
                    elif c['kind'] == 'book' and c['ingredient'] == s:
                        reason = f"book clue: {c['result']}"; break
                lines.append(f"  — ingredient {s}: eliminated ({reason})")
        hints.append({'level': 2, 'text': "Eliminate candidates:\n" + "\n".join(lines)})
        ans = answer(worlds, q, golem); alch = sol[ans]
        hints.append({'level': 3, 'text': (
            f"Only ingredient {ans} remains. "
            f"It is alchemical {ALCH_CODES[alch]}, which has {col}{msign}. "
            f"It is the missing fourth entry."
        )})

    elif k in ('golem_group', 'golem_animate_potion'):
        groups = compute_groups(sol, golem)
        tests  = [c for c in clues if c['kind'] == 'golem_test']
        hints_display = [c for c in clues if c['kind'] in ('golem_hint_color', 'golem_hint_size')]
        extra = (' Research notes: ' + '; '.join(_dc(c) for c in hints_display) + '.'
                 if hints_display else '')
        test_lines = [
            f"  ing{c['ingredient']}: chest={'✓' if c['chest_reacted'] else '✗'} "
            f"ears={'✓' if c['ears_reacted'] else '✗'}  →  {groups[c['ingredient']]}"
            for c in tests
        ]
        hints.append({'level': 1, 'text':
            f"The golem reacts to SIZE on a specific color channel.{extra}\n"
            "Known tests:\n" + "\n".join(test_lines)
        })
        hints.append({'level': 2, 'text': (
            f"Chest reacts to {golem['chest']['color']}+{golem['chest']['size']}. "
            f"Ears react to {golem['ears']['color']}+{golem['ears']['size']}. "
            f"An animator needs BOTH. Cross-reference with untested ingredients."
        )})
        if k == 'golem_group':
            ans  = answer(worlds, q, golem)
            info = [f"ing{s}→{ALCH_CODES[sol[s]]}" for s in (ans or [])]
            hints.append({'level': 3, 'text':
                f"The {q['group']} are: ingredients {ans}. Alch: {', '.join(info)}."
            })
        else:
            anims = sorted(s for s, g in groups.items() if g == 'animators')
            a1, a2 = sol[anims[0]], sol[anims[1]]
            hints.append({'level': 3, 'text':
                f"Animators: ingredients {anims} ({ALCH_CODES[a1]}, {ALCH_CODES[a2]}). "
                f"Mix: {fmt_r(MIX_TABLE[a1][a2])}."
            })

    elif k == 'alchemical':
        slot = q['ingredient']; alch = sol[slot]
        direct = [c for c in clues if c.get('ingredient') == slot
                  or c.get('ingredient1') == slot or c.get('ingredient2') == slot]
        w2 = apply_all(all_worlds(), clues, golem)
        remaining  = {w[slot - 1] for w in w2}
        eliminated = sorted(set(ALL_ALCH) - remaining)
        hints.append({'level': 1, 'text':
            f"Identify the alchemical for ingredient {slot}. "
            f"Direct clues: {', '.join(_dc(c) for c in direct) or 'none'}."
        })
        hints.append({'level': 2, 'text':
            f"Eliminated for slot {slot}: {eliminated}. Remaining: {sorted(remaining)}."
        })
        hints.append({'level': 3, 'text':
            f"Ingredient {slot} = {ALCH_CODES[alch]} "
            f"(R{sgn_str(ALCH_DATA[alch]['R'][0])} "
            f"G{sgn_str(ALCH_DATA[alch]['G'][0])} "
            f"B{sgn_str(ALCH_DATA[alch]['B'][0])})."
        })

    elif k == 'solar_lunar':
        slot   = q['ingredient']; alch = sol[slot]
        result = 'Solar' if is_solar(alch) else 'Lunar'
        w2     = apply_all(all_worlds(), clues, golem)
        remaining = {w[slot - 1] for w in w2}
        hints.append({'level': 1, 'text':
            f"Is ingredient {slot} Solar or Lunar? "
            "Solar = 0 or 2 negative aspects {1,3,5,8}, Lunar = 1 or 3 negatives {2,4,6,7}."
        })
        hints.append({'level': 2, 'text':
            f"Remaining alch for slot {slot}: {sorted(remaining)}. "
            f"Solar: {sorted(a for a in remaining if is_solar(a))}. "
            f"Lunar: {sorted(a for a in remaining if not is_solar(a))}."
        })
        hints.append({'level': 3, 'text':
            f"Ingredient {slot} = {ALCH_CODES[alch]}, which is {result.upper()}."
        })

    elif k == 'neutral-partner':
        slot = q['ingredient']
        alch = sol[slot]
        # find the actual neutral partner
        partner_slot = next(s for s in SLOTS if s != slot and MIX_TABLE[sol[s]][alch] == 'neutral')
        partner_alch = sol[partner_slot]
        hints.append({'level': 1, 'text': (
            f"Find the ingredient whose alchemical is the direct opposite of ingredient {slot}. "
            f"Two alchemicals are direct opposites when their mix is always neutral — "
            f"all three colour aspects have opposite signs."
        )})
        hints.append({'level': 2, 'text': (
            f"Ingredient {slot} has alchemical properties: "
            f"R{sgn_str(ALCH_DATA[alch]['R'][0])} G{sgn_str(ALCH_DATA[alch]['G'][0])} B{sgn_str(ALCH_DATA[alch]['B'][0])}. "
            f"Its direct opposite has all signs flipped. "
            f"Check which remaining possible alchemicals always mix to neutral with it."
        )})
        hints.append({'level': 3, 'text': (
            f"Ingredient {slot} = {ALCH_CODES[alch]}. "
            f"Its direct opposite is ingredient {partner_slot} = {ALCH_CODES[partner_alch]}."
        )})

    elif k == 'ingredient-potion-profile':
        slot = q['ingredient']
        alch = sol[slot]
        profile = []
        for s2 in SLOTS:
            if s2 == slot:
                continue
            results = {MIX_TABLE[w[slot - 1]][w[s2 - 1]] for w in worlds}
            if len(results) == 1:
                r = results.pop()
                if r != 'neutral':
                    profile.append(f"ing{s2}→{fmt_r(r)}")
        hints.append({'level': 1, 'text': (
            f"Find all potions that ingredient {slot} can certainly produce. "
            f"Neutral is always certain — every alchemical has a direct opposite, and mixing them always yields neutral. "
            f"For the other potions, a result is 'certain' when it's the same across every remaining possible world."
        )})
        hints.append({'level': 2, 'text': (
            f"Check each of ingredient {slot}'s 7 partners for non-neutral certain results. "
            f"Non-neutral certain results: {', '.join(profile) or 'none yet — keep reducing worlds'}."
        )})
        ans = answer(worlds, q, golem)
        hints.append({'level': 3, 'text':
            f"Ingredient {slot} = {ALCH_CODES[alch]}. Certain potions (neutral always included): {ans}."
        })

    elif k == 'group-possible-potions':
        ingredients = q['ingredients']
        certain = []
        for a, b in itertools.combinations(ingredients, 2):
            results = {MIX_TABLE[w[a - 1]][w[b - 1]] for w in worlds}
            if len(results) == 1:
                certain.append(f"ing{a}+ing{b}→{fmt_r(results.pop())}")
        hints.append({'level': 1, 'text': (
            f"Find all potions certainly achievable by some pair within ingredients {ingredients}. "
            f"Check all {len(list(itertools.combinations(ingredients, 2)))} pair combinations."
        )})
        hints.append({'level': 2, 'text': (
            f"Certain pairs so far: {', '.join(certain) or 'keep reducing worlds'}."
        )})
        ans = answer(worlds, q, golem)
        hints.append({'level': 3, 'text': f"Certain potions for group {ingredients}: {ans}."})

    elif k == 'most-informative-mix':
        slot = q['ingredient']
        alch = sol[slot]
        best_s2 = answer(worlds, q, golem)
        partner_rows = []
        for s2 in SLOTS:
            if s2 == slot:
                continue
            outcomes = sorted({MIX_TABLE[w[slot - 1]][w[s2 - 1]] for w in worlds}, key=str)
            partner_rows.append((len(outcomes), s2, outcomes))
        partner_rows.sort(key=lambda x: (-x[0], x[1]))
        lines = []
        for n_out, s2, outcomes in partner_rows[:6]:
            outcome_str = ', '.join(fmt_r(r) for r in outcomes)
            marker = " ← most informative" if s2 == best_s2 else ""
            lines.append(f"  ing{s2}: {n_out} distinct result{'s' if n_out != 1 else ''} ({outcome_str}){marker}")
        hints.append({'level': 1, 'text': (
            f"The most informative mix partner for ing{slot} is the one whose result "
            f"is most unpredictable — more distinct possible outcomes means more information "
            f"gained from the experiment, since each result rules out different alchemicals."
        )})
        hints.append({'level': 2, 'text': (
            f"Partners ranked by number of possible outcomes:\n" + "\n".join(lines)
        )})
        hints.append({'level': 3, 'text': (
            f"Most informative partner for ing{slot}: ing{best_s2}."
        )})

    elif k == 'guaranteed-non-producer':
        target_str = fmt_r(d2r(q['potion']))
        non_producers = answer(worlds, q, golem) or []
        hints.append({'level': 1, 'text': (
            f"Find all ingredients that can never produce {target_str} with any partner in any remaining world. "
            f"An ingredient is a non-producer if no world/partner combination yields {target_str}."
        )})
        hints.append({'level': 2, 'text': (
            f"Check each ingredient: does any remaining world have this ingredient produce {target_str} "
            f"with some partner? Non-producers found: {non_producers or 'keep checking'}."
        )})
        hints.append({'level': 3, 'text': f"Guaranteed non-producers of {target_str}: {non_producers}."})

    elif k == 'most_informative_book':
        n = len(worlds)
        best_s = answer(worlds, q, golem)
        confirmed_solar = []
        confirmed_lunar = []
        uncertain = []  # (slot, n_solar, n_lunar)
        for s in SLOTS:
            n_solar = sum(1 for w in worlds if is_solar(w[s - 1]))
            n_lunar = n - n_solar
            if n_solar == n:
                confirmed_solar.append(s)
            elif n_lunar == n:
                confirmed_lunar.append(s)
            else:
                uncertain.append((s, n_solar, n_lunar))
        uncertain.sort(key=lambda x: (abs(x[1] - x[2]), x[0]))
        status_lines = []
        if confirmed_solar:
            status_lines.append(f"Confirmed Solar: {', '.join(f'ing{s}' for s in confirmed_solar)}")
        if confirmed_lunar:
            status_lines.append(f"Confirmed Lunar: {', '.join(f'ing{s}' for s in confirmed_lunar)}")
        if uncertain:
            status_lines.append("Still uncertain (Solar / Lunar candidates both possible):")
            for s, n_sol, n_lun in uncertain:
                marker = " ← most balanced" if s == best_s else ""
                status_lines.append(
                    f"  ing{s}: {n_sol} Solar / {n_lun} Lunar alchemicals still consistent{marker}"
                )
        hints.append({'level': 1, 'text': (
            f"The Royal Society book reveals whether an ingredient's alchemical is Solar or Lunar. "
            f"Consulting a confirmed ingredient gives no new information. "
            f"The most useful choice is the ingredient whose Solar/Lunar nature is most uncertain — "
            f"the one most evenly split between the two possibilities."
        )})
        hints.append({'level': 2, 'text': '\n'.join(status_lines)})
        hints.append({'level': 3, 'text': f"Most informative ingredient to consult: ing{best_s}."})

    elif k == 'mixing-result':
        hints = gen_mixing_result_hints(worlds, clues, q, sol, golem)

    elif k == 'possible-potions':
        hints = gen_possible_potions_hints(worlds, clues, q, sol, golem)

    elif k == 'aspect':
        hints = gen_aspect_hints(worlds, clues, q, sol, golem)

    elif k == 'aspect-set':
        hints = gen_aspect_set_hints(worlds, clues, q, sol, golem)

    elif k == 'large-component':
        hints = gen_large_component_hints(worlds, clues, q, sol, golem)

    elif k == 'safe-publish':
        hints = gen_safe_publish_hints(worlds, clues, q, sol, golem)

    elif k == 'encyclopedia_which_aspect':
        entries = q['entries']
        entry_descs = ', '.join(f"ingredient {e['ingredient']} {e['sign']}" for e in entries)
        h1 = (
            f"For each colour R/G/B, check whether all four ingredient–sign pairs "
            f"({entry_descs}) hold across the remaining worlds."
        )
        h2 = (
            "Eliminate any colour where at least one remaining world disagrees. "
            "Only one colour will survive."
        )
        ans_col = answer(worlds, q, golem)
        col_name = {'R': 'Red', 'G': 'Green', 'B': 'Blue'}[ans_col]
        h3 = (
            f"The answer is {ans_col} ({col_name}): every remaining world maps all four "
            f"entries onto the {col_name} aspect."
        )
        hints = [{'level': 1, 'text': h1}, {'level': 2, 'text': h2}, {'level': 3, 'text': h3}]

    else:
        ans = answer(worlds, q, golem)
        if ans == 'not_validated':
            pass  # Debunk plan questions — no auto-generated hints
        else:
            hints.append({'level': 1, 'text': 'Use all clues to eliminate impossible worlds.'})
            hints.append({'level': 2, 'text': 'Apply each clue systematically.'})
            hints.append({'level': 3, 'text': f'Answer: {ans}'})

    return hints

# ── Assembly ──────────────────────────────────────────────────────────────────

TITLES = [
    "The Curious Formula", "A Scholar's Note", "The Hidden Reaction",
    "Whispers of the Archive", "The Alchemist's Deduction", "Trial by Fire",
    "Echoes of the Laboratory", "The Golem Stirs", "Secrets of the Guild",
    "The Dormant Giant", "A Flash of Insight", "The Researcher's Burden",
    "Patterns in the Ash", "The Scholar's Gambit", "The Waking Stone",
    "The Incomplete Article", "Reaction Chains", "The Final Entry",
    "The Sealed Chamber", "Golem Research Notes", "The Third Ingredient",
    "The Alchemist's Test", "An Unexpected Result", "Cross-Reference",
    "The Living Stone", "Second Opinion", "The Missing Entry",
]

DESCS = {
    'encyclopedia_fourth':       "A partial encyclopedia article lists three ingredients on the same aspect. Use the supporting clues to identify the fourth.",
    'encyclopedia_which_aspect': "Four ingredient–sign pairs form a valid encyclopedia article. All the clue types are in play — deduce which aspect colour they share.",
    'golem_group':               "The golem has been tested with several ingredients. Deduce the reaction pattern and identify the target group.",
    'golem_animate_potion':      "The golem stirred during testing. Identify the animators and determine what potion their mix would produce.",
    'alchemical':                "Use the clues to deduce which alchemical belongs to the target ingredient.",
    'solar_lunar':               "Use the clues to determine whether the target ingredient is Solar or Lunar.",
    'mixing-result':             "Mixing, selling, and debunking records all point toward a single pair. Deduce what potion they produce.",
    'aspect':                    "Multiple clue types constrain the world. Identify the sign of the target colour aspect.",
    'possible-potions':          "The evidence narrows things down — but not all the way. Mark every potion this pair could still produce.",
    'neutral-partner':           "Use the clues to identify the one ingredient that always mixes to neutral with the target ingredient.",
    'ingredient-potion-profile': "Determine all potions that the target ingredient can certainly produce when mixed with at least one partner.",
    'group-possible-potions':    "Identify all potions that can be certainly produced by some pair within the listed ingredient group.",
    'most-informative-mix':      "Decide which partner provides the most information (maximum entropy) when mixed with the target ingredient.",
    'guaranteed-non-producer':   "Find all ingredients that can never produce the target potion with any partner in any remaining world.",
    'most_informative_book':     "Use the clues to decide which ingredient reveals the most information when consulted in the Royal Society book.",
    'debunk_min_steps':          "Mixed evidence surrounds several suspicious publications. Use master debunking to expose the lies.",
}

EXP_PUZZLE_DIR = Path(__file__).parent.parent / 'src' / 'expanded' / 'data' / 'puzzles'
BASE_PUZZLE_DIR = Path(__file__).parent.parent / 'src' / 'data' / 'puzzles'


def _next_num(prefix: str, out_dir: Path) -> int:
    nums = [int(f.stem.split('-')[-1]) for f in out_dir.glob(f"{prefix}-*.json")
            if f.stem.split('-')[-1].isdigit()]
    return max(nums, default=1) + 1


_EXPANDED_MECHANICS = {'encyclopedia', 'solar_lunar', 'golem'}

def is_base_profile(profile: Profile) -> bool:
    """True when the puzzle belongs in BASE_PUZZLE_DIR (no mode='expanded')."""
    return not any(m in _EXPANDED_MECHANICS for m in profile.mechanics)

def assemble(raw: dict, profile: Profile, num: int, rng: random.Random) -> dict:
    hints = gen_hints(raw)
    sc    = compute_difficulty({
        'clues': raw['clues'], 'questions': [raw['q']], 'golem': raw['golem'],
    })
    is_base = is_base_profile(profile)
    golem_sec = {'golem': raw['golem']} if raw['golem'] else {}
    desc = DESCS.get(profile.question_kind, "Use the clues to answer the question.")
    if profile.question_kind in ('golem_group', 'golem_animate_potion'):
        nt   = sum(1 for c in raw['clues'] if c['kind'] == 'golem_test')
        desc = (f"The golem has been tested with {nt} ingredient{'s' if nt != 1 else ''}. "
                + desc.split('. ', 1)[1])
    difficulty = profile.difficulty
    if not is_base and difficulty != 'tutorial':
        pip = score_to_pip(sc['score'])
        difficulty = difficulty_for({'clues': raw['clues'], 'mode': 'expanded'}, pip)
    puz = {
        'id':          f"{profile.id_prefix}-{num:02d}",
        'title':       rng.choice(TITLES),
        'description': desc,
        'difficulty':  difficulty,
        **golem_sec,
        'clues':     raw['clues'],
        'questions': raw.get('_debunk_questions', [raw['q']]),
        'solution':  raw['_sol_str'],
        'hints':     hints,
        'complexity': sc,
    }
    # Debunk-specific fields
    if raw.get('_debunk_publications') is not None:
        puz['publications'] = raw['_debunk_publications']
    if raw.get('_debunk_answers'):
        puz['debunk_answers'] = raw['_debunk_answers']
    if raw.get('_debunk_articles'):
        puz['articles'] = raw['_debunk_articles']
    if not is_base_profile(profile):
        puz['mode'] = 'expanded'
        if profile.question_kind in DEBUNK_QUESTION_KINDS:
            puz['kind'] = 'debunk'
        # Insert mode (and kind if present) after id
        ordered = {'id': puz.pop('id'), 'mode': puz.pop('mode')}
        if 'kind' in puz:
            ordered['kind'] = puz.pop('kind')
        puz = {**ordered, **puz}
    return puz

# ══════════════════════════════════════════════════════════════════════════════
# SUBCOMMAND: generate
# ══════════════════════════════════════════════════════════════════════════════

def cmd_generate(args):
    if args.profiles:
        print("Available profiles:\n")
        for name, p in PROFILES.items():
            print(f"  {name:35s}  {p.difficulty:8s}  "
                  f"q={p.question_kind:30s}  "
                  f"golem={'yes' if p.has_golem else 'no '}  "
                  f"max_clues={p.max_clues}")
        return

    if not args.profile:
        print("Specify --profile NAME or --profiles to list options.")
        sys.exit(1)

    pname = args.profile
    if pname not in PROFILES:
        print(f"Unknown profile '{pname}'. Use --profiles to list.")
        sys.exit(1)

    profile = PROFILES[pname]
    rng     = random.Random(args.seed)
    count   = args.count
    print(f"Generating {count} puzzle(s)  [{pname}]  difficulty={profile.difficulty}")

    generated = 0
    attempts  = 0
    while generated < count and attempts < count * 200:
        attempts += 1
        if args.verbose:
            print(f"\n[attempt {attempts}]")

        raw = construct(profile, rng, verbose=args.verbose)
        if raw is None:
            continue
        raw = minimize(raw, profile=profile, verbose=args.verbose)

        tmp  = assemble(raw, profile, 0, rng)
        errs = validate_puzzle(tmp)
        if any(e.startswith('ERROR') for e in errs):
            if args.verbose:
                print(f"  → rejected: {[e for e in errs if e.startswith('ERROR')]}")
            continue

        out_dir = BASE_PUZZLE_DIR if is_base_profile(profile) else EXP_PUZZLE_DIR
        num = _next_num(profile.id_prefix, out_dir)
        puz = assemble(raw, profile, num, rng)
        puz['id'] = f"{profile.id_prefix}-{num:02d}"
        (out_dir / f"{puz['id']}.json").write_text(json.dumps(puz, indent=2))

        warns = [e for e in errs if e.startswith('WARNING')]
        print(f"  ✓  {puz['id']}  clues={len(raw['clues'])}  "
              f"worlds={len(raw['worlds'])}  raw={puz['complexity']['raw_score']:.2f}")
        for w in warns:
            print(f"     {w}")
        generated += 1

    if generated < count:
        print(f"\nWarning: only generated {generated}/{count} after {attempts} attempts.")

# ══════════════════════════════════════════════════════════════════════════════
# SUBCOMMAND: analyze  (base-game puzzles)
# ══════════════════════════════════════════════════════════════════════════════

def cmd_analyze(_args):
    files = sorted(BASE_PUZZLE_DIR.glob('*.json'))
    files = [f for f in files if f.name != 'collections.json']
    pairs = [(f, json.loads(f.read_text())) for f in files]

    print("Computing difficulty for base-game puzzles …")
    results = {}
    for f, puz in pairs:
        pid = puz['id']
        print(f"  {pid} …", end=' ', flush=True)
        d = compute_difficulty(puz)
        results[pid] = (f, puz, d)
        print(f"score={d['score']:3d}(raw={d['raw_score']:3d})  "
              f"clue={d['clue_score']:2d}  q={d['question_score']:3d}  "
              f"world={d['world_score']:2d}  worlds={d['residual_worlds']}")

    def pips_for(pid):
        if pid.startswith('tutorial'):
            return 1
        return score_to_pip(results[pid][2]['score'])

    print("\n── Results sorted by score ───────────────────────────────────────────────")
    print(f"{'ID':30s}  {'score':>5}  {'pip':>3}  {'clue':>4}  {'q':>3}  {'world':>5}  title")
    for pid, (f, puz, d) in sorted(results.items(), key=lambda x: x[1][2]['score']):
        p = pips_for(pid)
        print(f"{pid:30s}  {d['score']:5d}  {p:3d}  {d['clue_score']:4d}  "
              f"{d['question_score']:3d}  {d['world_score']:5d}  "
              f"{puz.get('title', '')}")

    print("\nWriting back …")
    for pid, (f, puz, d) in results.items():
        pip = pips_for(pid)
        puz['complexity'] = {
            'score':          d['score'],
            'raw_score':      d['raw_score'],
            'clue_score':     d['clue_score'],
            'question_score': d['question_score'],
            'world_score':    d['world_score'],
            'residual_worlds': d['residual_worlds'],
        }
        if not pid.startswith('tutorial'):
            puz['difficulty'] = difficulty_for(puz, pip)
        f.write_text(json.dumps(puz, indent=2))

    colls_file = BASE_PUZZLE_DIR / 'collections.json'
    if colls_file.exists():
        colls = json.loads(colls_file.read_text())
        print("\n── Collection pip distribution ───────────────────────────────────────────")
        for c in colls:
            pids     = c.get('puzzleIds', [])
            pip_list = sorted(pips_for(p) for p in pids if p in results)
            if not pip_list:
                continue
            med_pip = pip_list[len(pip_list) // 2]
            avg_pip = sum(pip_list) / len(pip_list)
            tier    = TIER.get(med_pip, '?')
            current = c.get('difficulty', '?')
            spread  = max(pip_list) - min(pip_list)
            flags   = []
            # 'extreme' is the non-compliant variant of 'expert' — treat as a match
            effective_tier = 'extreme' if (tier == 'expert' and not c.get('boardGameCompliant', True)) else tier
            if effective_tier != current and current != 'tutorial':
                flags.append('MISMATCH')
            if spread > 2:
                flags.append('SPLIT SUGGESTED')
            flag = ('  ← ' + ' + '.join(flags)) if flags else ''
            print(f"  {c['id']:30s}  current={current:8s}  computed={effective_tier:8s}  "
                  f"avg={avg_pip:.1f}  spread={spread}  pips={pip_list}{flag}")

    print("\nDone.")

# ══════════════════════════════════════════════════════════════════════════════
# SUBCOMMAND: analyze-expanded
# ══════════════════════════════════════════════════════════════════════════════

def cmd_analyze_expanded(_args):
    files = sorted(EXP_PUZZLE_DIR.glob('*.json'))
    files = [f for f in files if f.name != 'collections.json']
    pairs = [(f, json.loads(f.read_text())) for f in files]

    print("Computing difficulty for expanded puzzles …")
    results = {}
    for f, puz in pairs:
        pid = puz['id']
        print(f"  {pid} …", end=' ', flush=True)
        d = compute_difficulty(puz)
        results[pid] = (f, puz, d)
        print(f"score={d['score']:3d}(raw={d['raw_score']:3d})  "
              f"clue={d['clue_score']:2d}  q={d['question_score']:3d}  "
              f"world={d['world_score']:2d}  worlds={d['residual_worlds']}")

    def pips_for_exp(pid):
        if 'tutorial' in pid:
            return 1
        return score_to_pip(results[pid][2]['score'])

    print("\n── Results sorted by score ───────────────────────────────────────────────")
    print(f"{'ID':35s}  {'score':>5}  {'pip':>3}  {'clue':>4}  {'q':>3}  {'world':>5}  title")
    for pid, (f, puz, d) in sorted(results.items(), key=lambda x: x[1][2]['score']):
        p = pips_for_exp(pid)
        print(f"{pid:35s}  {d['score']:5d}  {p:3d}  {d['clue_score']:4d}  "
              f"{d['question_score']:3d}  {d['world_score']:5d}  "
              f"{puz.get('title', '')}")

    print("\nWriting back …")
    for pid, (f, puz, d) in results.items():
        is_tutorial = 'tutorial' in pid
        pip = 1 if is_tutorial else score_to_pip(d['score'])
        puz['complexity'] = {
            'score':          d['score'],
            'raw_score':      d['raw_score'],
            'clue_score':     d['clue_score'],
            'question_score': d['question_score'],
            'world_score':    d['world_score'],
            'residual_worlds': d['residual_worlds'],
        }
        if not is_tutorial:
            puz['difficulty'] = difficulty_for(puz, pip)
        f.write_text(json.dumps(puz, indent=2))

    colls_file = EXP_PUZZLE_DIR / 'collections.json'
    if colls_file.exists():
        colls = json.loads(colls_file.read_text())
        print("\n── Collection pip distribution ───────────────────────────────────────────")
        for c in colls:
            pids     = c.get('puzzleIds', [])
            pip_list = sorted(
                pips_for_exp(p)
                for p in pids if p in results and 'tutorial' not in p
            )
            if not pip_list:
                continue
            med_pip = pip_list[len(pip_list) // 2]
            avg_pip = sum(pip_list) / len(pip_list)
            tier    = TIER.get(med_pip, '?')
            current = c.get('difficulty', '?')
            spread  = max(pip_list) - min(pip_list)
            flags   = []
            if tier != current and current != 'tutorial':
                flags.append('MISMATCH')
            if spread > 2:
                flags.append('SPLIT SUGGESTED')
            flag = ('  ← ' + ' + '.join(flags)) if flags else ''
            print(f"  {c['id']:35s}  current={current:8s}  computed={tier:8s}  "
                  f"avg={avg_pip:.1f}  spread={spread}  pips={pip_list}{flag}")

    print("\nDone.")


# ══════════════════════════════════════════════════════════════════════════════
# SUBCOMMAND: validate  (expanded puzzles)
# ══════════════════════════════════════════════════════════════════════════════

def cmd_validate(_args):
    all_json = sorted(EXP_PUZZLE_DIR.glob('*.json'))
    puzzles = [f for f in all_json if f.name != 'collections.json']
    print(f"Validating {len(puzzles)} expanded puzzle(s) …\n")
    all_ok = True
    for f in puzzles:
        puz  = json.loads(f.read_text())
        errs = validate_puzzle(puz)
        icon = '✓' if not any(e.startswith('ERROR') for e in errs) else '✗'
        print(f"{icon}  {puz['id']}")
        for e in errs:
            print(f"    {e}")
        if any(e.startswith('ERROR') for e in errs):
            all_ok = False
    print('\n' + ('All puzzles valid.' if all_ok else 'ERRORS found — see above.'))

# ══════════════════════════════════════════════════════════════════════════════
# SUBCOMMAND: regen-hints
# ══════════════════════════════════════════════════════════════════════════════

def _build_raw_for_puzzle(puz: dict) -> Optional[dict]:
    """Build the raw dict that gen_hints expects from a loaded puzzle JSON."""
    sol_raw = puz.get('solution', {})
    if not sol_raw:
        return None
    sol   = {int(k): v for k, v in sol_raw.items()}
    golem = puz.get('golem')
    clues = puz.get('clues', [])
    worlds = apply_all(all_worlds(), clues, golem)
    return {'sol': sol, 'golem': golem, 'clues': clues, 'worlds': worlds}


def _puzzle_files(args) -> list:
    """Return list of Path objects based on args.all / args.files."""
    if args.all:
        files = (sorted(BASE_PUZZLE_DIR.glob('*.json'))
                 + sorted(EXP_PUZZLE_DIR.glob('*.json')))
        return [f for f in files if f.name != 'collections.json']
    return [Path(f) for f in args.files]


def cmd_regen_hints(args):
    files   = _puzzle_files(args)
    updated = skipped = 0

    for f in files:
        puz = json.loads(f.read_text())
        pid = puz.get('id', f.stem)

        if not args.include_tutorials and puz.get('difficulty') == 'tutorial':
            skipped += 1
            continue

        if args.missing_only and puz.get('hints'):
            skipped += 1
            continue

        questions = puz.get('questions', [])
        if not questions:
            skipped += 1
            continue

        raw = _build_raw_for_puzzle(puz)
        if raw is None:
            print(f"  SKIP {pid}: no solution")
            skipped += 1
            continue

        # Generate hints per question, renumber levels sequentially
        all_hints   = []
        level_offset = 0
        for q in questions:
            q_raw  = dict(raw, q=q)
            q_hints = gen_hints(q_raw)
            for h in q_hints:
                all_hints.append({'level': h['level'] + level_offset, 'text': h['text']})
            if q_hints:
                level_offset += max(h['level'] for h in q_hints)

        puz['hints'] = all_hints
        f.write_text(json.dumps(puz, indent=2))
        print(f"  ✓  {pid}: {len(all_hints)} hint level(s)")
        updated += 1

    print(f"\nUpdated {updated} file(s), skipped {skipped}.")

# ══════════════════════════════════════════════════════════════════════════════
# SUBCOMMAND: check-hints
# ══════════════════════════════════════════════════════════════════════════════

def cmd_check_hints(args):
    files  = _puzzle_files(args)
    wrong  = checked = 0

    for f in files:
        puz   = json.loads(f.read_text())
        pid   = puz.get('id', f.stem)
        hints = puz.get('hints')
        if not hints:
            continue

        sol_raw = puz.get('solution', {})
        if not sol_raw:
            continue
        sol   = {int(k): v for k, v in sol_raw.items()}
        golem = puz.get('golem')
        clues = puz.get('clues', [])
        worlds = apply_all(all_worlds(), clues, golem)
        questions = puz.get('questions', [])
        if not questions:
            continue

        total_levels = max(h['level'] for h in hints)
        num_q        = len(questions)
        # For regenerated hints: N questions × 3 levels each → block of 3 per question.
        # Determine per-question last level.  If total_levels is divisible by num_q, each
        # question occupies (total_levels // num_q) levels and we can pin-point each block.
        # Otherwise (hand-crafted hints with uneven distribution) fall back to max_level.
        if num_q > 0 and total_levels % num_q == 0:
            levels_per_q = total_levels // num_q
        else:
            levels_per_q = None  # fallback: use max_level for all

        def _last_text_for_q(qi: int) -> str:
            if levels_per_q is not None:
                target = (qi + 1) * levels_per_q
            else:
                target = total_levels
            raw = ' '.join(h['text'] for h in hints if h['level'] == target)
            return raw.replace('\u2212', '-')   # U+2212 → ASCII hyphen

        for qi, q in enumerate(questions):
            k   = q['kind']
            ans = answer(worlds, q, golem)
            if ans is None:
                continue

            expected = []
            if k == 'mixing-result':
                expected.append(fmt_r(ans))
            elif k == 'possible-potions':
                expected.extend(fmt_r(r) for r in ans)
            elif k == 'aspect':
                expected.append(q['color'] + sgn_str(ans))
            elif k == 'alchemical':
                expected.append(ALCH_CODES[ans])
            elif k == 'neutral-partner':
                expected.append(str(ans))
            elif k == 'safe-publish':
                expected.append(ans)
            elif k == 'encyclopedia_which_aspect':
                expected.append(ans)   # ans is a color string like 'G'
            # aspect-set / large-component / set-type answers: skip token check
            else:
                checked += 1
                continue

            last_text  = _last_text_for_q(qi)
            last_lower = last_text.lower()
            missing = [t for t in expected
                       if t not in last_text and t.lower() not in last_lower]
            if missing:
                print(f"  WRONG  {pid}  q={k}  missing={missing}  "
                      f"last_hint={last_text[:120]!r}")
                wrong += 1
            else:
                checked += 1

    print(f"\nChecked {checked} question(s). Wrong/stale hints: {wrong}.")
    if wrong > 0:
        sys.exit(1)

def cmd_migrate_conflict_answers(_args):
    """Recompute debunk_conflict_only reference answers for all existing puzzles
    using the new multi-step _find_conflict_cover logic."""
    import pathlib
    dirs = [
        pathlib.Path('src/data/puzzles'),
        pathlib.Path('src/expanded/data/puzzles'),
    ]
    updated = 0
    for d in dirs:
        for path in sorted(d.glob('*.json')):
            if path.name == 'collections.json':
                continue
            puz = json.loads(path.read_text())
            questions = puz.get('questions', [])
            if not any(q.get('kind') == 'debunk_conflict_only' for q in questions):
                continue
            pubs = [p for p in (puz.get('publications') or []) if p]
            if not pubs:
                continue
            sol = {int(k): v for k, v in puz['solution'].items()}
            pub_map = {p['ingredient']: p['claimedAlchemical'] for p in pubs}
            cover = _find_conflict_cover(sol, pub_map, set())
            if cover is None:
                # No full cover possible — remove debunk_conflict_only from this puzzle
                puz['questions'] = [q for q in questions if q.get('kind') != 'debunk_conflict_only']
                if 'debunk_answers' in puz and 'debunk_conflict_only' in puz['debunk_answers']:
                    del puz['debunk_answers']['debunk_conflict_only']
                path.write_text(json.dumps(puz, indent=2) + '\n')
                print(f'  removed debunk_conflict_only (no full cover): {path.name}')
                updated += 1
                continue
            new_answer = [{'kind': 'master', 'ingredient1': a, 'ingredient2': b} for a, b in cover]
            old_answer = puz.get('debunk_answers', {}).get('debunk_conflict_only', [])
            if new_answer == old_answer:
                continue
            # Update answer
            puz.setdefault('debunk_answers', {})['debunk_conflict_only'] = new_answer
            # Update fixedIngredient in the question
            fixed = cover[0][0]
            for q in questions:
                if q.get('kind') == 'debunk_conflict_only':
                    q['fixedIngredient'] = fixed
            path.write_text(json.dumps(puz, indent=2) + '\n')
            print(f'  updated {path.name}: {len(old_answer)} → {len(new_answer)} step(s)')
            updated += 1
    print(f'\nDone. {updated} puzzle(s) updated.')


def cmd_recompute_debunk_answers(_args):
    """Recompute debunk_min_steps reference answers for all existing puzzles
    using the fixed _find_removal_plan / _find_removal_plan_expanded logic."""
    import pathlib
    dirs = [
        pathlib.Path('src/data/puzzles'),
        pathlib.Path('src/expanded/data/puzzles'),
    ]
    updated = 0
    for d in dirs:
        is_exp = 'expanded' in str(d)
        for path in sorted(d.glob('*.json')):
            if path.name == 'collections.json':
                continue
            puz = json.loads(path.read_text())
            questions = puz.get('questions', [])
            if not any(q.get('kind') == 'debunk_min_steps' for q in questions):
                continue
            sol = {int(k): v for k, v in puz['solution'].items()}
            # Reconstruct worlds from clues to get definitively-known set
            clues = puz.get('clues', [])
            golem = puz.get('golem')
            worlds = apply_all(all_worlds(), clues, golem)
            known = _definitively_known(worlds, sol)
            # pub_map = only the FALSE publications
            pubs = [p for p in (puz.get('publications') or []) if p]
            pub_map = {p['ingredient']: p['claimedAlchemical']
                       for p in pubs if p['claimedAlchemical'] != sol[p['ingredient']]}
            if not pub_map:
                continue
            if is_exp:
                articles = puz.get('articles') or []
                new_plan = _find_removal_plan_expanded(sol, pub_map, articles, known)
            else:
                new_plan = _find_removal_plan(sol, pub_map, known)
            if new_plan is None:
                print(f'  WARN: no plan found for {path.name}')
                continue
            old_plan = puz.get('debunk_answers', {}).get('debunk_min_steps', [])
            if len(new_plan) == len(old_plan):
                continue
            puz.setdefault('debunk_answers', {})['debunk_min_steps'] = new_plan
            path.write_text(json.dumps(puz, indent=2) + '\n')
            print(f'  {path.name}: {len(old_plan)} → {len(new_plan)} step(s)')
            updated += 1
    print(f'\nDone. {updated} puzzle(s) updated.')


# ══════════════════════════════════════════════════════════════════════════════
# ENTRY POINT
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='Alchemydoku puzzle toolchain',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    sub = parser.add_subparsers(dest='cmd')

    # generate
    gen_p = sub.add_parser('generate', help='Generate expanded puzzles')
    gen_p.add_argument('--profile',  help='Profile name')
    gen_p.add_argument('--profiles', action='store_true', help='List profiles and exit')
    gen_p.add_argument('--count',    type=int, default=1)
    gen_p.add_argument('--seed',     type=int, default=None)
    gen_p.add_argument('--verbose',  action='store_true')

    # analyze
    sub.add_parser('analyze', help='Score difficulty of base-game puzzles and align difficulty labels')

    # analyze-expanded
    sub.add_parser('analyze-expanded', help='Score difficulty of expanded puzzles and align difficulty labels')

    # validate
    sub.add_parser('validate', help='Validate expanded puzzles')

    # regen-hints
    rh_p = sub.add_parser('regen-hints', help='Regenerate hints for puzzle files')
    rh_p.add_argument('files', nargs='*', help='Puzzle JSON file paths')
    rh_p.add_argument('--all',              action='store_true', help='Process all base + expanded puzzles')
    rh_p.add_argument('--missing-only',     action='store_true', help='Only update puzzles that have no hints')
    rh_p.add_argument('--include-tutorials',action='store_true', help='Allow overwriting tutorial-difficulty puzzles')

    # check-hints
    ch_p = sub.add_parser('check-hints', help='Detect wrong/stale hints in puzzle files')
    ch_p.add_argument('files', nargs='*', help='Puzzle JSON file paths')
    ch_p.add_argument('--all', action='store_true', help='Check all base + expanded puzzles')

    # migrate-conflict-answers
    sub.add_parser('migrate-conflict-answers',
                   help='Recompute debunk_conflict_only reference answers for all puzzles')

    # recompute-debunk-answers
    sub.add_parser('recompute-debunk-answers',
                   help='Recompute debunk_min_steps reference answers using fixed BFS logic')

    args = parser.parse_args()

    if args.cmd == 'generate':
        cmd_generate(args)
    elif args.cmd == 'analyze':
        cmd_analyze(args)
    elif args.cmd == 'analyze-expanded':
        cmd_analyze_expanded(args)
    elif args.cmd == 'validate':
        cmd_validate(args)
    elif args.cmd == 'regen-hints':
        cmd_regen_hints(args)
    elif args.cmd == 'check-hints':
        cmd_check_hints(args)
    elif args.cmd == 'migrate-conflict-answers':
        cmd_migrate_conflict_answers(args)
    elif args.cmd == 'recompute-debunk-answers':
        cmd_recompute_debunk_answers(args)
    else:
        parser.print_help()
