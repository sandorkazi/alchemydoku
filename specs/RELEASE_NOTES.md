# Alchemydoku — Release Notes / What's New

> Design specification for the "What's New" feature.
> Status: **DRAFT** — not yet implemented.
>
> Describes how returning players are informed about content added since their last visit.
> This is not a developer changelog; it is a player-facing feature.

---

## 1. Purpose and Goals

### 1.1 The problem

When a returning player opens the app after weeks away, there is no signal that anything has changed. New collections appear silently in the list. New question types are unlabelled. Players with progress have no way to know what is worth revisiting.

### 1.2 Goals

- Give returning players a brief, friendly summary of what is new since their last visit.
- Surface new collections and question types specifically, not build or infrastructure changes.
- Never show notes to first-time visitors (nothing is "new" to them yet).
- Be dismissible in one tap and stay out of the way thereafter.
- Persist the dismissed state so it does not reappear until the next real update.

### 1.3 Non-goals

- Not a full changelog visible at all times (that belongs in an "About" page if one is ever added).
- Not a marketing prompt.
- Does not change progression or unlocking rules.
- Does not retroactively mark any puzzle as "seen" or "unseen".

---

## 2. Detecting "First Visit After an Update"

### 2.1 Two separate version strings

Two version constants exist in the codebase, intentionally decoupled:

| Constant | Location | Purpose |
|---|---|---|
| `SAVE_VERSION` | `src/utils/saveProgress.ts` | Drives data migrations; bumped only when save-file shape changes |
| `RELEASE_VERSION` | `src/utils/releaseNotes.ts` *(new)* | Drives the What's New banner; bumped on every player-visible content release |

`RELEASE_VERSION` is an ISO date string (e.g. `'2026-03-15'`). Using a date makes it human-readable in DevTools, avoids integer bikeshedding, and sorts lexicographically. An alternative short tag like `'v1.4'` is also acceptable, provided it is strictly greater (lexicographically) than all previous values.

### 2.2 localStorage key

```
alch-seen-release  →  string  (the RELEASE_VERSION value last dismissed by the user)
```

This key is absent on a brand-new device and on any device that predates this feature.

### 2.3 Detection logic

```ts
// src/utils/releaseNotes.ts

export function shouldShowReleaseNotes(): boolean {
  try {
    const seen = localStorage.getItem('alch-seen-release');
    if (!seen) {
      // No record: first-time visitor OR a returning player who predates this feature.
      // Show only if the player has existing progress.
      const hasProgress =
        !!localStorage.getItem('alch-save-base') ||
        !!localStorage.getItem('alch-save-expanded') ||
        !!localStorage.getItem('alch-completed-base') ||
        !!localStorage.getItem('alch-completed-expanded');
      return hasProgress;
    }
    return seen !== RELEASE_VERSION;
  } catch { return false; }
}

export function markReleaseNotesSeen(): void {
  try { localStorage.setItem('alch-seen-release', RELEASE_VERSION); } catch { /* ignore */ }
}
```

### 2.4 Startup integration

`shouldShowReleaseNotes()` is called once in `main.tsx`, after `runMigrations()` and before `ReactDOM.createRoot`. The result is passed to `App` as a prop.

```ts
// main.tsx
runMigrations();
const showReleaseNotes = shouldShowReleaseNotes();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TutorialProvider>
      <App showReleaseNotes={showReleaseNotes} />
    </TutorialProvider>
  </StrictMode>
);
```

`App.tsx` threads `showReleaseNotes` to both the base home view and `ExpandedHome`.

---

## 3. Release Entry Data Structure

### 3.1 Where it lives

All release entry content lives in a new static module:

```
src/data/releaseNotes.ts
```

Plain TypeScript (not JSON) so future entries can reference imported constants if needed. The entire history is bundled at build time — acceptable because the payload is tiny (a few hundred bytes per release).

### 3.2 Data types

```ts
// src/data/releaseNotes.ts

export type ReleaseSection = {
  heading: string;    // e.g. "New Collections", "New Question Types", "Bug Fixes"
  items: string[];    // plain English bullets; no HTML, no visual tokens
};

export type ReleaseEntry = {
  version: string;        // matches RELEASE_VERSION format
  date: string;           // ISO date string, display only
  title: string;          // short headline, e.g. "New Deduction Tools"
  sections: ReleaseSection[];
};

export const RELEASE_NOTES: ReleaseEntry[] = [
  // Newest entry first.
];
```

### 3.3 Section headings

Suggested player-facing categories (not all required in every release):

- **New Collections** — new collection groups added to the home screen
- **New Question Types** — new answer formats players haven't encountered before
- **Improvements** — UI or workflow improvements that players will notice
- **Bug Fixes** — corrections to wrong hint text or incorrect puzzle answers (reference puzzles by title, not ID)

Infrastructure changes, TypeScript fixes, CI, and generator script improvements are never mentioned.

### 3.4 Multiple skipped versions

When a player skips multiple releases, the banner shows only the entry for the current `RELEASE_VERSION`. It does not accumulate all missed entries. A returning player who missed three releases is best served by a single "here is what we have now" summary, not a threaded history. The banner title may acknowledge this: `"Here's what's new since your last visit"`.

Multi-version aggregation is explicitly deferred (see §10).

---

## 4. UI Placement and Visual Design

### 4.1 Location

The banner appears at the top of each home screen, immediately below the mode-switcher / sync row and above the hero block. It is shown on both the base game home (`App.tsx`) and the expanded hub (`ExpandedHome.tsx`), because a release may affect either or both modes.

```
┌──────────────────────────────────────────┐
│  [Base Game]   [✨ Expanded]   ☁        │  ← mode switcher + Drive sync row
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  ✨ What's New                     │  │
│  │  New Deduction Tools               │  │  ← WhatsNewBanner (inline, dismissible)
│  │                                    │  │
│  │  New Collections                   │  │
│  │  • The Full Arsenal…               │  │
│  │  • Grand Synthesis…                │  │
│  │                       [ Got it ]   │  │
│  └────────────────────────────────────┘  │
│                                          │
│         ⚗️  Alchemy Sudoku Training      │  ← hero block
│         ...                              │
```

### 4.2 Visual treatment

The banner is a card that matches the existing design language:

| Property | Base mode | Expanded mode |
|---|---|---|
| Background | `bg-indigo-50` | `bg-amber-50` |
| Border | `border border-indigo-200` | `border border-amber-200` |
| Radius | `rounded-2xl` | `rounded-2xl` |
| Padding | `px-4 py-3` | `px-4 py-3` |

- Title row: emoji `✨` + title left-aligned (`text-sm font-semibold text-gray-800`), dismiss button right-aligned.
- Dismiss button: `Got it` — `text-xs text-indigo-600 hover:text-indigo-800 font-semibold`.
- Section heading: `text-[10px] uppercase tracking-widest text-gray-400 font-bold mt-2 mb-0.5` (matches the style used in `DebunkAnswerPanel` labels).
- Items: `text-sm text-gray-700`, each prefixed with `•`.

No modal overlay. The banner is inline and scrolls with the page. Entrance uses `animate-fadein` (existing utility class).

### 4.3 Accessibility

- Banner element: `role="region"` `aria-label="What's New"`.
- Dismiss button: `aria-label="Dismiss release notes"` with standard focus ring (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded`).

### 4.4 Dismiss behaviour

Clicking "Got it":
1. Calls `markReleaseNotesSeen()` — writes `alch-seen-release = RELEASE_VERSION` to localStorage.
2. The banner component unmounts immediately.
3. Because the key is shared, dismissing on the base home means the banner is also gone when the player switches to expanded mode (and vice versa).

---

## 5. New Content Tagging

### 5.1 Policy: annotations in release notes data, not in puzzle JSON

Puzzle JSON files do **not** gain an `addedInVersion` field. Reasons:

- Puzzle JSON is generated by Python scripts; version-tagging every generated file adds authoring friction.
- `check_puzzles.py` would need updating for every new field.
- The release notes data module already contains the canonical list of what is new.

New collections and puzzles are described in the `ReleaseEntry.sections` text. If a collection card should display a "New" badge, that badge is driven by `releaseNotes.ts`, not by any puzzle JSON field.

### 5.2 "New" badge on collection cards (optional, deferred — see §10)

An optional `NEW_COLLECTION_VERSIONS` map may be exported from `src/data/releaseNotes.ts`:

```ts
// Which collection ID was introduced in which release version
export const NEW_COLLECTION_VERSIONS: Record<string, string> = {
  'new-mechanics': '2026-03-15',
  'combo-base':    '2026-03-15',
  'combo-exp':     '2026-03-15',
};
```

A collection card shows a "New" chip when `NEW_COLLECTION_VERSIONS[col.id]` exists **and** the stored `alch-seen-release` is less than that version. The chip disappears once the player dismisses the banner for that version.

This is **[DEFERRED]** — the banner text is sufficient for v1.

---

## 6. Edge Cases

### 6.1 First-time visitor

`alch-seen-release` is absent, no progress keys are present. `shouldShowReleaseNotes()` returns `false`. The player sees nothing unusual on their first visit.

### 6.2 Returning player who predates this feature

Has `alch-completed-base` or `alch-save-base` populated, but no `alch-seen-release`. `hasProgress` returns `true`, so the banner is shown. This is correct: the player is returning and genuinely missed recent releases.

### 6.3 Multiple skipped versions

Only the current `RELEASE_VERSION` entry is shown (§3.4). The banner title acknowledges the gap: "Here's what's new since your last visit."

### 6.4 Mode switching while banner is visible

`showReleaseNotes` is computed once at startup and passed as a prop — it does not re-evaluate on mode switches. If the player switches from base to expanded without dismissing, the banner is still visible in the expanded hub. Both home screens share the same localStorage key, so dismissing in either mode clears it for both.

### 6.5 localStorage unavailable

All `releaseNotes.ts` reads/writes are wrapped in try/catch. If localStorage is unavailable, `shouldShowReleaseNotes()` returns `false` (banner suppressed) and `markReleaseNotesSeen()` no-ops silently. No crash, no broken UI.

### 6.6 Expanded mode unlock progression is unaffected

The banner does not reveal or unlock collections ahead of the `unlockedAfter` chain. Banner text about expanded collections should be written as "check the collection list when you're ready" rather than naming locked collections by title.

### 6.7 Player resets all progress

A "reset progress" flow clears puzzle save keys but **does not** clear `alch-seen-release`. After a reset the player is treated as having already seen the current notes — which is true; they saw the banner before resetting. They are not re-shown it.

---

## 7. Data Residency Summary

| Data | Location | Changed at |
|---|---|---|
| `RELEASE_VERSION` | `src/utils/releaseNotes.ts` (source) | Deploy time |
| `RELEASE_NOTES[]` and types | `src/data/releaseNotes.ts` (source) | Deploy time |
| `NEW_COLLECTION_VERSIONS` (optional) | `src/data/releaseNotes.ts` (source) | Deploy time |
| Last-seen version (per device) | `localStorage: alch-seen-release` | When player dismisses banner |

Nothing lives in puzzle JSON, `collections.json`, `puzzlesIndex.ts`, or any server-side storage.

---

## 8. Implementation Files

| File | Change |
|---|---|
| `src/utils/releaseNotes.ts` | **New.** `RELEASE_VERSION`, `shouldShowReleaseNotes()`, `markReleaseNotesSeen()` |
| `src/data/releaseNotes.ts` | **New.** `ReleaseEntry` types, `RELEASE_NOTES[]`, optional `NEW_COLLECTION_VERSIONS` |
| `src/components/WhatsNewBanner.tsx` | **New.** Pure display component: accepts `entry: ReleaseEntry` and `onDismiss: () => void` |
| `src/main.tsx` | Call `shouldShowReleaseNotes()` after `runMigrations()`; pass result to `<App>` |
| `src/App.tsx` | Accept `showReleaseNotes: boolean`; render `<WhatsNewBanner>` in home view; thread to `<ExpandedHome>` |
| `src/expanded/ExpandedHome.tsx` | Accept `showReleaseNotes: boolean`; render `<WhatsNewBanner>` in hub view |

`WhatsNewBanner` has no context dependencies — it is a pure display component that receives data as props.

---

## 9. First Release Entry

The first entry to add to `RELEASE_NOTES` when this feature ships:

```ts
{
  version: '2026-03-15',
  date: '2026-03-15',
  title: "New Deduction Tools & Capstone Collections",
  sections: [
    {
      heading: "New Collections",
      items: [
        "New Deduction Tools — five new question types: neutral partners, potion profiles, most informative mix, guaranteed non-producers, and group possible potions. Unlocks after Following the Logic.",
        "The Full Arsenal (base) — capstone collection combining mixing, selling, debunking, and overheard-reaction clues. Unlocks after All the Evidence.",
        "Grand Synthesis (expanded) — capstone collection using all expanded mechanics at once. Unlocks after The Hard Cases.",
        "Advanced Debunk Planning — master-debunk planning and the conflict-only challenge. Unlocks after the Master Debunking tutorial.",
      ],
    },
    {
      heading: "Bug Fixes",
      items: [
        "Corrected the answer list for two Possible Outcomes puzzles.",
        "Fixed stale hint text on three All the Evidence puzzles.",
        "Debunking now works correctly in apprentice-only plan puzzles (submitting green or blue was incorrectly rejected).",
      ],
    },
  ],
},
```

---

## 10. Deferred / Out of Scope

| Item | Notes |
|---|---|
| "New" badge on collection cards | Specified in §5.2 but deferred. The banner text alone is sufficient for v1. |
| "New" badge on individual puzzle rows | Requires per-puzzle version tracking in puzzle list UI; not worth the complexity. |
| Multi-version accumulation | Deferred. Show only the current `RELEASE_VERSION` entry. |
| Full "About / History" page | Appropriate once there are 4+ releases; would list all past entries. |
| Auto-scroll to new collection on dismiss | A pleasant UX touch; deferred pending real usage data. |
| Expanded-specific vs base-specific banner | Mode-agnostic banner is simpler; split banners are a future option. |
| Server-side targeting or A/B | No backend; out of scope. |
