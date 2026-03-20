---
name: check
description: Run the full pre-commit validation suite — TypeScript type-check, structural puzzle checks, and the vitest test suite. Use this before committing to verify everything is clean.
disable-model-invocation: true
allowed-tools: Bash
---

Run all three checks in sequence:

```bash
npx tsc --noEmit 2>&1 && echo "✓ tsc passed" || echo "✗ tsc failed"
python3 scripts/check_puzzles.py 2>&1
npm run test 2>&1
```

Report the results concisely:
- tsc: pass or list of type errors
- check_puzzles: pass (with warning count) or list of ERRORs (ignore warnings)
- tests: pass with test count, or list of failing tests

If everything passes, say so clearly. If anything fails, explain what needs fixing.
