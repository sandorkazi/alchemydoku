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

export const SAVE_VERSION = 3;

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

/**
 * Run once on startup.  Detects a v2 save file and resets answers / completed
 * status for puzzles whose questions changed between v2 and v3.
 */
export function runMigrations(): void {
  // Base ──────────────────────────────────────────────────────────────────────
  try {
    const raw = localStorage.getItem(BASE_KEY);
    if (raw) {
      const file = JSON.parse(raw) as SaveFile<PuzzleProgress>;
      if (file.version < SAVE_VERSION) {
        for (const id of BASE_QUESTIONS_CHANGED) {
          if (file.puzzles[id]) {
            file.puzzles[id].answers = file.puzzles[id].answers.map(() => null);
          }
          try { localStorage.removeItem(`solver-${id}`); } catch { /* ignore */ }
        }
        file.version = SAVE_VERSION;
        localStorage.setItem(BASE_KEY, JSON.stringify(file));
      }
    }
    // Remove changed puzzles from the completed-set
    const raw2 = localStorage.getItem('alch-completed-base');
    if (raw2) {
      const ids: string[] = JSON.parse(raw2);
      const cleaned = ids.filter(id => !BASE_QUESTIONS_CHANGED.has(id));
      if (cleaned.length !== ids.length) {
        localStorage.setItem('alch-completed-base', JSON.stringify(cleaned));
      }
    }
  } catch { /* ignore */ }

  // Expanded ──────────────────────────────────────────────────────────────────
  try {
    const raw = localStorage.getItem(EXPANDED_KEY);
    if (raw) {
      const file = JSON.parse(raw) as SaveFile<ExpandedPuzzleProgress>;
      if (file.version < SAVE_VERSION) {
        for (const id of EXPANDED_QUESTIONS_CHANGED) {
          if (file.puzzles[id]) {
            // Second question was removed — keep only the first answer slot
            file.puzzles[id].answers = [file.puzzles[id].answers[0] ?? null];
          }
          try { localStorage.removeItem(`exp-solver-${id}`); } catch { /* ignore */ }
        }
        file.version = SAVE_VERSION;
        localStorage.setItem(EXPANDED_KEY, JSON.stringify(file));
      }
    }
    // Remove from both expanded completed keys
    for (const key of ['alch-completed-expanded', 'alch-exp-completed']) {
      const raw2 = localStorage.getItem(key);
      if (raw2) {
        const ids: string[] = JSON.parse(raw2);
        const cleaned = ids.filter(id => !EXPANDED_QUESTIONS_CHANGED.has(id));
        if (cleaned.length !== ids.length) {
          localStorage.setItem(key, JSON.stringify(cleaned));
        }
      }
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
