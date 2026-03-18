import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { INGREDIENTS } from '../data/ingredients';
import { ALCHEMICALS } from '../data/alchemicals';
import { useSolver, useIngredient } from '../contexts/SolverContext';
import { getEliminatedCells } from '../logic/deducer';
import { AlchemicalDisplay } from './AlchemicalDisplay';
import { AlchemicalImage, IngredientIcon, PotionImage } from './GameSprites';
import { StarBurst } from './StarBurst';
import type { AlchemicalId, IngredientId, CellState } from '../types';

// Fixed visual column order by display-ingredient ID (mushroom → fern → toad → bird claw → mandrake → scorpion → raven's feather → flower)
const BOARD_DISPLAY_ORDER: IngredientId[] = [3, 1, 7, 2, 4, 5, 6, 8];
const ALCH_IDS: AlchemicalId[] = [1, 2, 3, 4, 5, 6, 7, 8];

const TINT_COLORS = [
  '#6C4FA3', '#8DBF3F', '#6B5A3A', '#D4A437',
  '#3F6FB6', '#979c91', '#B23A2E', '#23293D',
];

// ─── Tool types ───────────────────────────────────────────────────────────────

type GridTool = 'mark' | 'question' | 'text' | 'draw';
const TOOL_CYCLE: GridTool[] = ['mark', 'question', 'text', 'draw'];

// Per-tool cursor CSS values — shown on the grid wrapper
const TOOL_CURSOR: Record<GridTool, string> = {
  mark:     'crosshair',
  question: 'cell',
  text:     'text',
  draw:     'crosshair',
};

// ─── Marker glyphs ────────────────────────────────────────────────────────────

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

// ─── Cell ─────────────────────────────────────────────────────────────────────

function Cell({
  cellState, alchId, tintColor, tintOpacity, noteText,
  isEditing,
  onMouseDown,
  ariaLabel,
  hint,
}: {
  cellState:   CellState;
  alchId:      AlchemicalId;
  tintColor:   string;
  tintOpacity: number;
  noteText:    string;
  isEditing:   boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  ariaLabel?:  string;
  hint?:       'eliminated' | 'confirmed';
}) {
  const { glyph, textShadow } = MARKER[cellState];

  return (
    <button
      onMouseDown={onMouseDown}
      onClick={e => e.preventDefault()}
      className={`relative w-12 h-12 rounded flex items-center justify-center border transition-all
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
        ${isEditing
          ? 'border-indigo-400 ring-2 ring-indigo-300'
          : 'border-gray-200 hover:border-gray-400'
        }`}
      aria-label={ariaLabel ?? cellState}
      title={ariaLabel ?? cellState}
    >
      {/* vibrant column tint */}
      <span
        className="absolute inset-0 rounded pointer-events-none"
        style={{ backgroundColor: tintColor, opacity: tintOpacity }}
      />
      {/* alchemical watermark */}
      <span
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ opacity: 0.22 }}
      >
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

      {/* Mark glyph — hidden when note text present */}
      {glyph && !noteText && (
        <span
          className="relative z-10 text-xl font-black leading-none select-none"
          style={{ color: 'white', textShadow }}
        >
          {glyph}
        </span>
      )}

      {/* Note text overlay */}
      {noteText && (
        <span
          className="relative z-10 text-[11px] font-black leading-none select-none tracking-tight"
          style={{ color: 'white', textShadow: stroke('#1e1b4b') }}
        >
          {noteText}
        </span>
      )}
    </button>
  );
}

// ─── Inline text editor ───────────────────────────────────────────────────────

function CellTextEditor({
  value, onChange, onDone,
}: {
  value: string;
  onChange: (v: string) => void;
  onDone: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center rounded overflow-hidden">
      <input
        ref={ref}
        type="text"
        maxLength={3}
        value={value}
        onChange={e => onChange(e.target.value.toUpperCase().slice(0, 3))}
        onBlur={onDone}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); onDone(); }
        }}
        className="w-full h-full text-center text-[13px] font-black bg-indigo-900/80 text-white
                   border-0 outline-none tracking-widest rounded"
        aria-label="Cell note (max 3 characters)"
      />
    </div>
  );
}

// ─── Visual Hints confirm modal ───────────────────────────────────────────────

function AutoDeduceModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4 animate-fadein">
        <h3 className="font-bold text-gray-900 text-base">Enable Visual Hints?</h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          Visual Hints will show faint circles on cells the clues logically{' '}
          <span className="font-semibold text-red-600">eliminate</span>{' '}
          (red squiggly) or{' '}
          <span className="font-semibold text-green-600">confirm</span>{' '}
          (green circle). Your own grid marks are untouched.
        </p>
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Recommended only if you're stuck or want to check your reasoning.
        </p>
        <div className="flex gap-3 pt-1">
          <button onClick={onCancel}
            className="flex-1 py-2 rounded-xl border border-gray-300 text-sm font-medium
                       text-gray-700 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold
                       hover:bg-indigo-700 transition-colors">
            Enable
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function IngredientGrid({ onRandomize }: { onRandomize?: () => void }) {
  const { state, dispatch } = useSolver();
  const notes = state.notes;
  const setNote = (key: string, value: string) => dispatch({ type: 'SET_NOTE', key, value });
  const { gridState, autoDeduction, displayMap } = state;
  const getIngredient = useIngredient();
  const gridRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const livePathRef = useRef<SVGPathElement>(null);
  const isDrawingRef = useRef(false);
  const drawPointsRef = useRef<{x: number; y: number}[]>([]);

  const [showConfirm, setShowConfirm] = useState(false);
  const [activeTool, setActiveTool] = useState<GridTool>('mark');
  const [editingCell, setEditingCell] = useState<{ ing: IngredientId; alch: AlchemicalId } | null>(null);

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

  // ── Spacebar cycles tools · U = undo · R = redo ───────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Only act when no input is focused
      const active = document.activeElement;
      const inInput = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;
      if (inInput) return;
      if (e.code === 'Space' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setActiveTool(cur => TOOL_CYCLE[(TOOL_CYCLE.indexOf(cur) + 1) % TOOL_CYCLE.length]);
        setEditingCell(null);
      } else if (e.key === 'u' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        dispatch({ type: 'UNDO' });
      } else if (e.key === 'r' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        dispatch({ type: 'REDO' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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

  // Columns are fixed by display-ingredient ID. Build inverse map: displayId → slotId.
  const displayToSlot: Record<number, IngredientId> = {};
  for (let slot = 1; slot <= 8; slot++) {
    const dispId = displayMap[slot] ?? slot;
    displayToSlot[dispId] = slot as IngredientId;
  }

  const colData = BOARD_DISPLAY_ORDER.map((displayId, i) => ({
    slotId:    displayToSlot[displayId] as IngredientId,
    tint:      TINT_COLORS[i],
    displayId,
  })).filter(x => x.slotId != null);

  const noteKey = (ing: IngredientId, alch: AlchemicalId) => `${ing}-${alch}`;

  // ── Resolve effective tool from modifier keys ──────────────────────────────
  // Shift held → always use mark tool, regardless of active tool
  const resolveEffectiveTool = (e: React.MouseEvent): GridTool => {
    if (e.shiftKey) return 'mark';
    return activeTool;
  };

  // ── Cell mousedown handler ─────────────────────────────────────────────────
  const handleCellMouseDown = useCallback((
    e: React.MouseEvent,
    slotId: IngredientId,
    alchId: AlchemicalId,
  ) => {
    e.preventDefault(); // prevent focus steal / text selection
    const tool = resolveEffectiveTool(e);

    if (tool === 'text') {
      setEditingCell({ ing: slotId, alch: alchId });
      return;
    }
    if (tool === 'mark') {
      dispatch({ type: 'TOGGLE_CELL', ingredient: slotId, alchemical: alchId });
    } else if (tool === 'question') {
      const cur = gridState[slotId]?.[alchId] ?? 'unknown';
      const next: CellState = cur === 'possible' ? 'unknown' : 'possible';
      dispatch({ type: 'SET_CELL', ingredient: slotId, alchemical: alchId, state: next });
    }
  }, [activeTool, gridState, dispatch]);

  // ── Tool bar definitions ───────────────────────────────────────────────────
  const TOOL_DEFS: { id: GridTool; label: string; title: string }[] = [
    { id: 'mark',     label: '✗✔',  title: 'Mark tool [Space] — cycle ✗ / ✔ · Shift+click forces this tool' },
    { id: 'question', label: '?',    title: '? tool [Space] — toggle possible mark' },
    { id: 'text',     label: 'abc',  title: 'Text tool [Space] — type up to 3 letters per cell' },
    { id: 'draw',     label: '✏',   title: 'Draw tool [Space] — freehand pencil' },
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
                <button
                  key={id}
                  title={title}
                  aria-pressed={activeTool === id}
                  onClick={() => { setActiveTool(id); setEditingCell(null); }}
                  className={`px-2.5 py-1 text-xs font-bold transition-colors focus-visible:outline-none
                    focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400
                    ${activeTool === id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                    }
                    ${id === 'mark' ? '' : 'border-l border-gray-200'}
                  `}
                >
                  {label}
                </button>
              ))}
            </div>

            <button
              onClick={() => { dispatch({ type: 'CLEAR_GRID' }); setEditingCell(null); }}
              className="text-xs text-gray-400 hover:text-red-500 border border-gray-200
                         hover:border-red-300 rounded-lg px-2.5 py-1 transition-colors"
            >
              ✕ Clear
            </button>

            {state.drawStrokes.length > 0 && (
              <button
                onClick={() => dispatch({ type: 'CLEAR_DRAW_STROKES' })}
                className="text-xs text-rose-400 hover:text-red-500 border border-rose-200
                           hover:border-red-300 rounded-lg px-2.5 py-1 transition-colors"
              >
                ✕ Drawing
              </button>
            )}

            {onRandomize && (
              <button onClick={onRandomize}
                className="text-xs text-gray-400 hover:text-indigo-600 border border-gray-200
                           hover:border-indigo-300 rounded-lg px-2.5 py-1 transition-colors">
                🔀
              </button>
            )}

            <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
              <span className={autoDeduction ? 'text-indigo-600 font-semibold' : 'text-gray-500'}>Grid Hints</span>
              <button
                role="switch"
                aria-checked={autoDeduction}
                onClick={() => { if (!autoDeduction) setShowConfirm(true); else dispatch({ type: 'TOGGLE_AUTO_DEDUCTION' }); }}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
                  ${autoDeduction ? 'bg-indigo-600' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow
                  transition-transform ${autoDeduction ? 'translate-x-4' : 'translate-x-1'}`} />
              </button>
            </label>
          </div>
        </div>

        {/* Grid — cursor + tool indicator badge */}
        <div
          ref={gridRef}
          className="overflow-x-auto -mx-1 pl-1 pr-4 pb-1 relative"
          style={{ cursor: TOOL_CURSOR[activeTool] }}
        >
          {/* Active tool badge — floats top-right of the scroll area */}
          <div
            aria-live="polite"
            aria-atomic="true"
            className={`absolute top-0 right-1 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full
              text-[10px] font-bold select-none pointer-events-none transition-all
              ${activeTool === 'mark'     ? 'bg-gray-800/70 text-white' : ''}
              ${activeTool === 'question' ? 'bg-indigo-600/80 text-white' : ''}
              ${activeTool === 'text'     ? 'bg-amber-500/80 text-white' : ''}
              ${activeTool === 'draw'     ? 'bg-rose-500/80 text-white' : ''}
            `}
          >
            {activeTool === 'mark'     && <><span>✗✔</span><span>mark</span></>}
            {activeTool === 'question' && <><span>?</span><span>question</span></>}
            {activeTool === 'text'     && <><span>abc</span><span>text</span></>}
            {activeTool === 'draw'     && <><span>✏</span><span>draw</span></>}
            <kbd className="ml-0.5 opacity-60 font-mono text-[9px] border border-current/40 rounded px-0.5">Space</kbd>
          </div>
          {/* ── Neutral-pair decorators + table wrapper ──────────────────── */}
          <div className="relative block w-fit mx-auto">
            {/* 4 neutral potions at the row-pair boundaries, behind the table */}
            {([1, 3, 5, 7] as const).map(boundaryRow => (
              <div
                key={boundaryRow}
                className="absolute pointer-events-none"
                style={{
                  right: -18,
                  top: 44 + boundaryRow * 48,
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
                  const name = INGREDIENTS[displayId as 1].name;
                  return (
                    <th key={slotId} className="px-0.5 pb-0.5 text-center align-bottom">
                      <div className="mx-auto mb-0.5 rounded-full h-1" style={{ backgroundColor: tint, width: 20 }} />
                      <span title={name} aria-label={name}>
                        <IngredientIcon index={index} width={36} />
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {ALCH_IDS.map(alchId => (
                <tr key={alchId}>
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
                            tintOpacity={[1,2,5,6].includes(alchId) ? 0.13 : 0.31}
                            noteText={notes[key] ?? ''}
                            isEditing={isEditing}
                            hint={hintCells.get(key)}
                            onMouseDown={e => handleCellMouseDown(e, slotId, alchId)}
                            ariaLabel={`${INGREDIENTS[getIngredient(slotId).displayId as 1].name} / ${ALCHEMICALS[alchId].code}: ${gridState[slotId]?.[alchId] ?? 'unknown'}`}
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
              ))}
            </tbody>
          </table>
          <StarBurst
            notes={notes}
            firstSlot={colData[0]?.slotId}
            lastSlot={colData[colData.length - 1]?.slotId}
          />
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
              <path key={i} d={d} fill="none" stroke="rgba(239,68,68,0.75)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            ))}
            <path ref={livePathRef} d="" fill="none" stroke="rgba(239,68,68,0.75)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          </div>{/* /neutral-pair wrapper */}
        </div>

        {/* Contextual legend + keyboard hints */}
        <p className="text-[10px] text-gray-400">
          {activeTool === 'mark' && <>
            Tap to cycle:{' '}
            <span className="font-mono">· unknown</span>{' → '}
            <span className="font-mono font-bold text-red-500">✗ eliminated</span>{' → '}
            <span className="font-mono font-bold text-green-600">✔ confirmed</span>
            <span className="ml-2 opacity-60">· Space to switch tool · U / R to undo/redo</span>
          </>}
          {activeTool === 'question' && <>
            Tap to toggle <span className="font-mono font-bold text-indigo-500">? possible</span> on/off
            <span className="ml-2 opacity-60">· Space to switch tool · Shift+click for mark · U / R to undo/redo</span>
          </>}
          {activeTool === 'text' && <>
            Tap any cell to type a note (max 3 chars)
            <span className="ml-2 opacity-60">· Space to switch tool · Shift+click for mark · U / R to undo/redo</span>
          </>}
          {activeTool === 'draw' && <>
            Draw freehand lines on the grid
            <span className="ml-2 opacity-60">· Space to switch tool · U / R to undo/redo</span>
          </>}
        </p>
      </div>
    </>
  );
}
