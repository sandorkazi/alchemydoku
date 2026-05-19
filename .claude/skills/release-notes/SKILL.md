---
name: release-notes
description: Draft release notes for src/data/releaseNotes.ts from git commits since the last RELEASE_VERSION. Falls back to diff analysis for low-quality commit messages. Proposes a new ReleaseEntry and bumps RELEASE_VERSION to today's date after user confirmation.
allowed-tools: Bash, Read, Edit
---

The user wants to draft release notes. Arguments (optional override date): $ARGUMENTS

## Step 1 — Gather baseline

Read the current release state:

```bash
grep -n "RELEASE_VERSION\|version:" src/utils/releaseNotes.ts src/data/releaseNotes.ts
```

Extract `RELEASE_VERSION` (e.g. `'2026-03-16'`) and today's date (`date +%Y-%m-%d`).

If `$ARGUMENTS` contains a date (format `YYYY-MM-DD`), use it as the since-date instead of `RELEASE_VERSION`.

## Step 2 — Collect commits since the last release

```bash
git log --oneline --after="<RELEASE_VERSION>" -- src/ \
  ':(exclude)src/utils/releaseNotes.ts' \
  ':(exclude)src/data/releaseNotes.ts'
```

If there are no commits, tell the user the release notes are already up to date and stop.

## Step 3 — Evaluate commit message quality

For each commit, a message is **low quality** if any of these are true:
- Subject line is ≤ 25 characters
- Subject line is generic (matches: `fix`, `update`, `changes`, `wip`, `misc`, `tweak`, `cleanup`, `minor`, `stuff`)
- Subject line has no colon (no conventional-commit scope marker)

For commits that pass quality: extract the subject line and use it directly.

For **low-quality** commits, fetch the diff summary to understand what actually changed:

```bash
git show --stat <sha>
# if still unclear:
git show --unified=0 <sha> -- src/
```

Summarise what each low-quality commit actually did based on the diff (1–2 sentences max per commit, no code quotes).

## Step 4 — Classify and group changes

**First, filter out everything a player cannot see or understand.** Silently discard any commit that touches only:
- `.claude/`, `.husky/`, `.github/`, `scripts/`, `specs/`, `tests/`, `*.md` files
- `vite.config.*`, `tsconfig.*`, `package*.json`, `eslint*`, deployment / CI config
- Pure refactors, renames, type fixes, or test changes with no gameplay effect
- Release notes tooling itself (`src/utils/releaseNotes.ts`, `src/data/releaseNotes.ts`)

If a commit touches both player-visible files and invisible files, include only the player-visible part.

Group the remaining changes into sections. Use only sections that have content:

| Section heading | What belongs here |
|---|---|
| New Features | New question types, new puzzle collections, new UI mechanics, new game modes |
| Puzzle Content | New puzzles added, existing puzzles regenerated or corrected |
| Bug Fixes | Incorrect answers, wrong UI behaviour, broken interactions |
| UI / UX | Visual changes, layout, settings, tutorial flow |

Rules:
- One bullet per player-visible change
- Bullets start with an active verb: "Added", "Fixed", "Corrected", "Improved", "Removed"
- Do not mention file names, function names, TypeScript types, or internal tool names
- Do not invent features — only describe what the diffs confirm
- If after filtering nothing remains, tell the user there are no player-visible changes and stop

## Step 5 — Draft the ReleaseEntry

Propose a `title` (short, evocative, ≤ 60 chars) and the full `ReleaseEntry` object to append to `RELEASE_NOTES`:

```ts
{
  version: '<TODAY>',
  title: '<proposed title>',
  sections: [
    { heading: '...', items: ['...', '...'] },
  ],
}
```

Show this to the user and ask:
1. Does the title and content look right? Any sections to add/remove/edit?
2. Confirm to write: "Shall I write this to `releaseNotes.ts` and bump `RELEASE_VERSION` to `<TODAY>`?"

**Do not write any files until the user confirms.**

## Step 6 — Write on confirmation

When the user confirms (or after they supply edits):

1. Append the new entry to the `RELEASE_NOTES` array in `src/data/releaseNotes.ts`
   - Add it as the **first** element (most recent first)
2. Update `RELEASE_VERSION` in `src/utils/releaseNotes.ts` to `'<TODAY>'`

After writing, run:
```bash
npx tsc --noEmit 2>&1 | head -20
```
and report any type errors (there should be none).

## Step 7 — Commit and provide PR URL

After the type check passes, ask the user: "Shall I commit these changes?"

If the user confirms:

1. Commit on the current branch:
```bash
git add src/data/releaseNotes.ts src/utils/releaseNotes.ts
git commit -m "chore(release): bump RELEASE_VERSION to <TODAY>"
```

2. Derive the GitHub repo path from the remote URL, then build a pre-filled PR URL:

```bash
python3 - <<'EOF'
import urllib.parse

repo = "<owner>/<repo>"   # derived from `git remote get-url origin` (strip .git, SSH→HTTPS)
today = "<TODAY>"
branch = "<CURRENT_BRANCH>"  # from `git branch --show-current`
entry_title = "<entry title>"

body_lines = ["## Summary", ""]
# For each section in the release entry, append:
#   ### <heading>
#   - <item>
#   ...
body_lines += ["", "---", "🤖 Generated with [Claude Code](https://claude.com/claude-code)"]

body = "\n".join(body_lines)
pr_title = f"chore(release): release notes {today} — {entry_title}"
params = urllib.parse.urlencode({"expand": "1", "title": pr_title, "body": body})
print(f"https://github.com/{repo}/compare/main...{branch}?{params}")
EOF
```

Output the resulting URL and tell the user: "Open this URL to create the PR on GitHub — the title and description will be pre-filled."
