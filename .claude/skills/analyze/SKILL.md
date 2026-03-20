---
name: analyze
description: Re-score all base and expanded puzzles with the complexity formula and write back complexity.score + difficulty fields. Shows collection pip distribution with MISMATCH and SPLIT SUGGESTED flags. Use this after changing any puzzle JSON or the scoring formula.
disable-model-invocation: true
allowed-tools: Bash
---

Run both analyze commands sequentially and report the results:

```bash
python3 scripts/alchemydoku.py analyze && python3 scripts/alchemydoku.py analyze-expanded
```

After they complete, summarize:
1. Any collections flagged `← MISMATCH` — list them and what the label should be changed to
2. Any collections flagged `← SPLIT SUGGESTED` — list them and their pip spread
3. Total puzzles re-scored (base + expanded)

Do not edit any files beyond what the commands write themselves.
