#!/usr/bin/env python3
"""
Phase 2 directory restructure.

Performs all git mv operations and updates every import across the codebase.
Run once from the repo root:
  python3 scripts/phase2_restructure.py
"""

import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).parent.parent
SRC  = REPO / 'src'

# ── File moves (paths relative to src/) ──────────────────────────────────────
MOVES: list[tuple[str, str]] = [
    # shared: top-level
    ('types.ts',                               'shared/types.ts'),
    ('compliance.ts',                          'shared/compliance.ts'),
    # shared: logic
    ('logic/alchemicals.ts',                   'shared/logic/alchemicals.ts'),
    ('logic/deducer.ts',                       'shared/logic/deducer.ts'),
    ('logic/index.ts',                         'shared/logic/index.ts'),
    ('logic/mixer.ts',                         'shared/logic/mixer.ts'),
    ('logic/sellValidator.ts',                 'shared/logic/sellValidator.ts'),
    ('logic/worldPack.ts',                     'shared/logic/worldPack.ts'),
    ('logic/worldSet.ts',                      'shared/logic/worldSet.ts'),
    # base: logic
    ('logic/debunk.ts',                        'base/logic/debunk.ts'),
    # shared: data
    ('data/alchemicals.ts',                    'shared/data/alchemicals.ts'),
    ('data/ingredients.ts',                    'shared/data/ingredients.ts'),
    ('data/sprites.ts',                        'shared/data/sprites.ts'),
    ('data/releaseNotes.ts',                   'shared/data/releaseNotes.ts'),
    # base: data (non-puzzle files moved first)
    ('data/tutorials/mixing.ts',               'base/data/tutorials/mixing.ts'),
    ('data/tutorials/aspect-balance.ts',       'base/data/tutorials/aspect-balance.ts'),
    ('data/tutorials/selling.ts',              'base/data/tutorials/selling.ts'),
    ('data/tutorials/two-color.ts',            'base/data/tutorials/two-color.ts'),
    ('data/tutorials/debunk-apprentice.ts',    'base/data/tutorials/debunk-apprentice.ts'),
    ('data/tutorials/debunk-master.ts',        'base/data/tutorials/debunk-master.ts'),
    # collections.json moves UP one level (out of puzzles/ subdir)
    ('data/puzzles/collections.json',          'base/data/collections.json'),
    # puzzle registry (index.ts) moves OUT of puzzles/ subdir
    ('data/puzzles/index.ts',                  'base/data/index.ts'),
    # shared: utils
    ('utils/legacyPuzzleIds.ts',               'shared/utils/legacyPuzzleIds.ts'),
    ('utils/penColors.ts',                     'shared/utils/penColors.ts'),
    ('utils/permalink.ts',                     'shared/utils/permalink.ts'),
    ('utils/releaseNotes.ts',                  'shared/utils/releaseNotes.ts'),
    ('utils/saveFileTransfer.ts',              'shared/utils/saveFileTransfer.ts'),
    ('utils/saveProgress.ts',                  'shared/utils/saveProgress.ts'),
    ('utils/settings.ts',                      'shared/utils/settings.ts'),
    ('utils/solverStorage.ts',                 'shared/utils/solverStorage.ts'),
    ('utils/syncPreference.ts',                'shared/utils/syncPreference.ts'),
    # shared: services
    ('services/googleDrive.ts',                'shared/services/googleDrive.ts'),
    # shared: contexts
    ('contexts/DriveContext.tsx',              'shared/contexts/DriveContext.tsx'),
    ('contexts/TutorialContext.tsx',           'shared/contexts/TutorialContext.tsx'),
    # base: contexts
    ('contexts/SolverContext.tsx',             'base/contexts/SolverContext.tsx'),
    # shared: components
    ('components/AlchemicalDisplay.tsx',       'shared/components/AlchemicalDisplay.tsx'),
    ('components/AtlasSprite.tsx',             'shared/components/AtlasSprite.tsx'),
    ('components/BuildStamp.tsx',              'shared/components/BuildStamp.tsx'),
    ('components/DriveSync.tsx',               'shared/components/DriveSync.tsx'),
    ('components/GameSprites.tsx',             'shared/components/GameSprites.tsx'),
    ('components/HintStepViewer.tsx',          'shared/components/HintStepViewer.tsx'),
    ('components/MixSimulator.tsx',            'shared/components/MixSimulator.tsx'),
    ('components/PuzzleToolbar.tsx',           'shared/components/PuzzleToolbar.tsx'),
    ('components/SaveSetupBanner.tsx',         'shared/components/SaveSetupBanner.tsx'),
    ('components/SettingsModal.tsx',           'shared/components/SettingsModal.tsx'),
    ('components/StarBurst.tsx',               'shared/components/StarBurst.tsx'),
    ('components/WhatsNewBanner.tsx',          'shared/components/WhatsNewBanner.tsx'),
    # base: components
    ('components/AnswerPanel.tsx',             'base/components/AnswerPanel.tsx'),
    ('components/AnswerPickers.tsx',           'base/components/AnswerPickers.tsx'),
    ('components/ClueCard.tsx',                'base/components/ClueCard.tsx'),
    ('components/ClueGrouping.tsx',            'base/components/ClueGrouping.tsx'),
    ('components/CluePanel.tsx',               'base/components/CluePanel.tsx'),
    ('components/DebunkAnswerPanel.tsx',       'base/components/DebunkAnswerPanel.tsx'),
    ('components/HintDrawer.tsx',              'base/components/HintDrawer.tsx'),
    ('components/IngredientGrid.tsx',          'base/components/IngredientGrid.tsx'),
    ('components/InterfaceQuickReference.tsx', 'base/components/InterfaceQuickReference.tsx'),
    ('components/RulesQuickReference.tsx',     'base/components/RulesQuickReference.tsx'),
    ('components/ShufflePickerModal.tsx',      'base/components/ShufflePickerModal.tsx'),
    # base: pages
    ('pages/PuzzleSolverPage.tsx',             'base/pages/PuzzleSolverPage.tsx'),
    ('pages/TutorialPage.tsx',                 'base/pages/TutorialPage.tsx'),
    # base: puzzles
    ('puzzles/schema.ts',                      'base/puzzles/schema.ts'),
]

# ── Import alias map (canonical src-relative key → new alias) ─────────────────
# Key = path under src/ without extension, no leading slash
# Value = new import string to use
IMPORT_MAP: dict[str, str] = {
    'types':                                    '@shared/types',
    'compliance':                               '@shared/compliance',
    # logic – shared
    'logic/alchemicals':                        '@shared/logic/alchemicals',
    'logic/deducer':                            '@shared/logic/deducer',
    'logic/index':                              '@shared/logic/index',
    'logic/mixer':                              '@shared/logic/mixer',
    'logic/sellValidator':                      '@shared/logic/sellValidator',
    'logic/worldPack':                          '@shared/logic/worldPack',
    'logic/worldSet':                           '@shared/logic/worldSet',
    # logic – base
    'logic/debunk':                             '@base/logic/debunk',
    # data – shared
    'data/alchemicals':                         '@shared/data/alchemicals',
    'data/ingredients':                         '@shared/data/ingredients',
    'data/sprites':                             '@shared/data/sprites',
    'data/releaseNotes':                        '@shared/data/releaseNotes',
    # data – base  (old canonical path for the puzzle registry)
    'data/puzzles/index':                       '@base/data/index',
    'data/tutorials/mixing':                    '@base/data/tutorials/mixing',
    'data/tutorials/aspect-balance':            '@base/data/tutorials/aspect-balance',
    'data/tutorials/selling':                   '@base/data/tutorials/selling',
    'data/tutorials/two-color':                 '@base/data/tutorials/two-color',
    'data/tutorials/debunk-apprentice':         '@base/data/tutorials/debunk-apprentice',
    'data/tutorials/debunk-master':             '@base/data/tutorials/debunk-master',
    # utils – shared
    'utils/legacyPuzzleIds':                    '@shared/utils/legacyPuzzleIds',
    'utils/penColors':                          '@shared/utils/penColors',
    'utils/permalink':                          '@shared/utils/permalink',
    'utils/releaseNotes':                       '@shared/utils/releaseNotes',
    'utils/saveFileTransfer':                   '@shared/utils/saveFileTransfer',
    'utils/saveProgress':                       '@shared/utils/saveProgress',
    'utils/settings':                           '@shared/utils/settings',
    'utils/solverStorage':                      '@shared/utils/solverStorage',
    'utils/syncPreference':                     '@shared/utils/syncPreference',
    # services – shared
    'services/googleDrive':                     '@shared/services/googleDrive',
    # contexts
    'contexts/DriveContext':                    '@shared/contexts/DriveContext',
    'contexts/TutorialContext':                 '@shared/contexts/TutorialContext',
    'contexts/SolverContext':                   '@base/contexts/SolverContext',
    # components – shared
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
    # components – base
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
    # pages – base
    'pages/PuzzleSolverPage':                   '@base/pages/PuzzleSolverPage',
    'pages/TutorialPage':                       '@base/pages/TutorialPage',
    # puzzles – base
    'puzzles/schema':                           '@base/puzzles/schema',
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def run(*cmd: str, cwd: Path = REPO) -> str:
    result = subprocess.run(list(cmd), cwd=cwd, check=True,
                            capture_output=True, text=True)
    return result.stdout


def git_mv(old_rel: str, new_rel: str) -> None:
    old_abs = SRC / old_rel
    new_abs = SRC / new_rel
    new_abs.parent.mkdir(parents=True, exist_ok=True)
    run('git', 'mv', str(old_abs), str(new_abs))
    print(f'  git mv {old_rel} → {new_rel}')


def canonical_key(abs_path: Path) -> str | None:
    """
    Return the src-relative path without extension for abs_path, or None.
    Also handles paths of the form  <REPO>/src/<key>.ts  that come from test
    imports like  ../../src/logic/mixer.
    """
    try:
        rel = abs_path.relative_to(SRC)
        parts = list(rel.parts)
        parts[-1] = Path(parts[-1]).stem  # strip extension
        return '/'.join(parts)
    except ValueError:
        return None


def update_imports_in_file(file_path: Path) -> bool:
    """
    Rewrite import paths in file_path.  Returns True if any change was made.

    The function resolves every relative import (./X or ../X) to an absolute
    path, then looks up the src-relative canonical key in IMPORT_MAP.  If
    found, the import spec is replaced with the mapped alias.

    Special case: src/data/puzzles/index.ts imports './foo.json'.  After it
    moves to src/base/data/index.ts the JSONs are one level deeper in puzzles/.
    We detect these JSON sibling imports and rewrite them to './puzzles/foo.json'.
    """
    text = file_path.read_text(encoding='utf-8')
    original = text

    # Pattern matches the path string inside from '...' or import '...'
    # Captures: (from|import)(whitespace)(quote)(spec)(quote)
    pat = re.compile(
        r"""((?:from|import)\s+)(['"])((?:\.\.?/)[^'"]+)(\2)"""
    )

    def replacer(m: re.Match) -> str:
        keyword  = m.group(1)   # 'from ' or 'import '
        quote    = m.group(2)   # ' or "
        spec     = m.group(3)   # the relative path
        # group 4 = closing quote (same as quote)

        # ── Special case: base puzzle index's sibling JSON imports ────────────
        # Old location: src/data/puzzles/index.ts  importing './foo.json'
        # New location: src/base/data/index.ts  (JSONs in ./puzzles/)
        # We detect this by checking if the spec is './something.json' and
        # the file is named 'index.ts' and lives (or will live) in base/data/.
        if (spec.startswith('./') and spec.endswith('.json')
                and file_path.name == 'index.ts'
                and 'base' in file_path.parts
                and 'data' in file_path.parts):
            # Rewrite './foo.json' → './puzzles/foo.json'
            new_spec = './puzzles/' + spec[2:]
            return f"{keyword}{quote}{new_spec}{quote}"

        # ── General case: resolve relative import ────────────────────────────
        resolved = (file_path.parent / spec).resolve()
        # Try exact match first, then without extension
        key = canonical_key(resolved) or canonical_key(resolved.with_suffix(''))
        if key and key in IMPORT_MAP:
            return f"{keyword}{quote}{IMPORT_MAP[key]}{quote}"

        return m.group(0)  # no change

    text = pat.sub(replacer, text)
    if text != original:
        file_path.write_text(text, encoding='utf-8')
        return True
    return False


# ── Step 1: git mv ────────────────────────────────────────────────────────────

def step_move_files() -> None:
    print('\n── Step 1: Moving files ──')

    # Move the puzzle JSON directory as a whole
    # src/data/puzzles/*.json → src/base/data/puzzles/*.json
    old_json_dir = SRC / 'data' / 'puzzles'
    new_json_dir = SRC / 'base' / 'data' / 'puzzles'
    new_json_dir.mkdir(parents=True, exist_ok=True)

    json_files = sorted(old_json_dir.glob('*.json'))
    print(f'  moving {len(json_files)} puzzle JSONs …')
    for jf in json_files:
        new_path = new_json_dir / jf.name
        run('git', 'mv', str(jf), str(new_path))

    # Move all explicitly listed files
    for old_rel, new_rel in MOVES:
        src_path = SRC / old_rel
        if not src_path.exists():
            print(f'  SKIP (not found): {old_rel}')
            continue
        git_mv(old_rel, new_rel)

    # Remove now-empty directories (git doesn't track them)
    for empty_dir in [
        SRC / 'data' / 'puzzles',
        SRC / 'data' / 'tutorials',
        SRC / 'data',
        SRC / 'logic',
        SRC / 'utils',
        SRC / 'services',
        SRC / 'contexts',
        SRC / 'components',
        SRC / 'pages',
        SRC / 'puzzles',
    ]:
        if empty_dir.exists() and not any(empty_dir.iterdir()):
            empty_dir.rmdir()
            print(f'  rmdir {empty_dir.relative_to(REPO)}')

    print('  done moving files.')


# ── Step 2: Update imports in TS/TSX files ────────────────────────────────────

def step_update_imports() -> None:
    print('\n── Step 2: Updating imports ──')
    changed = 0

    # Collect all TS/TSX files we might need to touch
    ts_files: list[Path] = []
    ts_files += sorted((SRC).rglob('*.ts'))
    ts_files += sorted((SRC).rglob('*.tsx'))
    ts_files += sorted((REPO / 'tests').rglob('*.ts'))
    ts_files += sorted((REPO / 'tests').rglob('*.tsx'))

    for f in ts_files:
        # Skip puzzle JSON files (they are .json, not .ts/.tsx — already excluded)
        # Skip the script itself
        if 'node_modules' in str(f):
            continue
        if update_imports_in_file(f):
            print(f'  updated {f.relative_to(REPO)}')
            changed += 1

    print(f'  {changed} file(s) updated.')


# ── Step 3: Update Python scripts ─────────────────────────────────────────────

def step_update_python_scripts() -> None:
    print('\n── Step 3: Updating Python scripts ──')

    # ── alchemydoku.py ────────────────────────────────────────────────────────
    alchemy_py = REPO / 'scripts' / 'alchemydoku.py'
    text = alchemy_py.read_text(encoding='utf-8')

    replacements = [
        # BASE_PUZZLE_DIR
        (
            'BASE_PUZZLE_DIR = Path(__file__).parent.parent / \'src\' / \'data\' / \'puzzles\'',
            'BASE_PUZZLE_DIR = Path(__file__).parent.parent / \'src\' / \'base\' / \'data\' / \'puzzles\'',
        ),
        # COLLECTIONS_JSON: moved up one level out of puzzles/
        (
            'COLLECTIONS_JSON = BASE_PUZZLE_DIR / \'collections.json\'',
            'COLLECTIONS_JSON = BASE_PUZZLE_DIR.parent / \'collections.json\'',
        ),
        # LEGACY_IDS_TS (in assign_uuids.py — handled separately below)
        # index_path inside _register_base_puzzle: index.ts is now one level up
        (
            "index_path = BASE_PUZZLE_DIR / 'index.ts'",
            "index_path = BASE_PUZZLE_DIR.parent / 'index.ts'",
        ),
        # pathlib.Path('src/data/puzzles') in docstrings/examples
        (
            "pathlib.Path('src/data/puzzles')",
            "pathlib.Path('src/base/data/puzzles')",
        ),
        # string literals in examples/docs
        (
            "'src/data/puzzles'",
            "'src/base/data/puzzles'",
        ),
        # 'src/data/puzzles/...' strings in comments
        (
            'src/data/puzzles/index.ts',
            'src/base/data/index.ts',
        ),
        (
            'src/data/puzzles/medium-pp-01.json',
            'src/base/data/puzzles/medium-pp-01.json',
        ),
    ]

    for old, new in replacements:
        if old in text:
            text = text.replace(old, new)
            print(f'  alchemydoku.py: replaced {repr(old[:60])} …')

    alchemy_py.write_text(text, encoding='utf-8')

    # ── assign_uuids.py ───────────────────────────────────────────────────────
    assign_py = REPO / 'scripts' / 'assign_uuids.py'
    if assign_py.exists():
        text = assign_py.read_text(encoding='utf-8')
        au_replacements = [
            (
                "BASE_PUZZLE_DIR = REPO_ROOT / \"src\" / \"data\" / \"puzzles\"",
                "BASE_PUZZLE_DIR = REPO_ROOT / \"src\" / \"base\" / \"data\" / \"puzzles\"",
            ),
            (
                "COLLECTIONS_JSON = BASE_PUZZLE_DIR / \"collections.json\"",
                "COLLECTIONS_JSON = BASE_PUZZLE_DIR.parent / \"collections.json\"",
            ),
            (
                "LEGACY_IDS_TS   = REPO_ROOT / \"src\" / \"utils\" / \"legacyPuzzleIds.ts\"",
                "LEGACY_IDS_TS   = REPO_ROOT / \"src\" / \"shared\" / \"utils\" / \"legacyPuzzleIds.ts\"",
            ),
        ]
        for old, new in au_replacements:
            if old in text:
                text = text.replace(old, new)
                print(f'  assign_uuids.py: replaced {repr(old[:60])} …')
        assign_py.write_text(text, encoding='utf-8')

    # ── check_puzzles.py ──────────────────────────────────────────────────────
    check_py = REPO / 'scripts' / 'check_puzzles.py'
    text = check_py.read_text(encoding='utf-8')
    cp_replacements = [
        (
            'BASE_DIR = ROOT / "src" / "data" / "puzzles"',
            'BASE_DIR = ROOT / "src" / "base" / "data" / "puzzles"',
        ),
        # collections.json is now one level up from puzzles/
        (
            'collections_json = BASE_DIR / "collections.json"',
            'collections_json = BASE_DIR.parent / "collections.json"',
        ),
        # docstring reference
        (
            'src/data/puzzles/easy-2000.json',
            'src/base/data/puzzles/easy-2000.json',
        ),
    ]
    for old, new in cp_replacements:
        if old in text:
            text = text.replace(old, new)
            print(f'  check_puzzles.py: replaced {repr(old[:60])} …')
    check_py.write_text(text, encoding='utf-8')

    print('  done updating Python scripts.')


# ── Step 4: Update tsconfig.json and vite.config.ts ──────────────────────────

def step_update_config() -> None:
    print('\n── Step 4: Updating config files ──')

    # tsconfig.json
    tsconfig = REPO / 'tsconfig.json'
    text = tsconfig.read_text(encoding='utf-8')
    old_paths = '"@/*": ["src/*"]'
    new_paths = (
        '"@/*": ["src/*"],\n'
        '      "@shared/*": ["src/shared/*"],\n'
        '      "@base/*": ["src/base/*"],\n'
        '      "@expanded/*": ["src/expanded/*"]'
    )
    if old_paths in text:
        text = text.replace(old_paths, new_paths)
        tsconfig.write_text(text, encoding='utf-8')
        print('  tsconfig.json: added @shared, @base, @expanded aliases')

    # vite.config.ts
    vite_config = REPO / 'vite.config.ts'
    text = vite_config.read_text(encoding='utf-8')
    old_alias = "alias: { '@': path.resolve(__dirname, './src') },"
    new_alias = (
        "alias: {\n"
        "      '@':        path.resolve(__dirname, './src'),\n"
        "      '@shared':  path.resolve(__dirname, './src/shared'),\n"
        "      '@base':    path.resolve(__dirname, './src/base'),\n"
        "      '@expanded': path.resolve(__dirname, './src/expanded'),\n"
        "    },"
    )
    if old_alias in text:
        text = text.replace(old_alias, new_alias)
        vite_config.write_text(text, encoding='utf-8')
        print('  vite.config.ts: added @shared, @base, @expanded aliases')

    print('  done updating configs.')


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    print(f'Phase 2 directory restructure in {REPO}')
    print('=' * 60)

    step_move_files()
    step_update_imports()
    step_update_python_scripts()
    step_update_config()

    print('\n' + '=' * 60)
    print('Phase 2 restructure complete.')
    print('\nNext steps:')
    print('  npx tsc --noEmit          # must be clean')
    print('  npm run test              # must pass')
    print('  python3 scripts/check_puzzles.py  # must pass')


if __name__ == '__main__':
    main()
