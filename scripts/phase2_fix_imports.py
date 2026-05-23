#!/usr/bin/env python3
"""
Second-pass import fixer for Phase 2 restructure.

Handles two remaining cases not covered by phase2_restructure.py:

1. Files that MOVED (e.g. src/components/ → src/base/components/) still have
   old relative imports.  Their imports now resolve to src/base/X paths that
   don't exist; the original src/X path is what should be looked up in
   IMPORT_MAP.  We detect this by stripping the leading 'base/' or 'shared/'
   segment from the resolved canonical key.

2. Inline import() type expressions  (no whitespace between import and '(')
   were skipped by the previous regex.  We add a second pattern for those.
"""

import re
import sys
from pathlib import Path

REPO = Path(__file__).parent.parent
SRC  = REPO / 'src'

IMPORT_MAP: dict[str, str] = {
    'types':                                    '@shared/types',
    'compliance':                               '@shared/compliance',
    'logic/alchemicals':                        '@shared/logic/alchemicals',
    'logic/deducer':                            '@shared/logic/deducer',
    'logic/index':                              '@shared/logic/index',
    'logic/mixer':                              '@shared/logic/mixer',
    'logic/sellValidator':                      '@shared/logic/sellValidator',
    'logic/worldPack':                          '@shared/logic/worldPack',
    'logic/worldSet':                           '@shared/logic/worldSet',
    'logic/debunk':                             '@base/logic/debunk',
    'data/alchemicals':                         '@shared/data/alchemicals',
    'data/ingredients':                         '@shared/data/ingredients',
    'data/sprites':                             '@shared/data/sprites',
    'data/releaseNotes':                        '@shared/data/releaseNotes',
    'data/puzzles/index':                       '@base/data/index',
    'data/tutorials/mixing':                    '@base/data/tutorials/mixing',
    'data/tutorials/aspect-balance':            '@base/data/tutorials/aspect-balance',
    'data/tutorials/selling':                   '@base/data/tutorials/selling',
    'data/tutorials/two-color':                 '@base/data/tutorials/two-color',
    'data/tutorials/debunk-apprentice':         '@base/data/tutorials/debunk-apprentice',
    'data/tutorials/debunk-master':             '@base/data/tutorials/debunk-master',
    'utils/legacyPuzzleIds':                    '@shared/utils/legacyPuzzleIds',
    'utils/penColors':                          '@shared/utils/penColors',
    'utils/permalink':                          '@shared/utils/permalink',
    'utils/releaseNotes':                       '@shared/utils/releaseNotes',
    'utils/saveFileTransfer':                   '@shared/utils/saveFileTransfer',
    'utils/saveProgress':                       '@shared/utils/saveProgress',
    'utils/settings':                           '@shared/utils/settings',
    'utils/solverStorage':                      '@shared/utils/solverStorage',
    'utils/syncPreference':                     '@shared/utils/syncPreference',
    'services/googleDrive':                     '@shared/services/googleDrive',
    'contexts/DriveContext':                    '@shared/contexts/DriveContext',
    'contexts/TutorialContext':                 '@shared/contexts/TutorialContext',
    'contexts/SolverContext':                   '@base/contexts/SolverContext',
    'components/AlchemicalDisplay':             '@shared/components/AlchemicalDisplay',
    'components/AtlasSprite':                   '@shared/components/AtlasSprite',
    'components/BuildStamp':                    '@shared/components/BuildStamp',
    'components/DriveSync':                     '@shared/components/DriveSync',
    'components/GameSprites':                   '@shared/components/GameSprites',
    'components/HintStepViewer':                '@shared/components/HintStepViewer',
    'components/MixSimulator':                  '@shared/components/MixSimulator',
    'components/PuzzleToolbar':                 '@shared/components/PuzzleToolbar',
    'components/SaveSetupBanner':               '@shared/components/SaveSetupBanner',
    'components/SettingsModal':                 '@shared/components/SettingsModal',
    'components/StarBurst':                     '@shared/components/StarBurst',
    'components/WhatsNewBanner':                '@shared/components/WhatsNewBanner',
    'components/AnswerPanel':                   '@base/components/AnswerPanel',
    'components/AnswerPickers':                 '@base/components/AnswerPickers',
    'components/ClueCard':                      '@base/components/ClueCard',
    'components/ClueGrouping':                  '@base/components/ClueGrouping',
    'components/CluePanel':                     '@base/components/CluePanel',
    'components/DebunkAnswerPanel':             '@base/components/DebunkAnswerPanel',
    'components/HintDrawer':                    '@base/components/HintDrawer',
    'components/IngredientGrid':                '@base/components/IngredientGrid',
    'components/InterfaceQuickReference':       '@base/components/InterfaceQuickReference',
    'components/RulesQuickReference':           '@base/components/RulesQuickReference',
    'components/ShufflePickerModal':            '@base/components/ShufflePickerModal',
    'pages/PuzzleSolverPage':                   '@base/pages/PuzzleSolverPage',
    'pages/TutorialPage':                       '@base/pages/TutorialPage',
    'puzzles/schema':                           '@base/puzzles/schema',
}


def canonical_key(abs_path: Path) -> str | None:
    try:
        rel = abs_path.relative_to(SRC)
        parts = list(rel.parts)
        parts[-1] = Path(parts[-1]).stem
        return '/'.join(parts)
    except ValueError:
        return None


def lookup(key: str | None) -> str | None:
    if key is None:
        return None
    if key in IMPORT_MAP:
        return IMPORT_MAP[key]
    # Strip leading 'base/' or 'shared/' from the key that came out of a
    # moved file whose relative import now resolves under src/base/ or
    # src/shared/ instead of directly under src/.
    for prefix in ('base/', 'shared/'):
        if key.startswith(prefix):
            stripped = key[len(prefix):]
            if stripped in IMPORT_MAP:
                return IMPORT_MAP[stripped]
    return None


def fix_spec(spec: str, file_path: Path) -> str | None:
    """Return the replacement alias for a relative import spec, or None."""
    resolved = (file_path.parent / spec).resolve()
    mapped = (lookup(canonical_key(resolved))
              or lookup(canonical_key(resolved.with_suffix(''))))
    return mapped


def update_file(file_path: Path) -> bool:
    text = file_path.read_text(encoding='utf-8')
    original = text

    # Pattern 1: from '...' / import '...' (standard, with whitespace)
    pat1 = re.compile(r"""((?:from|import)\s+)(['"])((?:\.\.?/)[^'"]+)(\2)""")
    # Pattern 2: import('...') type expressions (no whitespace)
    pat2 = re.compile(r"""(import\()(['"])((?:\.\.?/)[^'"]+)(\2\))""")

    def replace1(m: re.Match) -> str:
        keyword, quote, spec = m.group(1), m.group(2), m.group(3)
        new = fix_spec(spec, file_path)
        if new:
            return f"{keyword}{quote}{new}{quote}"
        return m.group(0)

    def replace2(m: re.Match) -> str:
        prefix, quote, spec, suffix = m.group(1), m.group(2), m.group(3), m.group(4)
        new = fix_spec(spec, file_path)
        if new:
            return f"{prefix}{quote}{new}{quote})"
        return m.group(0)

    text = pat1.sub(replace1, text)
    text = pat2.sub(replace2, text)

    if text != original:
        file_path.write_text(text, encoding='utf-8')
        return True
    return False


def main() -> None:
    ts_files: list[Path] = []
    ts_files += sorted(SRC.rglob('*.ts'))
    ts_files += sorted(SRC.rglob('*.tsx'))
    ts_files += sorted((REPO / 'tests').rglob('*.ts'))
    ts_files += sorted((REPO / 'tests').rglob('*.tsx'))

    changed = 0
    for f in ts_files:
        if 'node_modules' in str(f):
            continue
        if update_file(f):
            print(f'  updated {f.relative_to(REPO)}')
            changed += 1

    print(f'\n{changed} file(s) updated.')


if __name__ == '__main__':
    main()
