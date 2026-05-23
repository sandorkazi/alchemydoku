export const PEN_COLORS = [
  '#f97316',  // orange-500 (default)
  '#ef4444',  // red-500
  '#eab308',  // yellow-500
  '#22c55e',  // green-500
  '#3b82f6',  // blue-500
  '#a855f7',  // purple-500
  '#e2e8f0',  // slate-200 (light / white-ish)
] as const;

export type PenColor = (typeof PEN_COLORS)[number];
export const DEFAULT_PEN_COLOR: string = PEN_COLORS[0];

export type DrawStroke = { d: string; color: string };

export function normalizeStroke(raw: string | DrawStroke): DrawStroke {
  return typeof raw === 'string' ? { d: raw, color: DEFAULT_PEN_COLOR } : raw;
}
