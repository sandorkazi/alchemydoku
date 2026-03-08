# Alchemydoku — Specs

Design specifications for the Alchemydoku puzzle app. Each file covers one concern.
All specs reflect the **current implementation** unless marked `[DEFERRED]` or `[DRAFT]`.

---

| File                  | Contents                                                                 |
|-----------------------|--------------------------------------------------------------------------|
| `GAME_MECHANICS.md`   | Alchemical data, mixing rules, sell rules, all base clue types, world representation, question/answer types |
| `PUZZLE_FORMAT.md`    | Base game puzzle JSON schema, ID conventions, collection structure, validation rules |
| `ARCHITECTURE.md`     | File structure, isolation contract, routing model, context API, localStorage layout, build/deploy |
| `UI_COMPONENTS.md`    | Component catalogue — props, context deps, rendering contract for every component |
| `EXPANDED.md`         | Expanded rules: Solar/Lunar, encyclopedia articles, book tokens, debunk clue types, expanded question/answer types, grid UI additions |
| `DIFFICULTY.md`       | Information-theoretic difficulty scoring: clue strength, deduction chain depth, composite formula, collection re-ranking |

---

## Key design decisions recorded here

- **World representation:** flat `Uint8Array` + `Uint16Array` index set rather than JS objects — 5× faster filtering (see `ARCHITECTURE.md §2`, `GAME_MECHANICS.md §6`)
- **Expanded isolation:** only `App.tsx` imports from `src/expanded/` — enforced by convention, verifiable with grep (see `ARCHITECTURE.md §2`)
- **Reset version key:** `resetVersion` counter in React state ensures `SolverProvider` remounts on progress reset even when same puzzle is open (see `ARCHITECTURE.md §7`)
- **Article sign model:** encyclopedia articles assign each of 4 ingredients an independent sign on one aspect — not "4 ingredients sharing the same sign" (see `EXPANDED.md §2b`)
- **Debunk display rule:** apprentice debunk shows truth; master debunk shows only the claim (true result not public, especially on failure) (see `EXPANDED.md §2d–2e`)

---

## Deferred / Out of scope

- **Golem Project mechanics** — separate expansion, not yet designed
- **Debunking questions** — "what mix would debunk this article?" — deferred until Q/A types designed
- **Double-trouble debunk** — simultaneous two-article disproof — deferred
- **Uncertain article difficulty scoring** — `analyze_difficulty.py` not updated for 3-of-4 enumeration
- **Expanded puzzle generation scripts** — manual authoring only for now
