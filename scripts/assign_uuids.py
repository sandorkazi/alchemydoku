#!/usr/bin/env python3
"""Assign stable UUIDs to all existing puzzle JSON files (one-time migration).

Run once from the repo root:
  python3 scripts/assign_uuids.py

What it does:
  1. Reads every puzzle JSON in src/base/data/puzzles/ and src/expanded/data/puzzles/
  2. Captures the current human-readable 'id' as the legacy ID
  3. Generates a fresh UUID v4 for each puzzle
  4. Writes src/shared/utils/legacyPuzzleIds.ts with the full legacy→UUID mapping
     (written BEFORE any JSON is touched)
  5. Rewrites each puzzle JSON in-place: 'id' field becomes the UUID
  6. Updates puzzleIds arrays in collections.json and puzzlesIndex.ts to use UUIDs

After running this script:
  - Update saveProgress.ts: bump SAVE_VERSION and add the v5→v6 migration
  - Run: npm run test && python3 scripts/check_puzzles.py
"""

import json
import re
import uuid
from pathlib import Path

REPO_ROOT       = Path(__file__).parent.parent
BASE_PUZZLE_DIR = REPO_ROOT / "src" / "base" / "data" / "puzzles"
EXP_PUZZLE_DIR  = REPO_ROOT / "src" / "expanded" / "data" / "puzzles"
COLLECTIONS_JSON = BASE_PUZZLE_DIR.parent / "collections.json"
EXP_INDEX_TS    = REPO_ROOT / "src" / "expanded" / "data" / "puzzlesIndex.ts"
LEGACY_IDS_TS   = REPO_ROOT / "src" / "shared" / "utils" / "legacyPuzzleIds.ts"


def main() -> None:
    base_files = sorted(BASE_PUZZLE_DIR.glob("*.json"))
    exp_files  = sorted(EXP_PUZZLE_DIR.glob("*.json"))
    all_files  = base_files + exp_files

    # ── Step 1: Build legacy_id → UUID mapping ────────────────────────────────
    mapping: dict[str, str] = {}   # legacy_id → new UUID
    file_map: dict[Path, str] = {}  # path → new UUID (only for valid puzzle dicts)

    for path in all_files:
        data = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            # collections.json or other non-puzzle array files — skip
            continue
        legacy_id = data.get("id")
        if not legacy_id:
            print(f"WARNING: {path.name} has no id — skipping")
            continue
        new_uuid = str(uuid.uuid4())
        mapping[legacy_id] = new_uuid
        file_map[path] = new_uuid

    print(f"Assigning UUIDs to {len(mapping)} puzzles...")

    # ── Step 2: Write legacyPuzzleIds.ts BEFORE touching any JSON ─────────────
    lines = [
        "// Generated once during Phase 1 UUID migration — do not modify.",
        "// Maps every pre-UUID puzzle ID to its permanent UUID.",
        "export const LEGACY_ID_TO_UUID: Record<string, string> = {",
    ]
    for legacy_id, new_uuid in sorted(mapping.items()):
        lines.append(f'  "{legacy_id}": "{new_uuid}",')
    lines.append("};")
    LEGACY_IDS_TS.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"  → wrote {LEGACY_IDS_TS.relative_to(REPO_ROOT)}")

    # ── Step 3: Rewrite puzzle JSONs ──────────────────────────────────────────
    for path, new_uuid in file_map.items():
        data = json.loads(path.read_text(encoding="utf-8"))
        data["id"] = new_uuid
        path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"  → rewrote {len(file_map)} puzzle JSON files")

    # ── Step 4: Update collections.json ──────────────────────────────────────
    collections = json.loads(COLLECTIONS_JSON.read_text(encoding="utf-8"))
    for col in collections:
        col["puzzleIds"] = [mapping.get(pid, pid) for pid in col.get("puzzleIds", [])]
    COLLECTIONS_JSON.write_text(json.dumps(collections, indent=2) + "\n", encoding="utf-8")
    print(f"  → updated {COLLECTIONS_JSON.relative_to(REPO_ROOT)}")

    # ── Step 5: Update puzzlesIndex.ts collection puzzleIds ───────────────────
    text = EXP_INDEX_TS.read_text(encoding="utf-8")

    # Replace every quoted legacy ID with its UUID.  We sort by descending
    # length so that longer IDs (e.g. "combo-exp-sl-02") are replaced before
    # any shorter prefix that might overlap (e.g. "combo-exp-02").
    for legacy_id in sorted(mapping, key=len, reverse=True):
        new_uuid = mapping[legacy_id]
        text = text.replace(f"'{legacy_id}'", f"'{new_uuid}'")
        text = text.replace(f'"{legacy_id}"', f'"{new_uuid}"')

    EXP_INDEX_TS.write_text(text, encoding="utf-8")
    print(f"  → updated {EXP_INDEX_TS.relative_to(REPO_ROOT)}")

    print("\nDone.")
    print("Next steps:")
    print("  1. Update src/shared/utils/saveProgress.ts — bump SAVE_VERSION, add v5→v6 migration")
    print("  2. Run: npm run test && python3 scripts/check_puzzles.py")


if __name__ == "__main__":
    main()
