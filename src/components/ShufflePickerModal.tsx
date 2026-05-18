import { useState, useRef } from 'react';
import { IngredientIcon } from './GameSprites';
import { makeDisplayMap } from '../utils/solverStorage';
import type { DisplayMap } from '../utils/solverStorage';

interface ShufflePickerModalProps {
  currentMap: DisplayMap;
  onApply: (map: DisplayMap) => void;
  onClose: () => void;
}

export function ShufflePickerModal({ currentMap, onApply, onClose }: ShufflePickerModalProps) {
  const initialOrder = [1, 2, 3, 4, 5, 6, 7, 8].map(i => currentMap[i] ?? i);

  // Fixed: which ingredient each slot "represents" (the indicator)
  const indicators = useRef(initialOrder);

  // Moveable: which tile is currently sitting in each slot
  const [tiles, setTiles] = useState<number[]>(initialOrder);

  const dragIndex = useRef<number | null>(null);

  function handleDragStart(i: number) {
    dragIndex.current = i;
  }

  function handleDragOver(e: React.DragEvent, i: number) {
    e.preventDefault();
    const from = dragIndex.current;
    if (from === null || from === i) return;
    setTiles(prev => {
      const next = [...prev];
      [next[from], next[i]] = [next[i], next[from]];
      return next;
    });
    dragIndex.current = i;
  }

  function handleDragEnd() {
    dragIndex.current = null;
  }

  function handleRandomize() {
    const fresh = makeDisplayMap();
    setTiles([1, 2, 3, 4, 5, 6, 7, 8].map(i => fresh[i]));
  }

  function handleApply() {
    const map: DisplayMap = {};
    tiles.forEach((displayId, idx) => { map[idx + 1] = displayId; });
    onApply(map);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-lg w-full mx-4">
        <h2 className="text-base font-semibold text-gray-800 mb-1">Custom ingredient order</h2>
        <p className="text-xs text-gray-500 mb-4">
          Drag tiles to swap. Faded icon shows the slot's current ingredient; bright tile shows what will display there.
        </p>

        <div className="flex gap-2 justify-center flex-wrap">
          {tiles.map((tileId, i) => (
            <div
              key={i}
              onDragOver={e => handleDragOver(e, i)}
              className="relative flex items-center justify-center rounded-xl border-2 border-gray-200
                         hover:border-indigo-400 bg-gray-50 hover:bg-indigo-50 w-16 h-16
                         transition-colors"
            >
              {/* Fixed slot indicator */}
              <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                <IngredientIcon index={(indicators.current[i] - 1) as 0} width={55} />
              </div>
              {/* Draggable tile — round, same diameter as previous width */}
              <div
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragEnd={handleDragEnd}
                className="relative z-10 cursor-grab active:cursor-grabbing select-none
                           rounded-full overflow-hidden"
                style={{ width: 36, height: 36 }}
              >
                <IngredientIcon index={(tileId - 1) as 0} width={36} />
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-6 justify-end">
          <button
            onClick={handleRandomize}
            className="px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl
                       hover:bg-gray-100 transition-colors"
          >
            🔀 Randomize
          </button>
          <button
            onClick={onClose}
            className="px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl
                       hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-xl
                       hover:bg-indigo-700 transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
