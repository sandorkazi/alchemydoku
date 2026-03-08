/**
 * expanded/data/puzzlesIndex.ts
 * Registry of all expanded-mode puzzles and collections.
 * Never imported by base-game code.
 */

import expTutorialBook01  from './puzzles/exp-tutorial-book-01.json';
import expTutorialEnc01   from './puzzles/exp-tutorial-enc-01.json';
import expEasyEnc01       from './puzzles/exp-easy-enc-01.json';
import expEasySolar01     from './puzzles/exp-easy-solar-01.json';
import type { ExpandedPuzzle } from '../types';

export const ALL_EXPANDED_PUZZLES: ExpandedPuzzle[] =
  [expTutorialBook01, expTutorialEnc01, expEasyEnc01, expEasySolar01] as unknown as ExpandedPuzzle[];

export const EXPANDED_PUZZLE_MAP: Record<string, ExpandedPuzzle> =
  Object.fromEntries(ALL_EXPANDED_PUZZLES.map(p => [p.id, p]));

export type ExpandedCollection = {
  id: string;
  title: string;
  description: string;
  puzzleIds: string[];
};

export const EXPANDED_COLLECTIONS: ExpandedCollection[] = [
  {
    id: 'exp-tutorials',
    title: 'New Mechanics',
    description: 'Learn the Book Token and Royal Encyclopedia — the two new tools of the expanded rules.',
    puzzleIds: ['exp-tutorial-book-01', 'exp-tutorial-enc-01'],
  },
  {
    id: 'exp-easy',
    title: 'First Articles',
    description: 'Apply Solar/Lunar classification and encyclopedia reasoning in short puzzles.',
    puzzleIds: ['exp-easy-solar-01', 'exp-easy-enc-01'],
  },
];
