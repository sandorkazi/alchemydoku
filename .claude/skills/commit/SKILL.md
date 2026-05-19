---
name: commit
description: Create a git commit for staged or specified changes. Never adds a Co-Authored-By trailer. Use this instead of the default commit flow.
disable-model-invocation: true
allowed-tools: Bash
---

## Rules for this project

- **Never add a `Co-Authored-By` trailer** to any commit message
- Never use `--no-verify`
- Never amend a previous commit unless explicitly asked
- Stage specific files by name, not `git add -A`

## Steps

1. Run `git status` and `git diff --cached` to see what is staged / what has changed
2. Run `git log --oneline -5` to match the existing commit message style
3. If nothing is staged, ask which files to stage
4. **Release notes check** — run:
   ```bash
   RELEASE_VERSION=$(grep -oE "'[0-9]{4}-[0-9]{2}-[0-9]{2}'" src/utils/releaseNotes.ts 2>/dev/null | head -1 | tr -d "'")
   git log --oneline --after="$RELEASE_VERSION" -- src/ \
     ':(exclude)src/utils/releaseNotes.ts' \
     ':(exclude)src/data/releaseNotes.ts' 2>/dev/null | wc -l | tr -d ' '
   ```
   If the count is > 0 AND the staged diff does not touch `releaseNotes`, warn:
   > "Release notes may be stale ($RELEASE_VERSION, N commits since). Run /release-notes before committing, or confirm you want to skip."
   Wait for the user to either run `/release-notes` or explicitly say to proceed without updating them.
5. Draft a concise commit message (imperative subject, ≤72 chars; optional body)
6. Show the message and ask for confirmation, then commit:

```bash
git commit -m "$(cat <<'EOF'
<message here>
EOF
)"
```

7. Run `git status` to confirm success
