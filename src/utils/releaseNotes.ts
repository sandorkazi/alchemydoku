import { RELEASE_NOTES } from '../data/releaseNotes';
import type { ReleaseEntry } from '../data/releaseNotes';

export const RELEASE_VERSION = '2026-03-16';

export function shouldShowReleaseNotes(): boolean {
  try {
    const seen = localStorage.getItem('alch-seen-release');
    if (!seen) {
      const hasProgress =
        !!localStorage.getItem('alch-save-base') ||
        !!localStorage.getItem('alch-save-expanded') ||
        !!localStorage.getItem('alch-completed-base') ||
        !!localStorage.getItem('alch-exp-completed');
      return hasProgress;
    }
    return seen !== RELEASE_VERSION;
  } catch { return false; }
}

export function markReleaseNotesSeen(): void {
  try { localStorage.setItem('alch-seen-release', RELEASE_VERSION); } catch { /* ignore */ }
}

export function getCurrentReleaseEntry(): ReleaseEntry | null {
  return RELEASE_NOTES.find(e => e.version === RELEASE_VERSION) ?? null;
}
