// Module-level mutable text-scale value. Read by the RNText render patch
// (see App.tsx) so raw <RNText> calls in screens scale alongside the
// shared <Text> wrapper component.
//
// Listener pattern lets the React tree remount when the scale changes
// without forcing every consumer to read context.

let _scale = 1.0;
const listeners = new Set<() => void>();

export const TEXT_SCALE_MIN = 0.85;
export const TEXT_SCALE_MAX = 1.6;
export const TEXT_SCALE_STEP = 0.05;

export function getTextScale(): number {
  return _scale;
}

export function setTextScale(value: number): void {
  const next = Math.min(TEXT_SCALE_MAX, Math.max(TEXT_SCALE_MIN, value));
  if (next === _scale) return;
  _scale = next;
  listeners.forEach(l => l());
}

export function subscribeTextScale(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Multiply a numeric font size by the current scale. Pass-through for non-numbers. */
export function scaleFont(size: number | string | undefined): number | string | undefined {
  if (typeof size !== 'number') return size;
  return size * _scale;
}
