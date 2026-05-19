export interface ReleaseSection {
  heading: string;
  items: string[];
}

export interface ReleaseEntry {
  version: string;   // ISO date string, e.g. '2026-03-16'
  title: string;
  sections: ReleaseSection[];
}

export const RELEASE_NOTES: ReleaseEntry[] = [
  {
    version: '2026-05-19',
    title: 'Golem Rework, Mixed Puzzles & Settings Overhaul',
    sections: [
      {
        heading: 'New Features',
        items: [
          'Added 110 new puzzles: 25 base, 15 expanded, 50 mixed-clue, and 10 mixed debunk variants',
          'Reworked the Golem mechanic — joint world×configuration reasoning with sign-based animation',
          'Added sell-variant Among clues and Book Among clue type',
          'Added custom ingredient shuffle picker; shuffle is now encoded in the puzzle permalink',
          'Added puzzle search by title in both base and expanded modes',
          'Added freehand drawing color picker — color dot on the pen icon, long-press to change',
          'Added save file download and upload for local backup',
          'Replaced standalone toggles with a full Settings modal with visual previews',
          'Added board-game compliance toggle and per-puzzle unrealistic hiding with collection count badge',
          'Added "Witnessed Evidence, Master Debunk" collection',
          'Added "extreme" difficulty tier for unrealistic expert-level puzzles',
          'Merged the ? mark tool into the cell mark tool as a third state',
          'Synced horizontal scroll between ingredient grid and Golem panel',
          'Added optional solve timer — enable in Settings to show elapsed time in the toolbar; pause hides puzzle content behind an overlay',
        ],
      },
      {
        heading: 'Puzzle Content',
        items: [
          'Removed step hints from all non-tutorial puzzles',
          'Added correct publications to all debunk puzzles',
          'Regenerated Golem puzzles with new joint-reasoning generator',
          'Reclassified difficulty for several solar/lunar and expanded puzzles',
        ],
      },
      {
        heading: 'Bug Fixes',
        items: [
          'Fixed debunk conflict semantics — result-incompatibility now correctly detected',
          'Fixed master debunk steps to require deterministic mix results across all worlds',
          'Fixed article removal to be restricted to result-color only',
          'Fixed debunk publications to derive from world constraints, not the hidden solution',
          'Fixed conflict ingredient picker to show all 8 slots and correct re-add behavior',
          'Fixed mobile grid left-edge clipping on narrow screens',
          'Fixed encyclopedia which-aspect sign distribution to enforce 4-0 or 2-2 only',
          'Fixed Google Drive settings sync to merge per-field instead of overwriting',
        ],
      },
    ],
  },
  {
    version: '2026-03-16',
    title: 'New Deduction Tools & Capstone Collections',
    sections: [
      {
        heading: 'New Collections',
        items: [
          'New Deduction Tools — five new question types: Neutral Partner, Potion Profile, Group Potions, Best Mix, and Non-Producers',
          'The Full Arsenal — 21-puzzle capstone collection covering every base-game question type',
          'Grand Synthesis — 21-puzzle expanded capstone covering all expanded mechanics',
          'Advanced Debunk Planning — master-level debunking with conflict-only and min-steps challenges',
        ],
      },
      {
        heading: 'Bug Fixes',
        items: [
          'Possible Outcomes answers corrected for two medium-difficulty puzzles',
          'All the Evidence hints regenerated with accurate step-by-step reasoning',
          'Apprentice debunk submission now accepts plans that use only apprentice steps',
        ],
      },
    ],
  },
];
