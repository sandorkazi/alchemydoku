/**
 * expanded/components/ExpandedIngredientGrid.tsx
 *
 * Ingredient grid for expanded mode. Extends the base grid with:
 *  - Solar/Lunar row border colouring (warm gold = Solar, cool blue = Lunar)
 *  - Per-column ☀️/🌙 deduction buttons below ingredient icons
 *  - Uses useExpandedSolver / useExpandedIngredient instead of base context
 *
 * The Cell component and marker logic are identical to the base grid.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { INGREDIENTS } from '../../data/ingredients';
import { ALCHEMICALS } from '../../data/alchemicals';
import { useExpandedSolver, useExpandedIngredient } from '../contexts/ExpandedSolverContext';
import type { GolemNotepad, GolemSlotMark } from '../contexts/ExpandedSolverContext';
import type { GolemTestClue } from '../types';
import type { Color, Size } from '../../types';
import { isSolar } from '../logic/solarLunar';
import { AlchemicalDisplay } from '../../components/AlchemicalDisplay';
import { AlchemicalImage, IngredientIcon, ElemImage } from '../../components/GameSprites';
import type { AlchemicalId, IngredientId, CellState } from '../../types';
import type { SolarLunarMark } from '../types';

// Fixed visual column order by display-ingredient ID (mushroom → fern → toad → bird claw → mandrake → scorpion → raven's feather → flower)
const BOARD_DISPLAY_ORDER: IngredientId[] = [3, 1, 7, 2, 4, 5, 6, 8];
const ALCH_IDS: AlchemicalId[] = [1, 2, 3, 4, 5, 6, 7, 8];

const TINT_COLORS = [
  '#6C4FA3', '#8DBF3F', '#6B5A3A', '#D4A437',
  '#3F6FB6', '#979c91', '#B23A2E', '#23293D',
];

export type GridTool = 'mark' | 'question' | 'text';
const TOOL_CURSOR: Record<GridTool, string> = { mark: 'crosshair', question: 'cell', text: 'text' };

function stroke(c: string) {
  return `-2px -2px 0 ${c}, 2px -2px 0 ${c}, -2px 2px 0 ${c}, 2px 2px 0 ${c},`
       + ` 0 -2px 0 ${c}, 0 2px 0 ${c}, -2px 0 0 ${c}, 2px 0 0 ${c}`;
}
const MARKER: Record<CellState, { glyph: string; textShadow: string }> = {
  unknown:    { glyph: '',  textShadow: '' },
  possible:   { glyph: '?', textShadow: stroke('#6366f1') },
  eliminated: { glyph: '✗', textShadow: stroke('#ef4444') },
  confirmed:  { glyph: '✔', textShadow: stroke('#22c55e') },
};

// ─── Solar/Lunar row styling ──────────────────────────────────────────────────

function rowBorderStyle(alchId: AlchemicalId): string {
  return isSolar(alchId)
    ? 'border-l-2 border-l-orange-400'  // Solar: orange
    : 'border-l-2 border-l-gray-300';   // Lunar: light grey
}

// ─── Cell (pure — no context dependency) ─────────────────────────────────────

function Cell({
  cellState, alchId, tintColor, noteText,
  activeTool, isEditing,
  onMouseDown, ariaLabel, isSolarRow,
}: {
  cellState: CellState; alchId: AlchemicalId; tintColor: string; noteText: string;
  activeTool: GridTool; isEditing: boolean;
  onMouseDown: (e: React.MouseEvent) => void; ariaLabel?: string; isSolarRow: boolean;
}) {
  const { glyph, textShadow } = MARKER[cellState];
  return (
    <button
      onMouseDown={onMouseDown}
      onClick={e => e.preventDefault()}
      className={`relative w-12 h-12 rounded flex items-center justify-center border transition-all
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
        ${isEditing ? 'border-indigo-400 ring-2 ring-indigo-300' : 'border-gray-200 hover:border-gray-400'}
        ${isSolarRow ? 'bg-orange-50/40' : 'bg-gray-50/60'}
      `}
      aria-label={ariaLabel ?? cellState}
      title={ariaLabel ?? cellState}
    >
      <span className="absolute inset-0 rounded pointer-events-none"
        style={{ backgroundColor: tintColor, opacity: 0.28 }} />
      <span className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ opacity: 0.45 }}>
        <AlchemicalImage id={alchId} width={44} />
      </span>
      {glyph && !noteText && (
        <span className="relative z-10 text-xl font-black leading-none select-none"
          style={{ color: 'white', textShadow }}>{glyph}</span>
      )}
      {noteText && (
        <span className="relative z-10 text-[13px] font-bold leading-none select-none text-gray-800"
          style={{ textShadow: stroke('white') }}>{noteText}</span>
      )}
    </button>
  );
}

// ─── Cell text editor (pure) ──────────────────────────────────────────────────

function CellTextEditor({ value, onChange, onDone }: {
  value: string; onChange: (v: string) => void; onDone: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  return (
    <input ref={ref} type="text" maxLength={4}
      value={value}
      onChange={e => onChange(e.target.value.toUpperCase())}
      onBlur={onDone}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') onDone(); }}
      className="absolute inset-0 z-20 w-full h-full text-center text-[13px] font-bold bg-white/90
                 border-2 border-indigo-400 rounded outline-none"
    />
  );
}

// ─── Solar/Lunar column button ────────────────────────────────────────────────

function SolarLunarButtons({ slotId, mark, onToggle }: {
  slotId: number;
  mark: SolarLunarMark;
  onToggle: (slot: number, next: SolarLunarMark) => void;
}) {
  const nextMark = (current: SolarLunarMark, pressed: 'solar' | 'lunar'): SolarLunarMark =>
    current === pressed ? null : pressed;

  return (
    <div className="flex flex-col gap-0.5 items-center mt-0.5">
      {/* Solar button */}
      <button
        title="Mark as Solar (☀️)"
        aria-pressed={mark === 'solar'}
        onClick={() => onToggle(slotId, nextMark(mark, 'solar'))}
        className={`w-8 h-4 rounded text-[9px] font-bold flex items-center justify-center
          border transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-400
          ${mark === 'solar'
            ? 'bg-orange-500 border-orange-600 text-white'
            : 'bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100'
          }`}
      >☀️</button>
      {/* Lunar button */}
      <button
        title="Mark as Lunar (🌙)"
        aria-pressed={mark === 'lunar'}
        onClick={() => onToggle(slotId, nextMark(mark, 'lunar'))}
        className={`w-8 h-4 rounded text-[9px] font-bold flex items-center justify-center
          border transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-400
          ${mark === 'lunar'
            ? 'bg-gray-400 border-gray-500 text-white'
            : 'bg-gray-100 border-gray-300 text-gray-500 hover:bg-gray-200'
          }`}
      >🌙</button>
    </div>
  );
}

// ─── Auto-deduction confirm modal ─────────────────────────────────────────────

function AutoDeduceModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4 animate-fadein">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4">
        <h3 className="font-bold text-gray-900">Enable Auto-deduction?</h3>
        <p className="text-sm text-gray-600">
          Auto-deduction will automatically mark cells as eliminated or confirmed based on the remaining worlds.
          This may reveal information you haven't deduced yourself.
        </p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">Cancel</button>
          <button onClick={onConfirm}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">Enable</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main grid ────────────────────────────────────────────────────────────────

export function ExpandedIngredientGrid({ onRandomize, activeTool, setActiveTool }: {
  onRandomize?: () => void;
  activeTool: GridTool;
  setActiveTool: (t: GridTool) => void;
}) {
  const { state, dispatch } = useExpandedSolver();
  const { gridState, notes, autoDeduction, solarLunarMarks } = state;
  const getIngredient = useExpandedIngredient();

  const [editingCell, setEditingCell] = useState<{ ing: IngredientId; alch: AlchemicalId } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const gridRef = useRef<HTMLDivElement>(null);

  // Keyboard: Space cycles tool
  useEffect(() => {
    const TOOLS: GridTool[] = ['mark', 'question', 'text'];
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' && !editingCell) {
        e.preventDefault();
        setActiveTool(t => TOOLS[(TOOLS.indexOf(t) + 1) % TOOLS.length]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editingCell]);

  const noteKey = (ing: number, alch: number) => `${ing}-${alch}`;

  const setNote = useCallback((key: string, value: string) => {
    dispatch({ type: 'SET_NOTE', key, value });
  }, [dispatch]);

  const resolveEffectiveTool = (e: React.MouseEvent): GridTool => {
    if (e.shiftKey) return 'mark';
    if (e.ctrlKey || e.metaKey) return 'question';
    return activeTool;
  };

  // Columns fixed by display-ingredient ID. Build inverse: displayId → slotId.
  const { displayMap } = state;
  const displayToSlot: Record<number, IngredientId> = {};
  for (let slot = 1; slot <= 8; slot++) {
    const dispId = displayMap[slot] ?? slot;
    displayToSlot[dispId] = slot as IngredientId;
  }

  const colData = BOARD_DISPLAY_ORDER
    .map((displayId, i) => ({
      slotId:    displayToSlot[displayId] as IngredientId,
      tint:      TINT_COLORS[i],
      displayId,
    }))
    .filter(x => x.slotId != null);

  const handleCellMouseDown = useCallback((
    e: React.MouseEvent, slotId: IngredientId, alchId: AlchemicalId,
  ) => {
    e.preventDefault();
    const tool = resolveEffectiveTool(e);
    if (tool === 'text') { setEditingCell({ ing: slotId, alch: alchId }); return; }
    if (tool === 'mark') dispatch({ type: 'TOGGLE_CELL', ingredient: slotId, alchemical: alchId });
    else if (tool === 'question') {
      const cur = gridState[slotId]?.[alchId] ?? 'unknown';
      const next: CellState = cur === 'possible' ? 'unknown' : 'possible';
      dispatch({ type: 'SET_CELL', ingredient: slotId, alchemical: alchId, state: next });
    }
  }, [activeTool, gridState, dispatch]);

  const handleSolarLunarToggle = useCallback((slot: number, mark: SolarLunarMark) => {
    dispatch({ type: 'SET_SOLAR_LUNAR_MARK', slot, mark });
  }, [dispatch]);

  const TOOL_DEFS: { id: GridTool; label: string; title: string }[] = [
    { id: 'mark',     label: '✗✔',  title: 'Mark tool [Space] — cycle ✗ / ✔' },
    { id: 'question', label: '?',    title: '? tool — toggle possible mark' },
    { id: 'text',     label: 'abc',  title: 'Text tool — type up to 4 chars per cell' },
  ];

  return (
    <>
      {showConfirm && (
        <AutoDeduceModal
          onConfirm={() => { setShowConfirm(false); dispatch({ type: 'TOGGLE_AUTO_DEDUCTION' }); }}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-end gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Tool selector */}
            <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden">
              {TOOL_DEFS.map(({ id, label, title }) => (
                <button key={id} title={title} aria-pressed={activeTool === id}
                  onClick={() => { setActiveTool(id); setEditingCell(null); }}
                  className={`px-2.5 py-1 text-xs font-bold transition-colors focus-visible:outline-none
                    focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400
                    ${activeTool === id ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}
                    ${id === 'mark' ? '' : 'border-l border-gray-200'}`}
                >{label}</button>
              ))}
            </div>
            <button onClick={() => { dispatch({ type: 'CLEAR_GRID' }); setEditingCell(null); }}
              className="text-xs text-gray-400 hover:text-red-500 border border-gray-200
                         hover:border-red-300 rounded-lg px-2.5 py-1 transition-colors">✕ Clear</button>
            {onRandomize && (
              <button onClick={onRandomize}
                className="text-xs text-gray-400 hover:text-indigo-600 border border-gray-200
                           hover:border-indigo-300 rounded-lg px-2.5 py-1 transition-colors">🔀</button>
            )}
            <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
              <span className={autoDeduction ? 'text-indigo-600 font-semibold' : 'text-gray-500'}>Auto</span>
              <button role="switch" aria-checked={autoDeduction}
                onClick={() => { if (!autoDeduction) setShowConfirm(true); else dispatch({ type: 'TOGGLE_AUTO_DEDUCTION' }); }}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
                  ${autoDeduction ? 'bg-indigo-600' : 'bg-gray-200'}`}>
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow
                  transition-transform ${autoDeduction ? 'translate-x-4' : 'translate-x-1'}`} />
              </button>
            </label>
          </div>
        </div>

        {/* Solar/Lunar legend */}
        <div className="flex items-center gap-3 text-[10px] text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-200 border border-amber-300 inline-block" />Solar row</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-100 border border-blue-300 inline-block" />Lunar row</span>
        </div>

        <div ref={gridRef} className="overflow-x-auto -mx-1 px-1 pb-1 flex justify-center relative"
          style={{ cursor: TOOL_CURSOR[activeTool] }}>

          {/* Active tool badge */}
          <div aria-live="polite" aria-atomic="true"
            className={`absolute top-0 right-1 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full
              text-[10px] font-bold select-none pointer-events-none transition-all
              ${activeTool === 'mark'     ? 'bg-gray-800/70 text-white' : ''}
              ${activeTool === 'question' ? 'bg-indigo-600/80 text-white' : ''}
              ${activeTool === 'text'     ? 'bg-amber-500/80 text-white' : ''}`}>
            {activeTool === 'mark'     && <><span>✗✔</span><span>mark</span></>}
            {activeTool === 'question' && <><span>?</span><span>question</span></>}
            {activeTool === 'text'     && <><span>abc</span><span>text</span></>}
            <kbd className="ml-0.5 opacity-60 font-mono text-[9px] border border-current/40 rounded px-0.5">Space</kbd>
          </div>

          <table className="border-collapse text-xs">
            <thead>
              <tr>
                <th className="pr-2" />
                {colData.map(({ slotId, tint, displayId }) => {
                  const { index } = getIngredient(slotId);
                  const name = INGREDIENTS[displayId as 1]?.name ?? '';
                  const mark = solarLunarMarks[slotId] ?? null;
                  return (
                    <th key={slotId} className="px-0.5 pb-0.5 text-center align-bottom">
                      <div className="mx-auto mb-0.5 rounded-full h-1" style={{ backgroundColor: tint, width: 20 }} />
                      <span title={name} aria-label={name}>
                        <IngredientIcon index={index} width={36} />
                      </span>
                      {/* Solar/Lunar column buttons */}
                      <SolarLunarButtons
                        slotId={slotId}
                        mark={mark}
                        onToggle={handleSolarLunarToggle}
                      />
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {ALCH_IDS.map(alchId => {
                const solar = isSolar(alchId);
                return (
                  <tr key={alchId} className={`border-t border-gray-100 ${rowBorderStyle(alchId)}`}>
                    <td className="pr-1 py-0 align-middle">
                      <div className="flex items-center justify-end">
                        <AlchemicalDisplay id={alchId} elemWidth={48} />
                      </div>
                    </td>
                    {colData.map(({ slotId, tint }) => {
                      const key = noteKey(slotId, alchId);
                      const isEditing = editingCell?.ing === slotId && editingCell?.alch === alchId;
                      return (
                        <td key={slotId} className="px-0.5 py-0 text-center align-middle">
                          <div className="relative">
                            <Cell
                              cellState={gridState[slotId]?.[alchId] ?? 'unknown'}
                              alchId={alchId}
                              tintColor={tint}
                              noteText={notes[key] ?? ''}
                              activeTool={activeTool}
                              isEditing={isEditing}
                              isSolarRow={solar}
                              onMouseDown={e => handleCellMouseDown(e, slotId, alchId)}
                              ariaLabel={`${INGREDIENTS[getIngredient(slotId).displayId as 1]?.name ?? slotId} / ${ALCHEMICALS[alchId].code} (${solar ? 'Solar' : 'Lunar'}): ${gridState[slotId]?.[alchId] ?? 'unknown'}`}
                            />
                            {isEditing && (
                              <CellTextEditor
                                value={notes[key] ?? ''}
                                onChange={v => setNote(key, v)}
                                onDone={() => setEditingCell(null)}
                              />
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-[10px] text-gray-400">
          {activeTool === 'mark' && <>Tap to cycle: <span className="font-mono">· unknown</span>{' → '}<span className="font-mono font-bold text-red-500">✗ eliminated</span>{' → '}<span className="font-mono font-bold text-green-600">✔ confirmed</span><span className="ml-2 opacity-60">· Space to switch tool</span></>}
          {activeTool === 'question' && <>Tap to toggle <span className="font-mono font-bold text-indigo-500">? possible</span> on/off<span className="ml-2 opacity-60">· Space to switch tool</span></>}
          {activeTool === 'text' && <>Tap any cell to type a note (max 4 chars)<span className="ml-2 opacity-60">· Space to switch tool</span></>}
        </p>
      </div>
    </>
  );
}

// ─── Golem Panel ─────────────────────────────────────────────────────────────

// Alchemical property columns for the bottom grid
const ALCH_COLS: { color: Color; size: Size }[] = [
  { color: 'B', size: 'L' }, { color: 'B', size: 'S' },
  { color: 'G', size: 'L' }, { color: 'G', size: 'S' },
  { color: 'R', size: 'L' }, { color: 'R', size: 'S' },
];

const GOLEM_EARS_IMG  = '/alchemydoku/images/golem_ears.png';
const GOLEM_CHEST_IMG = '/alchemydoku/images/golem_chest.png';

function cycleSlotMark(m: GolemSlotMark): GolemSlotMark {
  if (m === null)      return 'reacts';
  if (m === 'reacts')  return 'no-react';
  return null;
}

function ReactionCell({
  mark, isClue, onClick,
}: { mark: GolemSlotMark; isClue?: boolean; onClick?: () => void }) {
  const base = 'w-12 h-9 flex items-center justify-center border rounded text-sm font-bold transition-all select-none';
  if (isClue && mark === 'reacts')
    return <div className={`${base} bg-green-200 border-green-400 text-green-700 cursor-default`}>✓</div>;
  if (isClue && mark === 'no-react')
    return <div className={`${base} bg-red-100 border-red-300 text-red-500 cursor-default`}>✗</div>;
  if (mark === 'reacts')
    return <button className={`${base} bg-green-100 border-green-400 text-green-700 hover:bg-green-200`} onClick={onClick}>✓</button>;
  if (mark === 'no-react')
    return <button className={`${base} bg-red-50 border-red-300 text-red-500 hover:bg-red-100`} onClick={onClick}>✗</button>;
  return <button className={`${base} bg-white border-gray-200 text-gray-200 hover:border-gray-400`} onClick={onClick}>·</button>;
}

function AlchPropertyCell({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-10 h-9 flex items-center justify-center border rounded transition-all
        ${active
          ? 'bg-indigo-100 border-indigo-500 shadow-sm scale-105'
          : 'bg-white border-gray-200 hover:border-gray-400'}`}
    >
      {active && <span className="text-indigo-600 font-bold text-sm">✓</span>}
    </button>
  );
}

export function GolemPanel({ activeTool }: { activeTool: GridTool }) {
  const { state, dispatch } = useExpandedSolver();
  const { puzzle, golemNotepad } = state;
  const getIngredient = useExpandedIngredient();

  if (!puzzle.golem) return null;

  // Ingredient columns in same display order as main grid (with same tints)
  const displayToSlot: Record<number, IngredientId> = {};
  for (let slot = 1; slot <= 8; slot++) {
    const dispId = (state.displayMap[slot] ?? slot) as number;
    displayToSlot[dispId] = slot as IngredientId;
  }
  const ingColumns = BOARD_DISPLAY_ORDER.map((displayId, i) => ({
    slotId: displayToSlot[displayId] as IngredientId,
    index:  getIngredient(displayToSlot[displayId] as IngredientId).index,
    tint:   TINT_COLORS[i],
  }));

  // Pre-fill clue reactions per slot
  const clueMap: Record<number, { chest: GolemSlotMark; ears: GolemSlotMark }> = {};
  (puzzle.clues.filter(c => c.kind === 'golem_test') as import('../types').GolemTestClue[]).forEach(c => {
    clueMap[c.ingredient] = {
      chest: c.chest_reacted ? 'reacts' : 'no-react',
      ears:  c.ears_reacted  ? 'reacts' : 'no-react',
    };
  });

  // Image is 760×400 → AR = 400/760 ≈ 0.526. Explicit height avoids any distortion.
  const CELL_W = 48;
  const ROW_H  = Math.round(CELL_W * 400 / 760); // ≈ 25 px
  const HDR_W  = CELL_W;

  const rows = [
    { part: 'ears'  as const, img: GOLEM_EARS_IMG,  label: 'Ears'  },
    { part: 'chest' as const, img: GOLEM_CHEST_IMG, label: 'Chest' },
  ];

  const { notes } = state;

  function GolemRowHeader({ img, label }: { img: string; label: string }) {
    return (
      <img src={img} alt={label} title={label} style={{
        width: HDR_W, height: 'auto', display: 'block',
        borderRadius: 6, flexShrink: 0, border: '1px solid #e5e7eb',
      }} />
    );
  }

  function GolemCell({ mark, isClue, img, noteKey, orbColor, orbSize, tint, onMark }: {
    mark: GolemSlotMark; isClue?: boolean; img: string; noteKey: string;
    orbColor?: Color; orbSize?: number; tint?: string; onMark: () => void;
  }) {
    const [editing, setEditing] = useState(false);
    const note = notes[noteKey] ?? '';
    const bgColor =
      mark === 'reacts'   ? '#dcfce7' :
      mark === 'no-react' ? '#fef2f2' :
      mark === 'possible' ? '#fef9c3' : 'white';
    const borderColor =
      isClue && mark === 'reacts'   ? '#4ade80' :
      isClue && mark === 'no-react' ? '#fca5a5' :
      mark === 'reacts'   ? '#4ade80' :
      mark === 'no-react' ? '#fca5a5' :
      mark === 'possible' ? '#fde047' : '#e5e7eb';
    const symbol =
      mark === 'reacts'   ? '✓' :
      mark === 'no-react' ? '✗' :
      mark === 'possible' ? '?' : '';
    const symColor =
      mark === 'reacts'   ? '#16a34a' :
      mark === 'no-react' ? '#dc2626' :
      mark === 'possible' ? '#ca8a04' : '#d1d5db';
    return (
      <button
        onClick={() => { if (activeTool === 'text') { setEditing(true); return; } onMark(); }}
        style={{
          position: 'relative', width: CELL_W, height: ROW_H, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 4, overflow: 'hidden',
          border: `1px solid ${borderColor}`, background: bgColor,
          cursor: 'pointer', transition: 'all 0.12s', fontWeight: 700, fontSize: 14,
        }}
      >
        <img src={img} alt="" style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', opacity: 0.10, pointerEvents: 'none',
        }} />
        {tint && <span style={{ position: 'absolute', inset: 0, borderRadius: 4, backgroundColor: tint, opacity: 0.28, pointerEvents: 'none' }} />}
        {orbColor != null && orbSize != null && (
          <span style={{ position: 'absolute', opacity: 0.20, pointerEvents: 'none' }}>
            <ElemImage color={orbColor} size="L" width={orbSize} />
          </span>
        )}
        {editing ? (
          <input
            autoFocus
            defaultValue={note}
            maxLength={4}
            onBlur={e => { dispatch({ type: 'SET_NOTE', key: noteKey, value: e.target.value }); setEditing(false); }}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') (e.target as HTMLInputElement).blur(); }}
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              background: 'rgba(255,255,240,0.95)', border: 'none', outline: 'none',
              textAlign: 'center', fontSize: 10, fontWeight: 600, zIndex: 10,
            }}
          />
        ) : note ? (
          <span style={{ position: 'absolute', bottom: 1, right: 2, fontSize: 8, color: '#6366f1', fontWeight: 700, lineHeight: 1, pointerEvents: 'none' }}>{note}</span>
        ) : null}
        {!editing && <span style={{ color: symColor, position: 'relative' }}>{symbol}</span>}
      </button>
    );
  }

  function cycleIngMark(cur: GolemSlotMark): GolemSlotMark {
    if (activeTool === 'mark')     return cur === null ? 'reacts' : cur === 'reacts' ? 'no-react' : null;
    if (activeTool === 'question') return cur === 'possible' ? null : 'possible';
    return cur;
  }

  return (
    <div className="px-1 pt-1 space-y-4 flex flex-col items-center">

      {/* ── Top grid: per-ingredient reactions ─────────────────────────────── */}
      <div>
        <div className="flex gap-1 mt-1" style={{ paddingLeft: HDR_W + 4 }}>
          {ingColumns.map(({ slotId, index, tint }) => (
            <div key={slotId} style={{ width: CELL_W, flexShrink: 0 }}
              className="flex flex-col items-center pb-1 gap-0.5">
              <div className="rounded-full h-1" style={{ width: 20, backgroundColor: tint }} />
              <IngredientIcon index={index} width={36} />
            </div>
          ))}
        </div>
        {rows.map(({ part, img, label }) => (
          <div key={part} className="flex gap-1 mt-1">
            <GolemRowHeader img={img} label={label} />
            {ingColumns.map(({ slotId, tint }) => {
              const isClue = clueMap[slotId]?.[part] !== undefined;
              const mark = golemNotepad.ingredientMarks?.[slotId]?.[part] ?? null;
              return (
                <div key={slotId}>
                  <GolemCell
                    mark={mark}
                    isClue={isClue && mark !== null}
                    img={img}
                    noteKey={`g1-${slotId}-${part}`}
                    tint={tint}
                    onMark={() => dispatch({
                      type: 'SET_GOLEM_INGREDIENT_MARK',
                      slot: slotId, part,
                      mark: cycleIngMark(mark),
                    })}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* ── Bottom grid: alch property deduction ───────────────────────────── */}
      <div>
        {rows.map(({ part, img, label }) => (
          <div key={part} className="flex gap-1 mt-1">
            <GolemRowHeader img={img} label={label} />
            {ALCH_COLS.map(col => {
              const current = golemNotepad[part] ?? null;
              const active = current?.color === col.color && current?.size === col.size;
              const orbSize = col.size === 'L' ? Math.round(CELL_W * 0.70) : Math.round(CELL_W * 0.25);
              const colKey = `${col.color}${col.size}`;
              const qMark = notes[`g2-${part}-${colKey}`] === '?' ? 'possible' as const : null;
              return (
                <GolemCell
                  key={colKey}
                  mark={active ? 'reacts' : qMark}
                  img={img}
                  noteKey={`g2-${part}-${colKey}`}
                  orbColor={col.color}
                  orbSize={orbSize}
                  onMark={() => {
                    if (activeTool === 'question') {
                      dispatch({ type: 'SET_NOTE', key: `g2-${part}-${colKey}`, value: qMark ? '' : '?' });
                    } else {
                      dispatch({ type: 'SET_GOLEM_NOTEPAD', part, value: active ? null : col });
                    }
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>

    </div>
  );
}


