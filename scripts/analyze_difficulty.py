#!/usr/bin/env python3
"""
analyze_difficulty.py  —  Implements the difficulty model from DIFFICULTY_SPEC.md.
Run from the project root: python scripts/analyze_difficulty.py
"""

import json, math, glob, itertools
from pathlib import Path

# ── Canonical alchemical data (mirrors alchemicals.ts) ────────────────────────
# {id: {color: (sign, size)}}   sign: +1/-1   size: L=1/S=0
ALCH_DATA = {
    1: {'R':(-1,0), 'G':(+1,0), 'B':(-1,1)},   # npN
    2: {'R':(+1,0), 'G':(-1,0), 'B':(+1,1)},   # pnP
    3: {'R':(+1,0), 'G':(-1,1), 'B':(-1,0)},   # pNn
    4: {'R':(-1,0), 'G':(+1,1), 'B':(+1,0)},   # nPp
    5: {'R':(-1,1), 'G':(-1,0), 'B':(+1,0)},   # Nnp
    6: {'R':(+1,1), 'G':(+1,0), 'B':(-1,0)},   # Ppn
    7: {'R':(-1,1), 'G':(-1,1), 'B':(-1,1)},   # NNN
    8: {'R':(+1,1), 'G':(+1,1), 'B':(+1,1)},   # PPP
}
ALL_ALCH = list(range(1, 9))
COLS     = ['R', 'G', 'B']

# ── Mixing rule (mirrors mixer.ts) ────────────────────────────────────────────

def mix(a1: int, a2: int):
    """Return (color, sign) or 'neutral'."""
    # Neutral if all sign-pairs are opposite
    if all(ALCH_DATA[a1][c][0] != ALCH_DATA[a2][c][0] for c in COLS):
        return 'neutral'
    # Find resolving axis: same sign AND different size
    for c in COLS:
        s1, z1 = ALCH_DATA[a1][c]
        s2, z2 = ALCH_DATA[a2][c]
        if s1 == s2 and z1 != z2:
            return (c, s1)
    return 'neutral'  # degenerate (same+same; never in valid worlds)

MIX_TABLE = {a1: {a2: mix(a1, a2) for a2 in ALL_ALCH} for a1 in ALL_ALCH}

# ── World representation ──────────────────────────────────────────────────────
# A world = tuple(a1..a8) — alchemical id for each ingredient slot (0-indexed)

def all_worlds():
    return set(itertools.permutations(ALL_ALCH))

# ── Clue filters ──────────────────────────────────────────────────────────────

def filter_mixing(worlds, clue):
    i1, i2 = clue['ingredient1']-1, clue['ingredient2']-1
    r = clue['result']
    if r['type'] == 'neutral':
        expected = 'neutral'
    else:
        expected = (r['color'], +1 if r['sign']=='+' else -1)
    return {w for w in worlds if MIX_TABLE[w[i1]][w[i2]] == expected}

def filter_sell(worlds, clue):
    i1, i2 = clue['ingredient1']-1, clue['ingredient2']-1
    cr = clue['claimedResult']
    col, sgn = cr['color'], +1 if cr['sign']=='+' else -1
    sr = clue['sellResult']
    result = set()
    for w in worlds:
        actual = MIX_TABLE[w[i1]][w[i2]]
        if sr == 'total_match':
            if actual == (col, sgn): result.add(w)
        elif sr == 'neutral':
            if actual == 'neutral': result.add(w)
        elif sr == 'sign_ok':
            if (actual != 'neutral' and actual != (col, sgn)
                    and actual[1] == sgn and actual[0] != col):
                result.add(w)
        elif sr == 'opposite':
            if actual != 'neutral' and actual[1] != sgn:
                result.add(w)
    return result

def filter_aspect(worlds, clue):
    si  = clue['ingredient'] - 1
    col = clue['color']
    sgn = +1 if clue['sign']=='+' else -1
    return {w for w in worlds if ALCH_DATA[w[si]][col][0] == sgn}

def filter_assignment(worlds, clue):
    si = clue['ingredient'] - 1
    a  = clue['alchemical']
    return {w for w in worlds if w[si] == a}

def filter_debunk(worlds, clue):
    if clue.get('variant') == 'apprentice':
        si  = clue['ingredient'] - 1
        col = clue['color']
        sgn = +1 if clue['sign']=='+' else -1
        return {w for w in worlds if ALCH_DATA[w[si]][col][0] == sgn}
    i1, i2 = clue['ingredient1']-1, clue['ingredient2']-1
    cp = clue['claimedPotion']
    if cp['type'] == 'neutral':
        claimed = 'neutral'
    else:
        claimed = (cp['color'], +1 if cp['sign']=='+' else -1)
    if clue['outcome'] == 'success':
        return {w for w in worlds if MIX_TABLE[w[i1]][w[i2]] == claimed}
    else:
        return {w for w in worlds if MIX_TABLE[w[i1]][w[i2]] != claimed}

def filter_clue(worlds, clue):
    k = clue['kind']
    if k == 'mixing':     return filter_mixing(worlds, clue)
    if k == 'sell':       return filter_sell(worlds, clue)
    if k == 'aspect':     return filter_aspect(worlds, clue)
    if k == 'assignment': return filter_assignment(worlds, clue)
    if k == 'debunk':     return filter_debunk(worlds, clue)
    return worlds

def apply_clues(worlds, clues):
    for c in clues:
        worlds = filter_clue(worlds, c)
    return worlds

# ── Question answering from worlds ────────────────────────────────────────────

def answer_question(worlds, q):
    """Return the unique answer if determined, else None."""
    k = q['kind']

    if k == 'mixing-result':
        i1, i2 = q['ingredient1']-1, q['ingredient2']-1
        results = {MIX_TABLE[w[i1]][w[i2]] for w in worlds}
        return results.pop() if len(results) == 1 else None

    if k == 'alchemical':
        si = q['ingredient'] - 1
        alch = {w[si] for w in worlds}
        return alch.pop() if len(alch) == 1 else None

    if k == 'aspect':
        si  = q['ingredient'] - 1
        col = q['color']
        signs = {ALCH_DATA[w[si]][col][0] for w in worlds}
        return signs.pop() if len(signs) == 1 else None

    if k == 'safe-publish':
        si = q['ingredient'] - 1
        # Uncertain axis = one where both signs appear
        uncertain = []
        for col in COLS:
            signs = {ALCH_DATA[w[si]][col][0] for w in worlds}
            if len(signs) > 1:
                uncertain.append(col)
        return uncertain[0] if len(uncertain) == 1 else None

    if k == 'possible-potions':
        i1, i2 = q['ingredient1']-1, q['ingredient2']-1
        return frozenset(MIX_TABLE[w[i1]][w[i2]] for w in worlds)  # always "determined"

    if k == 'aspect-set':
        col    = q['color']
        target = +1 if q['sign']=='+' else -1
        confirmed = []
        for si in range(8):
            signs = {ALCH_DATA[w[si]][col][0] for w in worlds}
            if signs == {target}:
                confirmed.append(si+1)
        # Fully determined when we know exactly 4 (the set is complete)
        return frozenset(confirmed) if len(confirmed) == 4 else None

    if k == 'large-component':
        col = q['color']
        confirmed = []
        for si in range(8):
            sizes = {ALCH_DATA[w[si]][col][1] for w in worlds}
            if sizes == {1}:
                confirmed.append(si+1)
        return frozenset(confirmed) if len(confirmed) == 4 else None

    return None

def all_answered(worlds, questions):
    return all(answer_question(worlds, q) is not None for q in questions)

# ── Axis 1: Clue strength ─────────────────────────────────────────────────────

def clue_strengths(clues):
    """Log2(before/after) for each clue applied in order. Returns (strengths, final_worlds)."""
    worlds = all_worlds()
    strengths = []
    for c in clues:
        before = len(worlds)
        worlds = filter_clue(worlds, c)
        after  = len(worlds)
        if before > 0 and 0 < after < before:
            strengths.append(math.log2(before / after))
        else:
            strengths.append(0.0)
    return strengths, worlds

# ── Clue type ambiguity weight (Axis 1 supplement) ───────────────────────────
# Penalise clue types that are weak by nature, independent of actual worlds eliminated.

CLUE_TYPE_PENALTY = {
    'mixing':     0.0,   # strongest — exact result
    'assignment': 0.0,   # exact assignment
    'aspect':     0.3,   # one sign, not size
    'sell':       0.0,   # varies by sellResult (handled below)
    'debunk':     0.0,
}
SELL_PENALTY = {
    'total_match': 0.0,
    'sign_ok':     0.4,
    'neutral':     0.8,
    'opposite':    0.6,
}

def clue_ambiguity_penalty(clues):
    """Extra penalty for using inherently weak clue types."""
    total = 0.0
    for c in clues:
        k = c['kind']
        p = CLUE_TYPE_PENALTY.get(k, 0.0)
        if k == 'sell':
            p += SELL_PENALTY.get(c.get('sellResult',''), 0.0)
        total += p
    return total / len(clues) if clues else 0.0

# ── Axis 2: Answer-aware chain depth ─────────────────────────────────────────

def simulate_chain(worlds, questions, max_depth=10):
    """
    Simulate iterative naked-single propagation.
    Returns (depth_to_answer, complement_needed, stuck).

    depth_to_answer: how many chain rounds before all questions are answerable.
    complement_needed: True if complement-set reasoning is on the critical path.
    """
    confirmed = {}  # slot → alch
    current   = set(worlds)

    if all_answered(current, questions):
        return 0, False, False

    for depth in range(1, max_depth + 1):
        # Find naked singles
        newly = {}
        for slot in range(8):
            if slot in confirmed:
                continue
            poss = {w[slot] for w in current}
            if len(poss) == 1:
                newly[slot] = next(iter(poss))

        if not newly:
            # Chain is stuck — check if complement would unlock the answer
            complement = _complement_unlocks(current, confirmed, questions)
            return depth, complement, True

        confirmed.update(newly)
        for slot, alch in newly.items():
            current = {w for w in current if w[slot] == alch}

        if all_answered(current, questions):
            return depth, False, False

    return max_depth, True, True

def _complement_unlocks(worlds, confirmed_slots, questions):
    """
    Check if complement-set deduction (X-Wing) would allow a new confirmation
    that moves us closer to answering the questions.
    """
    unconfirmed = [s for s in range(8) if s not in confirmed_slots]
    if not unconfirmed:
        return False

    for col in COLS:
        for sgn in (+1, -1):
            matching_alch = {a for a in ALL_ALCH if ALCH_DATA[a][col][0] == sgn}
            assigned      = {confirmed_slots[s] for s in confirmed_slots
                             if confirmed_slots[s] in matching_alch}
            remaining     = matching_alch - assigned

            if len(remaining) == 1:
                lone = next(iter(remaining))
                for slot in unconfirmed:
                    poss = {w[slot] for w in worlds}
                    if lone in poss and len(poss) > 1:
                        # Apply complement and see if questions become answerable
                        new_worlds = {w for w in worlds if w[slot] == lone}
                        if all_answered(new_worlds, questions):
                            return True
    return False

# ── Composite score ───────────────────────────────────────────────────────────

def compute_difficulty(puzzle):
    clues     = puzzle.get('clues', [])
    questions = puzzle.get('questions', [])

    strengths, final_worlds = clue_strengths(clues)
    avg_strength  = sum(strengths) / len(strengths) if strengths else 0.0
    ambig_penalty = clue_ambiguity_penalty(clues)

    depth, complement, stuck = simulate_chain(final_worlds, questions)

    enum = any(q['kind'] in {'possible-potions','aspect-set','large-component'}
               for q in questions)

    raw = (
        (1.0 / (avg_strength + 0.5)) * 4.0   # weak clues → high score
      + ambig_penalty * 2.0                   # weak clue types
      + depth * 1.5                           # chain depth
      + (2.0 if complement else 0.0)          # complement / X-Wing
      + (1.0 if enum else 0.0)               # enumeration questions
    )

    return {
        'raw':              round(raw, 3),
        'avg_clue_strength': round(avg_strength, 3),
        'ambig_penalty':    round(ambig_penalty, 3),
        'chain_depth':      depth,
        'stuck':            stuck,
        'requires_complement_set': complement,
        'question_requires_enumeration': enum,
        'residual_worlds':  len(final_worlds),
    }

# ── Percentile → pips ─────────────────────────────────────────────────────────

def to_pips(score, all_scores):
    rank = sum(1 for s in all_scores if s < score) / len(all_scores)
    if rank < 0.20: return 1
    if rank < 0.40: return 2
    if rank < 0.60: return 3
    if rank < 0.80: return 4
    return 5

# ── Main ──────────────────────────────────────────────────────────────────────

PUZ_DIR = Path(__file__).parent.parent / 'src' / 'data' / 'puzzles'

def main():
    files = sorted(PUZ_DIR.glob('*.json'))
    files = [f for f in files if f.name != 'collections.json']

    # Skip tutorials for percentile normalisation (separate difficulty space)
    tutorial_ids = set()
    non_tutorial_files = []
    tutorial_files     = []
    for f in files:
        d = json.loads(f.read_text())
        if d['id'].startswith('tutorial'):
            tutorial_files.append((f, d))
            tutorial_ids.add(d['id'])
        else:
            non_tutorial_files.append((f, d))

    print("Computing difficulty …")
    results = {}

    for f, puz in files:
        pid = puz['id']
        print(f"  {pid} …", end=' ', flush=True)
        d = compute_difficulty(puz)
        results[pid] = (f, puz, d)
        print(f"raw={d['raw']:.2f} depth={d['chain_depth']} "
              f"str={d['avg_clue_strength']:.2f} "
              f"comp={'Y' if d['requires_complement_set'] else 'n'} "
              f"enum={'Y' if d['question_requires_enumeration'] else 'n'}")

    # Normalise pips — tutorials get their own band
    non_tut_raws = [results[f.stem if hasattr(f,'stem') else
                            json.loads(f.read_text())['id']][2]['raw']
                    for f, d in non_tutorial_files]
    # rebuild cleanly
    non_tut_raws = [results[d['id']][2]['raw'] for _, d in non_tutorial_files]
    all_raws     = [results[d['id']][2]['raw'] for _, d in (non_tutorial_files + tutorial_files)]

    def pips_for(pid):
        r = results[pid][2]['raw']
        if pid.startswith('tutorial'):
            return 1  # tutorials always pip=1 (pedagogical, not difficulty-ranked)
        return to_pips(r, non_tut_raws)

    # ── Print sorted table ──
    print("\n── Results sorted by difficulty ────────────────────────────────────────")
    print(f"{'ID':30s} {'raw':>6} {'pips':>4} {'dep':>3} {'str':>6} {'c':>1} {'e':>1}  title")
    for pid, (f, puz, d) in sorted(results.items(), key=lambda x: x[1][2]['raw']):
        p = pips_for(pid)
        print(f"{pid:30s} {d['raw']:6.2f} {p:4d} {d['chain_depth']:3d} "
              f"{d['avg_clue_strength']:6.2f} "
              f"{'Y' if d['requires_complement_set'] else 'n'} "
              f"{'Y' if d['question_requires_enumeration'] else 'n'}  "
              f"{puz.get('title','')}")

    # ── Write back ──
    print("\nWriting …")
    for pid, (f, puz, d) in results.items():
        puz['complexity'] = {
            'score': pips_for(pid),
            'raw':   d['raw'],
            'avg_clue_strength': d['avg_clue_strength'],
            'chain_depth': d['chain_depth'],
            'stuck': d['stuck'],
            'requires_complement_set': d['requires_complement_set'],
            'question_requires_enumeration': d['question_requires_enumeration'],
            'residual_worlds': d['residual_worlds'],
        }
        f.write_text(json.dumps(puz, indent=2))

    # ── Collection analysis ──
    colls_file = PUZ_DIR / 'collections.json'
    colls = json.loads(colls_file.read_text())
    TIER = {1:'easy',2:'easy',3:'medium',4:'hard',5:'expert'}
    print("\n── Collection pip distribution ─────────────────────────────────────────")
    for c in colls:
        pids = c.get('puzzleIds', [])
        pip_list = sorted(pips_for(p) for p in pids if p in results)
        if not pip_list: continue
        med_pip = pip_list[len(pip_list)//2]
        tier    = TIER.get(med_pip,'?')
        current = c.get('difficulty','?')
        flag = ' ← MISMATCH' if tier != current and current != 'tutorial' else ''
        print(f"  {c['id']:30s}  current={current:8s}  computed={tier:8s}  pips={pip_list}{flag}")

    print("\nDone.")

if __name__ == '__main__':
    # Fix: files iterable needs to yield (path, dict) pairs
    import sys
    PUZ_DIR2 = Path(__file__).parent.parent / 'src' / 'data' / 'puzzles'
    _files_raw = sorted(PUZ_DIR2.glob('*.json'))
    _files_raw = [f for f in _files_raw if f.name != 'collections.json']
    _file_pairs = [(f, json.loads(f.read_text())) for f in _files_raw]

    print("Computing difficulty …")
    results = {}
    for f, puz in _file_pairs:
        pid = puz['id']
        print(f"  {pid} …", end=' ', flush=True)
        d = compute_difficulty(puz)
        results[pid] = (f, puz, d)
        print(f"raw={d['raw']:.2f} depth={d['chain_depth']} "
              f"str={d['avg_clue_strength']:.2f} "
              f"comp={'Y' if d['requires_complement_set'] else 'n'} "
              f"enum={'Y' if d['question_requires_enumeration'] else 'n'}")

    non_tut_raws = [results[d['id']][2]['raw']
                    for _, d in _file_pairs if not d['id'].startswith('tutorial')]

    def pips_for(pid):
        r = results[pid][2]['raw']
        if pid.startswith('tutorial'):
            return 1
        return to_pips(r, non_tut_raws)

    print("\n── Results sorted by difficulty ────────────────────────────────────────")
    print(f"{'ID':30s} {'raw':>6} {'pips':>4} {'dep':>3} {'str':>6} {'c':>1} {'e':>1}  title")
    for pid, (f, puz, d) in sorted(results.items(), key=lambda x: x[1][2]['raw']):
        p = pips_for(pid)
        print(f"{pid:30s} {d['raw']:6.2f} {p:4d} {d['chain_depth']:3d} "
              f"{d['avg_clue_strength']:6.2f} "
              f"{'Y' if d['requires_complement_set'] else 'n'} "
              f"{'Y' if d['question_requires_enumeration'] else 'n'}  "
              f"{puz.get('title','')}")

    print("\nWriting …")
    for pid, (f, puz, d) in results.items():
        puz['complexity'] = {
            'score': pips_for(pid),
            'raw':   d['raw'],
            'avg_clue_strength': d['avg_clue_strength'],
            'chain_depth': d['chain_depth'],
            'stuck': d['stuck'],
            'requires_complement_set': d['requires_complement_set'],
            'question_requires_enumeration': d['question_requires_enumeration'],
            'residual_worlds': d['residual_worlds'],
        }
        f.write_text(json.dumps(puz, indent=2))

    colls_file = PUZ_DIR2 / 'collections.json'
    colls = json.loads(colls_file.read_text())
    TIER = {1:'easy',2:'easy',3:'medium',4:'hard',5:'expert'}
    print("\n── Collection pip distribution ─────────────────────────────────────────")
    for c in colls:
        pids = c.get('puzzleIds', [])
        pip_list = sorted(pips_for(p) for p in pids if p in results)
        if not pip_list: continue
        med_pip = pip_list[len(pip_list)//2]
        tier    = TIER.get(med_pip,'?')
        current = c.get('difficulty','?')
        flag = ' ← MISMATCH' if tier != current and current != 'tutorial' else ''
        print(f"  {c['id']:30s}  current={current:8s}  computed={tier:8s}  pips={pip_list}{flag}")

    print("\nDone.")
