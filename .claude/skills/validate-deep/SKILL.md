---
name: validate-deep
description: Run the slow deep validation pass on puzzle files — checks logical consistency, redundant clues, and world simulation. Usage: /validate-deep [file...] or runs all files by default.
disable-model-invocation: true
allowed-tools: Bash
---

Arguments: $ARGUMENTS

## Run deep validation

If $ARGUMENTS contains specific files:
```bash
python3 scripts/check_puzzles.py --deep --files $ARGUMENTS
```

Otherwise run on all puzzles:
```bash
python3 scripts/check_puzzles.py --deep
```

This is slow (world simulation for every puzzle). Let the user know it may take a while.

## Report results

Separate the output into:
1. **Errors** — must be fixed before committing
2. **Redundant-clue warnings** — puzzles where one or more clues are logically redundant (already implied by other clues); non-tutorials with ≥2 redundant clues are errors
3. **Other warnings** — duplicate titles etc. (lower priority)

For each error or redundant-clue warning, name the puzzle and describe what needs fixing.
