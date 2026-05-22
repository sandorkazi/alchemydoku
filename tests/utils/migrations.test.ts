/**
 * migrations.test.ts
 *
 * Tests for runMigrations() in src/utils/saveProgress.ts.
 *
 * Vitest runs in a Node environment (no real localStorage), so each test
 * installs a fresh in-memory localStorage mock via vi.stubGlobal and tears
 * it down via vi.unstubAllGlobals in afterEach.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  runMigrations,
  SAVE_VERSION,
  type SaveFile,
  type PuzzleProgress,
} from '@shared/utils/saveProgress';
import { LEGACY_ID_TO_UUID } from '@shared/utils/legacyPuzzleIds';

// ─── Mock localStorage ────────────────────────────────────────────────────────

function makeLocalStorage(initial: Record<string, unknown> = {}) {
  const store: Record<string, string> = {};
  for (const [k, v] of Object.entries(initial)) {
    store[k] = typeof v === 'string' ? v : JSON.stringify(v);
  }
  return {
    getItem:    (key: string)              => store[key] ?? null,
    setItem:    (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string)              => { delete store[key]; },
    get store() { return store; },
    parse<T>(key: string): T | null {
      const raw = store[key];
      return raw ? JSON.parse(raw) as T : null;
    },
  };
}

function makeProgress(answers: unknown[] = [null]): PuzzleProgress {
  return { savedAt: '', gridState: {}, notes: {}, hintLevel: 0, wrongAttempts: 0, answers };
}

// ─── Fixture helpers ──────────────────────────────────────────────────────────

function baseSave(version: number, puzzles: Record<string, PuzzleProgress>): SaveFile<PuzzleProgress> {
  return { version, exportedAt: '', puzzles };
}

afterEach(() => { vi.unstubAllGlobals(); });

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('runMigrations — no-op at current version', () => {
  it('does not write to localStorage when version is already SAVE_VERSION', () => {
    const ls = makeLocalStorage({
      'alch-save-base': baseSave(SAVE_VERSION, { 'mix-2000': makeProgress() }),
    });
    const spy = vi.spyOn(ls, 'setItem');
    vi.stubGlobal('localStorage', ls);

    runMigrations();

    expect(spy).not.toHaveBeenCalled();
  });

  it('does not throw when localStorage is completely empty', () => {
    vi.stubGlobal('localStorage', makeLocalStorage({}));
    expect(() => runMigrations()).not.toThrow();
  });
});

describe('runMigrations — v3 → v4 → v6: ID renames then UUID translation', () => {
  it('renames old base puzzle IDs and translates them to UUIDs', () => {
    const ls = makeLocalStorage({
      'alch-save-base': baseSave(3, {
        'easy-2000': makeProgress(),
        'hard-9000': makeProgress(),
        'medium-pp-01': makeProgress(),
      }),
    });
    vi.stubGlobal('localStorage', ls);

    runMigrations();

    const saved = ls.parse<SaveFile<PuzzleProgress>>('alch-save-base');
    expect(saved?.version).toBe(SAVE_VERSION);
    // Pre-v4 IDs must be gone
    expect(saved?.puzzles['easy-2000']).toBeUndefined();
    expect(saved?.puzzles['hard-9000']).toBeUndefined();
    expect(saved?.puzzles['medium-pp-01']).toBeUndefined();
    // Intermediate human-readable IDs also gone (translated to UUIDs by v5→v6)
    expect(saved?.puzzles['mix-2000']).toBeUndefined();
    expect(saved?.puzzles['ded-9000']).toBeUndefined();
    expect(saved?.puzzles['pp-01']).toBeUndefined();
    // Final UUIDs must be present
    expect(saved?.puzzles[LEGACY_ID_TO_UUID['mix-2000']]).toBeDefined();
    expect(saved?.puzzles[LEGACY_ID_TO_UUID['ded-9000']]).toBeDefined();
    expect(saved?.puzzles[LEGACY_ID_TO_UUID['pp-01']]).toBeDefined();
  });

  it('renames IDs in the alch-completed-base array then translates to UUIDs', () => {
    const ls = makeLocalStorage({
      'alch-save-base': baseSave(3, {}),
      'alch-completed-base': ['easy-2000', 'hard-9000', 'tutorial-mix-01'],
    });
    vi.stubGlobal('localStorage', ls);

    runMigrations();

    const completed = ls.parse<string[]>('alch-completed-base');
    expect(completed).toContain(LEGACY_ID_TO_UUID['mix-2000']);
    expect(completed).toContain(LEGACY_ID_TO_UUID['ded-9000']);
    expect(completed).toContain(LEGACY_ID_TO_UUID['tutorial-mix-01']);
    expect(completed).not.toContain('easy-2000');
    expect(completed).not.toContain('hard-9000');
    expect(completed).not.toContain('mix-2000');
    expect(completed).not.toContain('ded-9000');
  });

  it('renames and UUID-translates the last-puzzle base key', () => {
    const ls = makeLocalStorage({
      'alch-save-base': baseSave(3, {}),
      'alch-last-puzzle-base': 'easy-2004',
    });
    vi.stubGlobal('localStorage', ls);

    runMigrations();

    expect(ls.store['alch-last-puzzle-base']).toBe(LEGACY_ID_TO_UUID['mix-2004']);
  });

  it('renames old expanded puzzle IDs and translates them to UUIDs', () => {
    const ls = makeLocalStorage({
      'alch-save-expanded': baseSave(3, {
        'exp-easy-enc-01': makeProgress(),
        'exp-easy-solar-01': makeProgress(),
      }),
    });
    vi.stubGlobal('localStorage', ls);

    runMigrations();

    const saved = ls.parse<SaveFile<PuzzleProgress>>('alch-save-expanded');
    expect(saved?.puzzles[LEGACY_ID_TO_UUID['enc-01']]).toBeDefined();
    expect(saved?.puzzles[LEGACY_ID_TO_UUID['sl-01']]).toBeDefined();
    expect(saved?.puzzles['enc-01']).toBeUndefined();
    expect(saved?.puzzles['sl-01']).toBeUndefined();
    expect(saved?.puzzles['exp-easy-enc-01']).toBeUndefined();
    expect(saved?.puzzles['exp-easy-solar-01']).toBeUndefined();
  });
});

describe('runMigrations — v2 → v3: answer reset for changed puzzles', () => {
  it('resets answers for base puzzles whose questions changed', () => {
    const progress = makeProgress([{ answer: 'old' }, { answer: 'also-old' }]);
    const ls = makeLocalStorage({
      'alch-save-base': baseSave(2, { 'easy-2003': progress }),
    });
    vi.stubGlobal('localStorage', ls);

    runMigrations();

    const saved = ls.parse<SaveFile<PuzzleProgress>>('alch-save-base');
    // 'easy-2003' → 'mix-2003' (v3→v4) → UUID (v5→v6); answers reset
    const entry = saved?.puzzles[LEGACY_ID_TO_UUID['mix-2003']];
    expect(entry).toBeDefined();
    expect(entry?.answers).toEqual([null, null]);
  });

  it('preserves answers for puzzles that did not change', () => {
    const progress = makeProgress([{ answer: 'keeper' }]);
    const ls = makeLocalStorage({
      'alch-save-base': baseSave(2, { 'easy-2000': progress }),
    });
    vi.stubGlobal('localStorage', ls);

    runMigrations();

    const saved = ls.parse<SaveFile<PuzzleProgress>>('alch-save-base');
    const entry = saved?.puzzles[LEGACY_ID_TO_UUID['mix-2000']];
    expect(entry?.answers).toEqual([{ answer: 'keeper' }]);
  });

  it('removes changed puzzles from alch-completed-base when coming from v2', () => {
    // easy-2003 is in BASE_QUESTIONS_CHANGED — it must be filtered out of completed
    const ls = makeLocalStorage({
      'alch-save-base': baseSave(2, {}),
      'alch-completed-base': ['easy-2000', 'easy-2003'],
    });
    vi.stubGlobal('localStorage', ls);

    runMigrations();

    const completed = ls.parse<string[]>('alch-completed-base');
    expect(completed).toContain(LEGACY_ID_TO_UUID['mix-2000']); // unchanged puzzle, renamed then UUID
    expect(completed).not.toContain(LEGACY_ID_TO_UUID['mix-2003']); // answer-changed → stripped
    expect(completed).not.toContain('easy-2003');
    expect(completed).not.toContain('mix-2000');
  });
});
