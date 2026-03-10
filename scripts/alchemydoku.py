#!/usr/bin/env python3
"""
alchemydoku.py  —  Puzzle toolchain for Alchemydoku.

Subcommands:
  generate   Generate new expanded puzzles from a profile
  analyze    Score difficulty of base-game puzzles and write back
  validate   Validate existing expanded puzzles

Usage:
  python scripts/alchemydoku.py generate --profile easy_enc --count 3
  python scripts/alchemydoku.py generate --profile tutorial_golem --seed 42 --verbose
  python scripts/alchemydoku.py generate --profiles
  python scripts/alchemydoku.py analyze
  python scripts/alchemydoku.py validate

Available generate profiles:
  tutorial_golem, easy_enc, easy_sl, easy_golem,
  medium_enc_sl, medium_golem_enc, medium_golem_sl,
  hard_all, hard_golem_mix
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

def is_solar(a: int) -> bool: return a % 2 == 1
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

    # Display-only: golem_hint_color, golem_hint_size — no world filtering
    return worlds

def apply_all(worlds: frozenset, clues: list, golem: Optional[dict] = None) -> frozenset:
    for c in clues:
        worlds = filter_clue(worlds, c, golem)
    return worlds

# ══════════════════════════════════════════════════════════════════════════════
# QUESTION ANSWERING  (base + expanded question kinds)
# ══════════════════════════════════════════════════════════════════════════════

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
        return frozenset(MIX_TABLE[w[i1]][w[i2]] for w in worlds)

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
        anim_sets = [frozenset(s for s in SLOTS if rgroup(w[s - 1], golem) == 'animators')
                     for w in worlds]
        if len(set(anim_sets)) != 1:
            return None
        anims = sorted(anim_sets[0])
        if len(anims) != 2:
            return None
        results = {MIX_TABLE[w[anims[0] - 1]][w[anims[1] - 1]] for w in worlds}
        return results.pop() if len(results) == 1 else None

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

    return None

def all_answered(worlds: frozenset, questions: list, golem: Optional[dict] = None) -> bool:
    return all(answer(worlds, q, golem) is not None for q in questions)

# ══════════════════════════════════════════════════════════════════════════════
# DIFFICULTY SCORING  (used by both 'analyze' and 'generate')
# ══════════════════════════════════════════════════════════════════════════════

# Base-game clue type penalties (from analyze_difficulty.py)
CLUE_TYPE_PENALTY = {
    'mixing': 0.0, 'assignment': 0.0, 'aspect': 0.3, 'sell': 0.0, 'debunk': 0.0,
}
SELL_PENALTY = {'total_match': 0.0, 'sign_ok': 0.4, 'neutral': 0.8, 'opposite': 0.6}

# Expanded surcharges (from PUZZLE_GENERATION.md §3)
Q_SURCHARGE = {
    'alchemical': 0.0, 'mixing-result': 0.0, 'aspect': 0.0, 'solar_lunar': 0.2,
    'safe-publish': 0.3, 'possible-potions': 0.8, 'aspect-set': 0.5, 'large-component': 0.5,
    'encyclopedia_fourth': 0.3, 'encyclopedia_which_aspect': 0.5,
    'golem_group': 0.5, 'golem_animate_potion': 0.8,
    'golem_mix_potion': 1.0, 'golem_possible_potions': 1.2,
}


def clue_strengths(clues: list, golem: Optional[dict] = None):
    """Log2 world-reduction per clue. Returns (strengths, final_worlds)."""
    worlds = all_worlds()
    strengths = []
    for c in clues:
        before = len(worlds)
        worlds  = filter_clue(worlds, c, golem)
        after   = len(worlds)
        strengths.append(math.log2(before / after) if 0 < after < before else 0.0)
    return strengths, worlds


def simulate_chain(worlds: frozenset, questions: list, golem: Optional[dict] = None,
                   max_depth: int = 10):
    """
    Simulate naked-single propagation.
    Returns (depth_to_answer, complement_needed, stuck).
    """
    confirmed: dict = {}
    current = set(worlds)

    if all_answered(current, questions, golem):
        return 0, False, False

    for depth in range(1, max_depth + 1):
        newly = {}
        for slot in range(8):
            if slot in confirmed:
                continue
            poss = {w[slot] for w in current}
            if len(poss) == 1:
                newly[slot] = next(iter(poss))

        if not newly:
            complement = _complement_unlocks(current, confirmed, questions, golem)
            return depth, complement, True

        confirmed.update(newly)
        for slot, alch in newly.items():
            current = {w for w in current if w[slot] == alch}

        if all_answered(current, questions, golem):
            return depth, False, False

    return max_depth, True, True


def _complement_unlocks(worlds, confirmed_slots, questions, golem):
    unconfirmed = [s for s in range(8) if s not in confirmed_slots]
    if not unconfirmed:
        return False
    for col in COLORS:
        for sgn in (+1, -1):
            matching = {a for a in ALL_ALCH if ALCH_DATA[a][col][0] == sgn}
            assigned = {confirmed_slots[s] for s in confirmed_slots if confirmed_slots[s] in matching}
            remaining = matching - assigned
            if len(remaining) == 1:
                lone = next(iter(remaining))
                for slot in unconfirmed:
                    poss = {w[slot] for w in worlds}
                    if lone in poss and len(poss) > 1:
                        new_worlds = {w for w in worlds if w[slot] == lone}
                        if all_answered(new_worlds, questions, golem):
                            return True
    return False


def compute_difficulty(puzzle: dict) -> dict:
    """Unified difficulty scorer for base-game and expanded puzzles."""
    clues     = puzzle.get('clues', [])
    questions = puzzle.get('questions', [])
    golem     = puzzle.get('golem')

    strengths, final_worlds = clue_strengths(clues, golem)
    avg_strength = sum(strengths) / len(strengths) if strengths else 0.0

    # Base-game ambiguity penalty
    total_penalty = 0.0
    for c in clues:
        p = CLUE_TYPE_PENALTY.get(c['kind'], 0.0)
        if c['kind'] == 'sell':
            p += SELL_PENALTY.get(c.get('sellResult', ''), 0.0)
        total_penalty += p
    ambig_penalty = total_penalty / len(clues) if clues else 0.0

    depth, complement, stuck = simulate_chain(final_worlds, questions, golem)

    # Question/mechanic surcharges for expanded puzzles
    q_sur  = max(Q_SURCHARGE.get(q['kind'], 0.0) for q in questions) if questions else 0.0
    has_enc    = any(c['kind'] in ('encyclopedia', 'encyclopedia_uncertain') for c in clues)
    has_golem  = any(c['kind'] == 'golem_test' for c in clues)
    has_sl     = any(c['kind'] == 'book' for c in clues)
    m_sur = 0.0
    if has_golem and has_enc: m_sur += 1.8
    elif has_golem:           m_sur += 0.8
    elif has_enc:             m_sur += 0.5
    if has_sl:                m_sur += 0.3

    enum = any(q['kind'] in {'possible-potions', 'aspect-set', 'large-component',
                              'golem_possible_potions'} for q in questions)

    raw = (
        (1.0 / (avg_strength + 0.5)) * 4.0
        + ambig_penalty * 2.0
        + depth * 1.5
        + (2.0 if complement else 0.0)
        + (1.0 if enum else 0.0)
        + q_sur
        + m_sur
    )

    return {
        'raw':                           round(raw, 3),
        'avg_clue_strength':             round(avg_strength, 3),
        'ambig_penalty':                 round(ambig_penalty, 3),
        'chain_depth':                   depth,
        'stuck':                         stuck,
        'requires_complement_set':       complement,
        'question_requires_enumeration': enum,
        'residual_worlds':               len(final_worlds),
    }


def to_pips(score: float, all_scores: list) -> int:
    rank = sum(1 for s in all_scores if s < score) / len(all_scores)
    if rank < 0.20: return 1
    if rank < 0.40: return 2
    if rank < 0.60: return 3
    if rank < 0.80: return 4
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

    for i, c in enumerate(clues):
        if i in anchor_idx:
            continue
        reduced = clues[:i] + clues[i + 1:]
        w2 = apply_all(all_worlds(), reduced, golem)
        if all(answer(w2, q, golem) is not None for q in questions):
            errs.append(f"WARNING: clue {i} ({c['kind']}) is redundant")

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

PROFILES = {
    'tutorial_golem':    Profile('exp-tutorial-golem',    ['base', 'golem'],                      'golem_group',          'tutorial', 6,  True,  {'group': 'animators'}),
    'easy_enc':          Profile('exp-easy-enc',          ['base', 'encyclopedia'],               'encyclopedia_fourth',  'easy',     10, False),
    'easy_sl':           Profile('exp-easy-sl',           ['base', 'solar_lunar'],                'alchemical',           'easy',     7,  False),
    'easy_golem':        Profile('exp-easy-golem',        ['base', 'golem'],                      'golem_group',          'easy',     8,  True,  {'group': 'animators'}),
    'medium_enc_sl':     Profile('exp-medium-enc-sl',     ['base', 'encyclopedia', 'solar_lunar'], 'encyclopedia_fourth', 'medium',   12, False),
    'medium_golem_enc':  Profile('exp-medium-golem-enc',  ['base', 'encyclopedia', 'golem'],       'golem_group',         'medium',   12, True,  {'group': 'animators'}),
    'medium_golem_sl':   Profile('exp-medium-golem-sl',   ['base', 'golem', 'solar_lunar'],        'golem_animate_potion','medium',   10, True),
    'hard_all':          Profile('exp-hard-all',          ['base', 'encyclopedia', 'golem', 'solar_lunar'], 'golem_group', 'hard',  15, True,  {'group': 'animators'}),
    'hard_golem_mix':    Profile('exp-hard-golem-mix',    ['base', 'golem'],                       'golem_animate_potion','hard',    10, True),
}

# ── Clue pool ─────────────────────────────────────────────────────────────────

def candidate_pool(mechanics: list, sol: dict, golem: Optional[dict],
                   blocked_enc: set) -> list:
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
            pool.append(('book', 8, {'kind': 'book', 'ingredient': s,
                                      'result': 'solar' if is_solar(sol[s]) else 'lunar'}))
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

    if k == 'alchemical':
        return {'kind': 'alchemical', 'ingredient': rng.choice(SLOTS)}, None, set()

    if k == 'solar_lunar':
        return {'kind': 'solar_lunar', 'ingredient': rng.choice(SLOTS)}, None, set()

    if k == 'golem_group':
        grp = profile.question_params.get('group', 'animators')
        return {'kind': 'golem_group', 'group': grp}, None, set()

    if k == 'golem_animate_potion':
        return {'kind': 'golem_animate_potion'}, None, set()

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

    pool = candidate_pool(profile.mechanics, sol, golem, blocked_enc)
    greedy = [(kd, pri, c2) for kd, pri, c2 in pool
              if kd not in ('golem_hint_color', 'golem_hint_size')]

    for _ in range(profile.max_clues * 5):
        if all_answered(worlds, [q], golem):
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

    if not all_answered(worlds, [q], golem):
        if verbose: print("  [greedy] no unique answer achieved")
        return None

    return {'sol': sol, '_sol_str': {str(k): v for k, v in sol.items()},
            'golem': golem, 'clues': clues, '_anchor': anchor,
            'q': q, 'worlds': worlds}

# ── Minimization ──────────────────────────────────────────────────────────────

def minimize(raw: dict, verbose: bool = False) -> dict:
    clues  = list(raw['clues'])
    golem  = raw['golem']
    q      = raw['q']
    anchor = raw.get('_anchor')

    changed = True
    while changed:
        changed = False
        for i in range(len(clues) - 1, -1, -1):
            if anchor and _ceq(clues[i], anchor):
                continue
            reduced = clues[:i] + clues[i + 1:]
            w = apply_all(all_worlds(), reduced, golem)
            if all_answered(w, [q], golem):
                if verbose: print(f"  [minimize] removed {clues[i]['kind']}")
                clues   = reduced
                changed = True
                break

    raw = dict(raw)
    raw['clues']  = clues
    raw['worlds'] = apply_all(all_worlds(), clues, golem)
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
            "Solar = odd alch IDs {1,3,5,7}, Lunar = even {2,4,6,8}."
        })
        hints.append({'level': 2, 'text':
            f"Remaining alch for slot {slot}: {sorted(remaining)}. "
            f"Solar: {sorted(a for a in remaining if is_solar(a))}. "
            f"Lunar: {sorted(a for a in remaining if not is_solar(a))}."
        })
        hints.append({'level': 3, 'text':
            f"Ingredient {slot} = {ALCH_CODES[alch]}, which is {result.upper()}."
        })

    else:
        ans = answer(worlds, q, golem)
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
    'encyclopedia_fourth':  "A partial encyclopedia article lists three ingredients on the same aspect. Use the supporting clues to identify the fourth.",
    'golem_group':          "The golem has been tested with several ingredients. Deduce the reaction pattern and identify the target group.",
    'golem_animate_potion': "The golem stirred during testing. Identify the animators and determine what potion their mix would produce.",
    'alchemical':           "Use the clues to deduce which alchemical belongs to the target ingredient.",
    'solar_lunar':          "Use the clues to determine whether the target ingredient is Solar or Lunar.",
}

EXP_PUZZLE_DIR = Path(__file__).parent.parent / 'src' / 'expanded' / 'data' / 'puzzles'
BASE_PUZZLE_DIR = Path(__file__).parent.parent / 'src' / 'data' / 'puzzles'


def _next_num(prefix: str, out_dir: Path) -> int:
    nums = [int(f.stem.split('-')[-1]) for f in out_dir.glob(f"{prefix}-*.json")
            if f.stem.split('-')[-1].isdigit()]
    return max(nums, default=1) + 1


def assemble(raw: dict, profile: Profile, num: int, rng: random.Random) -> dict:
    hints = gen_hints(raw)
    sc    = compute_difficulty({
        'clues': raw['clues'], 'questions': [raw['q']], 'golem': raw['golem'],
    })
    golem_sec = {'golem': raw['golem']} if raw['golem'] else {}
    desc = DESCS.get(profile.question_kind, "Use the clues to answer the question.")
    if profile.question_kind in ('golem_group', 'golem_animate_potion'):
        nt   = sum(1 for c in raw['clues'] if c['kind'] == 'golem_test')
        desc = (f"The golem has been tested with {nt} ingredient{'s' if nt != 1 else ''}. "
                + desc.split('. ', 1)[1])
    return {
        'id':          f"{profile.id_prefix}-{num:02d}",
        'mode':        'expanded',
        'title':       rng.choice(TITLES),
        'description': desc,
        'difficulty':  profile.difficulty,
        **golem_sec,
        'clues':     raw['clues'],
        'questions': [raw['q']],
        'solution':  raw['_sol_str'],
        'hints':     hints,
        'complexity': sc,
    }

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
        raw = minimize(raw, verbose=args.verbose)

        tmp  = assemble(raw, profile, 0, rng)
        errs = validate_puzzle(tmp)
        if any(e.startswith('ERROR') for e in errs):
            if args.verbose:
                print(f"  → rejected: {[e for e in errs if e.startswith('ERROR')]}")
            continue

        num = _next_num(profile.id_prefix, EXP_PUZZLE_DIR)
        puz = assemble(raw, profile, num, rng)
        puz['id'] = f"{profile.id_prefix}-{num:02d}"
        (EXP_PUZZLE_DIR / f"{puz['id']}.json").write_text(json.dumps(puz, indent=2))

        warns = [e for e in errs if e.startswith('WARNING')]
        print(f"  ✓  {puz['id']}  clues={len(raw['clues'])}  "
              f"worlds={len(raw['worlds'])}  raw={puz['complexity']['raw']:.2f}")
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
        print(f"raw={d['raw']:.2f}  depth={d['chain_depth']}  "
              f"str={d['avg_clue_strength']:.2f}  "
              f"comp={'Y' if d['requires_complement_set'] else 'n'}  "
              f"enum={'Y' if d['question_requires_enumeration'] else 'n'}")

    non_tut_raws = [d['raw'] for _, puz, d in results.values()
                    if not puz['id'].startswith('tutorial')]

    def pips_for(pid):
        r = results[pid][2]['raw']
        if pid.startswith('tutorial'):
            return 1
        return to_pips(r, non_tut_raws)

    print("\n── Results sorted by difficulty ──────────────────────────────────────────")
    print(f"{'ID':30s}  {'raw':>6}  {'pips':>4}  {'dep':>3}  {'str':>6}  c  e  title")
    for pid, (f, puz, d) in sorted(results.items(), key=lambda x: x[1][2]['raw']):
        p = pips_for(pid)
        print(f"{pid:30s}  {d['raw']:6.2f}  {p:4d}  {d['chain_depth']:3d}  "
              f"{d['avg_clue_strength']:6.2f}  "
              f"{'Y' if d['requires_complement_set'] else 'n'}  "
              f"{'Y' if d['question_requires_enumeration'] else 'n'}  "
              f"{puz.get('title', '')}")

    print("\nWriting back …")
    for pid, (f, puz, d) in results.items():
        puz['complexity'] = {
            'score':                         pips_for(pid),
            'raw':                           d['raw'],
            'avg_clue_strength':             d['avg_clue_strength'],
            'chain_depth':                   d['chain_depth'],
            'stuck':                         d['stuck'],
            'requires_complement_set':       d['requires_complement_set'],
            'question_requires_enumeration': d['question_requires_enumeration'],
            'residual_worlds':               d['residual_worlds'],
        }
        f.write_text(json.dumps(puz, indent=2))

    colls_file = BASE_PUZZLE_DIR / 'collections.json'
    if colls_file.exists():
        colls = json.loads(colls_file.read_text())
        TIER  = {1: 'easy', 2: 'easy', 3: 'medium', 4: 'hard', 5: 'expert'}
        print("\n── Collection pip distribution ───────────────────────────────────────────")
        for c in colls:
            pids     = c.get('puzzleIds', [])
            pip_list = sorted(pips_for(p) for p in pids if p in results)
            if not pip_list:
                continue
            med_pip = pip_list[len(pip_list) // 2]
            tier    = TIER.get(med_pip, '?')
            current = c.get('difficulty', '?')
            flag    = ' ← MISMATCH' if tier != current and current != 'tutorial' else ''
            print(f"  {c['id']:30s}  current={current:8s}  computed={tier:8s}  "
                  f"pips={pip_list}{flag}")

    print("\nDone.")

# ══════════════════════════════════════════════════════════════════════════════
# SUBCOMMAND: validate  (expanded puzzles)
# ══════════════════════════════════════════════════════════════════════════════

def cmd_validate(_args):
    puzzles = sorted(EXP_PUZZLE_DIR.glob('exp-*.json'))
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
    sub.add_parser('analyze', help='Score difficulty of base-game puzzles')

    # validate
    sub.add_parser('validate', help='Validate expanded puzzles')

    args = parser.parse_args()

    if args.cmd == 'generate':
        cmd_generate(args)
    elif args.cmd == 'analyze':
        cmd_analyze(args)
    elif args.cmd == 'validate':
        cmd_validate(args)
    else:
        parser.print_help()
