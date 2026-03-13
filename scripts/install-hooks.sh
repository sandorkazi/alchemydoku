#!/bin/sh
#
# scripts/install-hooks.sh
#
# Installs the pre-commit hook by symlinking scripts/pre-commit into
# .git/hooks/, so that the hook stays in version control and updates
# automatically when the file changes.
#
# Usage:
#   sh scripts/install-hooks.sh
#

set -e

REPO_ROOT=$(git rev-parse --show-toplevel)
HOOK_DIR="$REPO_ROOT/.git/hooks"
HOOK_FILE="$HOOK_DIR/pre-commit"
# Relative path from .git/hooks/ to scripts/pre-commit
TARGET="../../scripts/pre-commit"

if [ -e "$HOOK_FILE" ] && [ ! -L "$HOOK_FILE" ]; then
  echo "⚠  A non-symlink pre-commit hook already exists at $HOOK_FILE"
  echo "   Rename or remove it, then re-run this script."
  exit 1
fi

ln -sf "$TARGET" "$HOOK_FILE"
chmod +x "$HOOK_FILE"

echo "✓  Pre-commit hook installed."
echo "   $HOOK_FILE → $TARGET"
echo ""
echo "The hook runs on every 'git commit' and checks:"
echo "  • Puzzle registration, IDs, titles, solution shapes"
echo "  • TypeScript types (when .ts/.tsx files are staged)"
echo ""
echo "Useful escape hatches:"
echo "  git commit --no-verify          skip all hooks"
echo "  NO_TYPECHECK=1 git commit       skip TypeScript check only"
echo "  NO_PUZZLE_CHECK=1 git commit    skip puzzle checks only"
echo ""
echo "Run checks manually:"
echo "  python3 scripts/check_puzzles.py          (fast)"
echo "  python3 scripts/check_puzzles.py --deep   (+ world simulation)"
