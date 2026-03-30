/**
 * Save / load all puzzle progress as JSON files on the user's own drive.
 * Two files total:
 *   alchemy-sudoku-save.json          — base-game progress (all puzzles)
 *   alchemy-sudoku-expanded-save.json — expanded-mode progress (all puzzles)
 *
 * Each file is { version, exportedAt, puzzles: { [puzzleId]: PuzzleProgress } }.
 *
 * localStorage mirrors (auto-written on every state change):
 *   alch-save-base     — same shape as alchemy-sudoku-save.json
 *   alch-save-expanded — same shape as alchemy-sudoku-expanded-save.json
 *
 * On page open, contexts read from these unified keys (falling back to old
 * per-puzzle keys for backwards compatibility).
 */

export const SAVE_VERSION = 5;

// ─── ID rename map (v3 → v4) ──────────────────────────────────────────────────

export const ID_RENAMES: Record<string, string> = {
  // Base — easy → mix
  'easy-2000': 'mix-2000', 'easy-2001': 'mix-2001', 'easy-2002': 'mix-2002',
  'easy-2003': 'mix-2003', 'easy-2004': 'mix-2004', 'easy-2005': 'mix-2005',
  'easy-2006': 'mix-2006', 'easy-2007': 'mix-2007', 'easy-2008': 'mix-2008',
  'easy-2009': 'mix-2009',
  // Base — medium → mix
  'medium-6000': 'mix-6000', 'medium-6001': 'mix-6001', 'medium-6002': 'mix-6002',
  'medium-6003': 'mix-6003', 'medium-6004': 'mix-6004', 'medium-6005': 'mix-6005',
  'medium-6006': 'mix-6006', 'medium-6007': 'mix-6007',
  // Base — hard → ded
  'hard-9000': 'ded-9000', 'hard-9001': 'ded-9001', 'hard-9002': 'ded-9002',
  'hard-9003': 'ded-9003', 'hard-9004': 'ded-9004', 'hard-9005': 'ded-9005',
  // Base — expert → cross
  'expert-1001': 'cross-1001', 'expert-1002': 'cross-1002', 'expert-1003': 'cross-1003',
  'expert-1004': 'cross-1004', 'expert-1005': 'cross-1005', 'expert-1006': 'cross-1006',
  'expert-1007': 'cross-1007', 'expert-1008': 'cross-1008',
  // Base — medium-pp / hard-pp → pp
  'medium-pp-01': 'pp-01', 'medium-pp-02': 'pp-02', 'medium-pp-03': 'pp-03',
  'hard-pp-01': 'pp-04', 'hard-pp-02': 'pp-05',
  // Base — hard-among → among
  'hard-among-01': 'among-01', 'hard-among-02': 'among-02',
  // Base — combo strips difficulty component
  'combo-b-easy-02': 'combo-b-02', 'combo-b-easy-03': 'combo-b-03',
  'combo-b-easy-04': 'combo-b-04', 'combo-b-easy-05': 'combo-b-05',
  'combo-b-easy-06': 'combo-b-06',
  'combo-b-easy-pp-02': 'combo-b-pp-02', 'combo-b-easy-pp-03': 'combo-b-pp-03',
  'combo-b-easy-pp-04': 'combo-b-pp-04', 'combo-b-hard-pp-03': 'combo-b-pp-05',
  'combo-b-med-asp-02': 'combo-b-asp-02', 'combo-b-med-asp-03': 'combo-b-asp-03',
  'combo-b-med-asp-04': 'combo-b-asp-04', 'combo-b-med-asp-05': 'combo-b-asp-05',
  'combo-b-med-np-02': 'combo-b-np-02', 'combo-b-med-np-03': 'combo-b-np-03',
  'combo-b-med-np-04': 'combo-b-np-04', 'combo-b-med-np-05': 'combo-b-np-05',
  'combo-b-hard-ip-02': 'combo-b-ip-02', 'combo-b-hard-ip-03': 'combo-b-ip-03',
  'combo-b-hard-ip-04': 'combo-b-ip-04', 'combo-b-hard-ip-05': 'combo-b-ip-05',
  // Expanded — enc
  'exp-easy-enc-01': 'enc-01', 'exp-easy-enc-02': 'enc-02', 'exp-easy-enc-03': 'enc-03',
  'exp-easy-enc-04': 'enc-04', 'exp-easy-enc-05': 'enc-05', 'exp-easy-enc-06': 'enc-06',
  'exp-easy-enc-07': 'enc-07', 'exp-easy-enc-08': 'enc-08', 'exp-easy-enc-09': 'enc-09',
  'exp-easy-enc-10': 'enc-10',
  // Expanded — sl
  'exp-easy-solar-01': 'sl-01', 'exp-easy-sl-02': 'sl-02', 'exp-easy-sl-03': 'sl-03',
  'exp-easy-sl-04': 'sl-04', 'exp-easy-sl-05': 'sl-05', 'exp-easy-sl-06': 'sl-06',
  'exp-easy-sl-07': 'sl-07',
  // Expanded — golem
  'exp-easy-golem-02': 'golem-02', 'exp-easy-golem-03': 'golem-03',
  'exp-easy-golem-04': 'golem-04', 'exp-easy-golem-05': 'golem-05',
  'exp-easy-golem-06': 'golem-06',
  // Expanded — debunk
  'exp-debunk-easy-01': 'debunk-01', 'exp-debunk-medium-01': 'debunk-02',
  // Expanded — enc-sl
  'exp-medium-enc-sl-02': 'enc-sl-02', 'exp-medium-enc-sl-03': 'enc-sl-03',
  'exp-medium-enc-sl-04': 'enc-sl-04', 'exp-medium-enc-sl-05': 'enc-sl-05',
  'exp-medium-enc-sl-06': 'enc-sl-06',
  // Expanded — golem-enc
  'exp-medium-golem-enc-02': 'golem-enc-02', 'exp-medium-golem-enc-03': 'golem-enc-03',
  'exp-medium-golem-enc-04': 'golem-enc-04', 'exp-medium-golem-enc-05': 'golem-enc-05',
  'exp-medium-golem-enc-06': 'golem-enc-06',
  // Expanded — golem-sl
  'exp-medium-golem-sl-02': 'golem-sl-02', 'exp-medium-golem-sl-03': 'golem-sl-03',
  'exp-medium-golem-sl-04': 'golem-sl-04', 'exp-medium-golem-sl-05': 'golem-sl-05',
  'exp-medium-golem-sl-06': 'golem-sl-06',
  // Expanded — all
  'exp-hard-all-02': 'all-02', 'exp-hard-all-03': 'all-03', 'exp-hard-all-04': 'all-04',
  'exp-hard-all-05': 'all-05', 'exp-hard-all-06': 'all-06',
  // Expanded — golem-mix
  'exp-hard-golem-mix-02': 'golem-mix-02', 'exp-hard-golem-mix-03': 'golem-mix-03',
  'exp-hard-golem-mix-04': 'golem-mix-04', 'exp-hard-golem-mix-05': 'golem-mix-05',
  'exp-hard-golem-mix-06': 'golem-mix-06',
  // Expanded — among-golem
  'exp-hard-among-golem-01': 'among-golem-01', 'exp-hard-among-golem-02': 'among-golem-02',
  // Expanded — combo strips difficulty component
  'combo-exp-easy-02': 'combo-exp-02', 'combo-exp-easy-03': 'combo-exp-03',
  'combo-exp-easy-04': 'combo-exp-04', 'combo-exp-easy-05': 'combo-exp-05',
  'combo-exp-easy-06': 'combo-exp-06',
  'combo-exp-med-sl-02': 'combo-exp-sl-02', 'combo-exp-med-sl-03': 'combo-exp-sl-03',
  'combo-exp-med-sl-04': 'combo-exp-sl-04', 'combo-exp-med-sl-05': 'combo-exp-sl-05',
  'combo-exp-med-all-02': 'combo-exp-all-02', 'combo-exp-med-all-03': 'combo-exp-all-03',
  'combo-exp-med-all-04': 'combo-exp-all-04', 'combo-exp-med-all-05': 'combo-exp-all-05',
  'combo-exp-hard-wha-02': 'combo-exp-wha-02', 'combo-exp-hard-wha-03': 'combo-exp-wha-03',
  'combo-exp-hard-wha-04': 'combo-exp-wha-04', 'combo-exp-hard-wha-05': 'combo-exp-wha-05',
  'combo-exp-hard-sl-02': 'combo-exp-xsl-02', 'combo-exp-hard-sl-03': 'combo-exp-xsl-03',
  'combo-exp-hard-sl-04': 'combo-exp-xsl-04', 'combo-exp-hard-sl-05': 'combo-exp-xsl-05',
};

// ─── Types ────────────────────────────────────────────────────────────────────

export type PuzzleProgress = {
  savedAt: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  gridState: Record<number, Record<number, string>>;
  notes: Record<string, string>;
  hintLevel: number;
  wrongAttempts: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  answers: (any | null)[];
};

export type ExpandedPuzzleProgress = PuzzleProgress & {
  solarLunarMarks: Record<number, { solar: string; lunar: string } | null>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  golemNotepad: any;
};

export type SaveFile<T extends PuzzleProgress = PuzzleProgress> = {
  version: number;
  exportedAt: string;
  puzzles: Record<string, T>;
};

// ─── Migration ────────────────────────────────────────────────────────────────

/** Puzzles whose questions changed in the v2→v3 migration */
const BASE_QUESTIONS_CHANGED = new Set([
  'easy-2003', 'easy-2006', 'medium-6000', 'medium-6003',
  'hard-among-01', 'hard-among-02', 'tutorial-debunk-03',
]);
/** Expanded puzzles where a question was removed in the v2→v3 migration */
const EXPANDED_QUESTIONS_CHANGED = new Set([
  'exp-hard-among-golem-01',
]);

/** Legacy golem puzzles deleted in v4→v5 (carried puzzle.golem field; replaced by joint-golem equivalents) */
const DELETED_IN_V5_EXPANDED = new Set([
  'golem-enc-02', 'golem-enc-03', 'golem-enc-04', 'golem-enc-05', 'golem-enc-06',
  'golem-sl-02',  'golem-sl-03',  'golem-sl-04',  'golem-sl-05',  'golem-sl-06',
  'golem-mix-02', 'golem-mix-03', 'golem-mix-04', 'golem-mix-05', 'golem-mix-06',
  'all-02', 'all-03', 'all-04', 'all-05', 'all-06',
  'among-golem-02', 'among-golem-03',
  'combo-exp-med-all-02', 'combo-exp-med-all-03', 'combo-exp-med-all-04', 'combo-exp-med-all-05',
  'mixed-exp-golem-02',  'mixed-exp-golem-03',  'mixed-exp-golem-04',  'mixed-exp-golem-05',
  'mixed-exp-golem-06',  'mixed-exp-golem-07',  'mixed-exp-golem-08',  'mixed-exp-golem-09',
  'mixed-exp-golem-10',  'mixed-exp-golem-11',  'mixed-exp-golem-12',  'mixed-exp-golem-13',
  'mixed-exp-golem-14',  'mixed-exp-golem-15',  'mixed-exp-golem-16',  'mixed-exp-golem-17',
  'mixed-exp-golem-18',  'mixed-exp-golem-19',  'mixed-exp-golem-20',  'mixed-exp-golem-21',
  'mixed-exp-golem-22',  'mixed-exp-golem-23',  'mixed-exp-golem-24',  'mixed-exp-golem-25',
  'mixed-exp-golem-26',
  'mixed-exp-mix-02',  'mixed-exp-mix-03',  'mixed-exp-mix-04',  'mixed-exp-mix-05',
  'mixed-exp-mix-06',  'mixed-exp-mix-07',  'mixed-exp-mix-08',  'mixed-exp-mix-09',
  'mixed-exp-mix-10',  'mixed-exp-mix-11',  'mixed-exp-mix-12',  'mixed-exp-mix-13',
  'mixed-exp-mix-14',  'mixed-exp-mix-15',  'mixed-exp-mix-16',  'mixed-exp-mix-17',
  'mixed-exp-mix-18',  'mixed-exp-mix-19',  'mixed-exp-mix-20',  'mixed-exp-mix-21',
  'mixed-exp-mix-22',  'mixed-exp-mix-23',  'mixed-exp-mix-24',  'mixed-exp-mix-25',
  'mixed-exp-mix-26',
  'mixed-exp-02',  'mixed-exp-03',  'mixed-exp-04',  'mixed-exp-05',  'mixed-exp-06',
  'mixed-exp-07',  'mixed-exp-08',  'mixed-exp-09',  'mixed-exp-10',  'mixed-exp-11',
  'mixed-exp-debunk-02',  'mixed-exp-debunk-03',  'mixed-exp-debunk-04',  'mixed-exp-debunk-05',
  'mixed-exp-debunk-06',  'mixed-exp-debunk-07',  'mixed-exp-debunk-08',  'mixed-exp-debunk-09',
  'mixed-exp-debunk-10',  'mixed-exp-debunk-11',  'mixed-exp-debunk-12',  'mixed-exp-debunk-13',
  'mixed-exp-debunk-14',  'mixed-exp-debunk-15',  'mixed-exp-debunk-16',  'mixed-exp-debunk-17',
  'mixed-exp-debunk-18',  'mixed-exp-debunk-19',  'mixed-exp-debunk-20',  'mixed-exp-debunk-21',
  'mixed-exp-debunk-22',  'mixed-exp-debunk-23',  'mixed-exp-debunk-24',  'mixed-exp-debunk-25',
  'mixed-exp-debunk-26',  'mixed-exp-debunk-27',  'mixed-exp-debunk-28',  'mixed-exp-debunk-29',
  'mixed-exp-debunk-30',  'mixed-exp-debunk-31',  'mixed-exp-debunk-32',  'mixed-exp-debunk-33',
  'mixed-exp-debunk-34',  'mixed-exp-debunk-35',  'mixed-exp-debunk-36',  'mixed-exp-debunk-37',
  'mixed-exp-debunk-38',  'mixed-exp-debunk-39',  'mixed-exp-debunk-40',  'mixed-exp-debunk-41',
  'mixed-exp-debunk-42',  'mixed-exp-debunk-43',  'mixed-exp-debunk-44',  'mixed-exp-debunk-45',
  'mixed-exp-debunk-46',  'mixed-exp-debunk-47',  'mixed-exp-debunk-48',  'mixed-exp-debunk-49',
  'mixed-exp-debunk-50',  'mixed-exp-debunk-51',
  'combo-exp-wha-02', 'combo-exp-wha-03', 'combo-exp-wha-04', 'combo-exp-wha-05',
  'combo-exp-xsl-02', 'combo-exp-xsl-03', 'combo-exp-xsl-04', 'combo-exp-xsl-05',
]);

/**
 * Run once on startup.  Applies all pending migrations in order:
 *   v2 → v3  reset answers for puzzles whose questions changed
 *   v3 → v4  rename all puzzle IDs to difficulty-neutral names
 *
 * Each step is guarded by the original file version so it only fires once
 * and never clobbers data that was saved under the new IDs.
 */
export function runMigrations(): void {
  // Base ──────────────────────────────────────────────────────────────────────
  try {
    const raw = localStorage.getItem(BASE_KEY);
    // Track the version as it was on disk (before we mutate anything).
    // Default to SAVE_VERSION so the completed-array rename below is skipped
    // when there is no save file yet (nothing to rename).
    let originalVersion = SAVE_VERSION;

    if (raw) {
      const file = JSON.parse(raw) as SaveFile<PuzzleProgress>;
      originalVersion = file.version;

      if (file.version < SAVE_VERSION) {
        // v2 → v3: reset answers for puzzles whose questions changed
        if (file.version < 3) {
          for (const id of BASE_QUESTIONS_CHANGED) {
            if (file.puzzles[id]) {
              file.puzzles[id].answers = file.puzzles[id].answers.map(() => null);
            }
            try { localStorage.removeItem(`solver-${id}`); } catch { /* ignore */ }
          }
        }
        // v3 → v4: rename puzzle IDs
        for (const oldId of Object.keys(file.puzzles)) {
          const newId = ID_RENAMES[oldId];
          if (newId) {
            file.puzzles[newId] = file.puzzles[oldId];
            delete file.puzzles[oldId];
          }
        }
        file.version = SAVE_VERSION;
        localStorage.setItem(BASE_KEY, JSON.stringify(file));
      }
    }

    // Migrate the completed-set.
    // • Only invalidate BASE_QUESTIONS_CHANGED entries when coming from v2
    //   (they were validly re-completed by v3 users and must survive as-is).
    // • Always apply ID_RENAMES (idempotent: new IDs are not in the map).
    const raw2 = localStorage.getItem('alch-completed-base');
    if (raw2 && originalVersion < SAVE_VERSION) {
      const ids: string[] = JSON.parse(raw2);
      const renamed = ids
        .filter(id => originalVersion >= 3 || !BASE_QUESTIONS_CHANGED.has(id))
        .map(id => ID_RENAMES[id] ?? id);
      localStorage.setItem('alch-completed-base', JSON.stringify(renamed));
    }
    // Rename last-puzzle key
    const lastRaw = localStorage.getItem('alch-last-puzzle-base');
    if (lastRaw && ID_RENAMES[lastRaw]) {
      localStorage.setItem('alch-last-puzzle-base', ID_RENAMES[lastRaw]);
    }
  } catch { /* ignore */ }

  // Expanded ──────────────────────────────────────────────────────────────────
  try {
    const raw = localStorage.getItem(EXPANDED_KEY);
    let originalVersion = SAVE_VERSION;

    if (raw) {
      const file = JSON.parse(raw) as SaveFile<ExpandedPuzzleProgress>;
      originalVersion = file.version;

      if (file.version < SAVE_VERSION) {
        // v2 → v3: remove second question slot for changed puzzles
        if (file.version < 3) {
          for (const id of EXPANDED_QUESTIONS_CHANGED) {
            if (file.puzzles[id]) {
              // Second question was removed — keep only the first answer slot
              file.puzzles[id].answers = [file.puzzles[id].answers[0] ?? null];
            }
            try { localStorage.removeItem(`exp-solver-${id}`); } catch { /* ignore */ }
          }
        }
        // v3 → v4: rename puzzle IDs
        for (const oldId of Object.keys(file.puzzles)) {
          const newId = ID_RENAMES[oldId];
          if (newId) {
            file.puzzles[newId] = file.puzzles[oldId];
            delete file.puzzles[oldId];
          }
        }
        // v4 → v5: delete progress for legacy golem puzzles (replaced by joint-golem equivalents)
        for (const id of DELETED_IN_V5_EXPANDED) {
          delete file.puzzles[id];
        }
        file.version = SAVE_VERSION;
        localStorage.setItem(EXPANDED_KEY, JSON.stringify(file));
      }
    }

    // Migrate both expanded completed keys
    for (const key of ['alch-completed-expanded', 'alch-exp-completed']) {
      const raw2 = localStorage.getItem(key);
      if (raw2 && originalVersion < SAVE_VERSION) {
        const ids: string[] = JSON.parse(raw2);
        const renamed = ids
          .filter(id => originalVersion >= 3 || !EXPANDED_QUESTIONS_CHANGED.has(id))
          .map(id => ID_RENAMES[id] ?? id)
          .filter(id => !DELETED_IN_V5_EXPANDED.has(id));
        localStorage.setItem(key, JSON.stringify(renamed));
      }
    }
    // Rename last-puzzle key
    const lastRaw = localStorage.getItem('alch-exp-last');
    if (lastRaw && ID_RENAMES[lastRaw]) {
      localStorage.setItem('alch-exp-last', ID_RENAMES[lastRaw]);
    }
  } catch { /* ignore */ }
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

const BASE_KEY     = 'alch-save-base';
const EXPANDED_KEY = 'alch-save-expanded';

export function readBaseFile(): SaveFile<PuzzleProgress> {
  try {
    const raw = localStorage.getItem(BASE_KEY);
    if (raw) return JSON.parse(raw) as SaveFile<PuzzleProgress>;
  } catch { /* ignore */ }
  return { version: SAVE_VERSION, exportedAt: '', puzzles: {} };
}

export function readExpandedFile(): SaveFile<ExpandedPuzzleProgress> {
  try {
    const raw = localStorage.getItem(EXPANDED_KEY);
    if (raw) return JSON.parse(raw) as SaveFile<ExpandedPuzzleProgress>;
  } catch { /* ignore */ }
  return { version: SAVE_VERSION, exportedAt: '', puzzles: {} };
}

export function persistBaseProgress(puzzleId: string, progress: PuzzleProgress): void {
  try {
    const file = readBaseFile();
    file.puzzles[puzzleId] = progress;
    localStorage.setItem(BASE_KEY, JSON.stringify(file));
  } catch { /* ignore */ }
}

export function persistExpandedProgress(puzzleId: string, progress: ExpandedPuzzleProgress): void {
  try {
    const file = readExpandedFile();
    file.puzzles[puzzleId] = progress;
    localStorage.setItem(EXPANDED_KEY, JSON.stringify(file));
  } catch { /* ignore */ }
}

// ─── Download ─────────────────────────────────────────────────────────────────

function triggerDownload(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Download BOTH save files in one click.
 * The current puzzle's progress is merged in before downloading.
 * Call this from either page — the other file is built from localStorage.
 */
export function downloadBothFiles(
  puzzleId: string,
  progress: PuzzleProgress | ExpandedPuzzleProgress,
  mode: 'base' | 'expanded',
): void {
  const now = new Date().toISOString();

  const baseFile = readBaseFile();
  const expFile  = readExpandedFile();

  if (mode === 'base') {
    baseFile.puzzles[puzzleId] = progress as PuzzleProgress;
  } else {
    expFile.puzzles[puzzleId] = progress as ExpandedPuzzleProgress;
  }
  baseFile.exportedAt = now;
  expFile.exportedAt  = now;

  triggerDownload('alchemy-sudoku-save.json',          baseFile);
  triggerDownload('alchemy-sudoku-expanded-save.json', expFile);
}

// ─── Upload ───────────────────────────────────────────────────────────────────

function pickFile(): Promise<string | null> {
  return new Promise(resolve => {
    const input    = document.createElement('input');
    input.type     = 'file';
    input.accept   = '.json,application/json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      const reader = new FileReader();
      reader.onload = e => resolve((e.target?.result as string) ?? null);
      reader.readAsText(file);
    };
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}

/**
 * Let the user pick a base-game save file.
 * Merges the whole file into localStorage, then returns this puzzle's entry.
 */
export async function uploadBaseProgress(puzzleId: string): Promise<PuzzleProgress | null> {
  const text = await pickFile();
  if (!text) return null;
  try {
    const file = JSON.parse(text) as SaveFile<PuzzleProgress>;
    if (typeof file.version !== 'number' || !file.puzzles) {
      alert('This file does not look like an Alchemy Sudoku Training save.');
      return null;
    }
    try { localStorage.setItem(BASE_KEY, JSON.stringify(file)); } catch { /* ignore */ }
    const entry = file.puzzles[puzzleId];
    if (!entry) {
      alert(`No progress for puzzle "${puzzleId}" found in this save file.`);
      return null;
    }
    return entry;
  } catch {
    alert('Could not read the save file.');
    return null;
  }
}

// ─── Progress reset ───────────────────────────────────────────────────────────

/** Clear all base-game progress from localStorage (main save + legacy per-puzzle keys). */
export function clearBaseProgress(): void {
  try {
    localStorage.removeItem('alch-completed-base');
    localStorage.removeItem('alch-last-puzzle-base');
    localStorage.removeItem(BASE_KEY);
    // Iterate backwards to avoid index-shifting while removing
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('solver-') || k.startsWith('display-map-'))) localStorage.removeItem(k);
    }
  } catch { /* ignore */ }
}

/** Clear all expanded-mode progress from localStorage (main save + legacy per-puzzle keys). */
export function clearExpandedProgress(): void {
  try {
    localStorage.removeItem('alch-exp-completed');
    localStorage.removeItem('alch-exp-last');
    localStorage.removeItem(EXPANDED_KEY);
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('exp-solver-') || k.startsWith('exp-display-map-'))) localStorage.removeItem(k);
    }
  } catch { /* ignore */ }
}

export async function uploadExpandedProgress(puzzleId: string): Promise<ExpandedPuzzleProgress | null> {
  const text = await pickFile();
  if (!text) return null;
  try {
    const file = JSON.parse(text) as SaveFile<ExpandedPuzzleProgress>;
    if (typeof file.version !== 'number' || !file.puzzles) {
      alert('This file does not look like an Alchemy Sudoku Training Expanded save.');
      return null;
    }
    try { localStorage.setItem(EXPANDED_KEY, JSON.stringify(file)); } catch { /* ignore */ }
    const entry = file.puzzles[puzzleId];
    if (!entry) {
      alert(`No progress for puzzle "${puzzleId}" found in this save file.`);
      return null;
    }
    return entry;
  } catch {
    alert('Could not read the save file.');
    return null;
  }
}
