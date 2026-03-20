---
name: regen-hints
description: Regenerate hints for one or more puzzle files, then verify no stale or invalid hint tokens remain. Usage: /regen-hints [file...] or /regen-hints --all
disable-model-invocation: true
allowed-tools: Bash
---

Arguments: $ARGUMENTS

## Step 1 — Regenerate hints

If $ARGUMENTS is `--all`:
```bash
python3 scripts/alchemydoku.py regen-hints --all
```

If $ARGUMENTS contains file paths:
```bash
python3 scripts/alchemydoku.py regen-hints $ARGUMENTS
```

If $ARGUMENTS is empty, ask which file(s) to regenerate.

## Step 2 — Verify hint tokens

Run check-hints on the same scope:
```bash
python3 scripts/alchemydoku.py check-hints $ARGUMENTS
```
(or `--all` if that was used above)

## Step 3 — Report

- List any files where hints changed
- Report any hint-token errors from check-hints
- If everything is clean, say so
