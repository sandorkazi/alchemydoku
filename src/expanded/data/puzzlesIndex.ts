/**
 * expanded/data/puzzlesIndex.ts
 * Registry of all expanded-mode puzzles and collections.
 * Never imported by base-game code.
 */

// ── Tutorials ─────────────────────────────────────────────────────────────────
import expTutorialBook01    from './puzzles/exp-tutorial-book-01.json';
import expTutorialEnc01     from './puzzles/exp-tutorial-enc-01.json';

// ── Easy: Encyclopedia ────────────────────────────────────────────────────────
import expEasyEnc01         from './puzzles/exp-easy-enc-01.json';
import expEasyEnc02         from './puzzles/exp-easy-enc-02.json';
import expEasyEnc03         from './puzzles/exp-easy-enc-03.json';
import expEasyEnc04         from './puzzles/exp-easy-enc-04.json';
import expEasyEnc05         from './puzzles/exp-easy-enc-05.json';
import expEasyEnc06         from './puzzles/exp-easy-enc-06.json';
import expEasyEnc07         from './puzzles/exp-easy-enc-07.json';
import expEasyEnc08         from './puzzles/exp-easy-enc-08.json';
import expEasyEnc09         from './puzzles/exp-easy-enc-09.json';
import expEasyEnc10         from './puzzles/exp-easy-enc-10.json';

// ── Easy: Solar/Lunar ─────────────────────────────────────────────────────────
import expEasySolar01       from './puzzles/exp-easy-solar-01.json';
import expEasySl02          from './puzzles/exp-easy-sl-02.json';
import expEasySl03          from './puzzles/exp-easy-sl-03.json';
import expEasySl04          from './puzzles/exp-easy-sl-04.json';
import expEasySl05          from './puzzles/exp-easy-sl-05.json';
import expEasySl06          from './puzzles/exp-easy-sl-06.json';
import expEasySl07          from './puzzles/exp-easy-sl-07.json';

// ── Easy: Golem ───────────────────────────────────────────────────────────────
import expGolemTutorial01   from './puzzles/exp-golem-tutorial-01.json';
import expEasyGolem02       from './puzzles/exp-easy-golem-02.json';
import expEasyGolem03       from './puzzles/exp-easy-golem-03.json';
import expEasyGolem04       from './puzzles/exp-easy-golem-04.json';
import expEasyGolem05       from './puzzles/exp-easy-golem-05.json';
import expEasyGolem06       from './puzzles/exp-easy-golem-06.json';

// ── Medium: Encyclopedia + Solar/Lunar ────────────────────────────────────────
import expMediumEncSl02     from './puzzles/exp-medium-enc-sl-02.json';
import expMediumEncSl03     from './puzzles/exp-medium-enc-sl-03.json';
import expMediumEncSl04     from './puzzles/exp-medium-enc-sl-04.json';
import expMediumEncSl05     from './puzzles/exp-medium-enc-sl-05.json';
import expMediumEncSl06     from './puzzles/exp-medium-enc-sl-06.json';

// ── Medium: Golem + Encyclopedia ──────────────────────────────────────────────
import expMediumGolemEnc02  from './puzzles/exp-medium-golem-enc-02.json';
import expMediumGolemEnc03  from './puzzles/exp-medium-golem-enc-03.json';
import expMediumGolemEnc04  from './puzzles/exp-medium-golem-enc-04.json';
import expMediumGolemEnc05  from './puzzles/exp-medium-golem-enc-05.json';
import expMediumGolemEnc06  from './puzzles/exp-medium-golem-enc-06.json';

// ── Medium: Golem + Solar/Lunar ───────────────────────────────────────────────
import expMediumGolemSl02   from './puzzles/exp-medium-golem-sl-02.json';
import expMediumGolemSl03   from './puzzles/exp-medium-golem-sl-03.json';
import expMediumGolemSl04   from './puzzles/exp-medium-golem-sl-04.json';
import expMediumGolemSl05   from './puzzles/exp-medium-golem-sl-05.json';
import expMediumGolemSl06   from './puzzles/exp-medium-golem-sl-06.json';

// ── Hard: All Mechanics ───────────────────────────────────────────────────────
import expHardAll02         from './puzzles/exp-hard-all-02.json';
import expHardAll03         from './puzzles/exp-hard-all-03.json';
import expHardAll04         from './puzzles/exp-hard-all-04.json';
import expHardAll05         from './puzzles/exp-hard-all-05.json';
import expHardAll06         from './puzzles/exp-hard-all-06.json';

// ── Hard: Golem + Mixing ──────────────────────────────────────────────────────
import expHardGolemMix02    from './puzzles/exp-hard-golem-mix-02.json';
import expHardGolemMix03    from './puzzles/exp-hard-golem-mix-03.json';
import expHardGolemMix04    from './puzzles/exp-hard-golem-mix-04.json';
import expHardGolemMix05    from './puzzles/exp-hard-golem-mix-05.json';
import expHardGolemMix06    from './puzzles/exp-hard-golem-mix-06.json';

// ── Hard: Among / Probabilistic ───────────────────────────────────────────────
import expHardAmongGolem01  from './puzzles/exp-hard-among-golem-01.json';
import expHardAmongGolem02  from './puzzles/exp-hard-among-golem-02.json';

// ── Debunk ────────────────────────────────────────────────────────────────────
import expDebunkTutorial01  from './puzzles/exp-debunk-tutorial-01.json';
import expDebunkEasy01      from './puzzles/exp-debunk-easy-01.json';
import expDebunkMedium01    from './puzzles/exp-debunk-medium-01.json';

// ── Combination: Grand Synthesis ──────────────────────────────────────────────
import comboExpEasy02       from './puzzles/combo-exp-easy-02.json';
import comboExpEasy03       from './puzzles/combo-exp-easy-03.json';
import comboExpEasy04       from './puzzles/combo-exp-easy-04.json';
import comboExpEasy05       from './puzzles/combo-exp-easy-05.json';
import comboExpEasy06       from './puzzles/combo-exp-easy-06.json';
import comboExpMedSl02      from './puzzles/combo-exp-med-sl-02.json';
import comboExpMedSl03      from './puzzles/combo-exp-med-sl-03.json';
import comboExpMedSl04      from './puzzles/combo-exp-med-sl-04.json';
import comboExpMedSl05      from './puzzles/combo-exp-med-sl-05.json';
import comboExpMedAll02     from './puzzles/combo-exp-med-all-02.json';
import comboExpMedAll03     from './puzzles/combo-exp-med-all-03.json';
import comboExpMedAll04     from './puzzles/combo-exp-med-all-04.json';
import comboExpMedAll05     from './puzzles/combo-exp-med-all-05.json';
import comboExpHardWha02    from './puzzles/combo-exp-hard-wha-02.json';
import comboExpHardWha03    from './puzzles/combo-exp-hard-wha-03.json';
import comboExpHardWha04    from './puzzles/combo-exp-hard-wha-04.json';
import comboExpHardWha05    from './puzzles/combo-exp-hard-wha-05.json';
import comboExpHardSl02     from './puzzles/combo-exp-hard-sl-02.json';
import comboExpHardSl03     from './puzzles/combo-exp-hard-sl-03.json';
import comboExpHardSl04     from './puzzles/combo-exp-hard-sl-04.json';
import comboExpHardSl05     from './puzzles/combo-exp-hard-sl-05.json';

import type { ExpandedPuzzle } from '../types';

export const ALL_EXPANDED_PUZZLES: ExpandedPuzzle[] = [
  expTutorialBook01, expTutorialEnc01,
  expEasyEnc01, expEasyEnc02, expEasyEnc03, expEasyEnc04, expEasyEnc05,
  expEasyEnc06, expEasyEnc07, expEasyEnc08, expEasyEnc09, expEasyEnc10,
  expEasySolar01, expEasySl02, expEasySl03, expEasySl04, expEasySl05, expEasySl06, expEasySl07,
  expGolemTutorial01, expEasyGolem02, expEasyGolem03, expEasyGolem04, expEasyGolem05, expEasyGolem06,
  expMediumEncSl02, expMediumEncSl03, expMediumEncSl04, expMediumEncSl05, expMediumEncSl06,
  expMediumGolemEnc02, expMediumGolemEnc03, expMediumGolemEnc04, expMediumGolemEnc05, expMediumGolemEnc06,
  expMediumGolemSl02, expMediumGolemSl03, expMediumGolemSl04, expMediumGolemSl05, expMediumGolemSl06,
  expHardAll02, expHardAll03, expHardAll04, expHardAll05, expHardAll06,
  expHardGolemMix02, expHardGolemMix03, expHardGolemMix04, expHardGolemMix05, expHardGolemMix06,
  expHardAmongGolem01, expHardAmongGolem02,
  expDebunkTutorial01, expDebunkEasy01, expDebunkMedium01,
  comboExpEasy02, comboExpEasy03, comboExpEasy04, comboExpEasy05, comboExpEasy06,
  comboExpMedSl02, comboExpMedSl03, comboExpMedSl04, comboExpMedSl05,
  comboExpMedAll02, comboExpMedAll03, comboExpMedAll04, comboExpMedAll05,
  comboExpHardWha02, comboExpHardWha03, comboExpHardWha04, comboExpHardWha05,
  comboExpHardSl02, comboExpHardSl03, comboExpHardSl04, comboExpHardSl05,
] as unknown as ExpandedPuzzle[];

export const EXPANDED_PUZZLE_MAP: Record<string, ExpandedPuzzle> =
  Object.fromEntries(ALL_EXPANDED_PUZZLES.map(p => [p.id, p]));

export type ExpandedCollection = {
  id: string;
  title: string;
  description: string;
  difficulty: 'tutorial' | 'easy' | 'medium' | 'hard';
  puzzleIds: string[];
  unlockedAfter?: string;
};

export const EXPANDED_COLLECTIONS: ExpandedCollection[] = [
  {
    id: 'exp-tutorials',
    title: 'New Mechanics',
    description: 'Learn the Book Token and Royal Encyclopedia — the two new tools of the expanded rules.',
    difficulty: 'tutorial',
    puzzleIds: ['exp-tutorial-book-01', 'exp-tutorial-enc-01'],
  },
  {
    id: 'exp-easy-enc',
    title: 'First Articles',
    description: 'Apply encyclopedia entries to narrow down alchemical identities. Short, focused deductions.',
    difficulty: 'easy',
    puzzleIds: [
      'exp-easy-enc-01', 'exp-easy-enc-02', 'exp-easy-enc-03', 'exp-easy-enc-04', 'exp-easy-enc-05',
      'exp-easy-enc-06', 'exp-easy-enc-07', 'exp-easy-enc-08', 'exp-easy-enc-09', 'exp-easy-enc-10',
    ],
    unlockedAfter: 'exp-tutorials',
  },
  {
    id: 'exp-easy-sl',
    title: 'Solar & Lunar Readings',
    description: 'Use the Book Token to classify ingredients as Solar or Lunar, then deduce from there.',
    difficulty: 'easy',
    puzzleIds: [
      'exp-easy-solar-01', 'exp-easy-sl-02', 'exp-easy-sl-03',
      'exp-easy-sl-04', 'exp-easy-sl-05', 'exp-easy-sl-06', 'exp-easy-sl-07',
    ],
    unlockedAfter: 'exp-tutorials',
  },
  {
    id: 'exp-golem',
    title: 'The Golem Project',
    description: 'Test ingredients on the royal golem. Deduce what it reacts to, then find the pair that will bring it to life.',
    difficulty: 'easy',
    puzzleIds: [
      'exp-golem-tutorial-01',
      'exp-easy-golem-02', 'exp-easy-golem-03', 'exp-easy-golem-04',
      'exp-easy-golem-05', 'exp-easy-golem-06',
    ],
    unlockedAfter: 'exp-tutorials',
  },
  {
    id: 'exp-medium-enc-sl',
    title: "The Scholar's Compendium",
    description: 'Encyclopedia and Solar/Lunar clues interlock — neither alone is enough.',
    difficulty: 'medium',
    puzzleIds: [
      'exp-medium-enc-sl-02', 'exp-medium-enc-sl-03', 'exp-medium-enc-sl-04',
      'exp-medium-enc-sl-05', 'exp-medium-enc-sl-06',
    ],
    unlockedAfter: 'exp-easy-enc',
  },
  {
    id: 'exp-medium-golem-enc',
    title: 'Golem & Encyclopedia',
    description: 'Golem reactions and published articles constrain each other. Cross-reference to find the animators.',
    difficulty: 'medium',
    puzzleIds: [
      'exp-medium-golem-enc-02', 'exp-medium-golem-enc-03', 'exp-medium-golem-enc-04',
      'exp-medium-golem-enc-05', 'exp-medium-golem-enc-06',
    ],
    unlockedAfter: 'exp-golem',
  },
  {
    id: 'exp-medium-golem-sl',
    title: 'Golem & Field Tests',
    description: 'Combine golem reactions with mixing results to deduce the animate potion.',
    difficulty: 'medium',
    puzzleIds: [
      'exp-medium-golem-sl-02', 'exp-medium-golem-sl-03', 'exp-medium-golem-sl-04',
      'exp-medium-golem-sl-05', 'exp-medium-golem-sl-06',
    ],
    unlockedAfter: 'exp-golem',
  },
  {
    id: 'exp-hard-all',
    title: 'The Hard Cases',
    description: 'All expanded mechanics in play — golem tests, encyclopedia entries, Solar/Lunar. No single clue type is sufficient.',
    difficulty: 'hard',
    puzzleIds: [
      'exp-hard-all-02', 'exp-hard-all-03', 'exp-hard-all-04',
      'exp-hard-all-05', 'exp-hard-all-06',
    ],
    unlockedAfter: 'exp-medium-golem-enc',
  },
  {
    id: 'exp-hard-golem-mix',
    title: 'Animating the Golem',
    description: 'You must deduce not just the reaction pattern but the exact potion needed — using only golem tests and mixing results.',
    difficulty: 'hard',
    puzzleIds: [
      'exp-hard-golem-mix-02', 'exp-hard-golem-mix-03', 'exp-hard-golem-mix-04',
      'exp-hard-golem-mix-05', 'exp-hard-golem-mix-06',
    ],
    unlockedAfter: 'exp-medium-golem-sl',
  },
  {
    id: 'exp-hard-among',
    title: 'Whispers & Reactions',
    description: 'You overheard partial results — reactions from unnamed ingredients, sell outcomes without knowing whose potion it was. Piece it together.',
    difficulty: 'hard',
    puzzleIds: ['exp-hard-among-golem-01', 'exp-hard-among-golem-02'],
    unlockedAfter: 'exp-hard-all',
  },
  {
    id: 'exp-debunk',
    title: 'Debunking',
    description: "Rivals have published false alchemical theories. You know the truth — plan the fewest possible debunk actions to clear the board.",
    difficulty: 'medium',
    puzzleIds: ['exp-debunk-tutorial-01', 'exp-debunk-easy-01', 'exp-debunk-medium-01'],
    unlockedAfter: 'exp-tutorials',
  },
  {
    id: 'combo-exp',
    title: 'Grand Synthesis',
    description: 'All expanded mechanics at once — encyclopedia articles, Solar/Lunar classifications, and golem reactions. The hardest deductions require every tool.',
    difficulty: 'hard',
    puzzleIds: [
      'combo-exp-easy-02', 'combo-exp-easy-03', 'combo-exp-easy-04', 'combo-exp-easy-05', 'combo-exp-easy-06',
      'combo-exp-med-sl-02', 'combo-exp-med-sl-03', 'combo-exp-med-sl-04', 'combo-exp-med-sl-05',
      'combo-exp-med-all-02', 'combo-exp-med-all-03', 'combo-exp-med-all-04', 'combo-exp-med-all-05',
      'combo-exp-hard-wha-02', 'combo-exp-hard-wha-03', 'combo-exp-hard-wha-04', 'combo-exp-hard-wha-05',
      'combo-exp-hard-sl-02', 'combo-exp-hard-sl-03', 'combo-exp-hard-sl-04', 'combo-exp-hard-sl-05',
    ],
    unlockedAfter: 'exp-hard-all',
  },
];
