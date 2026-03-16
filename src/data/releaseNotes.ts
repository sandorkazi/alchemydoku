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
