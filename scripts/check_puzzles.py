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
 10. permalink      — each puzzle ID appears in exactly one collection;
                      no ID is shared across base/expanded;
                      all collection refs point to registered puzzles

Additional checks with --deep (~2–5 s per puzzle, runs world simulation):
 11. logical        — clues don't eliminate the solution; all questions have
                      unique answers given the clue set
 12. redundancy     — warns if any clue can be removed without losing uniqueness

Usage:
  python scripts/check_puzzles.py           # structural checks (fast)
  python scripts/check_puzzles.py --deep    # + logical validation (slow)
  python scripts/check_puzzles.py --files src/data/puzzles/easy-2000.json

Exit codes: 0 = pass (warnings may appear), 1 = one or more errors.
"""

import argparse
import importlib.util
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

REQUIRED_BASE = {"id", "title", "difficulty", "clues", "questions", "solution"}
REQUIRED_EXP  = REQUIRED_BASE | {"mode"}

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
        if qk == 'debunk_conflict_only' and len(ref) != 1:
            r.error(
                f"[debunk-answers] {name}: debunk_conflict_only must have exactly 1 step "
                f"(found {len(ref)})"
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


# ── 10. Permalink uniqueness ───────────────────────────────────────────────────

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

    # ── Step 10: Debunk-answer step-kind check ─────────────────────────────────
    _section("debunk answers")
    for puz, path, _ in all_puzzles:
        check_debunk_answers(path, puz, r)
    _done()

    # ── Step 3–4: Duplicates + similar titles ─────────────────────────────────
    _section("IDs and titles")
    check_duplicates([(puz, path) for puz, path, _ in all_puzzles], r)
    _done()

    # ── Step 10: Permalink uniqueness ─────────────────────────────────────────
    _section("permalink uniqueness")
    check_permalink_uniqueness(all_puzzles, r)
    _done()

    # ── Steps 11–12: Deep logical validation (optional) ───────────────────────
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
