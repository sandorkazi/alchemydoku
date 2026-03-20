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
4. Draft a concise commit message (imperative subject, ≤72 chars; optional body)
5. Show the message and ask for confirmation, then commit:

```bash
git commit -m "$(cat <<'EOF'
<message here>
EOF
)"
```

6. Run `git status` to confirm success
