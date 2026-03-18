/**
 * expanded/data/puzzlesIndex.ts
 * Registry of all expanded-mode puzzles and collections.
 * Never imported by base-game code.
 */

// ── Tutorials ─────────────────────────────────────────────────────────────────
import expTutorialBook01    from './puzzles/exp-tutorial-book-01.json';
import expTutorialEnc01     from './puzzles/exp-tutorial-enc-01.json';

// ── Encyclopedia ──────────────────────────────────────────────────────────────
import enc01                from './puzzles/enc-01.json';
import enc02                from './puzzles/enc-02.json';
import enc03                from './puzzles/enc-03.json';
import enc04                from './puzzles/enc-04.json';
import enc05                from './puzzles/enc-05.json';
import enc06                from './puzzles/enc-06.json';
import enc07                from './puzzles/enc-07.json';
import enc08                from './puzzles/enc-08.json';
import enc09                from './puzzles/enc-09.json';
import enc10                from './puzzles/enc-10.json';

// ── Solar/Lunar ───────────────────────────────────────────────────────────────
import sl01                 from './puzzles/sl-01.json';
import sl02                 from './puzzles/sl-02.json';
import sl03                 from './puzzles/sl-03.json';
import sl04                 from './puzzles/sl-04.json';
import sl05                 from './puzzles/sl-05.json';
import sl06                 from './puzzles/sl-06.json';
import sl07                 from './puzzles/sl-07.json';

// ── Golem ─────────────────────────────────────────────────────────────────────
import expGolemTutorial01   from './puzzles/exp-golem-tutorial-01.json';
import golem02              from './puzzles/golem-02.json';
import golem03              from './puzzles/golem-03.json';
import golem04              from './puzzles/golem-04.json';
import golem05              from './puzzles/golem-05.json';
import golem06              from './puzzles/golem-06.json';

// ── Encyclopedia + Solar/Lunar ────────────────────────────────────────────────
import encSl02              from './puzzles/enc-sl-02.json';
import encSl03              from './puzzles/enc-sl-03.json';
import encSl04              from './puzzles/enc-sl-04.json';
import encSl05              from './puzzles/enc-sl-05.json';
import encSl06              from './puzzles/enc-sl-06.json';

// ── Golem + Encyclopedia ──────────────────────────────────────────────────────
import golemEnc02           from './puzzles/golem-enc-02.json';
import golemEnc03           from './puzzles/golem-enc-03.json';
import golemEnc04           from './puzzles/golem-enc-04.json';
import golemEnc05           from './puzzles/golem-enc-05.json';
import golemEnc06           from './puzzles/golem-enc-06.json';

// ── Golem + Solar/Lunar ───────────────────────────────────────────────────────
import golemSl02            from './puzzles/golem-sl-02.json';
import golemSl03            from './puzzles/golem-sl-03.json';
import golemSl04            from './puzzles/golem-sl-04.json';
import golemSl05            from './puzzles/golem-sl-05.json';
import golemSl06            from './puzzles/golem-sl-06.json';

// ── All Mechanics ─────────────────────────────────────────────────────────────
import all02                from './puzzles/all-02.json';
import all03                from './puzzles/all-03.json';
import all04                from './puzzles/all-04.json';
import all05                from './puzzles/all-05.json';
import all06                from './puzzles/all-06.json';

// ── Golem + Mixing ────────────────────────────────────────────────────────────
import golemMix02           from './puzzles/golem-mix-02.json';
import golemMix03           from './puzzles/golem-mix-03.json';
import golemMix04           from './puzzles/golem-mix-04.json';
import golemMix05           from './puzzles/golem-mix-05.json';
import golemMix06           from './puzzles/golem-mix-06.json';

// ── Among / Probabilistic ─────────────────────────────────────────────────────
import amongGolem01         from './puzzles/among-golem-01.json';
import amongGolem02         from './puzzles/among-golem-02.json';

// ── Debunk ────────────────────────────────────────────────────────────────────
import expDebunkTutorial01  from './puzzles/exp-debunk-tutorial-01.json';
import debunk01             from './puzzles/debunk-01.json';
import debunk02             from './puzzles/debunk-02.json';

// ── Combination: Grand Synthesis ──────────────────────────────────────────────
import comboExp02           from './puzzles/combo-exp-02.json';
import comboExp03           from './puzzles/combo-exp-03.json';
import comboExp04           from './puzzles/combo-exp-04.json';
import comboExp05           from './puzzles/combo-exp-05.json';
import comboExp06           from './puzzles/combo-exp-06.json';
import comboExpSl02         from './puzzles/combo-exp-sl-02.json';
import comboExpSl03         from './puzzles/combo-exp-sl-03.json';
import comboExpSl04         from './puzzles/combo-exp-sl-04.json';
import comboExpSl05         from './puzzles/combo-exp-sl-05.json';
import comboExpAll02        from './puzzles/combo-exp-all-02.json';
import comboExpAll03        from './puzzles/combo-exp-all-03.json';
import comboExpAll04        from './puzzles/combo-exp-all-04.json';
import comboExpAll05        from './puzzles/combo-exp-all-05.json';
import comboExpWha02        from './puzzles/combo-exp-wha-02.json';
import comboExpWha03        from './puzzles/combo-exp-wha-03.json';
import comboExpWha04        from './puzzles/combo-exp-wha-04.json';
import comboExpWha05        from './puzzles/combo-exp-wha-05.json';
import comboExpXsl02        from './puzzles/combo-exp-xsl-02.json';
import comboExpXsl03        from './puzzles/combo-exp-xsl-03.json';
import comboExpXsl04        from './puzzles/combo-exp-xsl-04.json';
import comboExpXsl05        from './puzzles/combo-exp-xsl-05.json';

// ── Mixed Clues — Best Book Experiment (10, entropy) ─────────────────────
import mixedExp02            from './puzzles/mixed-exp-02.json';
import mixedExp03            from './puzzles/mixed-exp-03.json';
import mixedExp04            from './puzzles/mixed-exp-04.json';
import mixedExp05            from './puzzles/mixed-exp-05.json';
import mixedExp06            from './puzzles/mixed-exp-06.json';
import mixedExp07            from './puzzles/mixed-exp-07.json';
import mixedExp08            from './puzzles/mixed-exp-08.json';
import mixedExp09            from './puzzles/mixed-exp-09.json';
import mixedExp10            from './puzzles/mixed-exp-10.json';
import mixedExp11            from './puzzles/mixed-exp-11.json';
// ── Mixed Clues — Potion Mixing (25) ──────────────────────────────────────
import mixedExpMix02         from './puzzles/mixed-exp-mix-02.json';
import mixedExpMix03         from './puzzles/mixed-exp-mix-03.json';
import mixedExpMix04         from './puzzles/mixed-exp-mix-04.json';
import mixedExpMix05         from './puzzles/mixed-exp-mix-05.json';
import mixedExpMix06         from './puzzles/mixed-exp-mix-06.json';
import mixedExpMix07         from './puzzles/mixed-exp-mix-07.json';
import mixedExpMix08         from './puzzles/mixed-exp-mix-08.json';
import mixedExpMix09         from './puzzles/mixed-exp-mix-09.json';
import mixedExpMix10         from './puzzles/mixed-exp-mix-10.json';
import mixedExpMix11         from './puzzles/mixed-exp-mix-11.json';
import mixedExpMix12         from './puzzles/mixed-exp-mix-12.json';
import mixedExpMix13         from './puzzles/mixed-exp-mix-13.json';
import mixedExpMix14         from './puzzles/mixed-exp-mix-14.json';
import mixedExpMix15         from './puzzles/mixed-exp-mix-15.json';
import mixedExpMix16         from './puzzles/mixed-exp-mix-16.json';
import mixedExpMix17         from './puzzles/mixed-exp-mix-17.json';
import mixedExpMix18         from './puzzles/mixed-exp-mix-18.json';
import mixedExpMix19         from './puzzles/mixed-exp-mix-19.json';
import mixedExpMix20         from './puzzles/mixed-exp-mix-20.json';
import mixedExpMix21         from './puzzles/mixed-exp-mix-21.json';
import mixedExpMix22         from './puzzles/mixed-exp-mix-22.json';
import mixedExpMix23         from './puzzles/mixed-exp-mix-23.json';
import mixedExpMix24         from './puzzles/mixed-exp-mix-24.json';
import mixedExpMix25         from './puzzles/mixed-exp-mix-25.json';
import mixedExpMix26         from './puzzles/mixed-exp-mix-26.json';
// ── Mixed Clues — Golem Reaction Groups (25) ──────────────────────────────
import mixedExpGolem02       from './puzzles/mixed-exp-golem-02.json';
import mixedExpGolem03       from './puzzles/mixed-exp-golem-03.json';
import mixedExpGolem04       from './puzzles/mixed-exp-golem-04.json';
import mixedExpGolem05       from './puzzles/mixed-exp-golem-05.json';
import mixedExpGolem06       from './puzzles/mixed-exp-golem-06.json';
import mixedExpGolem07       from './puzzles/mixed-exp-golem-07.json';
import mixedExpGolem08       from './puzzles/mixed-exp-golem-08.json';
import mixedExpGolem09       from './puzzles/mixed-exp-golem-09.json';
import mixedExpGolem10       from './puzzles/mixed-exp-golem-10.json';
import mixedExpGolem11       from './puzzles/mixed-exp-golem-11.json';
import mixedExpGolem12       from './puzzles/mixed-exp-golem-12.json';
import mixedExpGolem13       from './puzzles/mixed-exp-golem-13.json';
import mixedExpGolem14       from './puzzles/mixed-exp-golem-14.json';
import mixedExpGolem15       from './puzzles/mixed-exp-golem-15.json';
import mixedExpGolem16       from './puzzles/mixed-exp-golem-16.json';
import mixedExpGolem17       from './puzzles/mixed-exp-golem-17.json';
import mixedExpGolem18       from './puzzles/mixed-exp-golem-18.json';
import mixedExpGolem19       from './puzzles/mixed-exp-golem-19.json';
import mixedExpGolem20       from './puzzles/mixed-exp-golem-20.json';
import mixedExpGolem21       from './puzzles/mixed-exp-golem-21.json';
import mixedExpGolem22       from './puzzles/mixed-exp-golem-22.json';
import mixedExpGolem23       from './puzzles/mixed-exp-golem-23.json';
import mixedExpGolem24       from './puzzles/mixed-exp-golem-24.json';
import mixedExpGolem25       from './puzzles/mixed-exp-golem-25.json';
import mixedExpGolem26       from './puzzles/mixed-exp-golem-26.json';

// ── Mixed-Clue Debunk ──────────────────────────────────────────────────────
import mixedExpDebunk02      from './puzzles/mixed-exp-debunk-02.json';
import mixedExpDebunk03      from './puzzles/mixed-exp-debunk-03.json';
import mixedExpDebunk04      from './puzzles/mixed-exp-debunk-04.json';
import mixedExpDebunk05      from './puzzles/mixed-exp-debunk-05.json';
import mixedExpDebunk06      from './puzzles/mixed-exp-debunk-06.json';
import mixedExpDebunk07      from './puzzles/mixed-exp-debunk-07.json';
import mixedExpDebunk08      from './puzzles/mixed-exp-debunk-08.json';
import mixedExpDebunk09      from './puzzles/mixed-exp-debunk-09.json';
import mixedExpDebunk10      from './puzzles/mixed-exp-debunk-10.json';
import mixedExpDebunk11      from './puzzles/mixed-exp-debunk-11.json';
import mixedExpDebunk12      from './puzzles/mixed-exp-debunk-12.json';
import mixedExpDebunk13      from './puzzles/mixed-exp-debunk-13.json';
import mixedExpDebunk14      from './puzzles/mixed-exp-debunk-14.json';
import mixedExpDebunk15      from './puzzles/mixed-exp-debunk-15.json';
import mixedExpDebunk16      from './puzzles/mixed-exp-debunk-16.json';
import mixedExpDebunk17      from './puzzles/mixed-exp-debunk-17.json';
import mixedExpDebunk18      from './puzzles/mixed-exp-debunk-18.json';
import mixedExpDebunk19      from './puzzles/mixed-exp-debunk-19.json';
import mixedExpDebunk20      from './puzzles/mixed-exp-debunk-20.json';
import mixedExpDebunk21      from './puzzles/mixed-exp-debunk-21.json';
import mixedExpDebunk22      from './puzzles/mixed-exp-debunk-22.json';
import mixedExpDebunk23      from './puzzles/mixed-exp-debunk-23.json';
import mixedExpDebunk24      from './puzzles/mixed-exp-debunk-24.json';
import mixedExpDebunk25      from './puzzles/mixed-exp-debunk-25.json';
import mixedExpDebunk26      from './puzzles/mixed-exp-debunk-26.json';
import mixedExpDebunk27      from './puzzles/mixed-exp-debunk-27.json';
import mixedExpDebunk28      from './puzzles/mixed-exp-debunk-28.json';
import mixedExpDebunk29      from './puzzles/mixed-exp-debunk-29.json';
import mixedExpDebunk30      from './puzzles/mixed-exp-debunk-30.json';
import mixedExpDebunk31      from './puzzles/mixed-exp-debunk-31.json';
import mixedExpDebunk32      from './puzzles/mixed-exp-debunk-32.json';
import mixedExpDebunk33      from './puzzles/mixed-exp-debunk-33.json';
import mixedExpDebunk34      from './puzzles/mixed-exp-debunk-34.json';
import mixedExpDebunk35      from './puzzles/mixed-exp-debunk-35.json';
import mixedExpDebunk36      from './puzzles/mixed-exp-debunk-36.json';
import mixedExpDebunk37      from './puzzles/mixed-exp-debunk-37.json';
import mixedExpDebunk38      from './puzzles/mixed-exp-debunk-38.json';
import mixedExpDebunk39      from './puzzles/mixed-exp-debunk-39.json';
import mixedExpDebunk40      from './puzzles/mixed-exp-debunk-40.json';
import mixedExpDebunk41      from './puzzles/mixed-exp-debunk-41.json';
import mixedExpDebunk42      from './puzzles/mixed-exp-debunk-42.json';
import mixedExpDebunk43      from './puzzles/mixed-exp-debunk-43.json';
import mixedExpDebunk44      from './puzzles/mixed-exp-debunk-44.json';
import mixedExpDebunk45      from './puzzles/mixed-exp-debunk-45.json';
import mixedExpDebunk46      from './puzzles/mixed-exp-debunk-46.json';
import mixedExpDebunk47      from './puzzles/mixed-exp-debunk-47.json';
import mixedExpDebunk48      from './puzzles/mixed-exp-debunk-48.json';
import mixedExpDebunk49      from './puzzles/mixed-exp-debunk-49.json';
import mixedExpDebunk50      from './puzzles/mixed-exp-debunk-50.json';
import mixedExpDebunk51      from './puzzles/mixed-exp-debunk-51.json';

import type { ExpandedPuzzle } from '../types';

export const ALL_EXPANDED_PUZZLES: ExpandedPuzzle[] = [
  expTutorialBook01, expTutorialEnc01,
  enc01, enc02, enc03, enc04, enc05,
  enc06, enc07, enc08, enc09, enc10,
  sl01, sl02, sl03, sl04, sl05, sl06, sl07,
  expGolemTutorial01, golem02, golem03, golem04, golem05, golem06,
  encSl02, encSl03, encSl04, encSl05, encSl06,
  golemEnc02, golemEnc03, golemEnc04, golemEnc05, golemEnc06,
  golemSl02, golemSl03, golemSl04, golemSl05, golemSl06,
  all02, all03, all04, all05, all06,
  golemMix02, golemMix03, golemMix04, golemMix05, golemMix06,
  amongGolem01, amongGolem02,
  expDebunkTutorial01, debunk01, debunk02,
  comboExp02, comboExp03, comboExp04, comboExp05, comboExp06,
  comboExpSl02, comboExpSl03, comboExpSl04, comboExpSl05,
  comboExpAll02, comboExpAll03, comboExpAll04, comboExpAll05,
  comboExpWha02, comboExpWha03, comboExpWha04, comboExpWha05,
  comboExpXsl02, comboExpXsl03, comboExpXsl04, comboExpXsl05,
  mixedExp02, mixedExp03, mixedExp04, mixedExp05, mixedExp06,
  mixedExp07, mixedExp08, mixedExp09, mixedExp10, mixedExp11,
  mixedExpMix02, mixedExpMix03, mixedExpMix04, mixedExpMix05, mixedExpMix06,
  mixedExpMix07, mixedExpMix08, mixedExpMix09, mixedExpMix10, mixedExpMix11,
  mixedExpMix12, mixedExpMix13, mixedExpMix14, mixedExpMix15, mixedExpMix16,
  mixedExpMix17, mixedExpMix18, mixedExpMix19, mixedExpMix20, mixedExpMix21,
  mixedExpMix22, mixedExpMix23, mixedExpMix24, mixedExpMix25, mixedExpMix26,
  mixedExpGolem02, mixedExpGolem03, mixedExpGolem04, mixedExpGolem05, mixedExpGolem06,
  mixedExpGolem07, mixedExpGolem08, mixedExpGolem09, mixedExpGolem10, mixedExpGolem11,
  mixedExpGolem12, mixedExpGolem13, mixedExpGolem14, mixedExpGolem15, mixedExpGolem16,
  mixedExpGolem17, mixedExpGolem18, mixedExpGolem19, mixedExpGolem20, mixedExpGolem21,
  mixedExpGolem22, mixedExpGolem23, mixedExpGolem24, mixedExpGolem25, mixedExpGolem26,
  mixedExpDebunk02, mixedExpDebunk03, mixedExpDebunk04, mixedExpDebunk05, mixedExpDebunk06,
  mixedExpDebunk07, mixedExpDebunk08, mixedExpDebunk09, mixedExpDebunk10, mixedExpDebunk11,
  mixedExpDebunk12, mixedExpDebunk13, mixedExpDebunk14, mixedExpDebunk15, mixedExpDebunk16,
  mixedExpDebunk17, mixedExpDebunk18, mixedExpDebunk19, mixedExpDebunk20, mixedExpDebunk21,
  mixedExpDebunk22, mixedExpDebunk23, mixedExpDebunk24, mixedExpDebunk25, mixedExpDebunk26,
  mixedExpDebunk27, mixedExpDebunk28, mixedExpDebunk29, mixedExpDebunk30, mixedExpDebunk31,
  mixedExpDebunk32, mixedExpDebunk33, mixedExpDebunk34, mixedExpDebunk35, mixedExpDebunk36,
  mixedExpDebunk37, mixedExpDebunk38, mixedExpDebunk39, mixedExpDebunk40, mixedExpDebunk41,
  mixedExpDebunk42, mixedExpDebunk43, mixedExpDebunk44, mixedExpDebunk45, mixedExpDebunk46,
  mixedExpDebunk47, mixedExpDebunk48, mixedExpDebunk49, mixedExpDebunk50, mixedExpDebunk51,
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
      'enc-01', 'enc-02', 'enc-03', 'enc-04', 'enc-05',
      'enc-06', 'enc-07', 'enc-08', 'enc-09', 'enc-10',
    ],
    unlockedAfter: 'exp-tutorials',
  },
  {
    id: 'exp-easy-sl',
    title: 'Solar & Lunar Readings',
    description: 'Use the Book Token to classify ingredients as Solar or Lunar, then deduce from there.',
    difficulty: 'easy',
    puzzleIds: [
      'sl-01', 'sl-02', 'sl-03',
      'sl-04', 'sl-05', 'sl-06', 'sl-07',
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
      'golem-02', 'golem-03', 'golem-04',
      'golem-05', 'golem-06',
    ],
    unlockedAfter: 'exp-tutorials',
  },
  {
    id: 'exp-medium-enc-sl',
    title: "The Scholar's Compendium",
    description: 'Encyclopedia and Solar/Lunar clues interlock — neither alone is enough.',
    difficulty: 'medium',
    puzzleIds: [
      'enc-sl-02', 'enc-sl-03', 'enc-sl-04',
      'enc-sl-05', 'enc-sl-06',
    ],
    unlockedAfter: 'exp-easy-enc',
  },
  {
    id: 'exp-medium-golem-enc',
    title: 'Golem & Encyclopedia',
    description: 'Golem reactions and published articles constrain each other. Cross-reference to find the animators.',
    difficulty: 'medium',
    puzzleIds: [
      'golem-enc-02', 'golem-enc-03', 'golem-enc-04',
      'golem-enc-05', 'golem-enc-06',
    ],
    unlockedAfter: 'exp-golem',
  },
  {
    id: 'exp-medium-golem-sl',
    title: 'Golem & Field Tests',
    description: 'Combine golem reactions with mixing results to deduce the animate potion.',
    difficulty: 'medium',
    puzzleIds: [
      'golem-sl-02', 'golem-sl-03', 'golem-sl-04',
      'golem-sl-05', 'golem-sl-06',
    ],
    unlockedAfter: 'exp-golem',
  },
  {
    id: 'exp-hard-all',
    title: 'The Hard Cases',
    description: 'All expanded mechanics in play — golem tests, encyclopedia entries, Solar/Lunar. No single clue type is sufficient.',
    difficulty: 'hard',
    puzzleIds: [
      'all-02', 'all-03', 'all-04',
      'all-05', 'all-06',
    ],
    unlockedAfter: 'exp-medium-golem-enc',
  },
  {
    id: 'exp-hard-golem-mix',
    title: 'Animating the Golem',
    description: 'You must deduce not just the reaction pattern but the exact potion needed — using only golem tests and mixing results.',
    difficulty: 'hard',
    puzzleIds: [
      'golem-mix-02', 'golem-mix-03', 'golem-mix-04',
      'golem-mix-05', 'golem-mix-06',
    ],
    unlockedAfter: 'exp-medium-golem-sl',
  },
  {
    id: 'exp-hard-among',
    title: 'Whispers & Reactions',
    description: 'You overheard partial results — reactions from unnamed ingredients, sell outcomes without knowing whose potion it was. Piece it together.',
    difficulty: 'hard',
    puzzleIds: ['among-golem-01', 'among-golem-02'],
    unlockedAfter: 'exp-hard-all',
  },
  {
    id: 'exp-debunk',
    title: 'Debunking',
    description: "Rivals have published false alchemical theories. You know the truth — plan the fewest possible debunk actions to clear the board.",
    difficulty: 'medium',
    puzzleIds: ['exp-debunk-tutorial-01', 'debunk-01', 'debunk-02'],
    unlockedAfter: 'exp-tutorials',
  },
  {
    id: 'combo-exp',
    title: 'Grand Synthesis',
    description: 'All expanded mechanics at once — encyclopedia articles, Solar/Lunar classifications, and golem reactions. The hardest deductions require every tool.',
    difficulty: 'hard',
    puzzleIds: [
      'combo-exp-02', 'combo-exp-03', 'combo-exp-04', 'combo-exp-05', 'combo-exp-06',
      'combo-exp-sl-02', 'combo-exp-sl-03', 'combo-exp-sl-04', 'combo-exp-sl-05',
      'combo-exp-all-02', 'combo-exp-all-03', 'combo-exp-all-04', 'combo-exp-all-05',
      'combo-exp-wha-02', 'combo-exp-wha-03', 'combo-exp-wha-04', 'combo-exp-wha-05',
      'combo-exp-xsl-02', 'combo-exp-xsl-03', 'combo-exp-xsl-04', 'combo-exp-xsl-05',
    ],
    unlockedAfter: 'exp-hard-all',
  },
  {
    id: 'mixed-exp-debunk',
    title: 'Mixed Evidence, Master Debunk',
    description: 'Ambiguous clues from multiple mechanics surround wrong publications. Use master debunking to clear the board — and find the one mix that creates an irresolvable conflict.',
    difficulty: 'hard',
    puzzleIds: [
      'mixed-exp-debunk-02', 'mixed-exp-debunk-03', 'mixed-exp-debunk-04',
      'mixed-exp-debunk-05', 'mixed-exp-debunk-06', 'mixed-exp-debunk-07',
      'mixed-exp-debunk-08', 'mixed-exp-debunk-09', 'mixed-exp-debunk-10',
      'mixed-exp-debunk-11', 'mixed-exp-debunk-12', 'mixed-exp-debunk-13',
      'mixed-exp-debunk-14', 'mixed-exp-debunk-15', 'mixed-exp-debunk-16',
      'mixed-exp-debunk-17', 'mixed-exp-debunk-18', 'mixed-exp-debunk-19',
      'mixed-exp-debunk-20', 'mixed-exp-debunk-21', 'mixed-exp-debunk-22',
      'mixed-exp-debunk-23', 'mixed-exp-debunk-24', 'mixed-exp-debunk-25',
      'mixed-exp-debunk-26', 'mixed-exp-debunk-27', 'mixed-exp-debunk-28',
      'mixed-exp-debunk-29', 'mixed-exp-debunk-30', 'mixed-exp-debunk-31',
      'mixed-exp-debunk-32', 'mixed-exp-debunk-33', 'mixed-exp-debunk-34',
      'mixed-exp-debunk-35', 'mixed-exp-debunk-36', 'mixed-exp-debunk-37',
      'mixed-exp-debunk-38', 'mixed-exp-debunk-39', 'mixed-exp-debunk-40',
      'mixed-exp-debunk-41', 'mixed-exp-debunk-42', 'mixed-exp-debunk-43',
      'mixed-exp-debunk-44', 'mixed-exp-debunk-45', 'mixed-exp-debunk-46',
      'mixed-exp-debunk-47', 'mixed-exp-debunk-48', 'mixed-exp-debunk-49',
      'mixed-exp-debunk-50', 'mixed-exp-debunk-51',
    ],
    unlockedAfter: 'exp-debunk',
  },
  {
    id: 'mixed-clues-exp',
    title: 'Mixed Clues',
    description: 'Ambiguous sell results, overheard golem reactions, and uncertain solar/lunar observations — all pointing to 3 or 4 possible ingredients. Questions range from potion mixing to golem reaction groups.',
    difficulty: 'hard',
    puzzleIds: [
      'mixed-exp-mix-02', 'mixed-exp-mix-03', 'mixed-exp-mix-04', 'mixed-exp-mix-05', 'mixed-exp-mix-06',
      'mixed-exp-mix-07', 'mixed-exp-mix-08', 'mixed-exp-mix-09', 'mixed-exp-mix-10', 'mixed-exp-mix-11',
      'mixed-exp-mix-12', 'mixed-exp-mix-13', 'mixed-exp-mix-14', 'mixed-exp-mix-15', 'mixed-exp-mix-16',
      'mixed-exp-mix-17', 'mixed-exp-mix-18', 'mixed-exp-mix-19', 'mixed-exp-mix-20', 'mixed-exp-mix-21',
      'mixed-exp-mix-22', 'mixed-exp-mix-23', 'mixed-exp-mix-24', 'mixed-exp-mix-25', 'mixed-exp-mix-26',
      'mixed-exp-golem-02', 'mixed-exp-golem-03', 'mixed-exp-golem-04', 'mixed-exp-golem-05', 'mixed-exp-golem-06',
      'mixed-exp-golem-07', 'mixed-exp-golem-08', 'mixed-exp-golem-09', 'mixed-exp-golem-10', 'mixed-exp-golem-11',
      'mixed-exp-golem-12', 'mixed-exp-golem-13', 'mixed-exp-golem-14', 'mixed-exp-golem-15', 'mixed-exp-golem-16',
      'mixed-exp-golem-17', 'mixed-exp-golem-18', 'mixed-exp-golem-19', 'mixed-exp-golem-20', 'mixed-exp-golem-21',
      'mixed-exp-golem-22', 'mixed-exp-golem-23', 'mixed-exp-golem-24', 'mixed-exp-golem-25', 'mixed-exp-golem-26',
    ],
    unlockedAfter: 'combo-exp',
  },
  {
    id: 'entropy-book',
    title: 'Best Book Experiment',
    description: 'Mixed sell, among, and solar/lunar clues leave the board partially resolved. Find the single ingredient whose Book consultation carries the most information — the Shannon-optimal experiment.',
    difficulty: 'hard',
    puzzleIds: [
      'mixed-exp-02', 'mixed-exp-03', 'mixed-exp-04', 'mixed-exp-05', 'mixed-exp-06',
      'mixed-exp-07', 'mixed-exp-08', 'mixed-exp-09', 'mixed-exp-10', 'mixed-exp-11',
    ],
    unlockedAfter: 'mixed-clues-exp',
  },
];
