---
name: gen
description: Generate new puzzle(s) from a profile. Usage: /gen <profile> [count]. Runs alchemydoku.py generate and reminds you to register the output in the correct index file.
disable-model-invocation: true
allowed-tools: Bash, Read, Edit
---

The user wants to generate puzzles. Arguments: $ARGUMENTS

## Step 1 — List available profiles if no profile given

If $ARGUMENTS is empty, run:
```bash
python3 scripts/alchemydoku.py generate --profiles
```
Then stop and ask which profile and count to use.

## Step 2 — Generate

Parse $ARGUMENTS as `<profile> [count]` (count defaults to 1).

Run:
```bash
python3 scripts/alchemydoku.py generate --profile <profile> --count <count>
```

## Step 3 — Registration reminder

After generation succeeds, determine whether the profile is base or expanded:
- Base profiles (no `encyclopedia`, `solar_lunar`, `golem` in profile mechanics):
  register in `src/data/puzzles/index.ts` — add import and add to `ALL_PUZZLES` and the relevant collection in `COLLECTIONS`
- Expanded profiles: register in `src/expanded/data/puzzlesIndex.ts` — add import and add to `ALL_EXPANDED_PUZZLES` and optionally `EXPANDED_COLLECTIONS`

Show the generated puzzle ID(s) and the exact lines that need to be added.
Ask if you should make those edits now.

## Step 4 — Run check_puzzles on the new file(s)

```bash
python3 scripts/check_puzzles.py --files <generated-file-paths>
```

Report any errors.
