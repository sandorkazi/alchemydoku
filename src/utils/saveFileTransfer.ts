/**
 * Download / upload the full local save as a JSON file.
 *
 * The file format:
 * {
 *   "alchemydoku_save": true,
 *   "version": <SAVE_VERSION>,
 *   "exportedAt": "<ISO timestamp>",
 *   "data": { "<localStorage key>": "<value>" | null, ... }
 * }
 */

import { SAVE_VERSION } from './saveProgress';

const EXPORT_KEYS = [
  'alch-save-base',
  'alch-save-expanded',
  'alch-completed-base',
  'alch-exp-completed',
  'alch-tutorials-done',
  'alch-settings',
  'alch-last-puzzle-base',
  'alch-exp-last',
  'alch-seen-release',
] as const;

export function downloadSaveFile(): void {
  const data: Record<string, string | null> = {};
  for (const key of EXPORT_KEYS) {
    data[key] = localStorage.getItem(key);
  }
  const payload = JSON.stringify(
    { alchemydoku_save: true, version: SAVE_VERSION, exportedAt: new Date().toISOString(), data },
    null, 2,
  );
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `alchemydoku-save-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function uploadSaveFile(file: File): Promise<void> {
  const text = await file.text();
  let obj: unknown;
  try { obj = JSON.parse(text); } catch { throw new Error('Invalid JSON file.'); }
  if (
    !obj ||
    typeof obj !== 'object' ||
    (obj as Record<string, unknown>).alchemydoku_save !== true
  ) {
    throw new Error('Not a valid Alchemydoku save file.');
  }
  const data = (obj as Record<string, unknown>).data;
  if (!data || typeof data !== 'object') throw new Error('Save file is missing data.');
  for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
    if (typeof val === 'string') localStorage.setItem(key, val);
  }
  window.dispatchEvent(new Event('alch-cloud-sync'));
}
