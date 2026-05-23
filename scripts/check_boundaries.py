#!/usr/bin/env python3
"""
Module boundary checker.

Rules (from REPO.md):
  - src/shared/**  must NOT import from @base/ or @expanded/
  - src/base/**    must NOT import from @expanded/

Usage:
  python3 scripts/check_boundaries.py          # check all src/ files
  python3 scripts/check_boundaries.py [files]  # check specific files
"""

import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SRC  = REPO / 'src'

# Pattern that matches any import/export/require of a path alias
IMPORT_PAT = re.compile(r"""['"](@(?:base|expanded|shared)/[^'"]+)['"]""")


def check_file(path: Path) -> list[str]:
    """Return list of violation messages for path."""
    try:
        rel = path.relative_to(SRC)
    except ValueError:
        return []

    parts = rel.parts
    if not parts:
        return []

    zone = parts[0]  # 'shared', 'base', 'expanded', or top-level

    violations: list[str] = []
    text = path.read_text(encoding='utf-8')

    for lineno, line in enumerate(text.splitlines(), 1):
        for m in IMPORT_PAT.finditer(line):
            target = m.group(1)
            if zone == 'shared':
                if target.startswith('@base/') or target.startswith('@expanded/'):
                    violations.append(
                        f"{path.relative_to(REPO)}:{lineno}: "
                        f"shared/ must not import from {target}"
                    )
            elif zone == 'base':
                if target.startswith('@expanded/'):
                    violations.append(
                        f"{path.relative_to(REPO)}:{lineno}: "
                        f"base/ must not import from {target}"
                    )

    return violations


def main(argv: list[str]) -> int:
    if argv:
        files = [Path(a).resolve() for a in argv]
    else:
        files = sorted(SRC.rglob('*.ts')) + sorted(SRC.rglob('*.tsx'))
        files = [f for f in files if 'node_modules' not in str(f)]

    all_violations: list[str] = []
    for f in files:
        all_violations.extend(check_file(f))

    if all_violations:
        print('Module boundary violations:')
        for v in all_violations:
            print(f'  {v}')
        return 1

    print(f'check_boundaries: OK ({len(files)} file(s) checked)')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
