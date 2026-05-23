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

// ── Encyclopedia + Solar/Lunar ────────────────────────────────────────────────
import encSl02              from './puzzles/enc-sl-02.json';
import encSl03              from './puzzles/enc-sl-03.json';
import encSl04              from './puzzles/enc-sl-04.json';
import encSl05              from './puzzles/enc-sl-05.json';
import encSl06              from './puzzles/enc-sl-06.json';

// ── Debunk ────────────────────────────────────────────────────────────────────
import expDebunkTutorial01  from './puzzles/exp-debunk-tutorial-01.json';
import debunk01             from './puzzles/debunk-01.json';
import debunk02             from './puzzles/debunk-02.json';
import debunk03             from './puzzles/debunk-03.json';
import debunk04             from './puzzles/debunk-04.json';

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

// ── Golem (joint config × world reasoning) ────────────────────────────────
import golem02               from './puzzles/golem-02.json';
import golem03               from './puzzles/golem-03.json';
import golem04               from './puzzles/golem-04.json';
import golem05               from './puzzles/golem-05.json';
import golem06               from './puzzles/golem-06.json';
import golem07               from './puzzles/golem-07.json';
import golem08               from './puzzles/golem-08.json';
import golem09              from './puzzles/golem-09.json';
import golem10              from './puzzles/golem-10.json';
import golem11              from './puzzles/golem-11.json';
import golem12              from './puzzles/golem-12.json';
import golem13              from './puzzles/golem-13.json';
import golem14              from './puzzles/golem-14.json';
import golem15              from './puzzles/golem-15.json';
import golem16              from './puzzles/golem-16.json';
import golem17              from './puzzles/golem-17.json';
import golem18              from './puzzles/golem-18.json';
import golem19              from './puzzles/golem-19.json';
import golem20              from './puzzles/golem-20.json';
import golem21              from './puzzles/golem-21.json';
import golem22              from './puzzles/golem-22.json';
import golem23              from './puzzles/golem-23.json';
import golem24              from './puzzles/golem-24.json';
import golem25              from './puzzles/golem-25.json';
import golem26              from './puzzles/golem-26.json';
import golem27              from './puzzles/golem-27.json';
import golem28              from './puzzles/golem-28.json';
import golem29              from './puzzles/golem-29.json';
import golem30              from './puzzles/golem-30.json';
import golem31              from './puzzles/golem-31.json';

import comboExpMedAll02     from './puzzles/combo-exp-med-all-02.json';
import comboExpMedAll03     from './puzzles/combo-exp-med-all-03.json';
import comboExpMedAll04     from './puzzles/combo-exp-med-all-04.json';
import comboExpMedAll05     from './puzzles/combo-exp-med-all-05.json';
import comboExpMedAll06     from './puzzles/combo-exp-med-all-06.json';

import comboExpWha02        from './puzzles/combo-exp-wha-02.json';
import comboExpWha03        from './puzzles/combo-exp-wha-03.json';
import comboExpWha04        from './puzzles/combo-exp-wha-04.json';
import comboExpWha05        from './puzzles/combo-exp-wha-05.json';
import comboExpWha06        from './puzzles/combo-exp-wha-06.json';

import comboExpXsl02        from './puzzles/combo-exp-xsl-02.json';
import comboExpXsl03        from './puzzles/combo-exp-xsl-03.json';
import comboExpXsl04        from './puzzles/combo-exp-xsl-04.json';
import comboExpXsl05        from './puzzles/combo-exp-xsl-05.json';
import comboExpXsl06        from './puzzles/combo-exp-xsl-06.json';

import mixedExp02           from './puzzles/mixed-exp-02.json';
import mixedExp03           from './puzzles/mixed-exp-03.json';
import mixedExp04           from './puzzles/mixed-exp-04.json';
import mixedExp05           from './puzzles/mixed-exp-05.json';
import mixedExp06           from './puzzles/mixed-exp-06.json';
import mixedExp07           from './puzzles/mixed-exp-07.json';
import mixedExp08           from './puzzles/mixed-exp-08.json';
import mixedExp09           from './puzzles/mixed-exp-09.json';
import mixedExp10           from './puzzles/mixed-exp-10.json';
import mixedExp11           from './puzzles/mixed-exp-11.json';

import mixedExpMix02        from './puzzles/mixed-exp-mix-02.json';
import mixedExpMix03        from './puzzles/mixed-exp-mix-03.json';
import mixedExpMix04        from './puzzles/mixed-exp-mix-04.json';
import mixedExpMix05        from './puzzles/mixed-exp-mix-05.json';
import mixedExpMix06        from './puzzles/mixed-exp-mix-06.json';
import mixedExpMix07        from './puzzles/mixed-exp-mix-07.json';
import mixedExpMix08        from './puzzles/mixed-exp-mix-08.json';
import mixedExpMix09        from './puzzles/mixed-exp-mix-09.json';
import mixedExpMix10        from './puzzles/mixed-exp-mix-10.json';
import mixedExpMix11        from './puzzles/mixed-exp-mix-11.json';
import mixedExpMix12        from './puzzles/mixed-exp-mix-12.json';
import mixedExpMix13        from './puzzles/mixed-exp-mix-13.json';
import mixedExpMix14        from './puzzles/mixed-exp-mix-14.json';
import mixedExpMix15        from './puzzles/mixed-exp-mix-15.json';
import mixedExpMix16        from './puzzles/mixed-exp-mix-16.json';
import mixedExpMix17        from './puzzles/mixed-exp-mix-17.json';
import mixedExpMix18        from './puzzles/mixed-exp-mix-18.json';
import mixedExpMix19        from './puzzles/mixed-exp-mix-19.json';
import mixedExpMix20        from './puzzles/mixed-exp-mix-20.json';
import mixedExpMix21        from './puzzles/mixed-exp-mix-21.json';
import mixedExpMix22        from './puzzles/mixed-exp-mix-22.json';
import mixedExpMix23        from './puzzles/mixed-exp-mix-23.json';
import mixedExpMix24        from './puzzles/mixed-exp-mix-24.json';
import mixedExpMix25        from './puzzles/mixed-exp-mix-25.json';
import mixedExpMix26        from './puzzles/mixed-exp-mix-26.json';
import mixedExpMix27        from './puzzles/mixed-exp-mix-27.json';
import mixedExpMix28        from './puzzles/mixed-exp-mix-28.json';
import mixedExpMix29        from './puzzles/mixed-exp-mix-29.json';
import mixedExpMix30        from './puzzles/mixed-exp-mix-30.json';
import mixedExpMix31        from './puzzles/mixed-exp-mix-31.json';
import mixedExpMix32        from './puzzles/mixed-exp-mix-32.json';
import mixedExpMix33        from './puzzles/mixed-exp-mix-33.json';
import mixedExpMix34        from './puzzles/mixed-exp-mix-34.json';
import mixedExpMix35        from './puzzles/mixed-exp-mix-35.json';
import mixedExpMix36        from './puzzles/mixed-exp-mix-36.json';
import mixedExpMix37        from './puzzles/mixed-exp-mix-37.json';
import mixedExpMix38        from './puzzles/mixed-exp-mix-38.json';
import mixedExpMix39        from './puzzles/mixed-exp-mix-39.json';
import mixedExpMix40        from './puzzles/mixed-exp-mix-40.json';
import mixedExpMix41        from './puzzles/mixed-exp-mix-41.json';
import mixedExpMix42        from './puzzles/mixed-exp-mix-42.json';
import mixedExpMix43        from './puzzles/mixed-exp-mix-43.json';
import mixedExpMix44        from './puzzles/mixed-exp-mix-44.json';
import mixedExpMix45        from './puzzles/mixed-exp-mix-45.json';
import mixedExpMix46        from './puzzles/mixed-exp-mix-46.json';
import mixedExpMix47        from './puzzles/mixed-exp-mix-47.json';
import mixedExpMix48        from './puzzles/mixed-exp-mix-48.json';
import mixedExpMix49        from './puzzles/mixed-exp-mix-49.json';
import mixedExpMix50        from './puzzles/mixed-exp-mix-50.json';
import mixedExpMix51        from './puzzles/mixed-exp-mix-51.json';

import mixedExpDebunk02     from './puzzles/mixed-exp-debunk-02.json';
import mixedExpDebunk03     from './puzzles/mixed-exp-debunk-03.json';
import mixedExpDebunk04     from './puzzles/mixed-exp-debunk-04.json';
import mixedExpDebunk06     from './puzzles/mixed-exp-debunk-06.json';
import mixedExpDebunk07     from './puzzles/mixed-exp-debunk-07.json';
import mixedExpDebunk09     from './puzzles/mixed-exp-debunk-09.json';
import mixedExpDebunk10     from './puzzles/mixed-exp-debunk-10.json';
import mixedExpDebunk11     from './puzzles/mixed-exp-debunk-11.json';
import mixedExpDebunk12     from './puzzles/mixed-exp-debunk-12.json';
import mixedExpDebunk13     from './puzzles/mixed-exp-debunk-13.json';
import mixedExpDebunk15     from './puzzles/mixed-exp-debunk-15.json';
import mixedExpDebunk16     from './puzzles/mixed-exp-debunk-16.json';
import mixedExpDebunk17     from './puzzles/mixed-exp-debunk-17.json';
import mixedExpDebunk18     from './puzzles/mixed-exp-debunk-18.json';
import mixedExpDebunk19     from './puzzles/mixed-exp-debunk-19.json';
import mixedExpDebunk20     from './puzzles/mixed-exp-debunk-20.json';
import mixedExpDebunk22     from './puzzles/mixed-exp-debunk-22.json';
import mixedExpDebunk23     from './puzzles/mixed-exp-debunk-23.json';
import mixedExpDebunk24     from './puzzles/mixed-exp-debunk-24.json';
import mixedExpDebunk27     from './puzzles/mixed-exp-debunk-27.json';
import mixedExpDebunk28     from './puzzles/mixed-exp-debunk-28.json';
import mixedExpDebunk30     from './puzzles/mixed-exp-debunk-30.json';
import mixedExpDebunk31     from './puzzles/mixed-exp-debunk-31.json';
import mixedExpDebunk32     from './puzzles/mixed-exp-debunk-32.json';
import mixedExpDebunk33     from './puzzles/mixed-exp-debunk-33.json';
import mixedExpDebunk34     from './puzzles/mixed-exp-debunk-34.json';
import mixedExpDebunk35     from './puzzles/mixed-exp-debunk-35.json';
import mixedExpDebunk36     from './puzzles/mixed-exp-debunk-36.json';
import mixedExpDebunk38     from './puzzles/mixed-exp-debunk-38.json';
import mixedExpDebunk39     from './puzzles/mixed-exp-debunk-39.json';
import mixedExpDebunk40     from './puzzles/mixed-exp-debunk-40.json';
import mixedExpDebunk41     from './puzzles/mixed-exp-debunk-41.json';
import mixedExpDebunk42     from './puzzles/mixed-exp-debunk-42.json';
import mixedExpDebunk43     from './puzzles/mixed-exp-debunk-43.json';
import mixedExpDebunk45     from './puzzles/mixed-exp-debunk-45.json';
import mixedExpDebunk46     from './puzzles/mixed-exp-debunk-46.json';
import mixedExpDebunk47     from './puzzles/mixed-exp-debunk-47.json';
import mixedExpDebunk49     from './puzzles/mixed-exp-debunk-49.json';
import mixedExpDebunk50     from './puzzles/mixed-exp-debunk-50.json';
import mixedExpDebunk51     from './puzzles/mixed-exp-debunk-51.json';
import mixedExpDebunk52     from './puzzles/mixed-exp-debunk-52.json';
import mixedExpDebunk53     from './puzzles/mixed-exp-debunk-53.json';
import mixedExpDebunk54     from './puzzles/mixed-exp-debunk-54.json';
import mixedExpDebunk55     from './puzzles/mixed-exp-debunk-55.json';
import mixedExpDebunk56     from './puzzles/mixed-exp-debunk-56.json';
import mixedExpDebunk57     from './puzzles/mixed-exp-debunk-57.json';
import mixedExpDebunk58     from './puzzles/mixed-exp-debunk-58.json';
import mixedExpDebunk59     from './puzzles/mixed-exp-debunk-59.json';
import mixedExpDebunk60     from './puzzles/mixed-exp-debunk-60.json';
import mixedExpDebunk61     from './puzzles/mixed-exp-debunk-61.json';

import expEasySl02          from './puzzles/exp-easy-sl-02.json';
import expEasySl03          from './puzzles/exp-easy-sl-03.json';
import expEasySl04          from './puzzles/exp-easy-sl-04.json';

import expMediumEncSl02     from './puzzles/exp-medium-enc-sl-02.json';
import expMediumEncSl03     from './puzzles/exp-medium-enc-sl-03.json';
import expMediumEncSl04     from './puzzles/exp-medium-enc-sl-04.json';
import expMediumEncSl05     from './puzzles/exp-medium-enc-sl-05.json';
import expMediumEncSl06     from './puzzles/exp-medium-enc-sl-06.json';

import comboExpMedSl02      from './puzzles/combo-exp-med-sl-02.json';

import type { ExpandedPuzzle } from '../types';

export const ALL_EXPANDED_PUZZLES: ExpandedPuzzle[] = [
  expTutorialBook01, expTutorialEnc01,
  golem02, golem03, golem04, golem05, golem06, golem07, golem08, golem09, golem10, golem11, golem12, golem13, golem14, golem15, golem16, golem17, golem18, golem19, golem20, golem21, golem22, golem23, golem24, golem25, golem26, golem27, golem28, golem29, golem30, golem31,
  enc01, enc02, enc03, enc04, enc05,
  enc06, enc07, enc08, enc09, enc10,
  sl01, sl02, sl03, sl04, sl05, sl06, sl07,
  encSl02, encSl03, encSl04, encSl05, encSl06,
  expDebunkTutorial01, debunk01, debunk02, debunk03, debunk04,
  comboExp02, comboExp03, comboExp04, comboExp05, comboExp06,
  comboExpSl02, comboExpSl03, comboExpSl04, comboExpSl05,
  comboExpMedAll02, comboExpMedAll03, comboExpMedAll04, comboExpMedAll05, comboExpMedAll06,
  comboExpWha02, comboExpWha03, comboExpWha04, comboExpWha05, comboExpWha06,
  comboExpXsl02, comboExpXsl03, comboExpXsl04, comboExpXsl05, comboExpXsl06,
  mixedExp02, mixedExp03, mixedExp04, mixedExp05, mixedExp06, mixedExp07, mixedExp08, mixedExp09, mixedExp10, mixedExp11,
  mixedExpMix02, mixedExpMix03, mixedExpMix04, mixedExpMix05, mixedExpMix06, mixedExpMix07, mixedExpMix08, mixedExpMix09, mixedExpMix10, mixedExpMix11, mixedExpMix12, mixedExpMix13, mixedExpMix14, mixedExpMix15, mixedExpMix16, mixedExpMix17, mixedExpMix18, mixedExpMix19, mixedExpMix20, mixedExpMix21, mixedExpMix22, mixedExpMix23, mixedExpMix24, mixedExpMix25, mixedExpMix26, mixedExpMix27, mixedExpMix28, mixedExpMix29, mixedExpMix30, mixedExpMix31, mixedExpMix32, mixedExpMix33, mixedExpMix34, mixedExpMix35, mixedExpMix36, mixedExpMix37, mixedExpMix38, mixedExpMix39, mixedExpMix40, mixedExpMix41, mixedExpMix42, mixedExpMix43, mixedExpMix44, mixedExpMix45, mixedExpMix46, mixedExpMix47, mixedExpMix48, mixedExpMix49, mixedExpMix50, mixedExpMix51,
  mixedExpDebunk02, mixedExpDebunk03, mixedExpDebunk04, mixedExpDebunk06, mixedExpDebunk07, mixedExpDebunk09, mixedExpDebunk10, mixedExpDebunk11, mixedExpDebunk12, mixedExpDebunk13, mixedExpDebunk15, mixedExpDebunk16, mixedExpDebunk17, mixedExpDebunk18, mixedExpDebunk19, mixedExpDebunk20, mixedExpDebunk22, mixedExpDebunk23, mixedExpDebunk24, mixedExpDebunk27, mixedExpDebunk28, mixedExpDebunk30, mixedExpDebunk31, mixedExpDebunk32, mixedExpDebunk33, mixedExpDebunk34, mixedExpDebunk35, mixedExpDebunk36, mixedExpDebunk38, mixedExpDebunk39, mixedExpDebunk40, mixedExpDebunk41, mixedExpDebunk42, mixedExpDebunk43, mixedExpDebunk45, mixedExpDebunk46, mixedExpDebunk47, mixedExpDebunk49, mixedExpDebunk50, mixedExpDebunk51, mixedExpDebunk52, mixedExpDebunk53, mixedExpDebunk54, mixedExpDebunk55, mixedExpDebunk56, mixedExpDebunk57, mixedExpDebunk58, mixedExpDebunk59, mixedExpDebunk60, mixedExpDebunk61,
  expEasySl02, expEasySl03, expEasySl04,
  expMediumEncSl02, expMediumEncSl03, expMediumEncSl04, expMediumEncSl05, expMediumEncSl06,
  comboExpMedSl02,
] as unknown as ExpandedPuzzle[];

export const EXPANDED_PUZZLE_MAP: Record<string, ExpandedPuzzle> =
  Object.fromEntries(ALL_EXPANDED_PUZZLES.map(p => [p.id, p]));

export type ExpandedCollection = {
  id: string;
  title: string;
  description: string;
  difficulty: 'tutorial' | 'easy' | 'medium' | 'hard' | 'expert' | 'extreme';
  puzzleIds: string[];
  unlockedAfter?: string;
  boardGameCompliant?: boolean;  // omit = true
};

export const EXPANDED_COLLECTIONS: ExpandedCollection[] = [
  {
    id: 'exp-tutorials',
    title: 'New Mechanics',
    description: 'Learn the Book Token and Royal Encyclopedia — the two new tools of the expanded rules.',
    difficulty: 'tutorial',
    puzzleIds: ['f9c253fe-c835-4cdf-9ba4-f7be61498b45', 'bebc4a37-1370-47e2-a5e5-e9d1d3c5de0e'],
  },
  {
    id: 'exp-easy-enc',
    title: 'First Articles',
    description: 'Apply encyclopedia entries to narrow down alchemical identities. Short, focused deductions.',
    difficulty: 'easy',
    puzzleIds: [
      'd566d228-3170-4fb3-a1ad-095f84ec03cc', '8b49a6cb-27eb-4ea7-a004-cc7e37e99bea', '2b40d5d3-ccfc-45ac-87d1-01a5bb4ea535', '3245c04d-0640-46dd-8fb1-3b11ad77b1fc', 'c091df26-52b5-45f1-9dad-d96b9abae07d',
      '1bcdfa4b-c326-40e6-b8c5-fc3df4301924', 'dc3933fb-24a4-4874-8dbb-7e7e529c7071', 'e470e7ff-bd4d-4b4b-b7f4-8c4a2055c4f9', 'f5a5111a-d065-4352-a094-752653f77627', 'd7c1419d-3f88-4a21-8636-b06133ddbfdc',
    ],
    unlockedAfter: 'exp-tutorials',
  },
  {
    id: 'exp-easy-sl',
    title: 'Solar & Lunar Readings',
    description: 'Use the Book Token to classify ingredients as Solar or Lunar, then deduce from there.',
    difficulty: 'easy',
    puzzleIds: [
      '5969d699-b74c-4eca-9e7b-b949bcb93e56', 'c5620277-2091-4457-92aa-0a43df6e01f5', '09bac850-6cb3-41d1-aa65-3f12929cf127',
      '6acf31ec-95d5-4969-ac83-da853ef2263b', '460ffb1e-af73-4f4f-93d5-a49285330236', 'aeb26b5a-3662-4990-b6fe-598474e47e13', '82f052a8-788d-46ad-ad0b-1b68c3401b4f',
      '472652ce-6eb0-4d71-b12c-1f682c98aabf', 'c04e68b4-c318-4e5c-a628-b7b677b123e4', '184a6585-2f41-40b2-9f13-401df688b1f8',
    ],
    unlockedAfter: 'exp-tutorials',
  },
  {
    id: 'exp-medium-enc-sl',
    title: "The Scholar's Compendium",
    description: 'Encyclopedia and Solar/Lunar clues interlock — neither alone is enough.',
    difficulty: 'medium',
    puzzleIds: [
      '4886d3e3-b9b1-45a8-87ef-07f9a3617756', 'ace5f58c-b0c0-4cbc-b478-3561ad0162c0', 'd23c65e4-59d2-4a40-9fbb-f8f64dce8483',
      '5d467f0b-765d-4e9a-8470-bd4e3a36aa6e', '04cd9ffe-9f9d-4833-b29a-3bf1de6e680a',
      'a01c2ab1-578a-40c2-a4c0-df67340662b2', 'ed229864-8c6f-4f23-b3cf-3b2bf1dc09a0', '47fc0fe6-e4c2-4350-a70f-68301d5522d5',
      'e3e7e8b0-17d0-4980-a804-8d84fb2e2bda', '3838bcc7-9899-4bcd-8789-c13e2b90c6ee',
    ],
    unlockedAfter: 'exp-easy-enc',
  },
  {
    id: 'exp-debunk',
    title: 'Debunking',
    description: "Rivals have published false alchemical theories. You know the truth — plan the fewest possible debunk actions to clear the board.",
    difficulty: 'medium',
    puzzleIds: ['c89da5d6-1fdb-4515-89d9-4d12043c006a', '203723c8-dfe6-4e36-8959-e12dfe16320c', 'ad63a006-cc57-4d8f-86b3-5b414be3e2dd', '77887343-9896-4949-b491-959e854e1bb8'],
    unlockedAfter: 'exp-tutorials',
  },
  {
    id: 'exp-golem',
    title: 'The Golem Project',
    description: 'Test ingredients on the golem and deduce its hidden configuration from the reactions. Use joint reasoning across all possible configs and ingredient assignments.',
    difficulty: 'medium',
    puzzleIds: [
      '46904d41-2420-4a7a-b635-d2d876ac9fab', 'ff6cd95b-efdb-4d00-a58e-f3c5d32466b6', '0daabb38-5270-43b9-9bbc-09e6a794a8d8',
      '714d5d88-b3d2-4e8b-8943-76afb30ce965', '37bba622-c344-405e-9744-2b2f6dd670df', '78e08c3f-8148-4d37-8f09-51410544ff2a', '72a1672f-cbde-4260-adb9-1d8613d84a1a', '12eb934f-9d77-4805-a56b-7cf1bad24cde', 'b5265b29-5cf1-4ea7-bfeb-b46eb1b51fd1', 'ee508212-682f-4c1c-b1c8-a04853f36432', '89591643-3531-4af0-afab-026ef625fa1d', '4f0e514b-d488-4542-a02a-2c277c3ca750', 'c6c3e475-0db9-4288-89b7-f8093079e1b2', '3fa574b2-78ed-446a-9c15-5c436e2a6de9', 'b52087a2-b30f-4077-b6c3-dab5037953f8', '05e9862d-e40f-463f-87a3-222b292f7ac2', 'd4b0b58f-d3f3-44e2-be92-3a720b0aedc0', '119e177d-c762-474f-a4f1-71e3b2682666', '3d7db1f4-be69-4a27-ab23-2702015efd39', '842ff2f5-6aaf-4813-be2c-3d3a614c14d0', 'caa89787-13c7-4c0a-b9e3-1f6f2dfd3823', '1797af74-5c1f-4143-8b13-2972e9a4d930', 'f3b59796-2b31-43cd-93d9-ea7201745b78', 'e8ccde3f-4b25-496b-8fe6-bc7cb64f4cfb', '2e71d19e-b0ec-4cec-a332-dc76cc5ae49d', '87ada369-b692-4366-b814-f0b0e2be0f03', '56742c8a-09bf-4655-94a4-6092e5e1a43a', '5601500f-0e87-442d-bf9d-f3a702de3e5b', '0156a467-a71c-4c6f-a807-f221e21cf4ad', 'eb346905-317f-4a54-a8df-6a0a329da489',
    ],
    unlockedAfter: 'exp-tutorials',
    boardGameCompliant: false,
  },
  {
    id: 'combo-exp',
    title: 'Grand Synthesis',
    description: 'All expanded mechanics at once — encyclopedia articles, Solar/Lunar classifications, and hidden knowledge clues. The hardest deductions require every tool.',
    difficulty: 'hard',
    puzzleIds: [
      'b162191a-0556-4fa2-a12e-ba317134aa66', 'fd8b9194-8fe0-4c8d-a706-9a4f57f985ef', '05eda9e5-eb28-473e-96ab-9cba72778516', '56dd5be6-4684-4498-b4a9-5b8d5722a67a', '01eea135-750b-46cf-bf41-eb5a8611d492',
      '86c5a1d8-ce5a-4a22-9457-ae40abb51943', '12dad701-57ee-4c6c-8699-d32dfcf95540', '932f0fe0-c76b-466e-b9a7-2868d62b1f91', '5fd25918-8928-4284-9033-864824a1cb97',
      'eaef37c6-e8d6-4674-b9c3-969f82babad3',
      '022b5a56-d074-4a1b-977f-c667c5d05cad', 'ae0cccd5-aa7b-43d5-92dc-3740415ed986', 'fa91905f-97cd-4dd9-a65f-489b9cba0227', 'b0c9a2ca-b048-4f26-938a-c11ec0b09ff0', 'fe5fe5e2-7ce2-4ad3-b99f-09871439e212',
      '8e60f8e3-c430-4b5d-a604-15a21b6f4088', '4cd3196b-0fa2-41f8-a6b5-195ba1d81469', 'b545f7fd-bf92-4563-b2c7-66923c10abb0', '5bdb23f8-f749-4f83-b55b-bc464fe6969d', '28ab1d3c-99ed-450f-814f-cae03c9859c6',
      'eb039517-f02e-4e6c-a4f6-aaf89e428c56', '9d7fad9a-112c-4176-a668-152bd14a4960', '0a722b81-fa01-4893-b647-a9ff22179d67', '3e2d959d-1a5f-472f-a053-3ffbccd5c23a', '60820178-9d38-49bf-b97d-e0811f5598f1',
    ],
    unlockedAfter: 'exp-debunk',
  },
  {
    id: 'mixed-exp-debunk',
    title: 'Mixed Evidence, Master Debunk',
    description: 'Ambiguous clues from multiple mechanics surround wrong publications. Use master debunking to clear the board — and find the one mix that creates an irresolvable conflict.',
    difficulty: 'extreme',
    puzzleIds: [
      '348ea3c2-8bd9-4319-9c3d-e903f3153a94', 'd573a892-03ce-456f-b790-77a63fbb14c9', '90197bb0-73d8-4238-8cc2-60be7483bd1d',
      'ad3da313-c4ea-4f0a-85ff-7bfbf682d032', '74c087a6-62d2-4a52-bfc1-ea10a3f40347',
      '7d7d1fb5-1c99-4272-a8cf-e1fe8e07e0b9', '71fbc1c4-3e1e-407e-b39a-b06c60880137', 'ffd2a507-1f0f-4451-806e-6a04e0eaa4ff', 'ffbc68db-63f6-4171-a699-12c158769aa3',
      '00d7704f-ed69-4d84-a98a-eaaf56331b19', '7f93d5ef-42ed-4728-ba6a-d9c19bed1635', '7fbc142b-f841-4b87-b4f1-cb3849c6f34a', 'f1def917-ec05-4d2e-8080-f9cfb61acd68',
      '1dba2646-b085-49ed-87b1-19f70c86b50d', 'dd977563-5f36-432b-b059-2703326cb650', '6556f7a9-27b5-4599-8557-5b23f89e8a9a',
      'ae0d39eb-32be-4a58-98be-16671fd2405a', '1727c4d8-1591-4bd1-9f69-58f042d9de72', '649d53a0-c5d7-49fc-ba1f-7c68feaeaa9b',
      '326f6880-cb03-4be1-9d59-7b25d737fb53', 'dca6935d-212b-49ee-9c2f-ae74e96e5b3f',
      '45fd0ceb-af44-41f8-8ae4-c00bef4e3e2b', 'e1a3188b-165f-437e-ba8a-3ea765694f94', 'cbcf58bf-9724-4774-b3f4-a16f03865537', 'ba1ca342-8bf8-42bc-8e5d-a7ee30d4b935',
      'b64a707a-c602-4934-9159-b41708d8f9e3', '2220a0b8-280b-4eb4-964e-9887b0a04960', 'a72918f8-d796-48a8-b75e-d62e44066053',
      '4890502a-0c94-45ff-8116-bd36d01ae2c2', '81d582a9-fc07-4995-bb59-08332268bb01', '890b0d80-4557-48ae-8bb9-044c426f77ae', 'fdc41de4-f924-46eb-ae99-bb23555e80a7',
      '586b18e5-863e-4de2-bfe7-567f49454c2e', 'ecc8e08e-0df4-4f9d-80de-50139ee20223',
      '68b765db-aca3-4050-b38b-2f5fa9f96a75', 'e5cdd58b-4018-4fc3-9218-d776cadef346', 'ff2dfd52-c885-47e8-9470-2530d8d3b747',
      'b49f3c01-6166-4c0b-81f4-c2b14d1d3390', '522173b6-a209-46fe-8636-23570e934182', '11235ed5-2450-46c5-9a90-d22ebdc5d199', 'f61b56f9-8403-497d-8f5f-5bd83fbe7df6', 'd58ba31d-c894-4659-b9a5-f682c6c66a0b', '3a22ec67-7930-41aa-b059-bc24b214fd04', 'e88f2c93-9366-4699-8ec8-07f25fccb811', '8feb161f-d8cb-4e35-8d81-939e630de6a3', '429840bb-deb8-48d9-a0ed-baf43b683e97', '46e22eef-2f3f-449b-9ed3-b926cad4a3aa', 'a495d564-8d09-48f8-a98a-224aac185c0d', 'ac43a078-3ff9-4f62-bb10-912a66deba94', '744aeb94-37f5-45dd-90ff-0b3e3cde5e28',
    ],
    unlockedAfter: 'exp-debunk',
    boardGameCompliant: false,
  },
  {
    id: 'mixed-clues-exp',
    title: 'Mixed Clues',
    description: 'Ambiguous sell results, overheard reactions, and uncertain solar/lunar observations — all pointing to 3 or 4 possible ingredients. Questions range from potion mixing to solar/lunar classifications.',
    difficulty: 'hard',
    puzzleIds: [
      '9a42da06-6230-4b53-86bf-5a41117dc874', '6fe6841b-31b6-47ec-987e-0c361ab13563', '38f43a69-67f9-4af0-a62d-69488f8901ac', 'c4eaae16-cd30-4ca4-a149-230c909b0cc3',
      'a9abfc6c-e0fa-48e5-833f-85f8e1a6cf96', '372aef7d-1ded-4849-98d8-647b7abc7ab0', '3a51bebb-f52b-4cdc-a81f-8ce63d799b55', 'ad3e5bc6-9a71-47f4-9cf4-095e543762e7',
      'f3266987-057b-4479-811a-23ad9c07e275', 'cec0277a-042e-4deb-b8cf-0df23dca5815', '69e72f7c-6d18-423f-974c-13874a5cb050', 'aa93211d-45be-4297-bd96-ca4fee09cc98',
      'd4847d19-c695-463e-a227-0ea7819b48c9', 'aa44bfed-becd-4558-b54e-7b5e2f3c6185', 'e7f43731-2884-4ea3-8454-4fef6f795700', '8fb7ee4c-faa8-4d0a-8a83-b43717ad02be',
      '787158ff-f5c0-47ee-b7e1-91a29a6fc075', 'cb3ea449-c759-4e4c-826b-c4612b1e5f68', '582703c8-62ae-4d6a-a94a-86329d21d575', '3aae27a6-78c5-4656-ad60-30f2ae408d18',
      '1a34da8c-49c4-4168-9eb0-ed5881375bc4', '4747f250-09ef-4165-ac0b-271590c792ee', '64283d9e-392f-4638-afe8-6a626f10e8f4', 'd03fe1ce-e651-45e9-8e8b-dba4d0e18617',
      '598a7689-3ecb-40e3-88c4-40c9a972379f', '17084830-2e8b-49e2-a9a5-6292caa6b44d', '6a92d7ad-12fe-4fe6-8f1b-17e07522bedb', '5da7b8ec-ec5c-48ab-a331-b6cd968eff5e',
      '1aa427a5-28b1-4b3c-922d-a966f1b0fe4d', 'bca056a8-f44b-4a3c-a7d2-e61d0bb4dfee', 'd6fcf3fa-5016-41a0-bc75-842dc25377a0', '16baa3d5-d8d9-4335-9fe6-d80a22b8b0f3',
      '88dbd589-2d32-4267-aaf4-5afb2ec30667', 'a368cae1-b10f-4e92-a9af-97471b429e25', '4a8d7150-4061-44ee-9341-80069e834c33', '5bc6551e-672a-4072-82ad-d368e0fefc15',
      'c613ccf4-dc35-4197-b3ae-a5490c41b64e', '05beb116-39d8-4cf9-a3ce-a8a841f46e07', 'adfd5b32-fd71-4aa8-aa9c-da8cfe07fb43', '191708b2-f885-4b63-8b17-dccb903b07dd',
      '8b22e6a2-a3d7-40ba-99ec-72b7b48aff06', '6e1d1b51-f289-42c9-99cd-6f5c6e745368', '0ba04176-6fa5-4095-a2cd-613fcf1bd611', 'bbab24b4-8caf-4e87-b350-3d283acc7d3f',
      '358bc1d6-7622-4967-adcb-458ef4a69fea', 'bb878c32-de2f-4d19-8f6a-ce8c67c56bd4', '709d6c6b-947b-4779-adcd-89649d5e752e', 'bbf42834-7a76-4009-af78-7d8fb639c3c4',
      '685ede9b-0508-4f4a-8a77-ee8456a66490', '1d65dd69-13a9-47a2-82dd-bf4c119ad5d6',
    ],
    unlockedAfter: 'combo-exp',
    boardGameCompliant: false,
  },
  {
    id: 'entropy-book',
    title: 'Best Book Experiment',
    description: 'Mixed sell, among, and solar/lunar clues leave the board partially resolved. Find the single ingredient whose Book consultation carries the most information — the Shannon-optimal experiment.',
    difficulty: 'hard',
    puzzleIds: [
      'e877f30c-3fe8-4656-9b27-c62da5f8c337', 'acbda24e-b4b5-4505-a0b7-b26a77ade3fa', '1a8871b7-cc43-4cb4-952f-e85bbbe87a31', 'b8cb1eea-12c6-4aa3-8ec1-4ef25502bce5',
      '67c2bb01-e768-4b45-934d-3f135a8c1bce', '68f89da6-97b0-4d03-9067-45b51a3394be', '46ffc021-79bf-422d-9dde-cdb911f731ed', '3523fd31-2613-4523-894e-ce1d4419be11',
      '5622813d-63de-412a-aa15-4669813c8a35', '515cf6a5-a5f7-4609-a44d-9061ff7e969e',
    ],
    unlockedAfter: 'mixed-clues-exp',
    boardGameCompliant: false,
  },
];
