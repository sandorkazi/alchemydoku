import { useState, useRef } from 'react';
import { IngredientIcon } from './GameSprites';
import { makeDisplayMap } from '../utils/solverStorage';
import type { DisplayMap } from '../utils/solverStorage';
import { INGREDIENTS } from '../data/ingredients';

interface ShufflePickerModalProps {
  currentMap: DisplayMap;
  onApply: (map: DisplayMap) => void;
  onClose: () => void;
}

export function ShufflePickerModal({ currentMap, onApply, onClose }: ShufflePickerModalProps) {
  // Internal state: ordered array of display IDs, index = slot - 1
  const [order, setOrder] = useState<number[]>(() =>
    [1, 2, 3, 4, 5, 6, 7, 8].map(i => currentMap[i] ?? i)
  );

  const dragIndex = useRef<number | null>(null);

  function handleDragStart(i: number) {
    dragIndex.current = i;
  }

  function handleDragOver(e: React.DragEvent, i: number) {
    e.preventDefault();
    const from = dragIndex.current;
    if (from === null || from === i) return;
    setOrder(prev => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(i, 0, item);
      return next;
    });
    dragIndex.current = i;
  }

  function handleDragEnd() {
    dragIndex.current = null;
  }

  function handleRandomize() {
    const fresh = makeDisplayMap();
    setOrder([1, 2, 3, 4, 5, 6, 7, 8].map(i => fresh[i]));
  }

  function handleApply() {
    const map: DisplayMap = {};
    order.forEach((displayId, idx) => { map[idx + 1] = displayId; });
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
          Drag to reorder. The arrangement is encoded in the permalink when you copy a link.
        </p>

        <div className="flex gap-2 justify-center flex-wrap">
          {order.map((displayId, i) => (
            <div
              key={i}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={e => handleDragOver(e, i)}
              onDragEnd={handleDragEnd}
              className="flex flex-col items-center gap-1 cursor-grab active:cursor-grabbing
                         rounded-xl border-2 border-gray-200 hover:border-indigo-400
                         bg-gray-50 hover:bg-indigo-50 px-2 py-2 transition-colors select-none"
              title={INGREDIENTS[displayId as 1]?.name}
            >
              <IngredientIcon index={(displayId - 1) as 0} width={40} />
              <span className="text-[10px] text-gray-400 font-medium">{i + 1}</span>
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
