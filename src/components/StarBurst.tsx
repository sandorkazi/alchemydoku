/**
 * StarBurst — Easter egg overlay.
 *
 * When a note cell in any corner of the ingredient grid contains "3",
 * a burst of stars erupts from that corner inward for ~1.2 s.
 *
 * Fully cosmetic: pointer-events:none, no game state touched.
 */

import { useEffect, useRef, useState } from 'react';
import type { IngredientId } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

type Corner = 'tl' | 'tr' | 'bl' | 'br';

interface Burst {
  id:     number;
  corner: Corner;
}

interface StarBurstProps {
  notes:   Record<string, string>;
  /** First column slot id (display order) */
  firstSlot: IngredientId;
  /** Last column slot id (display order) */
  lastSlot:  IngredientId;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Corner positions: origin % and inward fan angle range (degrees from inward diagonal) */
const CORNER_STYLE: Record<Corner, { originX: string; originY: string; fanMin: number; fanMax: number }> = {
  tl: { originX: '0%',   originY: '0%',   fanMin: -30, fanMax: 60  },  // fan SE
  tr: { originX: '100%', originY: '0%',   fanMin: 120, fanMax: 210 },  // fan SW
  bl: { originX: '0%',   originY: '100%', fanMin: -60, fanMax: 30  },  // fan NE
  br: { originX: '100%', originY: '100%', fanMin: 150, fanMax: 240 },  // fan NW
};

const STAR_CHARS = ['★', '✦', '✧', '✨', '⭐', '💫', '✵', '✶'];
const N_STARS    = 22;

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

// ─── Single burst layer ───────────────────────────────────────────────────────

function BurstLayer({ corner, onDone }: { corner: Corner; onDone: () => void }) {
  const { originX, originY, fanMin, fanMax } = CORNER_STYLE[corner];

  // Build stars once on mount
  const stars = useRef(
    Array.from({ length: N_STARS }, (_, i) => {
      const angleDeg = rand(fanMin, fanMax);
      const angleRad = (angleDeg * Math.PI) / 180;
      const dist     = rand(60, 220);
      const dx       = Math.cos(angleRad) * dist;
      const dy       = Math.sin(angleRad) * dist;
      const size     = rand(10, 24);
      const delay    = rand(0, 0.5);
      const dur      = rand(1.1, 2.0);
      const char     = STAR_CHARS[i % STAR_CHARS.length];
      const hue      = Math.round(rand(30, 320));
      return { dx, dy, size, delay, dur, char, hue };
    })
  ).current;

  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      aria-hidden
      className="absolute inset-0 overflow-hidden"
      style={{ pointerEvents: 'none', zIndex: 9999 }}
    >
      {stars.map((s, i) => (
        <span
          key={i}
          style={{
            position:    'absolute',
            left:        originX,
            top:         originY,
            fontSize:    s.size,
            color:       `hsl(${s.hue} 100% 60%)`,
            filter:      'drop-shadow(0 0 4px currentColor)',
            opacity:     0,
            animation:   `alch-star-fly ${s.dur}s ${s.delay}s ease-out forwards`,
            // Custom properties consumed by the keyframe
            ['--dx' as string]: `${s.dx}px`,
            ['--dy' as string]: `${s.dy}px`,
            userSelect: 'none',
          }}
        >
          {s.char}
        </span>
      ))}
    </div>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

let _nextId = 1;

export function StarBurst({ notes, firstSlot, lastSlot }: StarBurstProps) {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const prevNotes = useRef<Record<string, string>>({});

  useEffect(() => {
    const corners: [Corner, string][] = [
      ['tl', `${firstSlot}-1`],
      ['tr', `${lastSlot}-1`],
      ['bl', `${firstSlot}-8`],
      ['br', `${lastSlot}-8`],
    ];

    const newBursts: Burst[] = [];
    for (const [corner, key] of corners) {
      const now  = notes[key]?.trim();
      const prev = prevNotes.current[key]?.trim();
      // Trigger when value *becomes* "3" (newly typed, not already there)
      if (now === '3' && prev !== '3') {
        newBursts.push({ id: _nextId++, corner });
      }
    }

    if (newBursts.length > 0) {
      setBursts(b => [...b, ...newBursts]);
    }

    prevNotes.current = { ...notes };
  }, [notes, firstSlot, lastSlot]);

  if (bursts.length === 0) return null;

  return (
    <>
      {/* Inject keyframe once */}
      <style>{`
        @keyframes alch-star-fly {
          0%   { opacity: 0;   transform: translate(0, 0) scale(0.2) rotate(0deg); }
          15%  { opacity: 1; }
          80%  { opacity: 0.9; transform: translate(var(--dx), var(--dy)) scale(1) rotate(360deg); }
          100% { opacity: 0;   transform: translate(calc(var(--dx) * 1.15), calc(var(--dy) * 1.15)) scale(0.4) rotate(420deg); }
        }
      `}</style>
      {bursts.map(b => (
        <BurstLayer
          key={b.id}
          corner={b.corner}
          onDone={() => setBursts(bs => bs.filter(x => x.id !== b.id))}
        />
      ))}
    </>
  );
}
