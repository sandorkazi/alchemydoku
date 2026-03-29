/**
 * expanded/components/ExpandedIngredientGrid.tsx
 *
 * Ingredient grid for expanded mode. Extends the base grid with:
 *  - Solar/Lunar row border colouring (warm gold = Solar, cool blue = Lunar)
 *  - Per-column ☀/🌙 deduction buttons (single row, tool-aware mark cycling)
 *  - Corner indicators on cells showing the column's solar/lunar button state
 *  - Golem panel with unified marker styling
 *
 * The Cell component and marker logic are identical to the base grid.
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { INGREDIENTS } from '../../data/ingredients';
import { ALCHEMICALS } from '../../data/alchemicals';
import { useExpandedSolver, useExpandedIngredient, computeSolarLunarAutoMarks } from '../contexts/ExpandedSolverContext';
import type { GolemSlotMark } from '../contexts/ExpandedSolverContext';
import type { Color, Size } from '../../types';
import { isSolar } from '../logic/solarLunar';
import { getEliminatedCells } from '../../logic/deducer';
import { AlchemicalDisplay } from '../../components/AlchemicalDisplay';
import { AlchemicalImage, IngredientIcon, ElemImage, PotionImage, SignedElemImage } from '../../components/GameSprites';
import type { AlchemicalId, IngredientId, CellState, Sign } from '../../types';
import type { SolarLunarMark } from '../types';

// Fixed visual column order by display-ingredient ID
const BOARD_DISPLAY_ORDER: IngredientId[] = [3, 1, 7, 2, 4, 5, 6, 8];
const ALCH_IDS: AlchemicalId[] = [1, 2, 3, 4, 5, 6, 8, 7]; // swap 7/8 so Solar(PPP) precedes Lunar(NNN)

const TINT_COLORS = [
  '#6C4FA3', '#8DBF3F', '#6B5A3A', '#D4A437',
  '#3F6FB6', '#979c91', '#B23A2E', '#23293D',
];

export type GridTool = 'mark' | 'text' | 'draw';
const TOOL_CURSOR: Record<GridTool, string> = { mark: 'crosshair', text: 'text', draw: 'crosshair' };

// ─── Shared marker style system ───────────────────────────────────────────────
// Used by Cell, GolemCell, and SolarLunarButtons corner indicators

function stroke(c: string) {
  return `-2px -2px 0 ${c}, 2px -2px 0 ${c}, -2px 2px 0 ${c}, 2px 2px 0 ${c},`
       + ` 0 -2px 0 ${c}, 0 2px 0 ${c}, -2px 0 0 ${c}, 2px 0 0 ${c}`;
}

/** Glyph + textShadow for all mark states — identical across every grid. */
const MARKER: Record<CellState, { glyph: string; textShadow: string }> = {
  unknown:    { glyph: '',  textShadow: '' },
  possible:   { glyph: '?', textShadow: stroke('#6366f1') },
  eliminated: { glyph: '✗', textShadow: stroke('#ef4444') },
  confirmed:  { glyph: '✔', textShadow: stroke('#22c55e') },
};

/** Background + border colours for marked states in golem cells. */
const GOLEM_CELL_STATE: Record<CellState, { bg: string; border: string }> = {
  unknown:    { bg: 'white',   border: '#e5e7eb' },
  possible:   { bg: '#eef2ff', border: '#a5b4fc' },
  eliminated: { bg: '#fef2f2', border: '#fca5a5' },
  confirmed:  { bg: '#f0fdf4', border: '#4ade80' },
};

// ─── Solar/Lunar row styling ──────────────────────────────────────────────────

// border-l doubled in thickness compared to previous version
function rowBorderStyle(alchId: AlchemicalId): string {
  return isSolar(alchId)
    ? 'border-l-4 border-l-amber-400'
    : 'border-l-4 border-l-blue-400';
}

// ─── Cell (pure — no context dependency) ─────────────────────────────────────

function Cell({
  cellState, alchId, tintColor, tintOpacity, noteText,
  isEditing,
  onMouseDown, ariaLabel, isSolarRow,
  slotSolarMark, slotLunarMark, hint, cornerHint,
}: {
  cellState: CellState; alchId: AlchemicalId; tintColor: string; tintOpacity: number; noteText: string;
  isEditing: boolean;
  onMouseDown: (e: React.MouseEvent) => void; ariaLabel?: string; isSolarRow: boolean;
  slotSolarMark: CellState; slotLunarMark: CellState;
  hint?: 'eliminated' | 'confirmed';
  cornerHint?: 'eliminated' | 'confirmed';
}) {
  const { glyph, textShadow } = MARKER[cellState];
  // Corner indicator: top-left for solar rows, top-right for lunar rows
  const cornerMark = isSolarRow ? slotSolarMark : slotLunarMark;
  const { glyph: cornerGlyph, textShadow: cornerShadow } = MARKER[cornerMark];

  return (
    <button
      onMouseDown={onMouseDown}
      onClick={e => e.preventDefault()}
      className={`relative w-12 h-12 rounded flex items-center justify-center border transition-all
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
        ${isEditing ? 'border-indigo-400 ring-2 ring-indigo-300' : 'border-gray-200 hover:border-gray-400'}
        ${isSolarRow ? 'bg-amber-50/50' : 'bg-blue-50/40'}
      `}
      aria-label={ariaLabel ?? cellState}
      title={ariaLabel ?? cellState}
    >
      <span className="absolute inset-0 rounded pointer-events-none"
        style={{ backgroundColor: tintColor, opacity: tintOpacity }} />
      <span className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ opacity: 0.22 }}>
        <AlchemicalImage id={alchId} width={44} />
      </span>
      {/* Visual hint circle — shown when Hints mode is on and cell is unknown */}
      {hint && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
          {hint === 'confirmed' && (
            <circle cx="24" cy="24" r="17" fill="none" stroke="rgba(34,197,94,0.75)" strokeWidth="2.5" />
          )}
          {hint === 'eliminated' && (
            <>
              <path d="M 24,7 C 34,4 43,14 42,24 C 41,34 33,43 23,42 C 13,42 4,33 5,23 C 6,13 14,6 24,7"
                fill="none" stroke="rgba(239,68,68,0.7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M 26,9 C 35,7 42,17 41,26 C 40,35 32,43 22,43 C 14,43 6,35 7,25 C 8,16 16,9 26,9"
                fill="none" stroke="rgba(239,68,68,0.45)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </>
          )}
        </svg>
      )}
      {/* Corner solar/lunar indicator */}
      {cornerGlyph && (
        <span
          className={`absolute z-20 text-[9px] font-black leading-none select-none pointer-events-none
            ${isSolarRow ? 'top-0.5 left-0.5' : 'top-0.5 right-0.5'}`}
          style={{ color: 'white', textShadow: cornerShadow }}
        >{cornerGlyph}</span>
      )}
      {/* Corner visual hint (only when user hasn't set a mark) */}
      {cornerHint && !cornerGlyph && (
        <svg width="8" height="8"
          className={`absolute z-20 pointer-events-none
            ${isSolarRow ? 'top-0.5 left-0.5' : 'top-0.5 right-0.5'}`}
          aria-hidden="true">
          {cornerHint === 'confirmed' && (
            <circle cx="4" cy="4" r="2.5" fill="none" stroke="rgba(34,197,94,0.9)" strokeWidth="1.5" />
          )}
          {cornerHint === 'eliminated' && (
            <path d="M4,1 C6.5,0.5 7.5,2 7,4 C6.5,6 5,7 3,6.5 C1.5,6 0.5,4.5 1,3 C1.5,1.5 3,1 4,1"
              fill="none" stroke="rgba(239,68,68,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>
      )}
      {/* Main cell glyph */}
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

// ─── Solar/Lunar column buttons ───────────────────────────────────────────────
//
// Layout: single row, ☀ left / 🌙 right, each ~22 px wide.
// Tool behaviour:
//   mark tool    → cycles unknown → confirmed → eliminated → unknown
//   question tool → toggles unknown ↔ possible
//   text tool    → treated as mark tool (no text editing on these buttons)
//
// Icon colours: ☀ always orange-400, 🌙 always gray-300

function nextSlMark(cur: CellState): CellState {
  if (cur === 'unknown')   return 'confirmed';
  if (cur === 'confirmed') return 'eliminated';
  if (cur === 'eliminated') return 'possible';
  return 'unknown';
}

function slBtnClass(state: CellState, polarity: 'solar' | 'lunar'): string {
  if (state === 'confirmed')
    return polarity === 'solar'
      ? 'bg-amber-400 border-amber-500'
      : 'bg-blue-400  border-blue-500';
  if (state === 'eliminated') return 'bg-red-200   border-red-400';
  if (state === 'possible')   return 'bg-indigo-100 border-indigo-300';
  // unknown
  return polarity === 'solar'
    ? 'bg-amber-50  border-amber-200 hover:bg-amber-100'
    : 'bg-gray-50   border-gray-200  hover:bg-gray-100';
}

function SolarLunarButtons({ slotId, mark, onToggle }: {
  slotId: number;
  mark: SolarLunarMark | null;
  onToggle: (slot: number, next: SolarLunarMark) => void;
}) {
  const solar: CellState = mark?.solar ?? 'unknown';
  const lunar: CellState = mark?.lunar ?? 'unknown';

  return (
    <div className="flex gap-0.5 justify-center mt-0.5 w-full">
      {/* Solar — left, orange icon */}
      <button
        title={`Solar: ${solar} (click to cycle)`}
        aria-pressed={solar !== 'unknown'}
        onClick={() => onToggle(slotId, { solar: nextSlMark(solar), lunar })}
        className={`w-[22px] h-[15px] rounded text-[10px] flex items-center justify-center
          border transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400
          ${slBtnClass(solar, 'solar')}`}
      >
        <span className="text-orange-400 leading-none" style={solar !== 'unknown' ? {filter:'brightness(10)'} : {}}>☀</span>
      </button>
      {/* Lunar — right, gray icon */}
      <button
        title={`Lunar: ${lunar} (click to cycle)`}
        aria-pressed={lunar !== 'unknown'}
        onClick={() => onToggle(slotId, { solar, lunar: nextSlMark(lunar) })}
        className={`w-[22px] h-[15px] rounded text-[10px] flex items-center justify-center
          border transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-300
          ${slBtnClass(lunar, 'lunar')}`}
      >
        <span className="text-slate-400 leading-none" style={lunar !== 'unknown' ? {filter:'brightness(10)'} : {}}>☽</span>
      </button>
    </div>
  );
}

// ─── Visual Hints confirm modal ───────────────────────────────────────────────

function AutoDeduceModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4 animate-fadein">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4">
        <h3 className="font-bold text-gray-900">Enable Visual Hints?</h3>
        <p className="text-sm text-gray-600">
          Visual Hints will show faint circles on cells the clues logically eliminate (red squiggly) or confirm (green circle). Your own grid marks are untouched.
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

export function ExpandedIngredientGrid({ onRandomize, activeTool, setActiveTool, scrollContainerRef, onScrollSync }: {
  onRandomize?: () => void;
  activeTool: GridTool;
  setActiveTool: (t: GridTool) => void;
  scrollContainerRef?: React.MutableRefObject<HTMLDivElement | null>;
  onScrollSync?: (scrollLeft: number) => void;
}) {
  const { state, dispatch } = useExpandedSolver();
  const { gridState, notes, autoDeduction, solarLunarMarks } = state;
  const getIngredient = useExpandedIngredient();

  const [editingCell, setEditingCell] = useState<{ ing: IngredientId; alch: AlchemicalId } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const gridRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const livePathRef = useRef<SVGPathElement>(null);
  const isDrawingRef = useRef(false);
  const drawPointsRef = useRef<{x: number; y: number}[]>([]);

  // ── Visual hint circles (worlds-derived, never touch gridState) ───────────
  const hintCells = useMemo(() => {
    if (!state.autoDeduction) return new Map<string, 'eliminated' | 'confirmed'>();
    const result = new Map<string, 'eliminated' | 'confirmed'>();
    const eliminated = getEliminatedCells(state.worlds);
    for (let i = 1; i <= 8; i++) {
      let soleAlch: number | null = null;
      let soleCount = 0;
      for (let a = 1; a <= 8; a++) {
        if (!eliminated.has(`${i}-${a}`)) { soleAlch = a; soleCount++; }
      }
      for (let a = 1; a <= 8; a++) {
        const key = `${i}-${a}`;
        if (eliminated.has(key)) {
          result.set(key, 'eliminated');
        } else if (soleCount === 1 && a === soleAlch) {
          result.set(key, 'confirmed');
        }
      }
    }
    return result;
  }, [state.autoDeduction, state.worlds]);

  // ── Solar/lunar visual hint marks (worlds-derived, never touch state) ──────
  const slHintMarks = useMemo(() => {
    if (!state.autoDeduction) return {} as Record<number, { solar: CellState; lunar: CellState } | null>;
    return computeSolarLunarAutoMarks(state.worlds);
  }, [state.autoDeduction, state.worlds]);

  // ── Reset draw state when switching away from draw tool ───────────────────
  useEffect(() => {
    if (activeTool !== 'draw') {
      isDrawingRef.current = false;
      drawPointsRef.current = [];
      if (livePathRef.current) livePathRef.current.setAttribute('d', '');
    }
  }, [activeTool]);

  // ── SVG draw helpers ───────────────────────────────────────────────────────
  const toSvgPoint = (e: React.PointerEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const buildPath = (pts: {x: number; y: number}[]) =>
    pts.length < 2 ? '' : 'M ' + pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ');

  const handleSvgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (activeTool !== 'draw') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    drawPointsRef.current = [toSvgPoint(e)];
    if (livePathRef.current) livePathRef.current.setAttribute('d', '');
  };
  const handleSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawingRef.current) return;
    drawPointsRef.current.push(toSvgPoint(e));
    const d = buildPath(drawPointsRef.current);
    if (livePathRef.current) livePathRef.current.setAttribute('d', d);
  };
  const finalizeDraw = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const d = buildPath(drawPointsRef.current);
    if (d) dispatch({ type: 'ADD_DRAW_STROKE', d });
    drawPointsRef.current = [];
    if (livePathRef.current) livePathRef.current.setAttribute('d', '');
  };

  // Keyboard: Space cycles tool · U = undo · R = redo
  useEffect(() => {
    const TOOLS: GridTool[] = ['mark', 'text', 'draw'];
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' && !editingCell) {
        e.preventDefault();
        setActiveTool(TOOLS[(TOOLS.indexOf(activeTool) + 1) % TOOLS.length]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editingCell, activeTool, setActiveTool]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const inInput = document.activeElement instanceof HTMLInputElement
                   || document.activeElement instanceof HTMLTextAreaElement;
      if (inInput) return;
      if (e.key === 'u' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault(); dispatch({ type: 'UNDO' });
      } else if (e.key === 'r' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault(); dispatch({ type: 'REDO' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const noteKey = (ing: number, alch: number) => `${ing}-${alch}`;

  const setNote = useCallback((key: string, value: string) => {
    dispatch({ type: 'SET_NOTE', key, value });
  }, [dispatch]);

  const resolveEffectiveTool = (e: React.MouseEvent): GridTool => {
    if (e.shiftKey) return 'mark';
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
  }, [activeTool, dispatch]);

  const handleSolarLunarToggle = useCallback((slot: number, mark: SolarLunarMark) => {
    dispatch({ type: 'SET_SOLAR_LUNAR_MARK', slot, mark });
  }, [dispatch]);

  const TOOL_DEFS: { id: GridTool; label: string; title: string }[] = [
    { id: 'mark', label: '✗✔?', title: 'Mark tool [Space] — cycle ✗ / ✔ / ?' },
    { id: 'text', label: 'abc', title: 'Text tool — type up to 4 chars per cell' },
    { id: 'draw', label: '✏',  title: 'Draw tool [Space] — freehand pencil' },
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
            {state.drawStrokes.length > 0 && (
              <button
                onClick={() => dispatch({ type: 'CLEAR_DRAW_STROKES' })}
                className="text-xs text-rose-400 hover:text-red-500 border border-rose-200
                           hover:border-red-300 rounded-lg px-2.5 py-1 transition-colors"
              >✕ Drawing</button>
            )}
            {onRandomize && (
              <button onClick={onRandomize}
                className="text-xs text-gray-400 hover:text-indigo-600 border border-gray-200
                           hover:border-indigo-300 rounded-lg px-2.5 py-1 transition-colors">🔀</button>
            )}
            <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
              <span className={autoDeduction ? 'text-indigo-600 font-semibold' : 'text-gray-500'}>Grid Hints</span>
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
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-amber-100 border border-amber-400 inline-block" />
            <span className="text-orange-400 font-semibold">☀ Solar</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-blue-100 border border-blue-400 inline-block" />
            <span className="text-slate-400 font-semibold">☽ Lunar</span>
          </span>
        </div>

        <div ref={(el) => { gridRef.current = el; if (scrollContainerRef) scrollContainerRef.current = el; }}
          className="overflow-x-auto -mx-1 pl-1 pr-4 pb-1 relative"
          onScroll={e => onScrollSync?.(e.currentTarget.scrollLeft)}
          style={{ cursor: TOOL_CURSOR[activeTool] }}>

          {/* Active tool badge */}
          <div aria-live="polite" aria-atomic="true"
            className={`absolute top-0 right-1 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full
              text-[10px] font-bold select-none pointer-events-none transition-all
              ${activeTool === 'mark' ? 'bg-gray-800/70 text-white' : ''}
              ${activeTool === 'text' ? 'bg-amber-500/80 text-white' : ''}
              ${activeTool === 'draw' ? 'bg-rose-500/80 text-white' : ''}`}>
            {activeTool === 'mark' && <><span>✗✔?</span><span>mark</span></>}
            {activeTool === 'text' && <><span>abc</span><span>text</span></>}
            {activeTool === 'draw' && <><span>✏</span><span>draw</span></>}
            <kbd className="ml-0.5 opacity-60 font-mono text-[9px] border border-current/40 rounded px-0.5">Space</kbd>
          </div>

          {/* ── Neutral-pair decorators + table wrapper ──────────────────── */}
          <div className="flex justify-center min-w-full w-max">
          <div className="relative inline-block">
            {/* 4 neutral potions at the row-pair boundaries, behind the table */}
            {([1, 3, 5, 7] as const).map(boundaryRow => (
              <div
                key={boundaryRow}
                className="absolute pointer-events-none"
                style={{
                  right: -18,
                  top: 61 + boundaryRow * 48,
                  transform: 'translateY(-50%) rotate(45deg)',
                  width: 24, height: 24,
                  zIndex: 0, opacity: 0.35,
                }}
              >
                <PotionImage result={{ type: 'neutral' }} width={24} />
              </div>
            ))}
            <table className="border-collapse text-xs" style={{ position: 'relative', zIndex: 1 }}>
            <thead>
              <tr>
                <th className="pr-2" />
                {colData.map(({ slotId, tint, displayId }) => {
                  const { index } = getIngredient(slotId);
                  const name = INGREDIENTS[displayId as 1]?.name ?? '';
                  const slotMark = solarLunarMarks[slotId] ?? null;
                  return (
                    <th key={slotId} className="px-0.5 pb-0.5 text-center align-bottom">
                      <div className="mx-auto mb-0.5 rounded-full h-1" style={{ backgroundColor: tint, width: 20 }} />
                      <span title={name} aria-label={name}>
                        <IngredientIcon index={index} width={36} />
                      </span>
                      {/* Solar/Lunar column buttons — single row */}
                      <SolarLunarButtons
                        slotId={slotId}
                        mark={slotMark}
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
                  <tr key={alchId} className={rowBorderStyle(alchId)}>
                    <td className="pr-1 py-0 align-middle">
                      <div className="flex items-center justify-end">
                        <AlchemicalDisplay id={alchId} elemWidth={48} />
                      </div>
                    </td>
                    {colData.map(({ slotId, tint }) => {
                      const key = noteKey(slotId, alchId);
                      const isEditing = editingCell?.ing === slotId && editingCell?.alch === alchId;
                      const slotMark = solarLunarMarks[slotId] ?? null;
                      const slotSolarMark: CellState = slotMark?.solar ?? 'unknown';
                      const slotLunarMark: CellState = slotMark?.lunar ?? 'unknown';
                      const slotHintMark = slHintMarks[slotId] ?? null;
                      const hintValCorner = slotHintMark ? (solar ? slotHintMark.solar : slotHintMark.lunar) : null;
                      const cornerHint: 'confirmed' | 'eliminated' | undefined =
                        (!hintCells.has(key) && (hintValCorner === 'confirmed' || hintValCorner === 'eliminated'))
                          ? hintValCorner : undefined;
                      return (
                        <td key={slotId} className="px-0.5 py-0 text-center align-middle">
                          <div className="relative">
                            <Cell
                              cellState={gridState[slotId]?.[alchId] ?? 'unknown'}
                              alchId={alchId}
                              tintColor={tint}
                              tintOpacity={[1,2,5,6].includes(alchId) ? 0.13 : 0.31}
                              noteText={notes[key] ?? ''}
                              isEditing={isEditing}
                              isSolarRow={solar}
                              slotSolarMark={slotSolarMark}
                              slotLunarMark={slotLunarMark}
                              hint={hintCells.get(key)}
                              cornerHint={cornerHint}
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
          {/* SVG draw overlay — intercepts pointer events only when draw tool is active */}
          <svg
            ref={svgRef}
            className="absolute inset-0 w-full h-full"
            style={{ zIndex: 10, pointerEvents: activeTool === 'draw' ? 'all' : 'none' }}
            onPointerDown={handleSvgPointerDown}
            onPointerMove={handleSvgPointerMove}
            onPointerUp={finalizeDraw}
            onPointerLeave={finalizeDraw}
          >
            {state.drawStrokes.map((d, i) => (
              <path key={i} d={d} fill="none" stroke="rgba(249,115,22,0.85)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            ))}
            <path ref={livePathRef} d="" fill="none" stroke="rgba(249,115,22,0.85)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          </div>{/* /neutral-pair wrapper */}
          </div>{/* /centering wrapper */}
        </div>

        <p className="text-[10px] text-gray-400">
          {activeTool === 'mark' && <>Tap to cycle: <span className="font-mono">· unknown</span>{' → '}<span className="font-mono font-bold text-red-500">✗ eliminated</span>{' → '}<span className="font-mono font-bold text-green-600">✔ confirmed</span>{' → '}<span className="font-mono font-bold text-indigo-500">? possible</span><span className="ml-2 opacity-60">· Space to switch tool · U / R to undo/redo</span></>}
          {activeTool === 'text' && <>Tap any cell to type a note (max 4 chars)<span className="ml-2 opacity-60">· Space to switch tool · U / R to undo/redo</span></>}
          {activeTool === 'draw' && <>Draw freehand lines on the grid<span className="ml-2 opacity-60">· Space to switch tool · U / R to undo/redo</span></>}
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

export function GolemPanel({ activeTool }: { activeTool: GridTool }) {
  const { state, dispatch } = useExpandedSolver();
  const { puzzle, golemNotepad, autoDeduction } = state;
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

  // Visual hints (circles on unmarked cells when Hints mode is on)
  const ingHints: Record<string, 'eliminated' | 'confirmed'> = {};
  const bottomHints: Record<string, 'confirmed'> = {};
  if (autoDeduction) {
    for (const [slotStr, reactions] of Object.entries(clueMap)) {
      for (const part of ['chest', 'ears'] as const) {
        const reaction = reactions[part];
        ingHints[`${slotStr}-${part}`] = reaction === 'reacts' ? 'confirmed' : 'eliminated';
      }
    }
    // Note: bottomHints are NOT pre-filled from puzzle.golem — the player must
    // deduce the golem config from the clues, not receive it as hidden truth.
  }

  // Image is 760×400 → AR = 400/760 ≈ 0.526. Explicit height avoids distortion.
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

  /**
   * GolemCell — unified marker styling matching the ingredient grid.
   *
   * isBottomGrid:
   *   true  → golem image is rendered grayscale at lower opacity, BEHIND the
   *            mark-state colour overlay (so colour always shows through).
   *   false → normal coloured image on top of white bg (top grid behaviour).
   */
  function GolemCell({ mark, isClue, img, noteKey, orbColor, orbSize, tint, isBottomGrid, hint, onMark }: {
    mark: GolemSlotMark; isClue?: boolean; img: string; noteKey: string;
    orbColor?: Color; orbSize?: number; tint?: string; isBottomGrid?: boolean;
    hint?: 'eliminated' | 'confirmed';
    onMark: () => void;
  }) {
    const [editing, setEditing] = useState(false);
    const note = notes[noteKey] ?? '';

    // Map GolemSlotMark → CellState for the unified MARKER system
    const cellState: CellState =
      mark === 'reacts'   ? 'confirmed'  :
      mark === 'no-react' ? 'eliminated' :
      mark === 'possible' ? 'possible'   : 'unknown';

    const { glyph, textShadow }    = MARKER[cellState];
    const { bg, border }           = GOLEM_CELL_STATE[cellState];
    const borderWidth = isClue && mark !== null ? '2px' : '1px';

    return (
      <button
        onClick={() => { if (activeTool === 'text') { setEditing(true); return; } onMark(); }}
        style={{
          position: 'relative', width: CELL_W, height: ROW_H, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 4, overflow: 'hidden',
          border: `${borderWidth} solid ${border}`,
          background: 'white',    // always white — colour comes from overlay
          cursor: 'pointer', transition: 'all 0.12s',
        }}
      >
        {/* Golem silhouette:
            - Bottom grid: grayscale, behind the colour overlay
            - Top grid: coloured, normal contrast */}
        <img src={img} alt="" style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover',
          opacity: isBottomGrid ? 0.20 : 0.30,
          filter: isBottomGrid ? 'grayscale(1)' : 'none',
          pointerEvents: 'none',
        }} />

        {/* Mark-state colour overlay — sits ABOVE the bg image so colour is always visible */}
        {cellState !== 'unknown' && (
          <span style={{
            position: 'absolute', inset: 0, borderRadius: 3,
            backgroundColor: bg, opacity: 0.70,
            pointerEvents: 'none',
          }} />
        )}

        {/* Column tint overlay (top grid only — ingredient identity) */}
        {tint && !isBottomGrid && (
          <span style={{ position: 'absolute', inset: 0, borderRadius: 4, backgroundColor: tint, opacity: 0.28, pointerEvents: 'none' }} />
        )}

        {/* Alch-property orb (bottom grid only) */}
        {orbColor != null && orbSize != null && (
          <span style={{ position: 'absolute', opacity: 0.22, pointerEvents: 'none' }}>
            <ElemImage color={orbColor} size="L" width={orbSize} />
          </span>
        )}

        {/* Visual hint circle — shown when Hints mode is on and cell is unmarked */}
        {hint && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
            {hint === 'confirmed' && (
              <circle cx="24" cy="12" r="9" fill="none" stroke="rgba(34,197,94,0.75)" strokeWidth="2" />
            )}
            {hint === 'eliminated' && (
              <>
                <path d="M 24,3 C 34,1 43,6 42,12 C 41,18 32,22 22,22 C 12,22 4,17 5,11 C 6,5 14,2 24,3"
                  fill="none" stroke="rgba(239,68,68,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M 26,4 C 35,2 43,8 42,14 C 41,19 31,23 21,23 C 12,23 4,18 5,12 C 6,6 16,3 26,4"
                  fill="none" stroke="rgba(239,68,68,0.45)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </>
            )}
          </svg>
        )}

        {editing ? (
          <input
            autoFocus
            defaultValue={note}
            maxLength={4}
            onBlur={e => { dispatch({ type: 'SET_NOTE', key: noteKey, value: e.target.value }); setEditing(false); }}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') (e.target as HTMLInputElement).blur(); }}
            onClick={e => e.stopPropagation()}
            className="absolute inset-0 z-20 w-full h-full text-center text-[11px] font-bold bg-white/90 border-2 border-indigo-400 rounded outline-none"
          />
        ) : note ? (
          <span className="absolute bottom-0.5 right-0.5 text-[8px] font-bold text-indigo-500 leading-none pointer-events-none"
            style={{ textShadow: stroke('white') }}>{note}</span>
        ) : null}

        {/* Marker glyph — same white-with-stroke style as ingredient grid */}
        {!editing && glyph && (
          <span className="relative z-10 text-xl font-black leading-none select-none"
            style={{ color: 'white', textShadow }}>{glyph}</span>
        )}
      </button>
    );
  }

  function cycleIngMark(cur: GolemSlotMark): GolemSlotMark {
    if (activeTool === 'mark') {
      if (cur === null)       return 'reacts';
      if (cur === 'reacts')   return 'no-react';
      if (cur === 'no-react') return 'possible';
      return null;
    }
    return cur;  // text tool — no cycling on golem marks
  }

  return (
    <div className="pt-1 space-y-4 pr-[10px]">

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
                    isBottomGrid={false}
                    hint={ingHints[`${slotId}-${part}`]}
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
      {/* paddingBottom reserves space for the peeking decorators — no overflow */}
      <div style={{ position: 'relative', paddingBottom: 19 }}>
        {/* Aspect sign decorators — peek out 2/3 below the grid, 1/3 behind */}
        {ALCH_COLS.map((col, colIdx) => {
          const sign: Sign = col.size === 'L' ? '+' : '-';
          // Column centre: header(HDR_W) + (colIdx+1) gaps of 4px + colIdx full cells + half cell
          const left = HDR_W + (colIdx + 1) * 4 + colIdx * CELL_W + CELL_W / 2 - 14;
          return (
            <div key={`sdec-${col.color}${col.size}`} style={{
              position: 'absolute', bottom: 0, left,
              zIndex: 0, opacity: 0.40, pointerEvents: 'none',
            }}>
              <SignedElemImage color={col.color} sign={sign} width={28} />
            </div>
          );
        })}
        {/* Grid rows sit above the decorators */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          {rows.map(({ part, img, label }) => (
            <div key={part} className="flex gap-1 mt-1">
              <GolemRowHeader img={img} label={label} />
              {ALCH_COLS.map(col => {
                const orbSize = col.size === 'L' ? Math.round(CELL_W * 0.70) : Math.round(CELL_W * 0.25);
                const colKey = `${col.color}${col.size}`;
                const cellKey = `${part}-${colKey}`;
                const mark = golemNotepad.bottomGrid?.[cellKey] ?? null;
                return (
                  <GolemCell
                    key={colKey}
                    mark={mark}
                    img={img}
                    noteKey={`g2-${part}-${colKey}`}
                    orbColor={col.color}
                    orbSize={orbSize}
                    isBottomGrid={true}
                    hint={bottomHints[cellKey]}
                    onMark={() => dispatch({
                      type: 'SET_GOLEM_BOTTOM_MARK',
                      key: cellKey,
                      mark: cycleIngMark(mark),
                    })}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
