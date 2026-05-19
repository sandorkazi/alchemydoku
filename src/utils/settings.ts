/**
 * User-adjustable settings, persisted in localStorage and synced via Google Drive.
 */

import { DEFAULT_PEN_COLOR } from './penColors';

export type Settings = {
  showLatestUpdates: boolean;  // show What's New banner for new releases (default: true)
  showRulesRef: boolean;       // show Rules quick reference section (default: false)
  showInterfaceRef: boolean;   // show Interface quick reference section (default: false)
  showPuzzleOnly: boolean;     // show non-board-game (puzzle-only) collections (default: false)
  penColor: string;            // default pen color for draw tool (default: orange-500)
  showTimer: boolean;          // show solve timer in puzzle toolbar (default: false)
};

export const DEFAULT_SETTINGS: Settings = {
  showLatestUpdates: true,
  showRulesRef: false,
  showInterfaceRef: false,
  showPuzzleOnly: false,
  penColor: DEFAULT_PEN_COLOR,
  showTimer: false,
};

const SETTINGS_KEY = 'alch-settings';

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch { return { ...DEFAULT_SETTINGS }; }
}

export function saveSettings(s: Settings): void {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}
