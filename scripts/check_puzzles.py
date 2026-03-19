#!/usr/bin/env python3
"""
scripts/check_puzzles.py — Alchemydoku puzzle integrity checker.

Checks performed (always, ~0.1 s):
  1. registration   — every *.json in puzzle dirs is imported in index files
  2. id-filename    — puzzle 'id' field matches filename stem
  3. duplicates     — no two puzzles share an id; warns on identical titles
  4. similar-titles — warns when titles share ≥80 % of their word tokens
  5. required-fields— id, title, difficulty, clues, questions, solution present
  6. solution-shape — solution is a valid 1→8 bijection
  7. mode-field     — expanded puzzles have mode='expanded'
  8. trivial-answer — no question is directly answered by a single clue
                      (suppress per-puzzle with "trivial_answer_ok": true)
  9. hint-tokens    — hint text must not contain raw ingredient names
                      (Fern, Bird Claw, etc.) — use ing1–ing8 tokens instead
 10. base-only-lang — base puzzle titles/hints must not mention expanded-mode
                      concepts (golem, encyclopedia, solar, lunar, etc.)
 11. all-possible   — possible-potions answer must not be all 7 potions
                      (uses world simulation; only for puzzles with pp questions)
 12. enc-wha-dist   — encyclopedia_which_aspect entries must be 4-0 (all+/all-)
                      or 2-2 sign distribution; 3-1 is invalid
 13. debunk-art-ing-count — debunk articles must have exactly 4 entries
                      with a 2+/2- sign distribution; each ingredient may
                      appear in at most 2 articles per puzzle
 14. permalink      — each puzzle ID appears in exactly one collection;
                      no ID is shared across base/expanded;
                      all collection refs point to registered puzzles

Additional checks with --deep (~2–5 s per puzzle, runs world simulation):
 13. logical        — clues don't eliminate the solution; all questions have
                      unique answers given the clue set
 14. redundancy     — warns if any clue can be removed without losing uniqueness

Usage:
  python scripts/check_puzzles.py           # structural checks (fast)
  python scripts/check_puzzles.py --deep    # + logical validation (slow)
  python scripts/check_puzzles.py --files src/data/puzzles/easy-2000.json

Exit codes: 0 = pass (warnings may appear), 1 = one or more errors.
"""

import argparse
import importlib.util
import itertools
import json
import re
import sys
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────────────

ROOT     = Path(__file__).resolve().parent.parent
BASE_DIR = ROOT / "src" / "data" / "puzzles"
EXP_DIR  = ROOT / "src" / "expanded" / "data" / "puzzles"
BASE_IDX = ROOT / "src" / "data" / "puzzles" / "index.ts"
EXP_IDX  = ROOT / "src" / "expanded" / "data" / "puzzlesIndex.ts"

REQUIRED_BASE = {"id", "title", "difficulty", "clues", "questions", "solution", "complexity"}
REQUIRED_EXP  = REQUIRED_BASE | {"mode"}

COMPLEXITY_TIER = {1: 'easy', 2: 'easy', 3: 'medium', 4: 'hard', 5: 'expert'}

TITLE_SIMILARITY_THRESHOLD = 0.8   # Jaccard word-token similarity

# ── Terminal colour helpers ────────────────────────────────────────────────────

def _color_ok():
    return sys.stdout.isatty()

RED    = "\033[31m" if _color_ok() else ""
YELLOW = "\033[33m" if _color_ok() else ""
GREEN  = "\033[32m" if _color_ok() else ""
BOLD   = "\033[1m"  if _color_ok() else ""
RESET  = "\033[0m"  if _color_ok() else ""
DIM    = "\033[2m"  if _color_ok() else ""


class Results:
    def __init__(self):
        self.errors   = []
        self.warnings = []

    def error(self, msg):   self.errors.append(msg)
    def warning(self, msg): self.warnings.append(msg)
    def ok(self):           return not self.errors


# ── 1. Registration ────────────────────────────────────────────────────────────

def _imported_filenames(index_path: Path) -> set:
    """Return the set of JSON basenames mentioned in import statements."""
    text = index_path.read_text(encoding="utf-8")
    # Strip any subdirectory prefix (e.g. './puzzles/foo.json' → 'foo.json')
    paths = re.findall(r"""from\s+['"]\./([^'"]+\.json)['"]""", text)
    return {Path(p).name for p in paths}


def check_registration(r: Results):
    SKIP = {"collections.json"}
    for puzzle_dir, index_file, label in [
        (BASE_DIR, BASE_IDX, "base"),
        (EXP_DIR,  EXP_IDX,  "expanded"),
    ]:
        actual   = {f.name for f in puzzle_dir.glob("*.json")} - SKIP
        imported = _imported_filenames(index_file) - SKIP

        for name in sorted(actual - imported):
            r.error(f"[registration] {label} puzzle not registered in index: {name}")

        for name in sorted(imported - actual):
            r.error(f"[registration] {label} index imports missing file: {name}")


# ── 2–7. Per-puzzle structural checks ─────────────────────────────────────────

def check_structure(path: Path, puz: dict, is_expanded: bool, r: Results):
    name = path.name

    # Required fields
    required = REQUIRED_EXP if is_expanded else REQUIRED_BASE
    missing  = required - puz.keys()
    if missing:
        r.error(f"[required-fields] {name}: missing {', '.join(sorted(missing))}")

    # ID must match filename stem
    pid  = puz.get("id", "")
    stem = path.stem
    if pid != stem:
        r.error(f"[id-filename] {name}: id='{pid}' does not match filename stem '{stem}'")

    # Expanded puzzles must declare mode
    if is_expanded and puz.get("mode") != "expanded":
        r.error(f"[mode-field] {name}: expanded puzzle must have mode='expanded'")

    # mixing_count_among clues: requires ≥ 3 ingredients, count in [1, C(n,2)]
    for c in puz.get("clues", []):
        if c.get("kind") == "mixing_count_among":
            n = len(c.get("ingredients", []))
            count = c.get("count", 0)
            max_pairs = n * (n - 1) // 2
            if n < 3:
                r.error(f"[clue-shape] {name}: mixing_count_among requires ≥ 3 ingredients, got {n}")
            if not (1 <= count <= max_pairs):
                r.error(f"[clue-shape] {name}: mixing_count_among count={count} out of range [1, {max_pairs}]")

    # sell_among clues: requires ≥ 3 ingredients, count in [1, C(n,2)]
    for c in puz.get("clues", []):
        if c.get("kind") == "sell_among":
            n = len(c.get("ingredients", []))
            count = c.get("count", 0)
            max_pairs = n * (n - 1) // 2
            if n < 3:
                r.error(f"[clue-shape] {name}: sell_among requires ≥ 3 ingredients, got {n}")
            if not (1 <= count <= max_pairs):
                r.error(f"[clue-shape] {name}: sell_among count={count} out of range [1, {max_pairs}]")

    # sell_result_among clues: requires ≥ 2 ingredients
    for c in puz.get("clues", []):
        if c.get("kind") == "sell_result_among":
            n = len(c.get("ingredients", []))
            if n < 2:
                r.error(f"[clue-shape] {name}: sell_result_among requires ≥ 2 ingredients, got {n}")

    # encyclopedia_which_aspect: sign distribution must be 4-0 or 2-2 (not 3-1)
    for qi, q in enumerate(puz.get("questions", [])):
        if q.get("kind") == "encyclopedia_which_aspect":
            entries = q.get("entries", [])
            plus = sum(1 for e in entries if e.get("sign") == "+")
            minus = len(entries) - plus
            if len(entries) == 4 and plus not in (0, 2, 4):
                r.error(
                    f"[enc-wha-dist] {name}: question[{qi}] encyclopedia_which_aspect "
                    f"has {plus}+/{minus}- distribution — must be 4-0 or 2-2"
                )

    # Solution must be a valid 1–8 bijection
    sol = puz.get("solution", {})
    if sol:
        try:
            keys = sorted(int(k) for k in sol.keys())
            vals = sorted(int(v) for v in sol.values())
            if keys != list(range(1, 9)) or vals != list(range(1, 9)):
                r.error(f"[solution-shape] {name}: solution is not a valid 1–8 bijection")
        except (ValueError, TypeError):
            r.error(f"[solution-shape] {name}: solution has non-integer keys or values")


# ── 3–4. Duplicate / similar-title checks ─────────────────────────────────────

def _jaccard(a: str, b: str) -> float:
    ta = set(a.lower().split())
    tb = set(b.lower().split())
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)


def check_duplicates(puzzles: list, r: Results):
    """puzzles: list of (dict, Path)"""
    seen_ids    = {}
    seen_titles = {}

    for puz, path in puzzles:
        pid   = puz.get("id",    "")
        title = puz.get("title", "")

        if pid:
            if pid in seen_ids:
                r.error(
                    f"[duplicates] Duplicate id '{pid}': "
                    f"{seen_ids[pid].name} and {path.name}"
                )
            else:
                seen_ids[pid] = path

        if title:
            if title in seen_titles:
                r.warning(
                    f"[duplicates] Identical title '{title}': "
                    f"{seen_titles[title].name} and {path.name}"
                )
            else:
                seen_titles[title] = path

    # Similar-title warning (Jaccard on word tokens)
    title_list = [
        (puz.get("title", ""), path)
        for puz, path in puzzles
        if puz.get("title")
    ]
    for i, (ta, pa) in enumerate(title_list):
        for tb, pb in title_list[i + 1:]:
            if ta == tb:
                continue   # already caught above
            if _jaccard(ta, tb) >= TITLE_SIMILARITY_THRESHOLD:
                r.warning(
                    f"[similar-titles] '{ta}' ({pa.name}) "
                    f"and '{tb}' ({pb.name}) share "
                    f"{_jaccard(ta, tb):.0%} of their words"
                )


# ── 8. Trivial-answer check ────────────────────────────────────────────────────

def _trivial_reason(question: dict, clues: list) -> str | None:
    """Return a human-readable reason if a clue directly answers the question,
    or None if no trivial answer is detected."""
    kind = question["kind"]

    if kind == "mixing-result":
        q_pair = frozenset([question["ingredient1"], question["ingredient2"]])
        for c in clues:
            ck = c["kind"]
            if ck == "mixing":
                if frozenset([c["ingredient1"], c["ingredient2"]]) == q_pair:
                    return (
                        f"mixing clue for pair "
                        f"({question['ingredient1']},{question['ingredient2']}) "
                        f"directly states the result"
                    )
            elif ck == "debunk" and c.get("variant") == "master" and c.get("outcome") == "success":
                if frozenset([c["ingredient1"], c["ingredient2"]]) == q_pair:
                    return (
                        f"successful master-debunk clue for pair "
                        f"({question['ingredient1']},{question['ingredient2']}) "
                        f"directly confirms the mix result"
                    )
            elif ck == "sell" and c.get("sellResult") == "total_match":
                if frozenset([c["ingredient1"], c["ingredient2"]]) == q_pair:
                    return (
                        f"sell clue (total_match) for pair "
                        f"({question['ingredient1']},{question['ingredient2']}) "
                        f"directly confirms the mix result"
                    )

    elif kind == "aspect":
        ing, color = question["ingredient"], question["color"]
        for c in clues:
            ck = c["kind"]
            if ck == "aspect" and c["ingredient"] == ing and c["color"] == color:
                return (
                    f"aspect clue directly reveals the {color} sign "
                    f"of ingredient {ing}"
                )
            if (
                ck == "debunk"
                and c.get("variant") == "apprentice"
                and c["ingredient"] == ing
                and c["color"] == color
            ):
                return (
                    f"apprentice-debunk clue directly reveals the {color} sign "
                    f"of ingredient {ing}"
                )

    elif kind == "possible-potions":
        q_pair = frozenset([question["ingredient1"], question["ingredient2"]])
        for c in clues:
            ck = c["kind"]
            if ck == "mixing":
                if frozenset([c["ingredient1"], c["ingredient2"]]) == q_pair:
                    return (
                        f"mixing clue for pair "
                        f"({question['ingredient1']},{question['ingredient2']}) "
                        f"already pins the exact result — possible-potions is trivially {{that result}}"
                    )
            elif ck == "debunk" and c.get("variant") == "master" and c.get("outcome") == "success":
                if frozenset([c["ingredient1"], c["ingredient2"]]) == q_pair:
                    return (
                        f"master-debunk success clue for pair "
                        f"({question['ingredient1']},{question['ingredient2']}) "
                        f"already confirms the exact result — possible-potions is trivially {{claimedPotion}}"
                    )

    elif kind == "solar_lunar":
        ing = question["ingredient"]
        for c in clues:
            if c["kind"] == "book" and c["ingredient"] == ing:
                return (
                    f"book clue directly reveals the solar/lunar status "
                    f"of ingredient {ing}"
                )

    return None


# ── Debunk-answer step-kind check ──────────────────────────────────────────────

_DEBUNK_STEP_KIND = {
    'debunk_min_steps':       'master',
    'debunk_apprentice_plan': 'apprentice',
    'debunk_conflict_only':   'master',
}

def check_debunk_answers(path: Path, puz: dict, r: Results):
    """Verify debunk_answers reference steps have the kind the question mode enforces."""
    name = path.name
    answers = puz.get('debunk_answers', {})
    for q in puz.get('questions', []):
        qk = q.get('kind')
        if qk not in _DEBUNK_STEP_KIND:
            continue
        expected = _DEBUNK_STEP_KIND[qk]
        ref = answers.get(qk)
        if not ref:
            r.error(f"[debunk-answers] {name}: question '{qk}' has no entry in debunk_answers")
            continue
        for i, step in enumerate(ref):
            actual = step.get('kind')
            if actual != expected:
                r.error(
                    f"[debunk-answers] {name}: {qk} step[{i}] "
                    f"has kind='{actual}', expected '{expected}'"
                )


def check_trivial_answers(path: Path, puz: dict, r: Results):
    if puz.get("trivial_answer_ok"):
        return
    name = path.name
    for i, q in enumerate(puz.get("questions", [])):
        reason = _trivial_reason(q, puz.get("clues", []))
        if reason:
            r.error(
                f"[trivial-answer] {name}: question[{i}] ({q['kind']}): "
                f"{reason}. "
                f'Add "trivial_answer_ok": true to suppress.'
            )


# ── 9. Hint-token check ────────────────────────────────────────────────────────

# Ingredient display names that must NOT appear raw in hint text.
# Authors must use ing1–ing8 (or "ingredient N") tokens instead.
_INGREDIENT_NAMES = [
    "fern", "bird claw", "mushroom", "flower",
    "mandrake", "scorpion", "toad", "raven's feather", "raven",
]

def check_hint_tokens(path: Path, puz: dict, r: Results):
    name = path.name
    for hint in puz.get("hints", []):
        text_lower = hint.get("text", "").lower()
        for ing_name in _INGREDIENT_NAMES:
            if ing_name in text_lower:
                r.error(
                    f"[hint-tokens] {name} (hint level {hint.get('level','?')}): "
                    f"raw ingredient name '{ing_name}' found — "
                    f"use ing1–ing8 tokens instead."
                )
                break  # one error per hint is enough


# ── 10. Base-only language check ──────────────────────────────────────────────

# Terms that belong exclusively to the expanded ruleset and must not appear in
# base puzzle titles or hint text.
_EXPANDED_TERMS = [
    "golem", "encyclopedia", "encyclopaedia", "solar", "lunar",
    "royal society", "royal", "article",
]

def check_base_only_language(path: Path, puz: dict, is_expanded: bool, r: Results):
    """Base puzzles must not mention expanded-mode concepts in title or hints."""
    if is_expanded:
        return
    name = path.name
    title_lower = puz.get("title", "").lower()
    for term in _EXPANDED_TERMS:
        if re.search(r'\b' + re.escape(term) + r'\b', title_lower):
            r.error(
                f"[base-only-lang] {name}: title contains expanded-mode term '{term}' — "
                f"expanded concepts (golem, encyclopedia, solar, lunar, …) must not appear "
                f"in base puzzle titles or hints"
            )
            break

    for hint in puz.get("hints", []):
        text_lower = hint.get("text", "").lower()
        for term in _EXPANDED_TERMS:
            if re.search(r'\b' + re.escape(term) + r'\b', text_lower):
                r.error(
                    f"[base-only-lang] {name} (hint level {hint.get('level', '?')}): "
                    f"hint contains expanded-mode term '{term}'"
                )
                break  # one error per hint


# ── 11. All-possible check ────────────────────────────────────────────────────

_PP_QUESTION_KINDS = {'possible-potions', 'group-possible-potions'}


def check_all_possible(all_puzzles: list, r: Results):
    """Flag possible-potions / group-possible-potions questions whose answer
    is all 7 potions — the player just marks everything with no deduction."""
    targets = [
        (puz, path)
        for puz, path, _ in all_puzzles
        if any(q['kind'] in _PP_QUESTION_KINDS for q in puz.get('questions', []))
    ]
    if not targets:
        return

    alch_mod = _load_alchemydoku()

    for puz, path in targets:
        worlds = alch_mod.apply_all(alch_mod.all_worlds(), puz.get('clues', []))
        for q in puz.get('questions', []):
            kind = q['kind']
            if kind not in _PP_QUESTION_KINDS:
                continue

            if kind == 'possible-potions':
                s1, s2 = q['ingredient1'] - 1, q['ingredient2'] - 1
                results = {alch_mod.MIX_TABLE[w[s1]][w[s2]] for w in worlds}
                if len(results) == 7:
                    r.error(
                        f"[all-possible] {path.name}: possible-potions("
                        f"ing{q['ingredient1']}, ing{q['ingredient2']}) has all 7 outcomes "
                        f"— trivially 'mark everything', no deduction required"
                    )

            elif kind == 'group-possible-potions':
                slots = [i - 1 for i in q['ingredients']]
                results: set = set()
                for a, b in itertools.combinations(slots, 2):
                    for w in worlds:
                        results.add(alch_mod.MIX_TABLE[w[a]][w[b]])
                if len(results) == 7:
                    r.error(
                        f"[all-possible] {path.name}: group-possible-potions("
                        f"{q['ingredients']}) has all 7 outcomes "
                        f"— trivially 'mark everything', no deduction required"
                    )


# ── 12. Permalink uniqueness ───────────────────────────────────────────────────

def _puzzleids_from_ts_collections(text: str) -> list[list[str]]:
    """Extract each puzzleIds array from a TypeScript collections constant.

    Matches blocks of the form:   puzzleIds: [ 'id-a', 'id-b', ... ]
    The arrays must not contain nested brackets (they don't in this codebase).
    """
    result = []
    for match in re.finditer(r'puzzleIds\s*:\s*\[([^\]]*)\]', text, re.DOTALL):
        ids = re.findall(r"""['"]([a-z0-9][a-z0-9-]*[a-z0-9])['"]""", match.group(1))
        if ids:
            result.append(ids)
    return result


def check_permalink_uniqueness(all_puzzles: list, r: Results):
    """Verify the permalink invariant: each puzzle ID is wired into the site
    exactly once — in at most one collection, in at most one mode.

    Three sub-checks:
      a) No puzzle ID appears in more than one base collection (collections.json)
      b) No puzzle ID appears in more than one expanded collection (puzzlesIndex.ts)
      c) No puzzle ID is shared between base and expanded collections
      d) Every collection reference points to a registered puzzle
    """
    registered_base = {puz.get("id") for puz, _path, is_exp in all_puzzles if not is_exp}
    registered_exp  = {puz.get("id") for puz, _path, is_exp in all_puzzles if     is_exp}

    # ── Base: collections.json ───────────────────────────────────────────────
    base_pid_to_col: dict[str, str] = {}
    collections_json = BASE_DIR / "collections.json"
    if collections_json.exists():
        try:
            data = json.loads(collections_json.read_text(encoding="utf-8"))
            for col in data:
                col_id = col.get("id", "?")
                for pid in col.get("puzzleIds", []):
                    if pid in base_pid_to_col:
                        r.error(
                            f"[permalink] Base puzzle '{pid}' is listed in multiple "
                            f"collections: '{base_pid_to_col[pid]}' and '{col_id}'"
                        )
                    else:
                        base_pid_to_col[pid] = col_id
                    if pid not in registered_base:
                        r.error(
                            f"[permalink] Base collection '{col_id}' references "
                            f"unregistered puzzle '{pid}'"
                        )
        except json.JSONDecodeError as exc:
            r.error(f"[permalink] collections.json: invalid JSON — {exc}")

    # ── Expanded: puzzlesIndex.ts ────────────────────────────────────────────
    exp_pid_to_coll_idx: dict[str, int] = {}
    try:
        exp_text = EXP_IDX.read_text(encoding="utf-8")
        for coll_idx, pids in enumerate(_puzzleids_from_ts_collections(exp_text)):
            for pid in pids:
                if pid in exp_pid_to_coll_idx:
                    r.error(
                        f"[permalink] Expanded puzzle '{pid}' is listed in multiple "
                        f"collections (collection indices "
                        f"{exp_pid_to_coll_idx[pid]} and {coll_idx} in puzzlesIndex.ts)"
                    )
                else:
                    exp_pid_to_coll_idx[pid] = coll_idx
                if pid not in registered_exp:
                    r.error(
                        f"[permalink] Expanded collection (index {coll_idx}) references "
                        f"unregistered puzzle '{pid}'"
                    )
    except OSError as exc:
        r.error(f"[permalink] Could not read {EXP_IDX.name}: {exc}")

    # ── Cross-mode: no ID shared between base and expanded ───────────────────
    for pid in sorted(set(base_pid_to_col) & set(exp_pid_to_coll_idx)):
        r.error(
            f"[permalink] Puzzle '{pid}' is listed in both base and expanded collections"
        )


# ── 11–12. Deep logical validation ─────────────────────────────────────────────

def _load_alchemydoku():
    """Import validate_puzzle from alchemydoku.py without executing its CLI."""
    spec = importlib.util.spec_from_file_location(
        "alchemydoku", ROOT / "scripts" / "alchemydoku.py"
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def check_debunk_article_integrity(path: Path, puz: dict, r: Results):
    """Check #13: debunk articles must have 4 entries with 2-2 sign distribution,
    and each ingredient must appear in at most 2 articles total. [debunk-art-ing-count]"""
    articles = puz.get('articles')
    if not articles:
        return
    name = path.name
    ing_counts: dict = {}
    for art_idx, art in enumerate(articles):
        entries = art.get('entries', [])
        if len(entries) != 4:
            r.error(
                f"[debunk-art-ing-count] {name}: article[{art_idx}] (id={art.get('id','?')}) "
                f"has {len(entries)} entries — must have exactly 4"
            )
        else:
            plus = sum(1 for e in entries if e.get('sign') == '+')
            minus = len(entries) - plus
            if plus != 2 or minus != 2:
                r.error(
                    f"[debunk-art-ing-count] {name}: article[{art_idx}] (id={art.get('id','?')}) "
                    f"has {plus}+/{minus}- distribution — must be 2+/2-"
                )
        for entry in entries:
            ing = entry.get('ingredient')
            if ing is not None:
                ing_counts[ing] = ing_counts.get(ing, 0) + 1
    for ing, count in ing_counts.items():
        if count > 2:
            r.error(
                f"[debunk-art-ing-count] {name}: ingredient {ing} appears in "
                f"{count} articles — max allowed is 2"
            )


def check_complexity(path: Path, puz: dict, r: Results):
    """Check #15: complexity must be present, have a valid score, and match difficulty."""
    name = path.name
    cx = puz.get("complexity")
    if not isinstance(cx, dict):
        # already caught by required-fields check; skip to avoid duplicate noise
        return
    score = cx.get("score")
    if score not in (1, 2, 3, 4, 5):
        r.error(f"[complexity] {name}: complexity.score must be 1–5, got {score!r}")
        return
    diff = puz.get("difficulty")
    if diff == "tutorial":
        return
    expected = COMPLEXITY_TIER.get(score)
    if diff != expected:
        r.error(
            f"[complexity] {name}: difficulty='{diff}' but complexity.score={score} "
            f"→ expected '{expected}' — run 'analyze' (base) or 'analyze-expanded' (expanded)"
        )


def check_logical(path: Path, puz: dict, alch_mod, r: Results):
    try:
        issues = alch_mod.validate_puzzle(puz)
    except Exception as exc:
        r.error(f"[logical] {path.name}: exception during validation — {exc}")
        return

    for msg in issues:
        if msg.startswith("ERROR:"):
            r.error(f"[logical] {path.name}: {msg[6:].strip()}")
        elif msg.startswith("WARNING:"):
            r.warning(f"[logical] {path.name}: {msg[8:].strip()}")


# ── Main ───────────────────────────────────────────────────────────────────────

def _section(label: str):
    print(f"{DIM}• {label}…{RESET}", end=" ", flush=True)


def _done():
    print(f"{DIM}done{RESET}")


def main():
    parser = argparse.ArgumentParser(
        description="Alchemydoku puzzle integrity checker",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--deep", action="store_true",
        help="Also run world-simulation checks (slow, ~2–5 s per puzzle)"
    )
    parser.add_argument(
        "--files", nargs="*", metavar="FILE",
        help="Check only these JSON files (structural + deep if --deep)"
    )
    args = parser.parse_args()

    r = Results()

    # ── Determine which files to check ────────────────────────────────────────

    if args.files:
        # Explicit file list: only structural + deep on those files
        puzzle_paths = [Path(f).resolve() for f in args.files]
        print(f"Checking {len(puzzle_paths)} specified file(s)…")
        # Registration / duplicate checks still run over ALL puzzles
        run_full_registration = True
    else:
        puzzle_paths = None
        run_full_registration = True

    # ── Step 1: Registration ─────────────────────────────────────────────────
    _section("registration")
    if run_full_registration:
        check_registration(r)
    _done()

    # ── Load all puzzle files ─────────────────────────────────────────────────
    _section("loading puzzles")
    all_puzzles = []   # list of (dict, Path, is_expanded)
    for puzzle_dir, is_exp in [(BASE_DIR, False), (EXP_DIR, True)]:
        for path in sorted(puzzle_dir.glob("*.json")):
            if path.name == "collections.json":
                continue
            try:
                puz = json.loads(path.read_text(encoding="utf-8"))
                all_puzzles.append((puz, path, is_exp))
            except json.JSONDecodeError as exc:
                r.error(f"[json] {path.name}: invalid JSON — {exc}")
    _done()

    total = len(all_puzzles)

    # ── Step 2–7: Structural checks ───────────────────────────────────────────
    _section(f"structure of {total} puzzles")
    for puz, path, is_exp in all_puzzles:
        check_structure(path, puz, is_exp, r)
    _done()

    # ── Step 8: Trivial-answer check ──────────────────────────────────────────
    _section("trivial answers")
    for puz, path, _ in all_puzzles:
        check_trivial_answers(path, puz, r)
    _done()

    # ── Step 9: Hint-token check ───────────────────────────────────────────────
    _section("hint tokens")
    for puz, path, _ in all_puzzles:
        check_hint_tokens(path, puz, r)
    _done()

    # ── Step 10: Base-only language check ─────────────────────────────────────
    _section("base-only language")
    for puz, path, is_exp in all_puzzles:
        check_base_only_language(path, puz, is_exp, r)
    _done()

    # ── Debunk-answer step-kind check ──────────────────────────────────────────
    _section("debunk answers")
    for puz, path, _ in all_puzzles:
        check_debunk_answers(path, puz, r)
    _done()

    # ── Step 3–4: Duplicates + similar titles ─────────────────────────────────
    _section("IDs and titles")
    check_duplicates([(puz, path) for puz, path, _ in all_puzzles], r)
    _done()

    # ── Step 11: All-possible check ───────────────────────────────────────────
    _section("all-possible potions")
    check_all_possible(all_puzzles, r)
    _done()

    # ── Step 13: Debunk article integrity ─────────────────────────────────────
    _section("debunk article integrity")
    for puz, path, _ in all_puzzles:
        check_debunk_article_integrity(path, puz, r)
    _done()

    # ── Step 14: Permalink uniqueness ─────────────────────────────────────────
    _section("permalink uniqueness")
    check_permalink_uniqueness(all_puzzles, r)
    _done()

    # ── Step 15: Complexity score + difficulty alignment ──────────────────────
    _section("complexity scores")
    for puz, path, _ in all_puzzles:
        check_complexity(path, puz, r)
    _done()

    # ── Deep logical validation (optional) ────────────────────────────────────
    if args.deep:
        _section("loading alchemydoku logic")
        alch_mod = None
        try:
            alch_mod = _load_alchemydoku()
            _done()
        except Exception as exc:
            print(f"\n{RED}failed — {exc}{RESET}")
            r.error(f"[logical] Could not load alchemydoku.py: {exc}")

        if alch_mod:
            targets = (
                [t for t in all_puzzles if t[1].resolve() in {p.resolve() for p in puzzle_paths}]
                if puzzle_paths else all_puzzles
            )
            n = len(targets)
            for idx, (puz, path, _) in enumerate(targets, 1):
                print(
                    f"\r{DIM}  [{idx:>{len(str(n))}}/{n}] {path.stem:<50}{RESET}",
                    end="", flush=True
                )
                check_logical(path, puz, alch_mod, r)
            print(f"\r{DIM}  validated {n} puzzle(s) logically.{' ' * 30}{RESET}")

    # ── Report ────────────────────────────────────────────────────────────────
    print()
    if r.warnings:
        print(f"{YELLOW}{BOLD}Warnings ({len(r.warnings)}):{RESET}")
        for w in r.warnings:
            print(f"  {YELLOW}⚠  {w}{RESET}")
        print()

    if r.errors:
        print(f"{RED}{BOLD}Errors ({len(r.errors)}):{RESET}")
        for e in r.errors:
            print(f"  {RED}✗  {e}{RESET}")
        print()
        print(f"{RED}{BOLD}✗  {len(r.errors)} check(s) failed.{RESET}")
        sys.exit(1)

    w_note = f" ({len(r.warnings)} warning(s))" if r.warnings else ""
    print(f"{GREEN}{BOLD}✓  All checks passed{RESET}{GREEN}{w_note}.{RESET}")


if __name__ == "__main__":
    main()
